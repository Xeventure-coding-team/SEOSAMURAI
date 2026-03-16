import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { stackServerApp } from "@/stack";

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { location_name, access_token, gmb_account_id } = body;

    // --- Validation ---
    if (!location_name) {
      return NextResponse.json(
        { error: "location_name is required" },
        { status: 400 },
      );
    }

    if (!access_token) {
      return NextResponse.json(
        { error: "access_token is required" },
        { status: 400 },
      );
    }

    // --- Get authenticated user ---
    const user = await stackServerApp.getUser();
    if (!user?.id) {
      return NextResponse.json(
        { error: "User authentication required" },
        { status: 401 },
      );
    }

    // --- Find the location (exclude already deleted) ---
    const existingLocation = await prisma.locations.findFirst({
      where: {
        location_id: `locations/${location_name}`,
        user_id: user.id,
        is_deleted: false,
      },
    });

    if (!existingLocation) {
      return NextResponse.json(
        { error: "Location not found or you don't have permission to remove it" },
        { status: 404 },
      );
    }

    // --- Soft delete ---
    await prisma.locations.update({
      where: {
        id: existingLocation.id,
      },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
      },
    });

    return NextResponse.json(
      { success: true, message: "Location removed successfully" },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}