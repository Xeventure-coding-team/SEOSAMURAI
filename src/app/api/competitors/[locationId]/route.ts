import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';
import { prisma } from '../../../../../lib/prisma';

interface GooglePlacesResult {
  id: string;
  displayName: { text: string; languageCode: string };
  formattedAddress: string;
  location: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  types: string[];
  businessStatus?: string;
  priceLevel?: string;
  googleMapsUri: string;
}

interface CompetitorData {
  id: string;
  name: string;
  address: string;
  rating?: number;
  reviewCount?: number;
  businessType: string;
  distance: number; // in meters
  googleMapsUri: string;
  rank: number; // 1, 2, 3, 4...
  lastUpdated: Date;
}

// Helper function to calculate distance between two coordinates
function calculateDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Enhanced Google Places search function
async function searchGooglePlaces(
  location: { lat: number; lng: number },
  businessType: string,
  apiKey: string,
  excludeLocationId?: string
): Promise<GooglePlacesResult[]> {
  const searchRadius = 10000; // 10km radius
  const query = encodeURIComponent(businessType);
  
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.lat},${location.lng}&radius=${searchRadius}&type=establishment&key=${apiKey}&keyword=${query}`;

  console.log('🔍 Google Places API URL:', url.replace(apiKey, 'API_KEY_HIDDEN'));

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Places API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('❌ Google Places API Error:', data);
      throw new Error(`Google Places API returned status: ${data.status} - ${data.error_message || 'Unknown error'}`);
    }

    if (data.status === 'ZERO_RESULTS') {
      console.log('⚠️ No results found for the search criteria');
      return [];
    }

    const results = (data.results || [])
      .filter((place: any) => {
        // Exclude the original location if provided
        if (excludeLocationId && place.place_id === excludeLocationId) {
          return false;
        }
        // Only include places with valid geometry
        return place.geometry && place.geometry.location;
      })
      .map((place: any) => ({
        id: place.place_id,
        displayName: {
          text: place.name,
          languageCode: 'en'
        },
        formattedAddress: place.vicinity || place.formatted_address || 'Address not available',
        location: {
          latitude: place.geometry?.location?.lat || 0,
          longitude: place.geometry?.location?.lng || 0
        },
        rating: place.rating,
        userRatingCount: place.user_ratings_total,
        types: place.types || [],
        businessStatus: place.business_status,
        priceLevel: place.price_level ? `PRICE_LEVEL_${place.price_level}` : undefined,
        googleMapsUri: `https://maps.google.com/maps/place/?q=place_id:${place.place_id}`
      }))
      .slice(0, 10); // Limit to 10 competitors

    console.log(`✅ Processed ${results.length} competitor results`);
    return results;
  } catch (error) {
    console.error('❌ Error in searchGooglePlaces:', error);
    throw new Error(`Error fetching competitors: ${error}`);
  }
}

// Main function to get competitors with caching per user
async function getCompetitors(
  locationId: string,
  businessType: string,
  currentLocation: { lat: number; lng: number },
  apiKey: string,
  forceUpdate: boolean = false
): Promise<{
  competitors: CompetitorData[];
  nextUpdateTime: Date;
  canUpdate: boolean;
  hoursUntilNextUpdate: number;
}> {
  try {
    console.log('🎯 Getting competitors for:', { locationId, businessType, currentLocation });

    // Get current user
    const user = await stackServerApp.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const userId = user.id;
    const now = new Date();
    console.log('👤 User ID:', userId);

    // Check existing analysis for this user
    const existingAnalysis = await prisma.competitorAnalysis.findUnique({
      where: {
        userId_locationId_businessType: {
          userId,
          locationId,
          businessType
        }
      }
    });

    const canUpdate = !existingAnalysis || now >= existingAnalysis.nextUpdate || forceUpdate;
    const hoursUntilNextUpdate = existingAnalysis 
      ? Math.max(0, Math.ceil((existingAnalysis.nextUpdate.getTime() - now.getTime()) / (1000 * 60 * 60)))
      : 0;

    console.log('📊 Analysis status:', { 
      hasExisting: !!existingAnalysis, 
      canUpdate, 
      hoursUntilNextUpdate,
      forceUpdate
    });

    // If we have data and it's not time to update yet, return cached results
    if (existingAnalysis && !canUpdate) {
      console.log(`♻️ Returning cached competitor data. Next update in ${hoursUntilNextUpdate} hours`);
      return {
        competitors: existingAnalysis.competitors as CompetitorData[],
        nextUpdateTime: existingAnalysis.nextUpdate,
        canUpdate: false,
        hoursUntilNextUpdate
      };
    }

    console.log('🔄 Fetching fresh competitor data from Google Places API');

    // Fetch fresh data from Google Places API
    const placesResults = await searchGooglePlaces(
      currentLocation,
      businessType,
      apiKey,
      locationId
    );

    if (placesResults.length === 0) {
      console.log('⚠️ No competitors found in the area');
      
      // Still save the empty result to avoid repeated API calls
      const nextUpdate = new Date(now.getTime() + (24 * 60 * 60 * 1000));
      
      if (existingAnalysis) {
        await prisma.competitorAnalysis.delete({
          where: { id: existingAnalysis.id }
        });
      }

      await prisma.competitorAnalysis.create({
        data: {
          userId,
          locationId,
          businessType,
          competitors: [],
          lastUpdated: now,
          nextUpdate: nextUpdate
        }
      });

      return {
        competitors: [],
        nextUpdateTime: nextUpdate,
        canUpdate: true,
        hoursUntilNextUpdate: 0
      };
    }

    // Transform results to CompetitorData format with rankings
    const competitors: CompetitorData[] = placesResults.map((place, index) => {
      const distance = calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        place.location.latitude,
        place.location.longitude
      );

      return {
        id: place.id,
        name: place.displayName.text,
        address: place.formattedAddress,
        rating: place.rating,
        reviewCount: place.userRatingCount,
        businessType: businessType,
        distance: distance,
        googleMapsUri: place.googleMapsUri,
        rank: index + 1, // Initial ranking
        lastUpdated: new Date()
      };
    });

    // Sort by distance (closest first)
    competitors.sort((a, b) => a.distance - b.distance);
    
    // Re-assign rankings after sorting to ensure they're correct
    competitors.forEach((competitor, index) => {
      competitor.rank = index + 1;
    });

    console.log('📍 Competitors ranked by distance:', 
      competitors.map(c => `#${c.rank}: ${c.name} (${(c.distance/1000).toFixed(1)}km)`)
    );

    // Calculate next update time (24 hours from now)
    const nextUpdate = new Date(now.getTime() + (24 * 60 * 60 * 1000));

    // Delete old data and save new data (fresh start each day)
    if (existingAnalysis) {
      await prisma.competitorAnalysis.delete({
        where: {
          id: existingAnalysis.id
        }
      });
      console.log('🗑️ Deleted old competitor analysis');
    }

    // Create fresh analysis
    await prisma.competitorAnalysis.create({
      data: {
        userId,
        locationId,
        businessType,
        competitors: competitors,
        lastUpdated: now,
        nextUpdate: nextUpdate
      }
    });

    console.log('💾 Saved new competitor analysis to database');
    console.log('⏰ Next update time:', nextUpdate.toISOString());

    return {
      competitors,
      nextUpdateTime: nextUpdate,
      canUpdate: true,
      hoursUntilNextUpdate: 0
    };

  } catch (error) {
    console.error('❌ Error in getCompetitors:', error);
    
    // If API fails, try to return cached data for this user
    try {
      const user = await stackServerApp.getUser();
      if (user) {
        const fallbackAnalysis = await prisma.competitorAnalysis.findUnique({
          where: {
            userId_locationId_businessType: {
              userId: user.id,
              locationId,
              businessType
            }
          }
        });

        if (fallbackAnalysis) {
          console.log('♻️ Returning fallback cached data due to API error');
          const now = new Date();
          const hoursUntilNextUpdate = Math.max(0, Math.ceil((fallbackAnalysis.nextUpdate.getTime() - now.getTime()) / (1000 * 60 * 60)));
          
          return {
            competitors: fallbackAnalysis.competitors as CompetitorData[],
            nextUpdateTime: fallbackAnalysis.nextUpdate,
            canUpdate: now >= fallbackAnalysis.nextUpdate,
            hoursUntilNextUpdate
          };
        }
      }
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError);
    }

    throw new Error(`Failed to get competitors: ${error}`);
  }
}

// Main GET handler for competitor analysis
export async function GET(
  request: NextRequest,
  { params }: { params: { locationId: string } }
) {
  try {
    console.log('🔍 Competitor API called:', params.locationId);

    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const businessType = searchParams.get('businessType');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const forceUpdate = searchParams.get('forceUpdate') === 'true';

    console.log('📋 Parameters:', { businessType, lat, lng, forceUpdate });

    // Validation
    if (!businessType) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'businessType parameter is required',
          example: '/api/competitors/4467341254111284164?businessType=Shopping%20Centre&lat=11.6634352&lng=76.25602119999999'
        },
        { status: 400 }
      );
    }

    if (!lat || !lng) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'lat and lng parameters are required',
          example: '/api/competitors/4467341254111284164?businessType=Shopping%20Centre&lat=11.6634352&lng=76.25602119999999'
        },
        { status: 400 }
      );
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid latitude or longitude values' 
        },
        { status: 400 }
      );
    }

    // Validate coordinates range
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Coordinates out of valid range' 
        },
        { status: 400 }
      );
    }

    // Check API key
    const apiKey = process.env.PLACES_KEY;
    if (!apiKey) {
      console.error('❌ Google Places API key not found in environment variables');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Google Places API key not configured' 
        },
        { status: 500 }
      );
    }

    console.log('🔑 API Key found, proceeding with competitor search...');

    // Get competitors data
    const result = await getCompetitors(
      params.locationId,
      businessType,
      { lat: latitude, lng: longitude },
      apiKey,
      forceUpdate
    );

    console.log(`✅ Found ${result.competitors.length} competitors`);

    // Success response
    return NextResponse.json({
      success: true,
      data: {
        locationId: params.locationId,
        businessType,
        coordinates: { lat: latitude, lng: longitude },
        competitors: result.competitors,
        metadata: {
          totalCount: result.competitors.length,
          nextUpdateTime: result.nextUpdateTime,
          canUpdate: result.canUpdate,
          hoursUntilNextUpdate: result.hoursUntilNextUpdate,
          lastUpdated: result.competitors[0]?.lastUpdated || new Date(),
          searchRadius: '10km',
          location: 'Kalpetta, Kerala'
        }
      }
    }, { 
      status: 200,
      headers: {
        'Cache-Control': result.canUpdate ? 'no-cache' : 'private, max-age=3600',
        'Content-Type': 'application/json',
      }
    });

  } catch (error) {
    console.error('❌ Competitor API Error:', error);

    // Handle different error types
    if (error instanceof Error) {
      if (error.message.includes('User not authenticated')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Authentication required. Please log in to access competitor analysis.',
            code: 'AUTH_REQUIRED'
          },
          { status: 401 }
        );
      }

      if (error.message.includes('Google Places API')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Unable to fetch competitor data from Google Places',
            details: error.message,
            code: 'EXTERNAL_API_ERROR'
          },
          { status: 503 }
        );
      }

      if (error.message.includes('Rate limit')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'API rate limit exceeded. Please try again later.',
            code: 'RATE_LIMIT'
          },
          { status: 429 }
        );
      }

      if (error.message.includes('database') || error.message.includes('Prisma')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Database error occurred',
            code: 'DATABASE_ERROR'
          },
          { status: 500 }
        );
      }
    }

    // Generic error
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error occurred while fetching competitors',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Handle POST method (optional - for future use)
export async function POST(
  request: NextRequest,
  { params }: { params: { locationId: string } }
) {
  try {
    const body = await request.json();
    const { businessType, lat, lng, forceUpdate = false } = body;

    if (!businessType || !lat || !lng) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'businessType, lat, and lng are required in request body' 
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Google Places API key not configured' 
        },
        { status: 500 }
      );
    }

    const result = await getCompetitors(
      params.locationId,
      businessType,
      { lat: parseFloat(lat), lng: parseFloat(lng) },
      apiKey,
      forceUpdate
    );

    return NextResponse.json({
      success: true,
      message: 'Competitor analysis completed',
      data: {
        competitors: result.competitors,
        nextUpdateTime: result.nextUpdateTime,
        canUpdate: result.canUpdate,
        hoursUntilNextUpdate: result.hoursUntilNextUpdate
      }
    });

  } catch (error) {
    console.error('❌ POST Competitor API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process competitor analysis request' 
      },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function PUT() {
  return NextResponse.json(
    { 
      success: false, 
      error: 'Method PUT not allowed. Use GET or POST instead.',
      allowedMethods: ['GET', 'POST']
    },
    { 
      status: 405,
      headers: {
        'Allow': 'GET, POST'
      }
    }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { 
      success: false, 
      error: 'Method DELETE not allowed. Use GET or POST instead.',
      allowedMethods: ['GET', 'POST']
    },
    { 
      status: 405,
      headers: {
        'Allow': 'GET, POST'
      }
    }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { 
      success: false, 
      error: 'Method PATCH not allowed. Use GET or POST instead.',
      allowedMethods: ['GET', 'POST']
    },
    { 
      status: 405,
      headers: {
        'Allow': 'GET, POST'
      }
    }
  );
}

// Export route segment config (optional)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;