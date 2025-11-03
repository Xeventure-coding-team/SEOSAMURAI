import { NextResponse } from "next/server";
import { stackServerApp } from "@/stack";
import { prisma } from "../../../../lib/prisma";

async function fetchLocationDetails(
  { accountId, locationId }: { accountId: string; locationId: string },
  accessToken: string
) {
  const googleApiKey = process.env.PLACES_KEY;

  try {
    // 🔹 Try Places API (only if key is available)
    if (googleApiKey) {
      try {
        const placesResponse = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${locationId}&fields=name&key=${googleApiKey}`
        );

        if (placesResponse.ok) {
          const placesResult = await placesResponse.json();
          const businessName = placesResult.result?.name || null;
          return { businessName };
        }
      } catch (placesError) {
        console.error("Places API fallback failed:", placesError);
      }
    }

    // 🔹 If both fail, return null
    return { businessName: null };
  } catch (err) {
    console.error("Error in fetchLocationDetails:", err);
    return { businessName: null };
  }
}

// Fetch ALL reviews with pagination support
async function fetchLocationUnrepliedReviews(
  { accountId, locationId }: { accountId: string; locationId: string },
  accessToken: string
) {
  try {
    // Clean up accountId and locationId - remove any prefixes
    const cleanAccountId = accountId.replace(/^accounts\//, '');
    const cleanLocationId = locationId.replace(/^locations\//, '');
    
    // Array to store all reviews
    let allReviews: any[] = [];
    let nextPageToken: string | null = null;
    let hasMorePages = true;

    // Fetch all pages of reviews
    while (hasMorePages) {
      // Build endpoint with correct format: accounts/{accountId}/locations/{locationId}/reviews
      let endpoint = `https://mybusiness.googleapis.com/v4/accounts/${cleanAccountId}/locations/${cleanLocationId}/reviews`;
      
      // Add page token and page size parameters
      const params = new URLSearchParams();
      params.append('pageSize', '50'); // Maximum allowed by API
      if (nextPageToken) {
        params.append('pageToken', nextPageToken);
      }
      
      endpoint += `?${params.toString()}`;

      const reviewsResponse = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!reviewsResponse.ok) {
        const errorText = await reviewsResponse.text();
        console.error(`Reviews API error (${reviewsResponse.status}):`, errorText);
        
        return {
          unrepliedReviews: [],
          unrepliedCount: 0,
          totalReviews: 0,
          hasPermission: reviewsResponse.status !== 403,
          error: reviewsResponse.status === 404
            ? "Location not found or reviews not available"
            : `API error: ${reviewsResponse.status}`,
        };
      }

      const reviewsData = await reviewsResponse.json();
      
      // Extract reviews from response (handle different response structures)
      const pageReviews = reviewsData.reviews?.reviews ?? reviewsData.reviews ?? [];
      
      // Add reviews from this page to our collection
      allReviews = [...allReviews, ...pageReviews];
      
      // Check if there are more pages
      nextPageToken = reviewsData.nextPageToken || null;
      hasMorePages = !!nextPageToken;

      // Safety check to prevent infinite loops
      if (allReviews.length > 1000) {
        console.warn('Reached maximum review fetch limit (1000)');
        break;
      }
    }

    // Filter for unreplied reviews - check if reviewReply exists and has comment
    const unrepliedReviews = allReviews.filter((r: any) => {
      // Check if reply exists and has actual content
      const hasReply = r.reviewReply && 
                      r.reviewReply.comment && 
                      r.reviewReply.comment.trim().length > 0;
      return !hasReply;
    });

    return {
      unrepliedReviews,
      unrepliedCount: unrepliedReviews.length,
      totalReviews: allReviews.length,
      hasPermission: true,
      allReviews, // Include all reviews for debugging/reference
    };

  } catch (error) {
    console.error(`Error fetching reviews for location ${locationId}:`, error);
    return {
      unrepliedReviews: [],
      unrepliedCount: 0,
      totalReviews: 0,
      hasPermission: false,
      error: error instanceof Error ? error.message : "Network or API error",
    };
  }
}


export async function GET(req: Request) {
  try {
    const user = await stackServerApp.getUser();
    const { searchParams } = new URL(req.url);

    const accessToken = searchParams.get("accessToken");
    const accountId = searchParams.get("accountId");
    const token = req.headers.get("authorization");

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    if (!accessToken || !accountId) {
      return NextResponse.json({ error: "Missing accessToken or accountId" }, { status: 400 });
    }

    // Decode the accountId if it's URL encoded
    const decodedAccountId = decodeURIComponent(accountId);

    // Get locations from DB
    const dbLocations = await prisma.locations.findMany({
      where: { user_id: user.id },
      select: {
        id: true,
        location_id: true,
        location_name: true,
        website: true,
        categories: true,
        last_rank_updated: true,
        created_at: true,
      },
    });

    // Fetch reviews for each location with better error handling
    const businessesWithUnrepliedReviews = await Promise.allSettled(
      dbLocations.map(async (location) => {

        try {
          const reviewsData = await fetchLocationUnrepliedReviews(
            { accountId: decodedAccountId, locationId: location.location_id },
            accessToken
          );

          const businessName = await fetchLocationDetails(
            { accountId: decodedAccountId, locationId: location.location_id },
            accessToken
          );

          return {
            ...location,
            businessName: businessName.businessName,
            unrepliedReviews: reviewsData.unrepliedReviews,
            unrepliedCount: reviewsData.unrepliedCount,
            totalReviews: reviewsData.totalReviews,
            hasReviewPermission: reviewsData.hasPermission,
            reviewsError: reviewsData.error || null,
          };
        } catch (err) {
          console.error(`Failed to process location ${location.location_name}:`, err);
          return {
            ...location,
            businessName: null,
            unrepliedReviews: [],
            unrepliedCount: 0,
            totalReviews: 0,
            hasReviewPermission: false,
            reviewsError: err instanceof Error ? err.message : "Unknown error",
          };
        }
      })
    );

    // Handle both successful and failed promises
    const businesses = businessesWithUnrepliedReviews.map((result) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error('Promise rejected:', result.reason);
        return null;
      }
    }).filter(Boolean); // Remove null values

    const totalUnrepliedReviews = businesses.reduce(
      (sum, business) => sum + (business?.unrepliedCount || 0),
      0
    );

    const totalReviews = businesses.reduce(
      (sum, business) => sum + (business?.totalReviews || 0),
      0
    );

    return NextResponse.json({
      businesses,
      totalBusinesses: dbLocations.length,
      summary: {
        totalReviews,
        totalUnrepliedReviews,
        processedLocations: businesses.length,
      },
    });
  } catch (error: any) {
    console.error("Error in GET /api/reviews:", error);
    return NextResponse.json(
      { 
        error: "Error fetching unreplied reviews", 
        debug: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}