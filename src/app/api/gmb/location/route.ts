import { NextResponse } from "next/server"
import { stackServerApp } from "@/stack"
import { prisma } from "../../../../../lib/prisma"

// Add this helper function at the top
function extractCleanLocation(placesData: any): string {
  if (!placesData?.address_components) {
    // Fallback: parse from formatted_address
    if (placesData?.formatted_address) {
      const parts = placesData.formatted_address.split(',')
      // Get last 3 parts: City, State, Country
      if (parts.length >= 3) {
        const city = parts[parts.length - 4]?.trim() || parts[parts.length - 3]?.trim()
        const state = parts[parts.length - 2]?.trim()
        const country = parts[parts.length - 1]?.trim()
        return [city, state, country].filter(Boolean).join(', ')
      }
    }
    return ''
  }

  const components = placesData.address_components
  let city = null
  let state = null
  let country = null

  // Extract CITY
  const cityTypes = ['locality', 'postal_town', 'administrative_area_level_2', 'administrative_area_level_3', 'sublocality_level_1', 'sublocality']
  for (const type of cityTypes) {
    const component = components.find((c: any) => c.types.includes(type))
    if (component) {
      city = component.long_name
      break
    }
  }

  // Extract STATE
  const stateComponent = components.find((c: any) => c.types.includes('administrative_area_level_1'))
  if (stateComponent) state = stateComponent.long_name

  // Extract COUNTRY
  const countryComponent = components.find((c: any) => c.types.includes('country'))
  if (countryComponent) country = countryComponent.long_name

  // Build location string
  const parts: string[] = []
  if (city) parts.push(city)
  if (state && state !== city) parts.push(state)
  if (country) parts.push(country)

  const result = parts.join(', ')
  return result
}

async function fetchLocationDetails(locationId: string, gmbAccountId: string, accessToken: string, apiKey: string | undefined) {
  try {

    // 1. Get basic location data from GMB Account Management API
    const locationResponse = await fetch(
      `https://mybusinessaccountmanagement.googleapis.com/v1/locations/${locationId}?readMask=name,storeCode,profile,labels,metadata,categories`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )


    if (!locationResponse.ok) {
      const errorText = await locationResponse.text()
      throw new Error(`GMB Account Management API error (${locationResponse.status}): ${errorText}`)
    }

    const locationData = await locationResponse.json()

    // 2. Get media data
    const mediaResponse = await fetch(
      `https://mybusiness.googleapis.com/v4/accounts/${gmbAccountId}/locations/${locationId}/media`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )

    let mediaData = null
    if (mediaResponse.ok) {
      mediaData = await mediaResponse.json()
    }


    // 3. Get Google Places data (if we have a place ID)
    let placesData = null;
    let cleanLocation = '';

    if (locationData?.metadata?.placeId && apiKey) {

      const placesResponse = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${locationData.metadata.placeId}&fields=name,rating,formatted_address,address_components,geometry,opening_hours,reviews,website&key=${apiKey}`
      );

      if (placesResponse.ok) {
        const placesResult = await placesResponse.json();
        placesData = placesResult.result;
        cleanLocation = extractCleanLocation(placesData);
      } else {
        console.log('Places API failed:', await placesResponse.text()) // DEBUG LOG
      }
    }

    // 4. Get reviews
    let reviewsData = null
    const reviewsResponse = await fetch(
      `https://mybusiness.googleapis.com/v4/accounts/${gmbAccountId}/locations/${locationId}/reviews`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (reviewsResponse.ok) {
      reviewsData = await reviewsResponse.json()
    }

    return {
      data: locationData,
      hasPermission: true,
      locationData: placesData,
      location: cleanLocation || 'Location not available',  // Add fallback
      reviews: reviewsData,
      media: mediaData,
    }

  } catch (error) {
    console.error('Error in fetchLocationDetails:', error)
    throw error
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const locationId = searchParams.get("location_name") || searchParams.get("place_id")
    const accessToken = searchParams.get("access_token")
    const gmbAccountId = searchParams.get("gmb_account_id")
    const withPosts = searchParams.get("with_posts") === "true"
    const apiKey = process.env.PLACES_KEY
    const user = await stackServerApp.getUser();

    if (!locationId || !accessToken || !gmbAccountId) {
      return NextResponse.json(
        {
          error: "Missing required parameters",
          required: ["location_name (or place_id)", "access_token", "gmb_account_id"],
          received: { locationId: !!locationId, accessToken: !!accessToken, gmbAccountId: !!gmbAccountId },
        },
        { status: 400 }
      )
    }

    // Fetch GMB location details
    const locationData = await fetchLocationDetails(locationId, gmbAccountId, accessToken, apiKey)

    const cleanLocationId = locationId.replace(/^locations\//, "");
    const cleanAccountId = gmbAccountId.replace(/^accounts\//, "");

    // If with_posts=true, fetch scheduled posts for this location
    let scheduledPosts: any[] = []
    if (withPosts) {
      scheduledPosts = await prisma.scheduledPost.findMany({
        where: { locationId: cleanLocationId, accountId: cleanAccountId, user_id: user?.id },
        orderBy: { scheduledAt: "desc" },
      })
    }

    return NextResponse.json({ location: locationData, scheduledPosts })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Error fetching GMB location",
        debug: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}