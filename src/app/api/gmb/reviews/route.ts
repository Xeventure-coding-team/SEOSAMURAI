import { NextResponse } from "next/server"
import { getLocationById, cleanGmbLocationId } from "@/lib/getLocationById"
import { stackServerApp } from "@/stack"

async function fetchLocationReviews(locationId: string, gmbAccountId: string, accessToken: string) {
  try {
    const reviewsResponse = await fetch(
      `https://mybusiness.googleapis.com/v4/accounts/${gmbAccountId}/locations/${locationId}/reviews`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!reviewsResponse.ok) {
      const errorText = await reviewsResponse.text()
      throw new Error(`GMB Reviews API error (${reviewsResponse.status}): ${errorText}`)
    }

    const reviewsData = await reviewsResponse.json()

    return {
      reviews: reviewsData,
      hasPermission: true,
      totalReviews: reviewsData?.reviews?.length || 0
    }

  } catch (error) {
    console.error('Error in fetchLocationReviews:', error)
    throw error
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const mongoId = searchParams.get("location_id") || searchParams.get("location_name") // MongoDB _id
    const accessToken = searchParams.get("access_token")
    const gmbAccountId = searchParams.get("gmb_account_id")

    // Auth check
    const user = await stackServerApp.getUser()
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!mongoId || !accessToken || !gmbAccountId) {
      return NextResponse.json(
        {
          error: "Missing required parameters",
          required: ["location_id (MongoDB _id)", "access_token", "gmb_account_id"],
          received: {
            mongoId: !!mongoId,
            accessToken: !!accessToken,
            gmbAccountId: !!gmbAccountId
          }
        },
        { status: 400 }
      )
    }

    // ✅ Resolve real GMB location ID from MongoDB _id
    const dbLocation = await getLocationById(mongoId)
    if (!dbLocation) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 })
    }

    const cleanLocationId = cleanGmbLocationId(dbLocation.location_id) // ✅ real GMB ID
    const cleanAccId = gmbAccountId.replace('accounts/', '')

    const data = await fetchLocationReviews(cleanLocationId, cleanAccId, accessToken)

    return NextResponse.json(data)

  } catch (error: any) {
    console.error('Reviews API Route Error:', error)
    return NextResponse.json(
      {
        error: "Error fetching GMB location reviews",
        debug: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}