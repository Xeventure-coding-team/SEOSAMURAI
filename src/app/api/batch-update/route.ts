import { NextResponse } from "next/server";
import { stackServerApp } from "@/stack";
import { prisma } from "../../../../lib/prisma";

// Types
interface KeywordRankData {
  locationId: string;
  keyword: string;
  location: string;
  currentRank: number | null;
  previousRank: number | null;
  rankChange: 'UP' | 'DOWN' | 'NEW' | 'SAME' | 'NOT_FOUND';
  rankChangeValue: number;
  url: string | null;
  title: string | null;
  snippet: string | null;
  canUpdate: boolean;
  nextUpdateTime: string;
  timeUntilUpdate: number;
}

interface BatchProgress {
  batchId: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  totalKeywords: number;
  processedKeywords: number;
  failedKeywords: number;
  currentKeyword?: string;
  estimatedTimeRemaining?: number;
  progress: number;
  results: any[];
}

// Rate limiting configuration
const RATE_LIMIT = {
  MIN_DELAY_MS: 15000,       // Minimum 15 seconds between requests (increased)
  MAX_DELAY_MS: 25000,       // Maximum 25 seconds between requests
  RETRY_ATTEMPTS: 4,         // Number of retry attempts (increased)
  INITIAL_BACKOFF_MS: 10000, // Initial backoff delay (increased)
  MAX_BACKOFF_MS: 120000,    // Maximum backoff delay (2 minutes)
  BACKOFF_MULTIPLIER: 2.5,   // Exponential backoff multiplier (increased)
};

// In-memory store for batch progress
const batchProgress = new Map<string, BatchProgress>();

// Rate limiting tracker per user
const userRequestTracker = new Map<string, number>();

function validateApiKey(): boolean {
  return true; // Replace with actual validation
}

function formatLocationForSERP(location: string): string {
  return location;
}

// Utility function with jitter for random delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const delayWithJitter = (baseMs: number, jitterMs: number = 2000) => {
  const jitter = Math.random() * jitterMs;
  return delay(baseMs + jitter);
};

// Check if we need to rate limit for a user
async function enforceUserRateLimit(userId: string): Promise<void> {
  const lastRequestTime = userRequestTracker.get(userId) || 0;
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < RATE_LIMIT.MIN_DELAY_MS) {
    const waitTime = RATE_LIMIT.MIN_DELAY_MS - timeSinceLastRequest;
    await delay(waitTime);
  }
  
  userRequestTracker.set(userId, Date.now());
}

// Exponential backoff retry wrapper
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  context: string,
  maxRetries: number = RATE_LIMIT.RETRY_ATTEMPTS
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const backoffTime = Math.min(
          RATE_LIMIT.INITIAL_BACKOFF_MS * Math.pow(RATE_LIMIT.BACKOFF_MULTIPLIER, attempt - 1),
          RATE_LIMIT.MAX_BACKOFF_MS
        );
        await delay(backoffTime);
      }
      
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if it's a rate limit error
      const is429Error = lastError.message.includes('429') || 
                         lastError.message.toLowerCase().includes('too many requests') ||
                         lastError.message.toLowerCase().includes('rate limit');
      
      const is500Error = lastError.message.includes('500');
      const is503Error = lastError.message.includes('503');
      
      // Only retry on rate limit or server errors
      if (is429Error || is500Error || is503Error) {
        if (attempt === maxRetries - 1) {
          throw new Error(`Max retries reached for ${context}: ${lastError.message}`);
        }
        
        // If it's a 429, add extra delay
        if (is429Error && attempt < maxRetries - 1) {
          await delay(30000); // Extra 30 second cooldown
        }
        
        // Continue to next retry attempt
        continue;
      } else {
        // For non-retryable errors, throw immediately
        throw lastError;
      }
    }
  }
  
  throw lastError || new Error(`Failed after ${maxRetries} attempts`);
}

export async function POST(req: Request) {
  try {

    if (!validateApiKey()) {
      return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
    }

    const user = await stackServerApp.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;
    const { businessName, location, keywordIds, locationId } = await req.json();
    
    const whereClause: any = keywordIds && keywordIds.length > 0
      ? { userId, isActive: true, id: { in: keywordIds } }
      : { userId, isActive: true };

    if (locationId) {
      whereClause.locationId = locationId;
    }

    const keywordsToUpdate = await prisma.keywordTracking.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });

    if (keywordsToUpdate.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No active keywords found to update"
      }, { status: 404 });
    }

    await prisma.batchUpdate.deleteMany({});
    
    const batchUpdate = await prisma.batchUpdate.create({
      data: {
        status: 'RUNNING',
        totalKeywords: keywordsToUpdate.length,
        processedKeywords: 0,
        failedKeywords: 0,
        startedAt: new Date()
      }
    });

    // Calculate more realistic estimated time with delays and retries
    const avgTimePerKeyword = 12; // 8s delay + 4s for processing and potential retries
    batchProgress.set(batchUpdate.id, {
      batchId: batchUpdate.id,
      status: 'RUNNING',
      totalKeywords: keywordsToUpdate.length,
      processedKeywords: 0,
      failedKeywords: 0,
      progress: 0,
      results: [],
      estimatedTimeRemaining: keywordsToUpdate.length * avgTimePerKeyword
    });

    // Start processing asynchronously
    processBatchAsync(batchUpdate.id, keywordsToUpdate, userId, businessName, location);

    return NextResponse.json({
      success: true,
      message: `Batch update started for ${keywordsToUpdate.length} keywords`,
      data: {
        batchId: batchUpdate.id,
        totalKeywords: keywordsToUpdate.length,
        estimatedDuration: Math.ceil((keywordsToUpdate.length * avgTimePerKeyword) / 60), // minutes
        status: 'RUNNING',
        note: 'Processing with rate limiting to avoid API throttling'
      }
    });

  } catch (error: any) {
    console.error("❌ Batch Update Error:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to start batch update",
      details: error.message
    }, { status: 500 });
  }
}

// Async function to process batch with delays and rate limiting
async function processBatchAsync(
  batchId: string,
  keywordsToUpdate: any[],
  userId: string,
  businessName: string,
  location: string
) {
  const results = [];
  let successCount = 0;
  let failCount = 0;
  const startTime = Date.now();

  try {
    for (let i = 0; i < keywordsToUpdate.length; i++) {
      const tracking = keywordsToUpdate[i];
      const isLastKeyword = i === keywordsToUpdate.length - 1;

      try {
        // Update progress with current keyword
        const currentProgress = batchProgress.get(batchId);
        if (currentProgress) {
          const elapsedSeconds = (Date.now() - startTime) / 1000;
          const avgTimePerKeyword = elapsedSeconds / (i + 1);
          const remainingKeywords = keywordsToUpdate.length - (i + 1);

          currentProgress.currentKeyword = tracking.keyword;
          currentProgress.estimatedTimeRemaining = Math.ceil(remainingKeywords * avgTimePerKeyword);
          batchProgress.set(batchId, currentProgress);
        }

        // Enforce rate limiting before making request
        await enforceUserRateLimit(userId);

        // Get the latest rank for comparison
        const latestRank = await prisma.keywordRank.findFirst({
          where: {
            keyword: tracking.keyword,
            location: tracking.location,
            userId,
          },
          orderBy: { createdAt: 'desc' }
        });

        let finalBusinessName = businessName || "Unknown Business";

        // Use retry with backoff for the API call
        const rankData = await retryWithBackoff(
          () => performSerpUpdate(
            tracking.keyword,
            tracking.location,
            tracking.targetDomain,
            userId,
            latestRank?.rank || null,
            tracking.locationId,
            finalBusinessName,
            batchId
          ),
          `keyword: ${tracking.keyword}`
        );

        // Update lastChecked timestamp
        await prisma.keywordTracking.update({
          where: { id: tracking.id },
          data: { lastChecked: new Date() }
        });

        const result = {
          keyword: tracking.keyword,
          location: tracking.location,
          success: true,
          processedAt: new Date().toISOString(),
          ...rankData
        };

        results.push(result);
        successCount++;

        // Update progress
        const progress = Math.round(((i + 1) / keywordsToUpdate.length) * 100);
        const currentProgressState = batchProgress.get(batchId);
        if (currentProgressState) {
          currentProgressState.processedKeywords = i + 1;
          currentProgressState.progress = progress;
          currentProgressState.results = [...results];
          batchProgress.set(batchId, currentProgressState);
        }

        // Add delay between API calls with jitter (except for the last keyword)
        if (!isLastKeyword) {
          const delayTime = RATE_LIMIT.MIN_DELAY_MS;          
          await delayWithJitter(delayTime, 2000);
        }

      } catch (error) {
        const errorResult = {
          keyword: tracking.keyword,
          location: tracking.location,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          processedAt: new Date().toISOString()
        };

        results.push(errorResult);
        failCount++;

        // Update progress even on error
        const progress = Math.round(((i + 1) / keywordsToUpdate.length) * 100);
        const currentProgressState = batchProgress.get(batchId);
        if (currentProgressState) {
          currentProgressState.processedKeywords = i + 1;
          currentProgressState.failedKeywords = failCount;
          currentProgressState.progress = progress;
          currentProgressState.results = [...results];
          batchProgress.set(batchId, currentProgressState);
        }

        // Add a longer delay after error to cool down
        if (!isLastKeyword) {
            await delay(10000);
        }
      }

      // Update database progress
      await prisma.batchUpdate.update({
        where: { id: batchId },
        data: {
          processedKeywords: i + 1,
          failedKeywords: failCount
        }
      });
    }

    // Mark batch as completed
    const finalStatus = failCount === keywordsToUpdate.length ? 'FAILED' : 'COMPLETED';

    await prisma.batchUpdate.update({
      where: { id: batchId },
      data: {
        status: finalStatus,
        completedAt: new Date(),
        errorMessage: failCount > 0 ? `${failCount} keywords failed to update` : null
      }
    });

    const finalProgress = batchProgress.get(batchId);
    if (finalProgress) {
      finalProgress.status = finalStatus;
      finalProgress.estimatedTimeRemaining = 0;
      batchProgress.set(batchId, finalProgress);
    }
  } catch (error) {    
    await prisma.batchUpdate.update({
      where: { id: batchId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown fatal error'
      }
    });

    const failedProgress = batchProgress.get(batchId);
    if (failedProgress) {
      failedProgress.status = 'FAILED';
      batchProgress.set(batchId, failedProgress);
    }
  }
}

// GET method to check batch update progress
export async function GET(req: Request) {
  try {
    const user = await stackServerApp.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const batchId = searchParams.get('batchId');

    if (batchId) {
      const progressData = batchProgress.get(batchId);

      if (progressData) {
        return NextResponse.json({
          success: true,
          data: progressData
        });
      }

      const batchUpdate = await prisma.batchUpdate.findUnique({
        where: { id: batchId }
      });

      if (!batchUpdate) {
        return NextResponse.json({ error: "Batch update not found" }, { status: 404 });
      }

      const results = await prisma.keywordRank.findMany({
        where: { batchId: batchId },
        orderBy: { createdAt: 'asc' }
      });

      return NextResponse.json({
        success: true,
        data: {
          batchId: batchUpdate.id,
          status: batchUpdate.status,
          totalKeywords: batchUpdate.totalKeywords,
          processedKeywords: batchUpdate.processedKeywords,
          failedKeywords: batchUpdate.failedKeywords,
          progress: Math.round((batchUpdate.processedKeywords / batchUpdate.totalKeywords) * 100),
          results: results.map(r => ({
            keyword: r.keyword,
            success: r.rank !== null,
            currentRank: r.rank,
            previousRank: r.previousRank,
            rankChange: r.rankChange,
            processedAt: r.createdAt.toISOString()
          })),
          startedAt: batchUpdate.startedAt?.toISOString(),
          completedAt: batchUpdate.completedAt?.toISOString()
        }
      });

    } else {
      const recentBatches = await prisma.batchUpdate.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      return NextResponse.json({
        success: true,
        data: recentBatches
      });
    }

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: "Failed to get batch update status",
      details: error.message
    }, { status: 500 });
  }
}


// SERP Update function with timeout
async function performSerpUpdate(
  query: string,
  location: string,
  targetDomain: string | null,
  userId: string,
  previousRank: number | null,
  locationId: string = "default",
  businessName: string,
  batchId: string
): Promise<KeywordRankData> {

  if (!process.env.X_API_KEY) {
    throw new Error("X_API_KEY environment variable is not set");
  }

  const url = `https://xenproductions.co.in/x7p9s3-check/api/local-rank/check`;
  const formattedLocation = formatLocationForSERP(location);

  const requestBody = {
    keyword: query,
    location: formattedLocation,
    businessName: businessName,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': process.env.X_API_KEY!,
      },
      body: JSON.stringify(requestBody),
      cache: "no-store",
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SERP API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      const errorText = await response.text();
      console.error("❌ API returned non-JSON response:", errorText);
      throw new Error("SERP API returned invalid response");
    }

    const data = await response.json();

    if (!data.success) {
        throw new Error(`SERP API error: ${data.message || 'Unknown API error'}`);
    }

    let currentRank = data.found ? data.rank : null;
    let url_found = null;
    let title_found = null;
    let snippet_found = null;

    if (data.found && currentRank) {
      url_found = null;
      title_found = businessName;
      snippet_found = data.message || null;
    }

    let rankChange: 'UP' | 'DOWN' | 'NEW' | 'SAME' | 'NOT_FOUND' = 'NOT_FOUND';
    let rankChangeValue = 0;

    if (currentRank && previousRank) {
      const diff = previousRank - currentRank;
      if (diff > 0) {
        rankChange = 'UP';
        rankChangeValue = diff;
      } else if (diff < 0) {
        rankChange = 'DOWN';
        rankChangeValue = Math.abs(diff);
      } else {
        rankChange = 'SAME';
      }
    } else if (currentRank && !previousRank) {
      rankChange = 'NEW';
    }

    const searchResultsToStore = data.competitors
      ? data.competitors.map((competitor: string, index: number) => ({
        position: index + 1,
        title: competitor,
        link: null,
        snippet: null
      }))
      : [];

      console.log(data);
      
    await prisma.keywordRank.create({
      data: {
        keyword: query,
        location: formattedLocation,
        locationId,
        userId,
        targetDomain,
        rank: currentRank,
        previousRank,
        rankChange,
        rankChangeValue,
        url: url_found,
        title: title_found,
        snippet: snippet_found,
        searchResults: JSON.stringify(searchResultsToStore),
        totalResults: BigInt(data.total || 0),
        searchTime: 0,
        batchId: batchId
      }
    });

    return {
      locationId,
      keyword: query,
      location: formattedLocation,
      currentRank,
      previousRank,
      rankChange,
      rankChangeValue,
      url: url_found,
      title: title_found,
      snippet: snippet_found,
      canUpdate: true,
      nextUpdateTime: 'Manual update',
      timeUntilUpdate: 0
    };

  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`API request timeout for keyword: ${query}`);
    }
    throw error;
  }
}

async function performSerpUpdateSingle(
  query: string,
  location: string,
  targetDomain: string | null,
  userId: string,
  previousRank: number | null,
  locationId: string = "default",
  businessName: string
): Promise<KeywordRankData> {

  // Use the same retry logic for single updates
  return retryWithBackoff(
    async () => {
      await enforceUserRateLimit(userId);
      
      if (!process.env.X_API_KEY) {
        throw new Error("X_API_KEY environment variable is not set");
      }

      const url = `https://xenproductions.co.in/x7p9s3-check/api/local-rank/check`;
      const formattedLocation = formatLocationForSERP(location);

      let finalBusinessName = businessName;

      const requestBody = {
        keyword: query,
        location: formattedLocation,
        businessName: finalBusinessName,
      };

      console.log(`📡 Single keyword update for ${query}:`, requestBody);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': process.env.X_API_KEY!,
          },
          body: JSON.stringify(requestBody),
          cache: "no-store",
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`SERP API request failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const contentType = response.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
          const errorText = await response.text();
          console.error("❌ API returned non-JSON response:", errorText);
          throw new Error("SERP API returned invalid response");
        }

        const data = await response.json();

        if (!data.success) {
          console.error(`SERP API error:`, data.message);
          throw new Error(`SERP API error: ${data.message || 'Unknown API error'}`);
        }

        let currentRank = data.found ? data.rank : null;
        let url_found = null;
        let title_found = null;
        let snippet_found = null;

        if (data.found && currentRank) {
          url_found = null;
          title_found = finalBusinessName;
          snippet_found = data.message || null;
        }

        let rankChange: 'UP' | 'DOWN' | 'NEW' | 'SAME' | 'NOT_FOUND' = 'NOT_FOUND';
        let rankChangeValue = 0;

        if (currentRank && previousRank) {
          const diff = previousRank - currentRank;
          if (diff > 0) {
            rankChange = 'UP';
            rankChangeValue = diff;
          } else if (diff < 0) {
            rankChange = 'DOWN';
            rankChangeValue = Math.abs(diff);
          } else {
            rankChange = 'SAME';
          }
        } else if (currentRank && !previousRank) {
          rankChange = 'NEW';
        }

        const searchResultsToStore = data.competitors
          ? data.competitors.map((competitor: string, index: number) => ({
            position: index + 1,
            title: competitor,
            link: null,
            snippet: null
          }))
          : [];

        await prisma.keywordRank.create({
          data: {
            keyword: query,
            location: formattedLocation,
            locationId,
            userId,
            targetDomain,
            rank: currentRank,
            previousRank,
            rankChange,
            rankChangeValue,
            url: url_found,
            title: title_found,
            snippet: snippet_found,
            searchResults: JSON.stringify(searchResultsToStore),
            totalResults: BigInt(data.total || 0),
            searchTime: 0,
            batchId: null
          }
        });

        return {
          locationId,
          keyword: query,
          location: formattedLocation,
          currentRank,
          previousRank,
          rankChange,
          rankChangeValue,
          url: url_found,
          title: title_found,
          snippet: snippet_found,
          canUpdate: true,
          nextUpdateTime: 'Manual update',
          timeUntilUpdate: 0
        };

      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error(`API request timeout for keyword: ${query}`);
        }
        throw error;
      }
    },
    `single keyword: ${query}`
  );
}

export async function PUT(req: Request) {
  try {
    const user = await stackServerApp.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const { keyword, refreshRate, targetDomain, isActive , businessName } = body;

    const url = new URL(req.url);
    const urlId = url.searchParams.get('id');

    if (!urlId) {
      return NextResponse.json(
        { error: "Missing keyword ID in URL" },
        { status: 400 }
      );
    }

    const keywordRecord = await prisma.keywordTracking.findFirst({
      where: {
        id: urlId,
        userId: user.id
      },
    });

    if (!keywordRecord) {
      return NextResponse.json(
        { error: "Keyword not found or unauthorized" },
        { status: 404 }
      );
    }

    const updateData: any = { updatedAt: new Date() };
    if (keyword !== undefined) updateData.keyword = keyword;
    if (refreshRate !== undefined) updateData.refreshRate = refreshRate;
    if (targetDomain !== undefined) updateData.targetDomain = targetDomain;
    if (isActive !== undefined) updateData.isActive = isActive;

    let updatedKeywordRecord = keywordRecord;

    if (Object.keys(updateData).length > 1) {
      updatedKeywordRecord = await prisma.keywordTracking.update({
        where: { id: urlId },
        data: updateData,
      });
    }

    let finalBusinessName = businessName;

    const latestRank = await prisma.keywordRank.findFirst({
      where: {
        keyword: updatedKeywordRecord.keyword,
        location: updatedKeywordRecord.location,
        userId: user.id,
      },
      orderBy: { createdAt: "desc" },
    });

    const rankData = await performSerpUpdateSingle(
      updatedKeywordRecord.keyword,
      updatedKeywordRecord.location,
      updatedKeywordRecord.targetDomain,
      user.id,
      latestRank?.rank || null,
      updatedKeywordRecord.locationId,
      finalBusinessName
    );

    return NextResponse.json({
      success: true,
      message: "Keyword updated and rank refreshed",
      data: rankData,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to update keyword",
        details: error instanceof Error ? error.message : error,
      },
      { status: 500 }
    );
  }
}