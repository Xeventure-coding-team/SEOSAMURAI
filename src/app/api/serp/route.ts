import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { stackServerApp } from "@/stack";
import { getPlanLimits, PlanId } from "@/lib/stripe";
import { checkRateLimit, getIdentifier } from "../../../../lib/rate-limit";

// ─── Types ────────────────────────────────────────────────────────────────────

interface KeywordRankData {
  keyword: string;
  location: string;
  locationId: string;
  currentRank: number | null;
  previousRank: number | null;
  rankChange: "UP" | "DOWN" | "NEW" | "SAME" | "NOT_FOUND";
  rankChangeValue: number;
  url: string | null;
  title: string | null;
  snippet: string | null;
  canUpdate: boolean;
  nextUpdateTime: string;
  timeUntilUpdate: number;
}

interface PlacesResult {
  name: string;
  place_id: string;
  formatted_address?: string;
  rating?: number;
  types?: string[];
}

// ─── Rate limiting ─────────────────────────────────────────────────────────────

const RATE_LIMIT = {
  MIN_DELAY_MS: 2_000,
  RETRY_ATTEMPTS: 3,
  INITIAL_BACKOFF_MS: 5_000,
  MAX_BACKOFF_MS: 60_000,
  BACKOFF_MULTIPLIER: 2,
  PAGE_DELAY_MS: 4_000,
};

const userRequestTracker = new Map<string, number>();
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function enforceUserRateLimit(userId: string): Promise<void> {
  const last = userRequestTracker.get(userId) ?? 0;
  const wait = RATE_LIMIT.MIN_DELAY_MS - (Date.now() - last);
  if (wait > 0) await delay(wait);
  userRequestTracker.set(userId, Date.now());
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  context: string,
  maxRetries = RATE_LIMIT.RETRY_ATTEMPTS
): Promise<T> {
  let lastError!: Error;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const backoff = Math.min(
          RATE_LIMIT.INITIAL_BACKOFF_MS * RATE_LIMIT.BACKOFF_MULTIPLIER ** (attempt - 1),
          RATE_LIMIT.MAX_BACKOFF_MS
        );
        await delay(backoff);
      }
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const msg = lastError.message;
      const retryable =
        msg.includes("429") ||
        msg.includes("500") ||
        msg.includes("503") ||
        msg.toLowerCase().includes("rate limit");
      if (!retryable) throw lastError;
    }
  }
  throw lastError;
}

// ─── Fuzzy name matching ───────────────────────────────────────────────────────

function normaliseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(pvt|ltd|llc|inc|corp|co|the)\b\.?/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isNameMatch(resultName: string, businessName: string): boolean {
  const a = normaliseName(resultName);
  const b = normaliseName(businessName);

  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;

  const wordsA = new Set(a.split(" ").filter(Boolean));
  const wordsB = b.split(" ").filter(Boolean);
  if (wordsB.length === 0) return false;

  const shared = wordsB.filter((w) => wordsA.has(w)).length;
  return shared / wordsB.length >= 0.6;
}

// ─── Google Places Text Search ─────────────────────────────────────────────────

const PLACES_BASE = "https://maps.googleapis.com/maps/api/place/textsearch/json";
const MAX_PAGES = 1;

function buildSearchQuery(keyword: string, location: string): string {
  const fullLocation = location.trim();

  const prepositionRegex = /\b(in|at|near|around|within|beside|by|on|upon)\s+\w+/i;

  if (prepositionRegex.test(keyword)) {
    return `${keyword} ${fullLocation}`;
  }

  return `${keyword} in ${fullLocation}`;
}


/**
 * Fetch one page of Places Text Search results.
 * For page tokens: waits must happen BEFORE calling this, not after.
 */
async function fetchPlacesPage(
  query: string,
  apiKey: string,
  pageToken?: string
): Promise<{ results: PlacesResult[]; nextPageToken?: string }> {

  const buildUrl = () => {
    const params = new URLSearchParams({ key: apiKey });
    if (pageToken) {
      params.set("pagetoken", pageToken);
    } else {
      params.set("query", query);
    }
    return `${PLACES_BASE}?${params}`;
  };

  const fetchOnce = async () => {
    const url = buildUrl();

    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Places API HTTP ${res.status}: ${txt}`);
    }
    return res.json();
  };

  let data = await fetchOnce();

  // Handle pagination token not ready (common issue)
  if (pageToken && (data.status === "INVALID_REQUEST" ||
    (data.status === "OK" && !data.next_page_token && data.results?.length === 20))) {

    const startTime = Date.now();
    const MAX_WAIT_MS = 15_000; // 15 seconds max wait
    let attempt = 0;

    while ((data.status === "INVALID_REQUEST" ||
      (data.status === "OK" && !data.next_page_token && data.results?.length === 20)) &&
      (Date.now() - startTime) < MAX_WAIT_MS) {
      attempt++;
      const delayMs = Math.min(2000 * attempt, 8000); // 2s, 4s, 6s, 8s
      console.log(`Retry ${attempt} — waiting ${delayMs}ms for token activation...`);
      await delay(delayMs);
      data = await fetchOnce();
    }
  }

  if (data.status === "ZERO_RESULTS") return { results: [] };

  if (data.status !== "OK") {
    console.error(`Places API error: ${data.status} — ${data.error_message ?? ""}`);
    return { results: [] };
  }

  // Log pagination info for debugging
  if (data.next_page_token) {
    console.log(`✓ Has next page token (first 20 chars): ${data.next_page_token.substring(0, 20)}...`);
  } else {
    console.log(`✗ No next page token. Results: ${data.results?.length || 0}/20 on this page`);
  }

  return {
    results: (data.results ?? []) as PlacesResult[],
    nextPageToken: data.next_page_token as string | undefined,
  };
}

/**
 * Search up to MAX_PAGES of Places results for businessName.
 *
 * Key timing rule: we wait PAGE_DELAY_MS BEFORE using a page token,
 * not after receiving it. This ensures the token is active on Google's side.
 */
async function findLocalRank(
  keyword: string,
  location: string,
  businessName: string,
  apiKey: string
): Promise<{ rank: number; result: PlacesResult } | null> {
  const query = buildSearchQuery(keyword, location);
  let pageToken: string | undefined;
  let offset = 0;

  for (let page = 0; page < MAX_PAGES; page++) {
    // SINGLE delay — bumped to 5000ms (sweet spot for most cases)
    if (page > 0 && pageToken) {
      await delay(5000);
    }

    const { results, nextPageToken } = await fetchPlacesPage(
      query,
      apiKey,
      page > 0 ? pageToken : undefined
    );

    for (let i = 0; i < results.length; i++) {
      if (isNameMatch(results[i].name, businessName)) {
        return { rank: offset + i + 1, result: results[i] };
      }
    }

    offset += results.length;

    if (!nextPageToken) {
      break;
    }
    pageToken = nextPageToken;
  }

  return null;
}

// ─── Core rank update ──────────────────────────────────────────────────────────

async function performSerpUpdate(
  query: string,
  location: string,
  targetDomain: string | null,
  userId: string,
  previousRank: number | null,
  locationId: string = "default",
  businessName: string
): Promise<KeywordRankData> {
  await enforceUserRateLimit(userId);

  const apiKey = process.env.PLACES_KEY;
  if (!apiKey) throw new Error("PLACES_KEY environment variable is not set");

  // Attempt rank lookup — failures degrade to NOT_FOUND, never crash
  let match: { rank: number; result: PlacesResult } | null = null;
  try {
    match = await retryWithBackoff(
      () => findLocalRank(query, location, businessName, apiKey),
      `Places rank: ${query}`
    );
  } catch (err) {
    console.error(`Places lookup failed for "${query}", storing as NOT_FOUND:`, err);
  }

  const currentRank = match?.rank ?? null;
  const title_found = match?.result.name ?? null;
  const snippet_found = match?.result.formatted_address ?? null;

  let rankChange: KeywordRankData["rankChange"] = "NOT_FOUND";
  let rankChangeValue = 0;

  if (currentRank !== null && previousRank !== null) {
    const diff = previousRank - currentRank;
    if (diff > 0) { rankChange = "UP"; rankChangeValue = diff; }
    else if (diff < 0) { rankChange = "DOWN"; rankChangeValue = Math.abs(diff); }
    else { rankChange = "SAME"; }
  } else if (currentRank !== null) {
    rankChange = "NEW";
  }

  await prisma.keywordRank.create({
    data: {
      keyword: query,
      location,
      locationId,
      userId,
      targetDomain,
      rank: currentRank,
      previousRank,
      rankChange,
      rankChangeValue,
      url: null,
      title: title_found,
      snippet: snippet_found,
      searchResults: "[]",
      totalResults: BigInt(0),
      searchTime: 0,
      batchId: null,
    },
  });

  return {
    locationId,
    keyword: query,
    location,
    currentRank,
    previousRank,
    rankChange,
    rankChangeValue,
    url: null,
    title: title_found,
    snippet: snippet_found,
    canUpdate: true,
    // "pending" signals the frontend: no countdown until batch runs
    nextUpdateTime: "pending",
    timeUntilUpdate: -1,
  };
}

// ─── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    if (!process.env.PLACES_KEY) {
      return NextResponse.json(
        { error: "PLACES_KEY is not configured" },
        { status: 401 }
      );
    }

    const user = await stackServerApp.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { limited, reset } = await checkRateLimit('ai', getIdentifier(req.headers));

    if (limited) {
      const retryAfter = reset ? Math.ceil((reset - Date.now()) / 1000) : 60;
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const userId = user.id;

    // ── 1. Parse body first ───────────────────────────────────────────────────
    const {
      businessName,
      keywords,
      keyword,
      location,
      targetDomain,
      refreshRate = 48,
      locationId,
    } = await req.json();

    if (!locationId || typeof locationId !== "string") {
      return NextResponse.json(
        { error: "locationId is required" },
        { status: 400 }
      )
    }

    const keywordList: string[] = keywords ?? (keyword ? [keyword] : []);

    if (!keywordList.length) {
      return NextResponse.json(
        { error: "keywords array or keyword is required" },
        { status: 400 }
      );
    }

    if (!location || typeof location !== "string") {
      return NextResponse.json(
        { error: "location is required and must be a string" },
        { status: 400 }
      );
    }

    // ── 2. Check plan limit against active keyword count ──────────────────────
    const [activeCount, subscription] = await Promise.all([
      prisma.keywordTracking.count({
        where: { userId, isActive: true, locationId }
      }),
      prisma.subscription.findUnique({
        where: { stackUserId: userId }
      })
    ])

    if (!subscription) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 403 }
      )
    }

    const limit = getPlanLimits(subscription.plan.toLowerCase() as PlanId).keywordTracking
    const slotsAvailable = limit - activeCount

    if (keywordList.length > slotsAvailable) {
      return NextResponse.json({
        error: slotsAvailable <= 0
          ? `Keyword limit reached (${limit}). Remove existing keywords to add more.`
          : `Only ${slotsAvailable} keyword slot(s) remaining. You tried to add ${keywordList.length}.`
      }, { status: 403 })
    }

    // ── 3. Process keywords ───────────────────────────────────────────────────
    const finalBusinessName: string = businessName || "Unknown Business";
    const normalizedLocation = location.trim();
    const results = [];

    for (const currentKeyword of keywordList) {
      if (!currentKeyword || typeof currentKeyword !== "string") continue;
      const trimmedKeyword = currentKeyword.trim();

      // Create tracking entry
      // NOTE: lastChecked intentionally omitted — batch runner sets this
      let trackingEntry;
      try {
        trackingEntry = await prisma.keywordTracking.create({
          data: {
            keyword: trimmedKeyword,
            location: normalizedLocation,
            locationId,
            userId,
            targetDomain: targetDomain ?? null,
            refreshRate,
            isActive: true,
          },
        });
      } catch (e) {
        console.error("❌ Failed to create tracking entry:", e);
        results.push({
          keyword: trimmedKeyword,
          success: false,
          error: "Failed to create tracking entry",
        });
        continue;
      }

      // Fetch initial rank for immediate display
      // Does NOT set lastChecked — timer starts only after first batch run
      let rankResult;
      try {
        const rankData = await performSerpUpdate(
          trimmedKeyword,
          normalizedLocation,
          targetDomain ?? null,
          userId,
          null,
          locationId,
          finalBusinessName
        );
        rankResult = { ...rankData, keyword: trimmedKeyword, success: true };
      } catch (e) {
        console.error(`❌ Rank fetch failed for "${trimmedKeyword}":`, e);
        rankResult = {
          keyword: trimmedKeyword,
          success: false,
          error: e instanceof Error ? e.message : "Failed to fetch rank",
        };
      }

      results.push({
        keyword: trimmedKeyword,
        trackingEntry,
        currentRank: rankResult,
        metadata: {
          isNewKeyword: true,
          originalLocation: location,
          formattedLocation: normalizedLocation,
          locationId,
          updateType: "initial",
          note: "Timer starts only after first batch run",
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${results.length} keyword(s) for ${finalBusinessName}`,
      data: {
        businessName: finalBusinessName,
        results,
        updateInfo: {
          refreshRate,
          lastUpdated: new Date().toISOString(),
          updateType: "initial",
          note: "Rankings sourced from Google Places Text Search. Batch countdown starts after first batch run.",
        },
      },
    });

  } catch (error: any) {
    console.error("❌ POST Error:", error);
    return NextResponse.json(
      { error: "Failed to process keyword tracking request", details: error.message },
      { status: 500 }
    );
  }
}

// ─── Batch bulk update (called by your batch runner, not by the user) ──────────

export async function updateKeywordRanks(
  userId: string,
  keywordIds?: string[]
) {
  const whereClause =
    keywordIds?.length
      ? { userId, isActive: true, id: { in: keywordIds } }
      : { userId, isActive: true };

  const keywordsToUpdate = await prisma.keywordTracking.findMany({
    where: whereClause,
  });

  if (!keywordsToUpdate.length) {
    return { success: false, message: "No active keywords found to update" };
  }

  const results = [];

  for (const tracking of keywordsToUpdate) {
    try {
      const latestRank = await prisma.keywordRank.findFirst({
        where: { keyword: tracking.keyword, location: tracking.location, userId },
        orderBy: { createdAt: "desc" },
      });

      const businessName =
        tracking.locationId.split("_")[0]?.replace(/_/g, " ") ?? "Unknown Business";

      const rankData = await performSerpUpdate(
        tracking.keyword,
        tracking.location,
        tracking.targetDomain,
        userId,
        latestRank?.rank ?? null,
        tracking.locationId,
        businessName
      );

      // ✅ Only the batch runner sets lastChecked — this starts the 48h countdown
      await prisma.keywordTracking.update({
        where: { id: tracking.id },
        data: {
          lastChecked: new Date(),
          nextBatchUpdate: new Date(Date.now() + 48 * 60 * 60 * 1000),
        },
      });

      results.push({ keyword: tracking.keyword, success: true, ...rankData });
    } catch (e) {
      console.error(`Failed to update "${tracking.keyword}":`, e);
      results.push({
        keyword: tracking.keyword,
        success: false,
        error: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.length - successCount;

  return {
    success: true,
    message: `Updated ${successCount} keyword(s)${failCount > 0 ? `, ${failCount} failed` : ""}`,
    results,
    stats: { total: results.length, successful: successCount, failed: failCount },
  };



}