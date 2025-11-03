import { NextResponse } from "next/server";
import axios from "axios";
import { prisma } from "../../../../../lib/prisma";
import { stackServerApp } from "@/stack";

// Types for better type safety
interface LocationDetails {
  name: string;
  title?: string;
  profile?: any;
  websiteUri?: string;
  categories?: Array<{ displayName: string; categoryId: string }>;
  serviceArea?: {
    businessType?: string;
    regionCode?: string;
    places?: Array<{ placeId: string; name: string }>;
  };
  storefrontAddress?: {
    revision?: number;
    regionCode?: string;
    languageCode?: string;
    postalCode?: string;
    sortingCode?: string;
    administrativeArea?: string;
    locality?: string;
    sublocality?: string;
    addressLines?: string[];
    recipients?: string[];
    organization?: string;
  };
  metadata?: {
    placeId?: string;
  };
}

interface DBLocation {
  location_id: string;
  location_name: string;
  website: string | null;
  categories: string | null;
  last_rank_updated: Date | null;
}

interface DetailedLocation extends LocationDetails {
  location_id: string;
  last_rank_updated: Date | null;
  displayName?: string;
  businessWebsite?: string;
  formattedAddress?: string;
}

// Utility function to validate GMB access token
async function validateGMBToken(token: string): Promise<boolean> {
  try {
    const response = await axios.get('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000,
    });
    return response.status === 200;
  } catch (error) {
    console.error('GMB token validation failed:', error);
    return false;
  }
}

// Extract display name from various API response fields
function extractDisplayName(locationData: LocationDetails): string {
  if (locationData.title) {
    return locationData.title;
  }
  
  if (locationData.profile?.businessName) {
    return locationData.profile.businessName;
  }
  
  if (locationData.name) {
    const parts = locationData.name.split('/');
    const locationId = parts[parts.length - 1];
    return locationId || locationData.name;
  }
  
  return 'Unknown Location';
}

// Extract formatted address from various API response fields
function extractFormattedAddress(locationData: LocationDetails): string | null {
  if (locationData.storefrontAddress) {
    const addr = locationData.storefrontAddress;
    const addressParts: string[] = [];
    
    if (addr.addressLines && addr.addressLines.length > 0) {
      addressParts.push(...addr.addressLines);
    }
    
    if (addr.locality) {
      addressParts.push(addr.locality);
    }
    
    if (addr.administrativeArea) {
      addressParts.push(addr.administrativeArea);
    }
    
    if (addr.postalCode) {
      addressParts.push(addr.postalCode);
    }
    
    if (addressParts.length > 0) {
      return addressParts.join(', ');
    }
  }
  
  if (locationData.profile?.address) {
    return locationData.profile.address;
  }
  
  return null;
}

// Extract website URL from various API response fields
function extractWebsiteUrl(locationData: LocationDetails): string | null {
  if (locationData.websiteUri) {
    return locationData.websiteUri;
  }
  
  if (locationData.profile?.websiteUrl) {
    return locationData.profile.websiteUrl;
  }
  
  if (locationData.profile?.description) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const match = locationData.profile.description.match(urlRegex);
    if (match && match.length > 0) {
      return match[0];
    }
  }
  
  return null;
}

// Fetch location details from Google with improved error handling
async function fetchLocationDetails(
  locationId: string,
  accessToken: string
): Promise<LocationDetails | null> {
  // Validate locationId format - it should be locations/XXXXXXX
  if (!locationId || !locationId.startsWith('locations/')) {
    console.error(`❌ Invalid location ID format: ${locationId} - Expected format: locations/XXXXXXX`);
    return null;
  }

  // Construct API URL
  const apiUrl = `https://mybusinessbusinessinformation.googleapis.com/v1/${locationId}`;
  
  const params = {
    readMask: 'name,title,profile,websiteUri,categories,serviceArea,storefrontAddress,metadata'
  };

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount < maxRetries) {
    try {
      const { data } = await axios.get(apiUrl, {
        headers,
        params,
        timeout: 15000
      });
      return data;
    } catch (error: any) {
      console.error(`❌ Attempt ${retryCount + 1} failed for ${locationId}:`, {
        status: error.response?.status,
        message: error.message,
        url: apiUrl,
        data: error.response?.data
      });

      // Handle rate limiting
      if (error.response?.status === 429) {
        const waitTime = Math.min(Math.pow(2, retryCount) * 2000, 10000);
        console.warn(`⏳ Rate limit exceeded. Retrying in ${waitTime / 1000}s...`);
        await new Promise((res) => setTimeout(res, waitTime));
        retryCount++;
        continue;
      }

      // Handle authentication errors
      if (error.response?.status === 401) {
        throw new Error('Invalid or expired access token');
      }

      // Handle forbidden/permission errors
      if (error.response?.status === 403) {
        console.warn(`🚫 Access forbidden for location: ${locationId}`);
        return null;
      }

      // Handle not found errors
      if (error.response?.status === 404) {
        console.warn(`🔍 Location not found: ${locationId}`);
        return null;
      }

      // For other errors, retry
      if (retryCount < maxRetries - 1) {
        const waitTime = Math.pow(2, retryCount) * 1000;
        await new Promise((res) => setTimeout(res, waitTime));
        retryCount++;
      } else {
        console.error(`💥 Failed to fetch location after ${maxRetries} attempts: ${locationId}`);
        return null;
      }
    }
  }

  return null;
}

// Process locations in batches
async function fetchLocationsBatch(
  locations: DBLocation[],
  accessToken: string,
  batchSize: number = 3
): Promise<DetailedLocation[]> {
  const results: DetailedLocation[] = [];

  for (let i = 0; i < locations.length; i += batchSize) {
    const batch = locations.slice(i, i + batchSize);
    
    const batchResults = await Promise.allSettled(
      batch.map(async (location): Promise<DetailedLocation | null> => {
        
        try {
          const googleData = await fetchLocationDetails(location.location_id, accessToken);
          
          if (!googleData) {
            console.warn(`⚠️ Using database fallback for: ${location.location_id}`);
            return {
              name: location.location_id,
              title: location.location_name || '',
              websiteUri: location.website || undefined,
              categories: location.categories ? JSON.parse(location.categories) : undefined,
              location_id: location.location_id,
              last_rank_updated: location.last_rank_updated,
              displayName: location.location_name || 'Unknown Location',
              businessWebsite: location.website || null,
              formattedAddress: null,
            };
          }

          // Extract dynamic data from API response
          const displayName = extractDisplayName(googleData);
          const businessWebsite = extractWebsiteUrl(googleData);
          const formattedAddress = extractFormattedAddress(googleData);

          return {
            ...googleData,
            location_id: location.location_id,
            last_rank_updated: location.last_rank_updated,
            displayName,
            businessWebsite,
            formattedAddress,
          };
        } catch (error) {
          console.error(`💥 Error processing location ${location.location_id}:`, error);
          return {
            name: location.location_id,
            title: location.location_name || '',
            websiteUri: location.website || undefined,
            categories: location.categories ? JSON.parse(location.categories) : undefined,
            location_id: location.location_id,
            last_rank_updated: location.last_rank_updated,
            displayName: location.location_name || 'Unknown Location',
            businessWebsite: location.website || null,
            formattedAddress: null,
          };
        }
      })
    );

    // Process batch results
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        results.push(result.value);
      } else {
        console.warn(`⚠️ Failed to process location: ${batch[index].location_id}`, result.reason);
        const location = batch[index];
        results.push({
          name: location.location_id,
          title: location.location_name || '',
          websiteUri: location.website || undefined,
          location_id: location.location_id,
          last_rank_updated: location.last_rank_updated,
          displayName: location.location_name || 'Unknown Location',
          businessWebsite: location.website || null,
          formattedAddress: null,
        });
      }
    });

    
    // Add delay between batches
    if (i + batchSize < locations.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return results;
}

export async function GET(req: Request) {
  try {
    // Get authenticated user
    const user = await stackServerApp.getUser();
    if (!user?.id) {
      return NextResponse.json(
        { error: "User authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const accessToken = searchParams.get("accessToken");

    // Validate required parameters
    if (!accessToken) {
      return NextResponse.json(
        { error: "Missing accessToken parameter" },
        { status: 400 }
      );
    }

    // Validate GMB access token
    const isValidToken = await validateGMBToken(accessToken);
    if (!isValidToken) {
      return NextResponse.json(
        { error: "Invalid or expired GMB access token" },
        { status: 401 }
      );
    }

    // Get locations from database
    const dbLocations = await prisma.locations.findMany({
      where: { user_id: user.id },
      select: {
        location_id: true,
        location_name: true,
        website: true,
        categories: true,
        last_rank_updated: true,
      },
    });

    if (dbLocations.length === 0) {
      return NextResponse.json({
        accounts: [],
        source: "database",
        count: 0,
      });
    }

    // Fetch Google details in batches
    const detailedLocations = await fetchLocationsBatch(dbLocations, accessToken);

    // Log summary of results
    const successfulFetches = detailedLocations.filter(loc => loc.profile || loc.title).length;
    
    return NextResponse.json({
      accounts: detailedLocations,
      source: "google_api_with_database_fallback",
      count: detailedLocations.length,
      successfulFetches,
      summary: {
        total: detailedLocations.length,
        withGoogleData: successfulFetches,
        databaseFallback: detailedLocations.length - successfulFetches
      }
    });

  } catch (error: any) {
    console.error("Error in GMB locations API:", {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });

    if (error.message?.includes('Invalid or expired access token')) {
      return NextResponse.json(
        {
          error: "Authentication failed",
          message: "Please re-authenticate with Google My Business"
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: "Error fetching GMB locations",
        message: "An unexpected error occurred while fetching location data",
        ...(process.env.NODE_ENV === 'development' && { debug: error.message })
      },
      { status: 500 }
    );
  }
}