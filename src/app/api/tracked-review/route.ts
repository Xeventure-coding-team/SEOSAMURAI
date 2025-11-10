import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { stackServerApp } from "@/stack";

async function fetchAllLocationReviews(
  { accountId, locationId }: { accountId: string; locationId: string },
  accessToken: string
) {
  try {
    const cleanAccountId = accountId.replace(/^accounts\//, "");
    const cleanLocationId = locationId.replace(/^locations\//, "");

    let allReviews: any[] = [];
    let nextPageToken: string | null = null;
    let hasMorePages = true;

    while (hasMorePages) {
      let endpoint = `https://mybusiness.googleapis.com/v4/accounts/${cleanAccountId}/locations/${cleanLocationId}/reviews`;

      const params = new URLSearchParams();
      params.append("pageSize", "50");
      if (nextPageToken) {
        params.append("pageToken", nextPageToken);
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
        console.error(
          `Reviews API error (${reviewsResponse.status}):`,
          errorText
        );

        return {
          reviews: [],
          error: `API error: ${reviewsResponse.status}`,
        };
      }

      const reviewsData = await reviewsResponse.json();
      const pageReviews =
        reviewsData.reviews?.reviews ?? reviewsData.reviews ?? [];
      allReviews = [...allReviews, ...pageReviews];

      nextPageToken = reviewsData.nextPageToken || null;
      hasMorePages = !!nextPageToken;

      if (allReviews.length > 1000) {
        console.warn("Reached maximum review fetch limit (1000)");
        break;
      }
    }

    return { reviews: allReviews };
  } catch (error) {
    console.error(`Error fetching reviews:`, error);
    return {
      reviews: [],
      error: error instanceof Error ? error.message : "Network or API error",
    };
  }
}

async function processLocationChunk(
  locations: any[],
  accountId: string,
  accessToken: string
) {
  let chunkFetched = 0;
  let chunkNewReviews = 0;
  let chunkDeletedReviews = 0;

  for (const location of locations) {
    const locationId = location.location_id;

    const { reviews, error } = await fetchAllLocationReviews(
      { accountId, locationId },
      accessToken
    );

    if (error) {
      console.error(
        `Error fetching reviews for location ${locationId}:`,
        error
      );
      continue;
    }

    chunkFetched += reviews.length;

    const existingReviews = await prisma.gmb_reviews.findMany({
      where: {
        accountId,
        locationId,
      },
      select: {
        reviewId: true,
        isDeleted: true,
      },
    });

    const existingReviewIds = new Set(
      existingReviews.filter((r) => !r.isDeleted).map((r) => r.reviewId)
    );
    const allExistingIds = new Set(existingReviews.map((r) => r.reviewId));

    const currentReviewIds = new Set(
      reviews.map((r: any) => r.reviewId || r.name)
    );

    const deletedReviewIds = [...allExistingIds].filter(
      (id) => !currentReviewIds.has(id)
    );

    if (deletedReviewIds.length > 0) {
      await prisma.gmb_reviews.updateMany({
        where: {
          reviewId: { in: deletedReviewIds },
          isDeleted: false,
        },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });
      chunkDeletedReviews += deletedReviewIds.length;
    }

    const newReviews = reviews
      .filter((r: any) => {
        const reviewId = r.reviewId || r.name;
        return !existingReviewIds.has(reviewId);
      })
      .map((r: any) => ({
        reviewId: r.reviewId || r.name,
        accountId,
        locationId,
        reviewerName: r.reviewer?.displayName || r.reviewerName || null,
        rating:
          r.starRating === "FIVE"
            ? 5
            : r.starRating === "FOUR"
            ? 4
            : r.starRating === "THREE"
            ? 3
            : r.starRating === "TWO"
            ? 2
            : r.starRating === "ONE"
            ? 1
            : null,
        comment: r.comment || null,
        reviewReply: r.reviewReply || null,
        createTime: r.createTime ? new Date(r.createTime) : null,
        updateTime: r.updateTime ? new Date(r.updateTime) : null,
        rawData: r,
      }));

    if (newReviews.length > 0) {
      for (const review of newReviews) {
        try {
          await prisma.gmb_reviews.create({
            data: review,
          });
          chunkNewReviews++;
        } catch (error: any) {
          if (error.code !== "P2002") {
            console.error("Error inserting review:", error);
          }
        }
      }
    }
  }

  return {
    chunkFetched,
    chunkNewReviews,
    chunkDeletedReviews,
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser();

    // if (!user) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

        // 2️⃣ Get active integrations
    const activeIntegrations = await prisma.gmbIntegration.findFirst({
      where: {
        isActive: true,
        // Remove token expiry check here - we'll handle refresh in getValidAccessToken
      },
      select: {
        id: true,
        userId: true,
        user_id: true,
        accountName: true,
        accountId: true,
        accessToken: true,
        refreshToken: true,
        tokenExpiry: true
      }
    });

    const accountId = activeIntegrations.accountId;
    const accessToken = activeIntegrations.accessToken
    const chunkSize = 5

    if (!accountId || !accessToken) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const dbLocations = await prisma.locations.findMany({
      where: { user_id: user.id },
      select: {
        id: true,
        location_id: true,
        location_name: true,
      },
    });

    if (dbLocations.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No locations found for user",
        totalFetched: 0,
        newReviews: 0,
        deletedReviews: 0,
      });
    }

    let totalFetchedCount = 0;
    let totalNewReviews = 0;
    let totalDeletedReviews = 0;

    // Process locations in chunks
    for (let i = 0; i < dbLocations.length; i += chunkSize) {
      const chunk = dbLocations.slice(i, i + chunkSize);

      const { chunkFetched, chunkNewReviews, chunkDeletedReviews } =
        await processLocationChunk(chunk, accountId, accessToken);

      totalFetchedCount += chunkFetched;
      totalNewReviews += chunkNewReviews;
      totalDeletedReviews += chunkDeletedReviews;

      // Log progress
      console.log(
        `Processed chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(
          dbLocations.length / chunkSize
        )}`
      );
    }

    // Return minimal response - NO deleted reviews list
    return NextResponse.json({
      success: true,
      totalFetched: totalFetchedCount,
      newReviews: totalNewReviews,
      deletedReviews: totalDeletedReviews,
      locationsProcessed: dbLocations.length,
      message: "Reviews synced successfully",
    });
  } catch (error) {
    console.error("Error tracking reviews:", error);
    return NextResponse.json(
      { error: "Failed to track reviews" },
      { status: 500 }
    );
  }
}
