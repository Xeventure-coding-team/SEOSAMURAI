import { NextResponse } from "next/server"
import { stackServerApp } from "@/stack"
import { prisma } from "../../../../../lib/prisma"
import { checkRateLimit, getIdentifier } from "../../../../../lib/rate-limit"


function extractCleanLocation(placesData: any): string {
  if (!placesData?.address_components) {
    if (placesData?.formatted_address) {
      const parts = placesData.formatted_address.split(',')
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

  const cityTypes = ['locality', 'postal_town', 'administrative_area_level_2', 'administrative_area_level_3', 'sublocality_level_1', 'sublocality']
  for (const type of cityTypes) {
    const component = components.find((c: any) => c.types.includes(type))
    if (component) {
      city = component.long_name
      break
    }
  }

  const stateComponent = components.find((c: any) => c.types.includes('administrative_area_level_1'))
  if (stateComponent) state = stateComponent.long_name

  const countryComponent = components.find((c: any) => c.types.includes('country'))
  if (countryComponent) country = countryComponent.long_name

  const parts: string[] = []
  if (city) parts.push(city)
  if (state && state !== city) parts.push(state)
  if (country) parts.push(country)

  return parts.join(', ')
}

async function refreshGMBToken(userId: string): Promise<string | null> {
  try {
    if (!userId) return null;

    const gmbIntegration = await prisma.gmbIntegration.findUnique({
      where: { userId },
    });

    if (!gmbIntegration?.refreshToken) return null;

    if (gmbIntegration.tokenExpiry) {
      const bufferTime = 5 * 60 * 1000;
      if (new Date().getTime() + bufferTime < gmbIntegration.tokenExpiry.getTime()) {
        return gmbIntegration.accessToken;
      }
    }

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: gmbIntegration.refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) return null;

    const { access_token, expires_in } = await response.json();
    const tokenExpiry = new Date();
    tokenExpiry.setSeconds(tokenExpiry.getSeconds() + expires_in);

    await prisma.gmbIntegration.update({
      where: { id: gmbIntegration.id },
      data: { accessToken: access_token, tokenExpiry, updatedAt: new Date() },
    });

    return access_token;
  } catch {
    return null;
  }
}

async function getValidAccessToken(userId: string, currentToken: string): Promise<string | null> {
  try {
    const testResponse = await fetch(
      "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
      { headers: { Authorization: `Bearer ${currentToken}` } }
    );

    if (testResponse.ok) return currentToken;

    if (testResponse.status === 401) {
      return await refreshGMBToken(userId);
    }

    return null;
  } catch {
    return null;
  }
}

async function fetchLocationDetails(
  gmbLocationId: string,
  gmbAccountId: string,
  accessToken: string,
  apiKey: string | undefined
) {
  // 1. Basic location data
  const locationResponse = await fetch(
    `https://mybusinessaccountmanagement.googleapis.com/v1/locations/${gmbLocationId}?readMask=name,storeCode,profile,labels,metadata,categories,phoneNumbers`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  )

  if (!locationResponse.ok) {
    const errorText = await locationResponse.text()
    throw new Error(`GMB Account Management API error (${locationResponse.status}): ${errorText}`)
  }

  const locationData = await locationResponse.json()

  // 2. Media
  const mediaResponse = await fetch(
    `https://mybusiness.googleapis.com/v4/accounts/${gmbAccountId}/locations/${gmbLocationId}/media`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  )
  const mediaData = mediaResponse.ok ? await mediaResponse.json() : null

  // 3. Places
  let placesData = null
  let cleanLocation = ''

  if (locationData?.metadata?.placeId && apiKey) {
    const placesResponse = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${locationData.metadata.placeId}&fields=name,rating,formatted_address,address_components,geometry,opening_hours,reviews,website&key=${apiKey}`
    )
    if (placesResponse.ok) {
      const placesResult = await placesResponse.json()
      placesData = placesResult.result
      cleanLocation = extractCleanLocation(placesData)
    }
  }

  // 4. Reviews
  const reviewsResponse = await fetch(
    `https://mybusiness.googleapis.com/v4/accounts/${gmbAccountId}/locations/${gmbLocationId}/reviews`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  )
  const reviewsData = reviewsResponse.ok ? await reviewsResponse.json() : null

  return {
    data: locationData,
    hasPermission: true,
    locationData: placesData,
    location: cleanLocation || 'Location not available',
    reviews: reviewsData,
    media: mediaData,
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const mongoId = searchParams.get("location_name") || searchParams.get("place_id") // MongoDB _id
    const accessTokenParam = searchParams.get("access_token")
    const gmbAccountId = searchParams.get("gmb_account_id")
    const withPosts = searchParams.get("with_posts") === "true"
    const apiKey = process.env.PLACES_KEY

    const { limited, reset } = await checkRateLimit("strict", getIdentifier(req.headers));

    if (limited) {
      const retryAfter = reset ? Math.ceil((reset - Date.now()) / 1000) : 60;
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const user = await stackServerApp.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "User authentication required" }, { status: 401 });
    }

    if (!mongoId || !accessTokenParam || !gmbAccountId) {
      return NextResponse.json(
        {
          error: "Missing required parameters",
          required: ["location_name (MongoDB _id)", "access_token", "gmb_account_id"],
          received: { mongoId: !!mongoId, accessToken: !!accessTokenParam, gmbAccountId: !!gmbAccountId },
        },
        { status: 400 }
      )
    }

    const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;
    if (!OBJECT_ID_REGEX.test(mongoId)) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    // 1. Look up the location record by MongoDB _id — unambiguous across all users
    const dbLocation = await prisma.locations.findUnique({
      where: { id: mongoId },
      select: {
        is_active: true,
        location_id: true, // real GMB location ID e.g. "locations/123456"
      },
    });

    if (!dbLocation) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    // Strip "locations/" prefix for API calls
    const gmbLocationId = dbLocation.location_id.replace(/^locations\//, "")
    const cleanAccountId = gmbAccountId.replace(/^accounts\//, "")

    // 2. Validate / refresh access token
    const validAccessToken = await getValidAccessToken(user.id, accessTokenParam);
    if (!validAccessToken) {
      return NextResponse.json(
        { error: "Session expired. Please log in to Google My Business again." },
        { status: 401 }
      );
    }

    // 3. Fetch all GMB data using the real GMB location ID from DB
    const locationData = await fetchLocationDetails(gmbLocationId, cleanAccountId, validAccessToken, apiKey)

    // 4. Optionally fetch scheduled posts (user-scoped — correct here)
    let scheduledPosts: any[] = []
    if (withPosts) {
      scheduledPosts = await prisma.scheduledPost.findMany({
        where: {
          locationId: mongoId, // "locations/xxx" from DB
          accountId: cleanAccountId,
          user_id: user.id,
        },
        orderBy: { scheduledAt: "desc" },
      })
    }

    return NextResponse.json({
      location: {
        ...locationData,
        data: {
          ...locationData.data,
          is_active: dbLocation.is_active ?? false,
        },
      },
      scheduledPosts,
    });

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