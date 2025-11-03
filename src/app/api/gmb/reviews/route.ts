import { NextResponse } from "next/server"

async function fetchLocationReviews(locationId: string, gmbAccountId: string, accessToken: string) {
  try {
    
    // Fetch reviews from GMB API
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
    const locationId = searchParams.get("location_id") || searchParams.get("location_name")
    const accessToken = searchParams.get("access_token")
    const gmbAccountId = searchParams.get("gmb_account_id")

    const cleanAccountId = gmbAccountId !== undefined || gmbAccountId !== null ? gmbAccountId?.replace('accounts/', '') : gmbAccountId
    
    if (!locationId || !accessToken || !cleanAccountId) {
      return NextResponse.json(
        {
          error: "Missing required parameters",
          required: ["location_id (or location_name)", "access_token", "gmb_account_id"],
          received: { 
            locationId: !!locationId, 
            accessToken: !!accessToken, 
            gmbAccountId: !!gmbAccountId 
          }
        },
        { status: 400 }
      )
    }

    const data = await fetchLocationReviews(locationId, cleanAccountId, accessToken)

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