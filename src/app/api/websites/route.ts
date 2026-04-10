import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '../../../../lib/prisma';

const createWebsiteSchema = z.object({
  userId: z.string(),
  locationId: z.string().optional(),   // optional for now
  accountId: z.string().optional(),
  placeId: z.string().min(1),          // ← NEW: Google Place ID (required)
  subdomain: z.string().min(3).regex(/^[a-z0-9-]+$/),
  title: z.string().optional(),        // will be overridden by Google data
  description: z.string().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  enabledSections: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const locationId = searchParams.get('locationId');

    const where: any = {};
    if (userId) where.userId = userId;
    if (locationId) where.locationId = locationId;

    const websites = await prisma.website.findMany({
      where,
      include: { cachedData: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ websites });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch websites' }, { status: 500 });
  }
}

async function fetchGooglePlaceData(placeId: string) {
  const apiKey = process.env.NEXT_PUBLIC_PLACES_KEY;
  if (!apiKey) throw new Error('Google Places API key not configured');

  const url = `https://places.googleapis.com/v1/places/${placeId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': `
        id,
        displayName,
        formattedAddress,
        shortFormattedAddress,
        internationalPhoneNumber,
        nationalPhoneNumber,
        websiteUri,
        regularOpeningHours,
        rating,
        userRatingCount,
        photos,
        reviews,
        types,
        location,
        viewport,
        businessStatus,
        priceLevel,
        editorialSummary,
        currentOpeningHours
      `.replace(/\s+/g, ''), // clean field mask
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Places API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = createWebsiteSchema.parse(body);

    // 1. Fetch fresh data from Google Places API
    const googleData = await fetchGooglePlaceData(validated.placeId);

    // 2. Prepare data for Website model
    const websiteData = {
      userId: validated.userId,
      locationId: validated.locationId || validated.placeId, // fallback
      accountId: validated.accountId || '',
      subdomain: validated.subdomain,
      title: googleData.displayName?.text || validated.title || 'My Business',
      description: googleData.editorialSummary?.text || validated.description || '',
      logoUrl: googleData.photos?.[0] 
        ? `https://places.googleapis.com/v1/${googleData.photos[0].name}/media?key=${process.env.NEXT_PUBLIC_PLACES_KEY}&maxHeightPx=400`
        : null,
      primaryColor: validated.primaryColor || "#10b981",
      secondaryColor: validated.secondaryColor || "#f59e0b",
      enabledSections: validated.enabledSections || ["hero", "reviews", "gallery", "contact"],
      isPublished: true,
      publishedAt: new Date(),
    };

    // Check subdomain uniqueness
    const existing = await prisma.website.findUnique({
      where: { subdomain: validated.subdomain },
    });
    if (existing) {
      return NextResponse.json({ error: 'Subdomain already taken' }, { status: 409 });
    }

    // 3. Create Website + CachedData in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const website = await tx.website.create({
        data: websiteData,
      });

      // Store raw Google data in WebsiteCachedData
      const cachedData = await tx.websiteCachedData.create({
        data: {
          websiteId: website.id,
          businessInfo: googleData as any,           // full place object
          reviews: googleData.reviews || null,
          photos: googleData.photos || null,
          posts: null, // Posts usually require full GBP API
          lastSyncedAt: new Date(),
          nextSyncAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours later
        },
      });

      return { website, cachedData };
    });

    return NextResponse.json({
      message: 'Website created successfully',
      website: result.website,
      cachedData: result.cachedData,
      googleDataSummary: {
        name: googleData.displayName?.text,
        address: googleData.formattedAddress,
        rating: googleData.rating,
        photoCount: googleData.photos?.length || 0,
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Website creation error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    return NextResponse.json({
      error: error.message || 'Failed to create website and fetch Google data'
    }, { status: 500 });
  }
}