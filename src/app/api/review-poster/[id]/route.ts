// app/api/review-poster/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
import { stackServerApp } from "@/stack";
import { prisma } from "../../../../../lib/prisma";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Get authenticated user
    const user = await stackServerApp.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    // Await params in Next.js 15
    const { id: posterId } = await context.params;

    if (!posterId) {
      return NextResponse.json(
        { error: "Poster ID is required" },
        { status: 400 }
      );
    }

    // Fetch the poster
    const poster = await prisma.googleReviewPoster.findUnique({
      where: { id: posterId },
    });

    if (!poster) {
      return NextResponse.json(
        { error: "Poster not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (poster.userId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized to view this poster" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        poster,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching poster:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch poster" },
      { status: 500 }
    );
  }
}