import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/stack";
import { prisma } from "../../../../../lib/prisma";

interface GooglePlacesResult {
  id: string;
  displayName: { text: string; languageCode: string };
  formattedAddress: string;
  location: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  types: string[];
  businessStatus?: string;
  priceLevel?: string;
  googleMapsUri: string;
  website?: string;
}

interface CompetitorData {
  id: string;
  name: string;
  address: string;
  rating?: number;
  reviewCount?: number;
  businessType: string;
  distance: number; // in meters
  googleMapsUri: string;
  rank: number; // 1, 2, 3, 4...
  lastUpdated: Date;
}

interface CompetitorRankingData {
  keyword: string;
  rank: number;
  url?: string;
  title?: string;
}

interface EnhancedCompetitor {
  id: string;
  name: string;
  domain?: string;
  address?: string;
  rating?: number;
  reviewCount?: number;
  distance?: number;
  googleMapsUri?: string;
  website?: string;
  coordinates?: { lat: number; lng: number };
  rank: number;
  keywordRankings: CompetitorRankingData[]; // New field
  averageRank?: number; // New field
  totalKeywordsRanked?: number; // New field
  bestRank: number;
  worstRank: number;
}


const BUSINESS_TYPE_MAP: Record<string, string[]> = {
  "shopping centre": ["shopping_mall", "department_store"],
  "shopping mall": ["shopping_mall", "department_store"],
  "restaurant": ["restaurant", "cafe", "food", "meal_takeaway"],
  "hospital": ["hospital", "doctor", "health"],
  "hotel": ["lodging"],
  "gym": ["gym", "health"],
  "supermarket": ["supermarket", "grocery_or_supermarket"],
  "school": ["school", "university"],
  "pharmacy": ["pharmacy", "drugstore"],
  "bank": ["bank", "finance"],
};

function isBusinessTypeMatch(placeTypes: string[], businessType: string): boolean {
  const key = businessType.toLowerCase();
  const allowed = Object.entries(BUSINESS_TYPE_MAP).find(([k]) =>
    key.includes(k)
  )?.[1];

  if (!allowed) return true; // No mapping → don't filter
  return placeTypes.some((t) => allowed.includes(t));
}


// Helper function to calculate distance between two coordinates
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Enhanced Google Places search function
async function searchGooglePlaces(
  location: { lat: number; lng: number },
  businessType: string,
  apiKey: string,
  excludeLocationId?: string
): Promise<GooglePlacesResult[]> {
  const searchRadius = 10000; // 10km radius
  const query = encodeURIComponent(businessType);

  console.log(location.lat, location.lng, "location lat");

  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.lat},${location.lng}&radius=${searchRadius}&type=establishment&key=${apiKey}&keyword=${query}`;

  console.log(
    "🔍 Google Places API URL:",
    url.replace(apiKey, "API_KEY_HIDDEN")
  );

  try {
    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Google Places API error: ${response.status} - ${errorText}`
      );
    }

    const data = await response.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("❌ Google Places API Error:", data);
      throw new Error(
        `Google Places API returned status: ${data.status} - ${data.error_message || "Unknown error"
        }`
      );
    }

    if (data.status === "ZERO_RESULTS") {
      console.log("⚠️ No results found for the search criteria");
      return [];
    }

    const results = (data.results || [])
      .filter((place: any) => {
        // Exclude the original location if provided
        if (excludeLocationId && place.place_id === excludeLocationId) {
          return false;
        }
        // Only include places with valid geometry
        return place.geometry && place.geometry.location;
      })
      .map((place: any) => ({
        id: place.place_id,
        displayName: {
          text: place.name,
          languageCode: "en",
        },
        formattedAddress:
          place.vicinity || place.formatted_address || "Address not available",
        location: {
          latitude: place.geometry?.location?.lat || 0,
          longitude: place.geometry?.location?.lng || 0,
        },
        rating: place.rating,
        userRatingCount: place.user_ratings_total,
        types: place.types || [],
        businessStatus: place.business_status,
        priceLevel: place.price_level
          ? `PRICE_LEVEL_${place.price_level}`
          : undefined,
        googleMapsUri: `https://maps.google.com/maps/place/?q=place_id:${place.place_id}`,
        website: place.website,
      }))
      .slice(0, 20); // Limit to 20 competitors

    console.log(`✅ Processed ${results.length} competitor results`);
    return results;
  } catch (error) {
    console.error("❌ Error in searchGooglePlaces:", error);
    throw new Error(`Error fetching competitors: ${error}`);
  }
}

async function enrichCompetitor(
  competitor: EnhancedCompetitor,
  searchLocation: { lat: number; lng: number },
  locationString: string,
  apiKey: string,
  businessType: string
): Promise<void> {
  try {
    const query = `${competitor.name} in ${locationString}`;
    const encodedQuery = encodeURIComponent(query);
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodedQuery}&location=${searchLocation.lat},${searchLocation.lng}&radius=30000&key=${apiKey}`; // Increased radius to 30km

    console.log(
      `🔍 Enriching ${competitor.name} with URL:`,
      url.replace(apiKey, "API_KEY_HIDDEN")
    );

    const response = await fetch(url);
    if (!response.ok) {
      console.warn(
        `⚠️ Textsearch failed for ${competitor.name}: ${response.status}`
      );
      return;
    }

    const data = await response.json();
    if (data.status === "OK" && data.results?.length > 0) {
      const place = data.results[0];

      // Stronger name match required
      const placeNameLower = place.name.toLowerCase();
      const competitorNameLower = competitor.name.toLowerCase();
      const isGoodNameMatch =
        placeNameLower.includes(competitorNameLower) ||
        competitorNameLower.includes(placeNameLower) ||
        placeNameLower.replace(/[^a-z0-9]/g, "") ===
        competitorNameLower.replace(/[^a-z0-9]/g, "");

      if (!isGoodNameMatch) {
        console.log(
          `⏭️ Skipping poor name match: "${place.name}" vs "${competitor.name}"`
        );
        return;
      }

      // Calculate distance
      if (place.geometry?.location) {
        const dist = calculateDistance(
          searchLocation.lat,
          searchLocation.lng,
          place.geometry.location.lat,
          place.geometry.location.lng
        );

        // REJECT if too far (> 50km = 50000 meters)
        const MAX_DISTANCE_METERS = 50000; // 50km max
        if (dist > MAX_DISTANCE_METERS) {
          console.log(
            `🚫 Rejecting distant match: ${place.name} (${(dist / 1000).toFixed(
              0
            )}km away)`
          );
          return;
        }

        // Only enrich if within reasonable distance
        competitor.id = place.place_id || competitor.id;
        competitor.address = place.formatted_address || competitor.address;
        competitor.rating = place.rating;
        competitor.reviewCount = place.user_ratings_total;
        competitor.googleMapsUri = `https://maps.google.com/maps/place/?q=place_id:${place.place_id}`;
        competitor.website = place.website;


        const placeTypes: string[] = place.types || [];
        if (!isBusinessTypeMatch(placeTypes, businessType)) {
          competitor.address = undefined; 
          return;
        }

        competitor.coordinates = {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
        };
        competitor.distance = dist;


      }
    }
  } catch (error) {
  }
}

// New helper: Fetch business name from Google Places using place_id (locationId)
async function getBusinessName(
  placeId: string,
  apiKey: string
): Promise<string | null> {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name&key=${apiKey}`;


  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Google Places details error: ${response.status} - ${errorText}`
      );
    }

    const data = await response.json();
    if (data.status === "OK" && data.result?.name) {
      return data.result.name;
    }
    return null;
  } catch (error) {
    console.error("❌ Error fetching business name:", error);
    return null;
  }
}

// Main function to get competitors with caching per user
async function getCompetitors(
  locationId: string,
  businessType: string,
  currentLocation: { lat: number; lng: number },
  apiKey: string,
  forceUpdate: boolean = false
): Promise<{
  competitors: CompetitorData[];
  nextUpdateTime: Date;
  canUpdate: boolean;
  hoursUntilNextUpdate: number;
}> {
  try {


    // Get current user
    const user = await stackServerApp.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const userId = user.id;
    const now = new Date();
    console.log("👤 User ID:", userId);

    // Check existing analysis for this user
    const existingAnalysis = await prisma.competitorAnalysis.findUnique({
      where: {
        userId_locationId_businessType: {
          userId,
          locationId,
          businessType,
        },
      },
    });

    const canUpdate =
      !existingAnalysis || now >= existingAnalysis.nextUpdate || forceUpdate;
    const hoursUntilNextUpdate = existingAnalysis
      ? Math.max(
        0,
        Math.ceil(
          (existingAnalysis.nextUpdate.getTime() - now.getTime()) /
          (1000 * 60 * 60)
        )
      )
      : 0;

    console.log("📊 Analysis status:", {
      hasExisting: !!existingAnalysis,
      canUpdate,
      hoursUntilNextUpdate,
      forceUpdate,
    });

    // If we have data and it's not time to update yet, return cached results
    if (existingAnalysis && !canUpdate) {
      console.log(
        `♻️ Returning cached competitor data. Next update in ${hoursUntilNextUpdate} hours`
      );
      return {
        competitors: existingAnalysis.competitors as CompetitorData[],
        nextUpdateTime: existingAnalysis.nextUpdate,
        canUpdate: false,
        hoursUntilNextUpdate,
      };
    }

    console.log("🔄 Fetching fresh competitor data from Google Places API");

    // Fetch fresh data from Google Places API
    const placesResults = await searchGooglePlaces(
      currentLocation,
      businessType,
      apiKey,
      locationId
    );

    if (placesResults.length === 0) {
      console.log("⚠️ No competitors found in the area");

      // Still save the empty result to avoid repeated API calls
      const nextUpdate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      if (existingAnalysis) {
        await prisma.competitorAnalysis.delete({
          where: { id: existingAnalysis.id },
        });
      }

      await prisma.competitorAnalysis.create({
        data: {
          userId,
          locationId,
          businessType,
          competitors: [],
          lastUpdated: now,
          nextUpdate: nextUpdate,
        },
      });

      return {
        competitors: [],
        nextUpdateTime: nextUpdate,
        canUpdate: true,
        hoursUntilNextUpdate: 0,
      };
    }

    // Transform results to CompetitorData format with rankings
    const competitors: CompetitorData[] = placesResults.map((place, index) => {
      const distance = calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        place.location.latitude,
        place.location.longitude
      );

      return {
        id: place.id,
        name: place.displayName.text,
        address: place.formattedAddress,
        rating: place.rating,
        reviewCount: place.userRatingCount,
        businessType: businessType,
        distance: distance,
        googleMapsUri: place.googleMapsUri,
        rank: index + 1, // Initial ranking
        lastUpdated: new Date(),
      };
    });

    // Sort by distance (closest first)
    competitors.sort((a, b) => a.distance - b.distance);

    // Re-assign rankings after sorting to ensure they're correct
    competitors.forEach((competitor, index) => {
      competitor.rank = index + 1;
    });

    console.log(
      "📍 Competitors ranked by distance:",
      competitors.map(
        (c) => `#${c.rank}: ${c.name} (${(c.distance / 1000).toFixed(1)}km)`
      )
    );

    // Calculate next update time (24 hours from now)
    const nextUpdate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Delete old data and save new data (fresh start each day)
    if (existingAnalysis) {
      await prisma.competitorAnalysis.delete({
        where: {
          id: existingAnalysis.id,
        },
      });
      console.log("🗑️ Deleted old competitor analysis");
    }

    // Create fresh analysis
    await prisma.competitorAnalysis.create({
      data: {
        userId,
        locationId,
        businessType,
        competitors: competitors,
        lastUpdated: now,
        nextUpdate: nextUpdate,
      },
    });

    console.log("💾 Saved new competitor analysis to database");
    console.log("⏰ Next update time:", nextUpdate.toISOString());

    return {
      competitors,
      nextUpdateTime: nextUpdate,
      canUpdate: true,
      hoursUntilNextUpdate: 0,
    };
  } catch (error) {
    console.error("❌ Error in getCompetitors:", error);

    // If API fails, try to return cached data for this user
    try {
      const user = await stackServerApp.getUser();
      if (user) {
        const fallbackAnalysis = await prisma.competitorAnalysis.findUnique({
          where: {
            userId_locationId_businessType: {
              userId: user.id,
              locationId,
              businessType,
            },
          },
        });

        if (fallbackAnalysis) {
          console.log("♻️ Returning fallback cached data due to API error");
          const now = new Date();
          const hoursUntilNextUpdate = Math.max(
            0,
            Math.ceil(
              (fallbackAnalysis.nextUpdate.getTime() - now.getTime()) /
              (1000 * 60 * 60)
            )
          );

          return {
            competitors: fallbackAnalysis.competitors as CompetitorData[],
            nextUpdateTime: fallbackAnalysis.nextUpdate,
            canUpdate: now >= fallbackAnalysis.nextUpdate,
            hoursUntilNextUpdate,
          };
        }
      }
    } catch (fallbackError) {
      console.error("❌ Fallback also failed:", fallbackError);
    }

    throw new Error(`Failed to get competitors: ${error}`);
  }
}

// Main GET handler for competitor analysis
export async function GET(
  request: NextRequest,
  { params }: { params: { locationId: string } }
) {
  try {
    console.log("🔍 Enhanced Competitor API called:", params.locationId);

    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
          code: "AUTH_REQUIRED",
        },
        { status: 401 }
      );
    }

    const userId = user.id;
    console.log(user.id, "user id from competitors.!");
    const searchParams = request.nextUrl.searchParams;
    console.log(searchParams, "searchParams..!");
    let businessName = searchParams.get("businessName");
    const businessType = searchParams.get("businessType") || "";

    // Validation
    if (!searchParams.get("lat") || !searchParams.get("lng")) {
      return NextResponse.json(
        {
          success: false,
          error: "lat and lng parameters are required",
        },
        { status: 400 }
      );
    }

    const latitude = parseFloat(searchParams.get("lat")!);
    const longitude = parseFloat(searchParams.get("lng")!);

    const apiKey = process.env.PLACES_KEY;
    if (!apiKey) {
      console.error("❌ Google Places API key not found");
      // Proceed without enrichment
    }

    // NEW: Fallback to fetch businessName if not provided (using locationId as place_id)
    if (apiKey && (!businessName || businessName === "null")) {
      businessName = await getBusinessName(params.locationId, apiKey);
      if (businessName) {
        console.log(`✅ Using fetched businessName: ${businessName}`);
      } else {
        console.warn(
          "⚠️ Could not fetch businessName; skipping own business exclusion may not work"
        );
      }
    }

    // Get all tracked keywords for this location
    const trackedKeywords = await prisma.keywordTracking.findMany({
      where: {
        userId,
        locationId: params.locationId,
        isActive: true,
      },
    });

    // If no keywords tracked, return empty state
    if (trackedKeywords.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          locationId: params.locationId,
          coordinates: { lat: latitude, lng: longitude },
          competitors: [],
          hasKeywords: false,
          metadata: {
            totalCount: 0,
            message:
              "No keywords are being tracked for this location. Add keywords to see competitor rankings.",
            trackedKeywordsCount: 0,
          },
        },
      });
    }

    // Get ALL keyword ranks (not just latest) for each tracked keyword to find competitors
    const competitorMap = new Map<string, EnhancedCompetitor>();

    for (const tracking of trackedKeywords) {
      // Get ALL ranking entries for this keyword (these represent different search results)
      const allRanks = await prisma.keywordRank.findMany({
        where: {
          keyword: tracking.keyword,
          location: tracking.location,
          userId,
        },
        orderBy: { createdAt: "desc" }, // Order by date descending to get latest first
      });

      console.log(allRanks, "all ranks from competitor.!");

      console.log(
        `📍 Keyword "${tracking.keyword}" has ${allRanks.length} ranking entries`
      );

      if (allRanks.length === 0) continue;

      // Use only the latest rank entry for each keyword to avoid outdated or duplicate data
      const latestRankEntry = allRanks[0];

      let searchResultsArray: Array<{
        position: number;
        title: string;
        link: string | null;
      }> = [];
      try {
        searchResultsArray = JSON.parse(latestRankEntry.searchResults);
      } catch (parseError) {
        console.error(
          `❌ Failed to parse searchResults for keyword "${tracking.keyword}":`,
          parseError
        );
        continue;
      }

      // Each entry in searchResultsArray represents a different website/competitor for this keyword snapshot
      searchResultsArray.forEach((result) => {
        // Skip if no title (incomplete data)
        if (!result.title) {
          return;
        }

        // NEW: Robust skipping of user's own business
        let isOwnBusiness = false;

        if (businessName) {
          const cleanBusinessName = businessName.toLowerCase();

          // 1. URL/domain match (reliable)
          if (result.link) {
            try {
              const urlObj = new URL(result.link);
              const hostname = urlObj.hostname
                .replace(/^www\./, "")
                .toLowerCase();
              if (
                hostname.includes(cleanBusinessName.replace(/\s+/g, "")) ||
                hostname.includes(cleanBusinessName.replace(/\s+/g, "-"))
              ) {
                isOwnBusiness = true;
              }
            } catch { }
          }

          // 2. Title match (fallback, stricter)
          if (!isOwnBusiness) {
            const titleLower = result.title.toLowerCase();
            if (titleLower.includes(cleanBusinessName)) {
              const lengthDiff = Math.abs(
                titleLower.length - cleanBusinessName.length
              );
              if (lengthDiff < 40) {
                // Avoid loose matches
                isOwnBusiness = true;
              }
            }
          }
        }

        if (isOwnBusiness) {
          console.log(`⏭️ Skipping own business: ${result.title}`);
          return;
        }

        // Extract domain from link if available, otherwise create a slug from title as fallback ID
        let domain: string;
        let url = result.link;
        if (url) {
          try {
            const urlObj = new URL(url);
            domain = urlObj.hostname.replace("www.", "");
          } catch {
            domain = url;
          }
        } else {
          // Fallback: Create a unique slug from title if no URL
          domain = result.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
        }

        // Use domain (or slug) as unique identifier
        const competitorId = domain;
        const competitorName = result.title;

        // Create or update competitor entry
        if (!competitorMap.has(competitorId)) {
          competitorMap.set(competitorId, {
            id: competitorId,
            name: competitorName,
            domain: url ? domain : undefined,
            keywordRankings: [],
            averageRank: 0,
            totalKeywordsRanked: 0,
            rank: 0,
            bestRank: 999,
            worstRank: 0,
          });
        }

        const competitor = competitorMap.get(competitorId)!;

        // Add this keyword ranking
        competitor.keywordRankings.push({
          keyword: tracking.keyword,
          rank: result.position,
          url: url || undefined,
          title: result.title,
        });

        // Update best and worst ranks
        if (result.position < competitor.bestRank) {
          competitor.bestRank = result.position;
        }
        if (result.position > competitor.worstRank) {
          competitor.worstRank = result.position;
        }
      });
    }

    console.log(`🏢 Found ${competitorMap.size} unique competitors`);

    // Enrich with Google Places if apiKey available and location string exists
    if (apiKey && trackedKeywords.length > 0) {
      const locationString = trackedKeywords[0].location; // Assume all same
      const searchLocation = { lat: latitude, lng: longitude };
      const competitorsArray = Array.from(competitorMap.values());
      await Promise.all(
        competitorsArray.map((competitor) =>
          enrichCompetitor(competitor, searchLocation, locationString, apiKey, businessType)
        )
      );
    }

    // If no competitors found
    if (competitorMap.size === 0) {
      return NextResponse.json({
        success: true,
        data: {
          locationId: params.locationId,
          coordinates: { lat: latitude, lng: longitude },
          competitors: [],
          hasKeywords: true,
          metadata: {
            totalCount: 0,
            trackedKeywordsCount: trackedKeywords.length,
            message:
              "No competitors found in search results. You may be dominating all tracked keywords!",
          },
        },
      });
    }

    // Calculate averages and sort competitors
    // const competitors: EnhancedCompetitor[] = Array.from(competitorMap.values())
    //   .map((competitor) => {
    //     const totalRank = competitor.keywordRankings.reduce((sum, kr) => sum + kr.rank, 0);
    //     const avgRank = totalRank / competitor.keywordRankings.length;

    //     return {
    //       ...competitor,
    //       totalKeywordsRanked: competitor.keywordRankings.length,
    //       averageRank: Math.round(avgRank * 100) / 100,
    //       rank: 0 // Will be assigned based on sort position
    //     };
    //   })
    //   .sort((a, b) => {
    //     // Sort by best rank first, then by average rank
    //     if (a.bestRank !== b.bestRank) {
    //       return a.bestRank - b.bestRank;
    //     }
    //     return a.averageRank - b.averageRank;
    //   })
    //   .map((competitor, index) => ({
    //     ...competitor,
    //     rank: index + 1
    //   }))
    //   .slice(0, 20); // Top 20 competitors

    // Calculate averages, filter only those with valid address, then sort and rank
    const competitors: EnhancedCompetitor[] = Array.from(competitorMap.values())
      .map((competitor) => {
        const totalRank = competitor.keywordRankings.reduce(
          (sum, kr) => sum + kr.rank,
          0
        );
        const avgRank = totalRank / competitor.keywordRankings.length;

        return {
          ...competitor,
          totalKeywordsRanked: competitor.keywordRankings.length,
          averageRank: Math.round(avgRank * 100) / 100,
          rank: 0,
        };
      })
      // 🔥 NEW: Only keep competitors with a real address (local physical businesses)
      .filter((competitor) => {
        const hasAddress =
          competitor.address &&
          competitor.address.trim() !== "" &&
          !competitor.address.includes("No address available") &&
          competitor.address.toLowerCase().includes("kerala"); // Extra safety

        return hasAddress;
      })
      // Sort by best rank → average rank
      .sort((a, b) => {
        if (a.bestRank !== b.bestRank) return a.bestRank - b.bestRank;
        return a.averageRank - b.averageRank;
      })
      // Re-assign ranks based on final filtered & sorted list
      .map((competitor, index) => ({
        ...competitor,
        rank: index + 1,
      }))
      .slice(0, 20); // Top 20 local competitors

    console.log(`✅ Returning ${competitors.length} competitors`);

    return NextResponse.json(
      {
        success: true,
        data: {
          locationId: params.locationId,
          coordinates: { lat: latitude, lng: longitude },
          competitors,
          hasKeywords: true,
          metadata: {
            totalCount: competitors.length,
            trackedKeywordsCount: trackedKeywords.length,
            lastUpdated: new Date(),
            dataSource: "keyword_rankings",
            message: `Showing top ${competitors.length} competitors based on keyword rankings`,
          },
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, max-age=300",
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("❌ Enhanced Competitor API Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error occurred while fetching competitors",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Handle POST method (optional - for future use)
export async function POST(
  request: NextRequest,
  { params }: { params: { locationId: string } }
) {
  try {
    const body = await request.json();
    const { businessType, lat, lng, forceUpdate = false } = body;

    if (!businessType || !lat || !lng) {
      return NextResponse.json(
        {
          success: false,
          error: "businessType, lat, and lng are required in request body",
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Google Places API key not configured",
        },
        { status: 500 }
      );
    }

    const result = await getCompetitors(
      params.locationId,
      businessType,
      { lat: parseFloat(lat), lng: parseFloat(lng) },
      apiKey,
      forceUpdate
    );

    return NextResponse.json({
      success: true,
      message: "Competitor analysis completed",
      data: {
        competitors: result.competitors,
        nextUpdateTime: result.nextUpdateTime,
        canUpdate: result.canUpdate,
        hoursUntilNextUpdate: result.hoursUntilNextUpdate,
      },
    });
  } catch (error) {
    console.error("❌ POST Competitor API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process competitor analysis request",
      },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function PUT() {
  return NextResponse.json(
    {
      success: false,
      error: "Method PUT not allowed. Use GET or POST instead.",
      allowedMethods: ["GET", "POST"],
    },
    {
      status: 405,
      headers: {
        Allow: "GET, POST",
      },
    }
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      success: false,
      error: "Method DELETE not allowed. Use GET or POST instead.",
      allowedMethods: ["GET", "POST"],
    },
    {
      status: 405,
      headers: {
        Allow: "GET, POST",
      },
    }
  );
}

export async function PATCH() {
  return NextResponse.json(
    {
      success: false,
      error: "Method PATCH not allowed. Use GET or POST instead.",
      allowedMethods: ["GET", "POST"],
    },
    {
      status: 405,
      headers: {
        Allow: "GET, POST",
      },
    }
  );
}

// Export route segment config (optional)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
