import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { stackServerApp } from "@/stack";

async function fetchAllLocationReviews(
  { accountId, locationId }: { accountId: string; locationId: string },
  accessToken: string,
  maxRetries: number = 4
) {
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

    let lastError: any = null;
    let success = false;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const reviewsResponse = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!reviewsResponse.ok) {
          const errorText = await reviewsResponse.text();

          if (
            reviewsResponse.status === 401 ||
            reviewsResponse.status === 403
          ) {
            console.error(
              `Reviews API auth error (${reviewsResponse.status}):`,
              errorText
            );
            return {
              reviews: [],
              error: `Authentication error: ${reviewsResponse.status}`,
            };
          }

          if (reviewsResponse.status === 404) {
            console.error(
              `Reviews API not found (${reviewsResponse.status}):`,
              errorText
            );
            return {
              reviews: [],
              error: "Location not found",
            };
          }

          lastError = new Error(`API error: ${reviewsResponse.status}`);
          console.warn(
            `Attempt ${attempt}/${maxRetries} failed for location ${locationId}:`,
            errorText
          );

          if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt - 1) * 1000;
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
        } else {
          const reviewsData = await reviewsResponse.json();
          const pageReviews =
            reviewsData.reviews?.reviews ?? reviewsData.reviews ?? [];
          allReviews = [...allReviews, ...pageReviews];

          nextPageToken = reviewsData.nextPageToken || null;
          hasMorePages = !!nextPageToken;
          success = true;
          break;
        }
      } catch (error) {
        lastError = error;
        console.warn(
          `Attempt ${attempt}/${maxRetries} failed for location ${locationId}:`,
          error
        );

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    if (!success) {
      console.error(
        `All ${maxRetries} attempts failed for location ${locationId}`
      );
      return {
        reviews: allReviews,
        error:
          lastError instanceof Error
            ? lastError.message
            : "Network or API error after retries",
      };
    }

    if (allReviews.length > 1000) {
      console.warn("Reached maximum review fetch limit (1000)");
      break;
    }
  }

  return { reviews: allReviews };
}

export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { accountId, accessToken, locationIds, chunkIndex = 0 } = body;

    if (!accountId || !accessToken) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get all locations for this user from DB
    const dbLocations = await prisma.locations.findMany({
      where: { 
        user_id: user.id,
        ...(locationIds && locationIds.length > 0 
          ? { location_id: { in: locationIds } }
          : {})
      },
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
        hasMore: false,
      });
    }

    console.log('check route!')

    // Process locations in chunks of 5
    const CHUNK_SIZE = 5;
    const startIndex = chunkIndex * CHUNK_SIZE;
    const endIndex = startIndex + CHUNK_SIZE;
    const locationsChunk = dbLocations.slice(startIndex, endIndex);
    const hasMore = endIndex < dbLocations.length;

    let totalFetchedCount = 0;
    let totalNewReviews = 0;
    let totalDeletedReviews = 0;

    // Process each location in this chunk
    for (const location of locationsChunk) {
      const locationId = location.location_id;

      // Fetch all reviews from Google for this location
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

      totalFetchedCount += reviews.length;

      // Get existing reviews from DB for this location
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

      // Current review IDs from Google
      const currentReviewIds = new Set(
        reviews.map((r: any) => r.reviewId || r.name)
      );

      // Find deleted reviews
      const deletedReviewIds = [...allExistingIds].filter(
        (id) => !currentReviewIds.has(id)
      );

      // Mark deleted reviews
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
        totalDeletedReviews += deletedReviewIds.length;
      }

      // Prepare new reviews to insert
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

      // Insert new reviews
      if (newReviews.length > 0) {
        for (const review of newReviews) {
          try {
            await prisma.gmb_reviews.create({
              data: review,
            });
            totalNewReviews++;
          } catch (error: any) {
            if (error.code !== "P2002") {
              console.error("Error inserting review:", error);
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      totalFetched: totalFetchedCount,
      newReviews: totalNewReviews,
      deletedReviews: totalDeletedReviews,
      locationsProcessed: locationsChunk.length,
      chunkIndex,
      hasMore,
      nextChunkIndex: hasMore ? chunkIndex + 1 : null,
      totalLocations: dbLocations.length,
      progress: `${Math.min(endIndex, dbLocations.length)}/${dbLocations.length}`,
    });
  } catch (error) {
    console.error("Error tracking reviews:", error);
    return NextResponse.json(
      { error: "Failed to track reviews" },
      { status: 500 }
    );
  }
}