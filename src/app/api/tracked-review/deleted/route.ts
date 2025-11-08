import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { stackServerApp } from "@/stack";

export async function GET(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        { error: "Missing accountId" },
        { status: 400 }
      );
    }

    // Get all locations for this user
    const dbLocations = await prisma.locations.findMany({
      where: { user_id: user.id },
      select: {
        location_id: true,
        location_name: true,
      },
    });

    const locationIds = dbLocations.map(loc => loc.location_id);

    // Get deleted reviews for all user's locations
    const deletedReviews = await prisma.gmb_reviews.findMany({
      where: {
        accountId,
        locationId: {
          in: locationIds,
        },
        isDeleted: true,
      },
      orderBy: {
        deletedAt: 'desc',
      },
      select: {
        id: true,
        reviewId: true,
        locationId: true,
        reviewerName: true,
        rating: true,
        comment: true,
        createTime: true,
        deletedAt: true,
        rawData: true, // Include rawData to get profile photo
      },
    });

    // Add location names and profile photos to reviews
    const reviewsWithLocation = deletedReviews.map(review => {
      const location = dbLocations.find(loc => loc.location_id === review.locationId);
      const profilePhotoUrl = (review.rawData as any)?.reviewer?.profilePhotoUrl || null;
      
      return {
        ...review,
        locationName: location?.location_name || 'Unknown Location',
        profilePhotoUrl,
      };
    });

    return NextResponse.json({
      deletedReviews: reviewsWithLocation,
      count: reviewsWithLocation.length,
    });
  } catch (error) {
    console.error("Error fetching deleted reviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch deleted reviews" },
      { status: 500 }
    );
  }
}