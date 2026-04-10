import { NextResponse } from "next/server"
import { stackServerApp } from "@/stack"
import { prisma } from "../../../../../lib/prisma"


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

// Function to refresh GMB access token
async function refreshGMBToken(userId: string): Promise<string | null> {
  try {
    if (!userId) {
      return null;
    }

    // Get the GMB integration record for the user
    const gmbIntegration = await prisma.gmbIntegration.findUnique({
      where: { userId: userId },
    });

    if (!gmbIntegration) {
      return null;
    }

    if (!gmbIntegration.refreshToken) {
      return null;
    }

    // Check if token is still valid (5 minute buffer)
    if (gmbIntegration.tokenExpiry) {
      const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
      if (new Date().getTime() + bufferTime < gmbIntegration.tokenExpiry.getTime()) {
        // Token is still valid, return existing access token
        return gmbIntegration.accessToken;
      }
    }

    // Refresh the token using Google OAuth endpoint
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: gmbIntegration.refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const { access_token, expires_in } = data;

    // Calculate new expiry date
    const tokenExpiry = new Date();
    tokenExpiry.setSeconds(tokenExpiry.getSeconds() + expires_in);

    // Update the access token in database
    await prisma.gmbIntegration.update({
      where: { id: gmbIntegration.id },
      data: {
        accessToken: access_token,
        tokenExpiry: tokenExpiry,
        updatedAt: new Date(),
      },
    });

    return access_token;
  } catch (error) {
    return null;
  }
}

// Function to get valid token (refreshes if needed)
async function getValidAccessToken(userId: string, currentToken: string): Promise<string | null> {
  try {
    // First, try to use the current token
    const testResponse = await fetch(
      "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
      {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      }
    );

    // If token is valid, return it
    if (testResponse.ok) {
      return currentToken;
    }

    // If token is expired (401), try to refresh
    if (testResponse.status === 401) {
      const newToken = await refreshGMBToken(userId);
      if (newToken) {
        return newToken;
      }
    }

    // If other error or refresh failed
    return null;
  } catch (error) {
    return null;
  }
}

async function fetchLocationDetails(locationId: string, gmbAccountId: string, accessToken: string, apiKey: string | undefined) {
  try {
    // 1. Get basic location data from GMB Account Management API
    const locationResponse = await fetch(
      `https://mybusinessaccountmanagement.googleapis.com/v1/locations/${locationId}?readMask=name,storeCode,profile,labels,metadata,categories,phoneNumbers`,
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
    throw error
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const locationId = searchParams.get("location_name") || searchParams.get("place_id")
    const accessTokenParam = searchParams.get("access_token")
    const gmbAccountId = searchParams.get("gmb_account_id")
    const withPosts = searchParams.get("with_posts") === "true"
    const apiKey = process.env.PLACES_KEY
    const user = await stackServerApp.getUser();

    // Check authentication
    if (!user?.id) {
      return NextResponse.json(
        { error: "User authentication required" },
        { status: 401 }
      );
    }

    if (!locationId || !accessTokenParam || !gmbAccountId) {
      return NextResponse.json(
        {
          error: "Missing required parameters",
          required: ["location_name (or place_id)", "access_token", "gmb_account_id"],
          received: { locationId: !!locationId, accessToken: !!accessTokenParam, gmbAccountId: !!gmbAccountId },
        },
        { status: 400 }
      )
    }

    // Get valid token (auto-refreshes if needed)
    const validAccessToken = await getValidAccessToken(user.id, accessTokenParam);
    
    if (!validAccessToken) {
      return NextResponse.json(
        { error: "Session expired. Please log in to Google My Business again." },
        { status: 401 }
      );
    }

    // Fetch GMB location details with the valid token
    const locationData = await fetchLocationDetails(locationId, gmbAccountId, validAccessToken, apiKey)

    const cleanLocationId = locationId.replace(/^locations\//, "");
    const cleanAccountId = gmbAccountId.replace(/^accounts\//, "");

    // If with_posts=true, fetch scheduled posts for this location
    let scheduledPosts: any[] = []
    if (withPosts) {
      scheduledPosts = await prisma.scheduledPost.findMany({
        where: { locationId: cleanLocationId, accountId: cleanAccountId, user_id: user.id },
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