import { NextResponse } from 'next/server';
import axios from 'axios';
import { prisma } from '../../../../../lib/prisma';
import { stackServerApp } from '@/stack';

// Types for better type safety
interface GMBLocation {
  name: string; 
  title?: string;
  profile?: any;
  websiteUri?: string;
  categories?: Array<{ displayName: string; categoryId: string }>;
  metadata: {
    placeId: string;
  };
}

interface RequestBody {
  placeId: string;
  accessToken: string;
  gmbAccountName: string;
}

interface APIResponse {
  hasPermission: boolean;
  exist?: boolean;
  message?: string;
  error?: string;
  details?: string;
}

// Utility function to validate GMB access token
async function validateGMBToken(token: string): Promise<boolean> {
  try {
    await axios.get('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return true;
  } catch {
    return false;
  }
}

// Utility function to fetch GMB locations with retry logic
async function fetchGMBLocations(
  gmbAccountName: string,
  gmbAccessToken: string,
  maxRetries: number = 3
): Promise<GMBLocation[]> {
  const url = `https://mybusinessbusinessinformation.googleapis.com/v1/${gmbAccountName}/locations`;
  const params = {
    readMask: 'name,title,profile,websiteUri,categories,metadata',
    pageSize: 100,
  };

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { data } = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${gmbAccessToken}`,
          'Content-Type': 'application/json'
        },
        params,
        timeout: 15000,
      });

      return data.locations || [];
    } catch (error: any) {
      console.error(`GMB API attempt ${attempt} failed:`, error?.response?.data || error?.message);

      if (attempt === maxRetries) {
        throw error;
      }

      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  return [];
}

export async function POST(req: Request): Promise<NextResponse<APIResponse>> {
  try {
    // Parse and validate request body
    let requestBody: RequestBody;
    try {
      requestBody = await req.json();
    } catch (error) {
      return NextResponse.json(
        { hasPermission: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { placeId, accessToken, gmbAccountName } = requestBody;

    // Input validation
    if (!placeId || typeof placeId !== 'string') {
      return NextResponse.json(
        { hasPermission: false, error: 'Valid placeId is required' },
        { status: 400 }
      );
    }

    if (!accessToken || typeof accessToken !== 'string') {
      return NextResponse.json(
        { hasPermission: false, error: 'Valid gmbAccessToken is required' },
        { status: 400 }
      );
    }

    if (!gmbAccountName || typeof gmbAccountName !== 'string') {
      return NextResponse.json(
        { hasPermission: false, error: 'Valid gmbAccountName is required' },
        { status: 400 }
      );
    }

    // Validate GMB account name format
    if (!gmbAccountName.startsWith('accounts/')) {
      return NextResponse.json(
        { hasPermission: false, error: 'Invalid gmbAccountName format' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const user = await stackServerApp.getUser();
    if (!user?.id) {
      return NextResponse.json(
        { hasPermission: false, error: 'User authentication required' },
        { status: 401 }
      );
    }

    // Validate GMB access token
    const isValidToken = await validateGMBToken(accessToken);
    if (!isValidToken) {
      return NextResponse.json(
        { hasPermission: false, error: 'Invalid or expired GMB access token' },
        { status: 401 }
      );
    }

    // Fetch locations from Google My Business first
    const locations = await fetchGMBLocations(gmbAccountName, accessToken);

    if (!locations.length) {
      return NextResponse.json({
        hasPermission: false,
        message: 'No locations found in GMB account'
      });
    }

    // Find the specific location using the place ID
    const foundLocation = locations.find(
      (loc: GMBLocation) => loc?.metadata?.placeId === placeId
    );

    if (!foundLocation) {
      return NextResponse.json({
        hasPermission: false,
        message: 'Location not found in your GMB account'
      });
    }

    // Extract the GMB location ID (resource name)
    const gmbLocationId = foundLocation.name; // This is the actual GMB location identifier

    if (!gmbLocationId) {
      return NextResponse.json({
        hasPermission: false,
        error: 'Invalid GMB location data - missing location name'
      });
    }

    // Check if location already exists using GMB location ID
    const existingLocation = await prisma.locations.findFirst({
      where: {
        user_id: user.id,
        location_id: gmbLocationId
      },
    });


    if (existingLocation) {
      return NextResponse.json({
        hasPermission: true,
        exist: true,
        message: 'Location already exists in your account',
      });
    }

    // Insert new location using GMB location ID as primary identifier
    try {
      await prisma.locations.create({
        data: {
          user_id: user.id,
          location_id: gmbLocationId,
          location_name: foundLocation.title || foundLocation.name || '',
          website: foundLocation.websiteUri || null,
          categories: foundLocation.categories
            ? JSON.stringify(foundLocation.categories)
            : null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      return NextResponse.json({
        hasPermission: true,
        exist: false,
        message: 'Location successfully added to your account'
      });

    } catch (dbError: any) {
      console.error('Database operation failed:', dbError);

      // Check if it's a unique constraint violation
      if (dbError.code === 'P2002') {
        return NextResponse.json({
          hasPermission: true,
          exist: true,
          message: 'Location already exists (concurrent request)'
        });
      }

      throw dbError;
    }

  } catch (error: any) {
    console.error('Location verification error:', {
      message: error?.message,
      response: error?.response?.data,
      status: error?.response?.status,
    });

    // Handle specific error types
    if (error?.response?.status === 401) {
      return NextResponse.json(
        {
          hasPermission: false,
          error: 'GMB authentication failed',
          message: 'Please re-authenticate with Google My Business'
        },
        { status: 401 }
      );
    }

    if (error?.response?.status === 403) {
      return NextResponse.json(
        {
          hasPermission: false,
          error: 'Insufficient permissions',
          message: 'You do not have permission to access this GMB account'
        },
        { status: 403 }
      );
    }

    if (error?.response?.status === 429) {
      return NextResponse.json(
        {
          hasPermission: false,
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.'
        },
        { status: 429 }
      );
    }

    if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
      return NextResponse.json(
        {
          hasPermission: false,
          error: 'Request timeout',
          message: 'GMB API request timed out. Please try again.'
        },
        { status: 408 }
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        hasPermission: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred. Please try again later.',
        ...(process.env.NODE_ENV === 'development' && { details: error?.message })
      },
      { status: 500 }
    );
  }
}