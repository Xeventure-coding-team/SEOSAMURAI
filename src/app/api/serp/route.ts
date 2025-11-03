import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { stackServerApp } from "@/stack";

interface SerpResult {
    position: number;
    title: string;
    link: string;
    snippet?: string;
}

interface KeywordRankData {
    keyword: string;
    location: string;
    locationId: string;
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

// Rate limiting configuration
const RATE_LIMIT = {
  MIN_DELAY_MS: 15000,
  MAX_DELAY_MS: 25000,
  RETRY_ATTEMPTS: 4,
  INITIAL_BACKOFF_MS: 10000,
  MAX_BACKOFF_MS: 120000,
  BACKOFF_MULTIPLIER: 2.5,
};

// Rate limiting tracker per user
const userRequestTracker = new Map<string, number>();

function formatLocationForSERP(location: string): string {
  return location;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const delayWithJitter = (baseMs: number, jitterMs: number = 2000) => {
  const jitter = Math.random() * jitterMs;
  return delay(baseMs + jitter);
};

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
      
      const is429Error = lastError.message.includes('429') || 
                         lastError.message.toLowerCase().includes('too many requests') ||
                         lastError.message.toLowerCase().includes('rate limit');
      
      const is500Error = lastError.message.includes('500');
      const is503Error = lastError.message.includes('503');
      
      if (is429Error || is500Error || is503Error) {
        if (attempt === maxRetries - 1) {
          throw new Error(`Max retries reached for ${context}: ${lastError.message}`);
        }
        
        if (is429Error && attempt < maxRetries - 1) {
          await delay(30000);
        }
        
        continue;
      } else {
        throw lastError;
      }
    }
  }
  
  throw lastError || new Error(`Failed after ${maxRetries} attempts`);
}

function validateApiKey(): boolean {
    return !!process.env.X_API_KEY;
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

        const { businessName, keywords, keyword, location, targetDomain, refreshRate = 48, locationId } = await req.json();

        const keywordList = keywords || (keyword ? [keyword] : []);

        if (!keywordList || keywordList.length === 0) {
            return NextResponse.json({ error: "keywords array or keyword is required" }, { status: 400 });
        }

        const finalBusinessName = businessName || "Unknown Business";

        if (!location || typeof location !== 'string') {
            return NextResponse.json({ error: "location is required and must be a string" }, { status: 400 });
        }

        // FIX: Normalize location consistently
        const normalizedLocation = location.trim();

        const results = [];
        const duplicates = [];

        for (const currentKeyword of keywordList) {
            if (!currentKeyword || typeof currentKeyword !== 'string') {
                console.log(`⚠️ Skipping invalid keyword: ${currentKeyword}`);
                continue;
            }

            const trimmedKeyword = currentKeyword.trim();

            let trackingEntry;

            try {
                // Create new tracking entry (not upsert, since we checked for duplicates)
                trackingEntry = await prisma.keywordTracking.create({
                    data: {
                        keyword: trimmedKeyword,
                        location: normalizedLocation,
                        locationId,
                        userId,
                        targetDomain: targetDomain || null,
                        refreshRate,
                        isActive: true,
                    }
                });

            } catch (createError) {
                console.error(`❌ Failed to create tracking entry:`, createError);
                results.push({
                    keyword: trimmedKeyword,
                    success: false,
                    error: "Failed to create tracking entry"
                });
                continue;
            }

            let rankResult = null;

            // FIX: Fetch initial rank on creation
            try {
                const rankData = await performSerpUpdate(
                    trimmedKeyword,
                    normalizedLocation,
                    targetDomain || null,
                    userId,
                    null, // No previous rank for new keywords
                    locationId,
                    finalBusinessName
                );

                // Update lastChecked after successful rank fetch
                await prisma.keywordTracking.update({
                    where: { id: trackingEntry.id },
                    data: { lastChecked: new Date() }
                });

                rankResult = {
                    ...rankData,
                    keyword: trimmedKeyword,
                    success: true
                };
            } catch (error) {
                console.error(`❌ Failed to fetch initial rank for keyword "${trimmedKeyword}":`, error);
                rankResult = {
                    keyword: trimmedKeyword,
                    success: false,
                    error: error instanceof Error ? error.message : "Failed to fetch current rank"
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
                    lastChecked: new Date().toISOString(),
                    updateType: 'manual'
                }
            });
        }

        // Prepare response with duplicate information
        const responseData: any = {
            success: true,
            message: `Successfully processed ${results.length} keyword(s) for ${finalBusinessName}`,
            data: {
                businessName: finalBusinessName,
                results,
                updateInfo: {
                    refreshRate: refreshRate,
                    lastUpdated: new Date().toISOString(),
                    updateType: 'manual',
                    note: "Keywords are updated manually when you press the update button"
                }
            }
        };

        // Add duplicate information if any were found
        if (duplicates.length > 0) {
            responseData.duplicates = duplicates;
            responseData.message += `. ${duplicates.length} duplicate(s) skipped.`;
        }

        return NextResponse.json(responseData);

    } catch (error: any) {
        console.error("❌ POST Error:", error);
        console.error("Error stack:", error.stack);
        return NextResponse.json({
            error: "Failed to process keyword tracking request",
            details: error.message
        }, { status: 500 });
    }
}

async function performSerpUpdate(
  query: string,
  location: string,
  targetDomain: string | null,
  userId: string,
  previousRank: number | null,
  locationId: string = "default",
  businessName: string
): Promise<KeywordRankData> {

  return retryWithBackoff(
    async () => {
      await enforceUserRateLimit(userId);
      
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

// Manual rank update function
export async function updateKeywordRanks(userId: string, keywordIds?: string[]) {
    try {
        const whereClause = keywordIds && keywordIds.length > 0 
            ? { userId, isActive: true, id: { in: keywordIds } }
            : { userId, isActive: true };

        const keywordsToUpdate = await prisma.keywordTracking.findMany({
            where: whereClause
        });

        if (keywordsToUpdate.length === 0) {
            return {
                success: false,
                message: "No active keywords found to update"
            };
        }

        const results = [];

        for (const tracking of keywordsToUpdate) {
            try {
                const latestRank = await prisma.keywordRank.findFirst({
                    where: {
                        keyword: tracking.keyword,
                        location: tracking.location,
                        userId,
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                });

                const businessName = tracking.locationId.split('_')[0]?.replace(/_/g, ' ') || "Unknown Business";

                const rankData = await performSerpUpdate(
                    tracking.keyword,
                    tracking.location,
                    tracking.targetDomain,
                    userId,
                    latestRank?.rank || null,
                    tracking.locationId,
                    businessName
                );

                await prisma.keywordTracking.update({
                    where: { id: tracking.id },
                    data: { lastChecked: new Date() }
                });

                results.push({
                    keyword: tracking.keyword,
                    success: true,
                    ...rankData
                });

            } catch (error) {
                console.error(`Failed to update keyword ${tracking.keyword}:`, error);
                results.push({
                    keyword: tracking.keyword,
                    success: false,
                    error: error instanceof Error ? error.message : "Unknown error"
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const failCount = results.length - successCount;

        return {
            success: true,
            message: `Updated ${successCount} keywords successfully${failCount > 0 ? `, ${failCount} failed` : ''}`,
            results,
            stats: {
                total: results.length,
                successful: successCount,
                failed: failCount
            }
        };

    } catch (error) {
        console.error("Failed to update keyword ranks:", error);
        return {
            success: false,
            message: "Failed to update keyword ranks",
            error: error instanceof Error ? error.message : "Unknown error"
        };
    }
}