import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/stack";
import { prisma } from "../../../../lib/prisma";

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await stackServerApp.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { businessName, reviewUrl, bgColor, bgPattern, keywords } = body;

    // Validation
    if (!businessName || !reviewUrl) {
      return NextResponse.json(
        { error: "Business name and review URL are required" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(reviewUrl);
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid review URL format" },
        { status: 400 }
      );
    }

    // Process keywords - convert comma-separated string to array
    let keywordsArray: string[] = [];
    if (keywords) {
      if (typeof keywords === 'string') {
        keywordsArray = keywords
          .split(',')
          .map(k => k.trim())
          .filter(k => k.length > 0);
      } else if (Array.isArray(keywords)) {
        keywordsArray = keywords.filter(k => k && k.trim().length > 0);
      }
    }

    // Validate bgPattern
    const validPatterns = ["none", "dots", "grid", "lines", "zigzag", "circles", "diagonal", "waves"];
    const finalBgPattern = validPatterns.includes(bgPattern) ? bgPattern : "none";

    // Create poster in database
    const poster = await prisma.googleReviewPoster.create({
      data: {
        userId: user.id,
        businessName,
        reviewUrl,
        bgColor: bgColor || "#10b981",
        bgPattern: finalBgPattern,
        keywords: keywordsArray,
        // placeId: placeId || null,
      },
    });

    return NextResponse.json(
      { 
        success: true,
        message: "Review poster saved successfully",
        poster: {
          id: poster.id,
          businessName: poster.businessName,
          bgColor: poster.bgColor,
          bgPattern: poster.bgPattern,
          createdAt: poster.createdAt,
        }
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error saving review poster:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save review poster" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await stackServerApp.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const placeId = searchParams.get("placeId");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build query filters
    const where: any = {
      userId: user.id,
    };

    if (placeId) {
      where.placeId = placeId;
    }

    // Fetch posters
    const [posters, total] = await Promise.all([
      prisma.googleReviewPoster.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          businessName: true,
          reviewUrl: true,
          bgColor: true,
          bgPattern: true, 
          keywords: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.googleReviewPoster.count({ where }),
    ]);

    return NextResponse.json(
      {
        success: true,
        posters,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching review posters:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch review posters" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await stackServerApp.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const posterId = searchParams.get("id");

    if (!posterId) {
      return NextResponse.json(
        { error: "Poster ID is required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const poster = await prisma.googleReviewPoster.findUnique({
      where: { id: posterId },
    });

    if (!poster) {
      return NextResponse.json(
        { error: "Poster not found" },
        { status: 404 }
      );
    }

    if (poster.userId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized to delete this poster" },
        { status: 403 }
      );
    }

    // Hard delete
    await prisma.googleReviewPoster.delete({
      where: { id: posterId },
    });

    return NextResponse.json(
      { 
        success: true,
        message: "Review poster deleted successfully"
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error deleting review poster:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete review poster" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await stackServerApp.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const posterId = searchParams.get("id");

    if (!posterId) {
      return NextResponse.json(
        { error: "Poster ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { businessName, reviewUrl, bgColor, bgPattern, keywords } = body;

    // Validation
    if (!businessName || !reviewUrl) {
      return NextResponse.json(
        { error: "Business name and review URL are required" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(reviewUrl);
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid review URL format" },
        { status: 400 }
      );
    }

    // Verify ownership
    const existingPoster = await prisma.googleReviewPoster.findUnique({
      where: { id: posterId },
    });

    if (!existingPoster) {
      return NextResponse.json(
        { error: "Poster not found" },
        { status: 404 }
      );
    }

    if (existingPoster.userId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized to update this poster" },
        { status: 403 }
      );
    }

    // Process keywords - convert comma-separated string to array
    let keywordsArray: string[] = [];
    if (keywords) {
      if (typeof keywords === 'string') {
        keywordsArray = keywords
          .split(',')
          .map(k => k.trim())
          .filter(k => k.length > 0);
      } else if (Array.isArray(keywords)) {
        keywordsArray = keywords.filter(k => k && k.trim().length > 0);
      }
    }

    // Validate bgPattern
    const validPatterns = ["none", "dots", "grid", "lines", "zigzag", "circles", "diagonal", "waves"];
    const finalBgPattern = validPatterns.includes(bgPattern) ? bgPattern : "none";

    // Update poster in database
    const updatedPoster = await prisma.googleReviewPoster.update({
      where: { id: posterId },
      data: {
        businessName,
        reviewUrl,
        bgColor: bgColor || "#10b981",
        bgPattern: finalBgPattern,
        keywords: keywordsArray,
      },
    });

    return NextResponse.json(
      { 
        success: true,
        message: "Review poster updated successfully",
        poster: updatedPoster
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error updating review poster:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update review poster" },
      { status: 500 }
    );
  }
}