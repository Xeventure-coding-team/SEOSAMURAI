// app/api/cron/track-reviews/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
// import { prisma } from "@/lib/prisma";

async function fetchAllLocationReviews(
  { accountId, locationId }: { accountId: string; locationId: string },
  accessToken: string,
  maxRetries: number = 4
) {
  const cleanAccountId = accountId.replace(/^accounts\//, '');
  const cleanLocationId = locationId.replace(/^locations\//, '');
  
  let allReviews: any[] = [];
  let nextPageToken: string | null = null;
  let hasMorePages = true;

  while (hasMorePages) {
    let endpoint = `https://mybusiness.googleapis.com/v4/accounts/${cleanAccountId}/locations/${cleanLocationId}/reviews`;
    
    const params = new URLSearchParams();
    params.append('pageSize', '50');
    if (nextPageToken) {
      params.append('pageToken', nextPageToken);
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
          
          if (reviewsResponse.status === 401 || reviewsResponse.status === 403) {
            return {
              reviews: [],
              error: `Authentication error: ${reviewsResponse.status}`,
            };
          }

          if (reviewsResponse.status === 404) {
            return {
              reviews: [],
              error: "Location not found",
            };
          }

          lastError = new Error(`API error: ${reviewsResponse.status}`);
          
          if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt - 1) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        } else {
          const reviewsData = await reviewsResponse.json();
          const pageReviews = reviewsData.reviews?.reviews ?? reviewsData.reviews ?? [];
          allReviews = [...allReviews, ...pageReviews];
          
          nextPageToken = reviewsData.nextPageToken || null;
          hasMorePages = !!nextPageToken;
          success = true;
          break;
        }
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    if (!success) {
      return {
        reviews: allReviews,
        error: lastError instanceof Error ? lastError.message : "Network or API error after retries",
      };
    }

    if (allReviews.length > 1000) {
      break;
    }
  }

  return { reviews: allReviews };
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all users with GMB connections
    const users = await prisma.user.findMany({
      where: {
        // Add condition to find users with GMB access tokens
        // This depends on how you store GMB credentials
      },
      select: {
        id: true,
        // Include fields where you store accountId and accessToken
      },
    });

    let totalProcessed = 0;
    let totalFailed = 0;
    const results: any[] = [];

    for (const user of users) {
      try {
        // Get user's GMB credentials (adjust based on your schema)
        // const accountId = user.gmbAccountId;
        // const accessToken = user.gmbAccessToken;
        
        // For now, skip if no credentials
        // if (!accountId || !accessToken) continue;

        const dbLocations = await prisma.locations.findMany({
          where: { user_id: user.id },
          select: {
            id: true,
            location_id: true,
            location_name: true,
          },
        });

        let userTotalFetched = 0;
        let userNewReviews = 0;
        let userDeletedReviews = 0;

        for (const location of dbLocations) {
          const locationId = location.location_id;

          // NOTE: You need to get accountId and accessToken for each user
          // This is a placeholder - implement based on your auth system
          const accountId = "REPLACE_WITH_USER_ACCOUNT_ID";
          const accessToken = "REPLACE_WITH_USER_ACCESS_TOKEN";

          const { reviews, error } = await fetchAllLocationReviews(
            { accountId, locationId },
            accessToken
          );

          if (error) {
            console.error(`Cron: Error for user ${user.id}, location ${locationId}:`, error);
            totalFailed++;
            continue;
          }

          userTotalFetched += reviews.length;

          const existingReviews = await prisma.gmb_reviews.findMany({
            where: { accountId, locationId },
            select: { reviewId: true, isDeleted: true },
          });

          const existingReviewIds = new Set(
            existingReviews.filter(r => !r.isDeleted).map(r => r.reviewId)
          );
          const allExistingIds = new Set(existingReviews.map(r => r.reviewId));

          const currentReviewIds = new Set(
            reviews.map((r: any) => r.reviewId || r.name)
          );

          const deletedReviewIds = [...allExistingIds].filter(
            id => !currentReviewIds.has(id)
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
            userDeletedReviews += deletedReviewIds.length;
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
              rating: r.starRating === 'FIVE' ? 5 :
                      r.starRating === 'FOUR' ? 4 :
                      r.starRating === 'THREE' ? 3 :
                      r.starRating === 'TWO' ? 2 :
                      r.starRating === 'ONE' ? 1 : null,
              comment: r.comment || null,
              reviewReply: r.reviewReply || null,
              createTime: r.createTime ? new Date(r.createTime) : null,
              updateTime: r.updateTime ? new Date(r.updateTime) : null,
              rawData: r,
            }));

          for (const review of newReviews) {
            try {
              await prisma.gmb_reviews.create({ data: review });
              userNewReviews++;
            } catch (error: any) {
              if (error.code !== 'P2002') {
                console.error('Cron: Error inserting review:', error);
              }
            }
          }
        }

        results.push({
          userId: user.id,
          totalFetched: userTotalFetched,
          newReviews: userNewReviews,
          deletedReviews: userDeletedReviews,
          locationsProcessed: dbLocations.length,
        });

        totalProcessed++;
      } catch (error) {
        console.error(`Cron: Error processing user ${user.id}:`, error);
        totalFailed++;
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      usersProcessed: totalProcessed,
      usersFailed: totalFailed,
      results,
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      { 
        error: "Cron job failed",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}