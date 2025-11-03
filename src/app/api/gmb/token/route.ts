import { NextRequest, NextResponse } from "next/server"
import { prisma } from "../../../../../lib/prisma"
import { stackServerApp } from "@/stack";

// GET - Retrieve GMB token
export async function GET(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser();
    
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const integration = await prisma.gmbIntegration.findUnique({
      where: { userId: user.id },
      select: {
        accessToken: true,
        refreshToken: true,
        tokenExpiry: true,
        accountName: true,
        accountId: true,
        isActive: true,
      },
    })

    if (!integration || !integration.isActive) {
      return NextResponse.json({ error: "No active GMB integration found" }, { status: 404 })
    }

    return NextResponse.json(integration)
  } catch (error) {
    console.error("Error fetching GMB token:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Store GMB token
export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser();
    
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { 
      accessToken, 
      refreshToken, 
      expiresIn, 
      accountName, 
      accountId, 
      clientId 
    } = body

    if (!accessToken) {
      return NextResponse.json({ error: "Access token is required" }, { status: 400 })
    }

    const tokenExpiry = expiresIn ? new Date(Date.now() + (expiresIn * 1000)) : new Date(Date.now() + (3600 * 1000)) // Default 1 hour

    const integration = await prisma.gmbIntegration.upsert({
      where: { userId: user.id },
      update: {
        accessToken,
        refreshToken: refreshToken || undefined,
        tokenExpiry,
        accountName: accountName || undefined,
        accountId: accountId || undefined,
        clientId: clientId || undefined,
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        user_id: user.id, // For the user_id field in your schema
        accessToken,
        refreshToken: refreshToken || undefined,
        tokenExpiry,
        accountName: accountName || undefined,
        accountId: accountId || undefined,
        clientId: clientId || undefined,
        isActive: true,
      },
    })

    return NextResponse.json({ 
      success: true, 
      id: integration.id,
      accessToken: integration.accessToken,
      tokenExpiry: integration.tokenExpiry,
      accountName: integration.accountName,
      accountId: integration.accountId,
    })
  } catch (error) {
    console.error("Error storing GMB token:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Update existing GMB token (useful for refresh operations)
export async function PUT(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser();
    
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { 
      accessToken, 
      refreshToken, 
      expiresIn
    } = body

    if (!accessToken) {
      return NextResponse.json({ error: "Access token is required" }, { status: 400 })
    }

    const tokenExpiry = expiresIn ? new Date(Date.now() + (expiresIn * 1000)) : new Date(Date.now() + (3600 * 1000))

    const integration = await prisma.gmbIntegration.update({
      where: { userId: user.id },
      data: {
        accessToken,
        refreshToken: refreshToken || undefined,
        tokenExpiry,
        isActive: true,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ 
      success: true,
      accessToken: integration.accessToken,
      tokenExpiry: integration.tokenExpiry,
    })
  } catch (error) {
    console.error("Error updating GMB token:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Remove GMB integration
export async function DELETE(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser();
    
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Solution 1: Use update() instead of updateMany() for single record
    try {
      await prisma.gmbIntegration.update({
        where: { userId: user.id },
        data: { isActive: false, updatedAt: new Date() },
      })
    } catch (updateError) {
      // If the record doesn't exist, that's fine - it's already "deleted"
      if (updateError.code === 'P2025') {
        console.log('No GMB integration found to deactivate for user:', user.id)
      } else {
        throw updateError
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing GMB integration:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}