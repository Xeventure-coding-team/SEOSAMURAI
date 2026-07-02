import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { prisma } from '../../../../../../lib/prisma';
import { checkRateLimit, getIdentifier } from '../../../../../../lib/rate-limit';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: websiteId } = await params;

    try {
        // =========================
        // FETCH WEBSITE & EXISTING DATA
        // =========================
        const website = await prisma.website.findUnique({
            where: { id: websiteId },
            include: { cachedData: true },
        });

        if (!website) {
            return NextResponse.json(
                { error: 'Website not found' },
                { status: 404 }
            );
        }

        const { limited, reset } = await checkRateLimit("strict", getIdentifier(req.headers));

        if (limited) {
            const retryAfter = reset ? Math.ceil((reset - Date.now()) / 1000) : 60;
            return NextResponse.json(
                {
                    success: false,
                    error: "Too many requests. Please try again later.",
                },
                {
                    status: 429,
                    headers: {
                        "Retry-After": String(retryAfter),
                    },
                }
            );
        }

        // Get the existing cached data to preserve it
        const existingCachedData = website.cachedData;
        const existingBusinessInfo = existingCachedData?.businessInfo as any || {};
        const existingReviews = existingCachedData?.reviews as any[] || [];
        const existingPhotos = existingCachedData?.photos as any[] || [];
        const existingPosts = existingCachedData?.posts as any[] || [];

        // =========================
        // FETCH FRESH DATA FROM GMB API
        // =========================
        if (!website.locationId || !website.accountId) {
            return NextResponse.json(
                { error: 'Website missing locationId or accountId for sync' },
                { status: 400 }
            );
        }

        let freshReviews: any[] = [];
        let freshPhotos: any[] = [];
        let freshPosts: any[] = [];
        let freshBusinessInfo: any = {};
        let freshLocation: any = null;
        let freshLocationData: any = null;

        try {
            // Call your internal GMB endpoint
            const gmbResponse = await axios.get(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/gmb/location`, {
                params: {
                    location_name: website.locationId,
                    gmb_account_id: website.accountId,
                    with_posts: true,
                },
                headers: {
                    // If your endpoint requires auth, add it here
                    'X-Skip-Auth': 'internal-sync', // optional internal flag
                },
            });

            if (gmbResponse.data) {
                const gmbData = gmbResponse.data.location || {};
                const locationData = gmbData.locationData || gmbData.data || {};

                // ✅ Extract fresh reviews (top 10, rating >= 4)
                const allReviews = gmbData.reviews?.reviews || [];
                const getRating = (review: any) => {
                    if (review.rating) return Number(review.rating);
                    if (review.starRating === 'FIVE') return 5;
                    if (review.starRating === 'FOUR') return 4;
                    if (review.starRating === 'THREE') return 3;
                    if (review.starRating === 'TWO') return 2;
                    if (review.starRating === 'ONE') return 1;
                    return 0;
                };

                freshReviews = allReviews
                    .filter(r => getRating(r) >= 4)
                    .sort((a, b) => {
                        const ratingDiff = getRating(b) - getRating(a);
                        if (ratingDiff !== 0) return ratingDiff;
                        const timeA = new Date(a.createTime || a.time || 0).getTime();
                        const timeB = new Date(b.createTime || b.time || 0).getTime();
                        return timeB - timeA;
                    })
                    .slice(0, 10);

                // ✅ Extract fresh photos (top 10)
                freshPhotos = (gmbData.media?.mediaItems || []).slice(0, 10);

                // ✅ Extract fresh posts
                freshPosts = gmbResponse.data.scheduledPosts || [];

                // ✅ Build fresh business info
                freshBusinessInfo = {
                    displayName: locationData.name || gmbData.location || existingBusinessInfo.displayName || 'My Business',
                    formattedAddress: locationData.formatted_address || existingBusinessInfo.formattedAddress || '',
                    phoneNumber: gmbData.phoneNumbers?.primaryPhone || existingBusinessInfo.phoneNumber || '',
                    websiteUri: gmbData.website || existingBusinessInfo.websiteUri || '',
                    rating: gmbData.rating || gmbResponse.data.reviews?.averageRating || existingBusinessInfo.rating || null,
                    totalReviewCount: gmbResponse.data.reviews?.totalReviewCount || allReviews.length || existingBusinessInfo.totalReviewCount || 0,
                    description: gmbData.description || gmbData.data?.profile?.description || existingBusinessInfo.description || '',
                    openingHours: gmbData.opening_hours || gmbData.data?.opening_hours || existingBusinessInfo.openingHours || null,
                };

                // ✅ Store raw location data
                freshLocation = gmbData;
                freshLocationData = locationData;
            }
        } catch (gmbError: any) {
            console.error('GMB API fetch error:', gmbError.message);
            // Don't fail the entire sync — log it and continue with whatever we have
        }

        // =========================
        // MERGE STRATEGY
        // =========================
        // - businessInfo: Deep merge (fresh data overwrites existing, but preserve nested custom keys)
        // - reviews, photos, posts: Replace completely with fresh data
        // - Preserve raw location blobs
        const mergedBusinessInfo = {
            ...existingBusinessInfo,
            ...freshBusinessInfo,
        };

        const fullBusinessInfo = {
            ...mergedBusinessInfo,
            ...(freshLocation ? { _rawLocation: freshLocation } : {}),
            ...(freshLocationData ? { _rawLocationData: freshLocationData } : {}),
        };

        // =========================
        // UPDATE WEBSITE (ONLY CACHED DATA)
        // =========================
        const now = new Date();
        const syncResult = await prisma.$transaction(async (tx) => {
            let cachedData;

            if (existingCachedData) {
                // Update existing cached data
                cachedData = await tx.websiteCachedData.update({
                    where: { id: existingCachedData.id },
                    data: {
                        businessInfo: fullBusinessInfo,
                        reviews: freshReviews.length > 0 ? freshReviews : existingReviews,
                        photos: freshPhotos.length > 0 ? freshPhotos : existingPhotos,
                        posts: freshPosts.length > 0 ? freshPosts : existingPosts,
                        lastSyncedAt: now,
                        nextSyncAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
                        isSyncing: false,
                        lastSyncError: null,
                        syncRetryCount: 0,
                    },
                });
            } else {
                // Create new cached data if it doesn't exist
                cachedData = await tx.websiteCachedData.create({
                    data: {
                        websiteId,
                        businessInfo: fullBusinessInfo,
                        reviews: freshReviews,
                        photos: freshPhotos,
                        posts: freshPosts,
                        lastSyncedAt: now,
                        nextSyncAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
                        syncInterval: 24,
                    },
                });
            }

            // ✅ Log sync in history
            await tx.syncHistory.create({
                data: {
                    websiteId,
                    userId: website.userId,
                    syncType: 'manual',
                    status: 'success',
                    reviewsCount: freshReviews.length || existingReviews.length,
                    photosCount: freshPhotos.length || existingPhotos.length,
                    postsCount: freshPosts.length || existingPosts.length,
                    fetchedAt: now,
                    completedAt: now,
                    duration: 0, // You can calculate this if needed
                },
            });

            return cachedData;
        });

        // =========================
        // RESPONSE
        // =========================
        return NextResponse.json(
            {
                message: 'Website synced successfully',
                website: {
                    id: website.id,
                    subdomain: website.subdomain,
                    title: website.title,
                },
                sync: {
                    reviewsCount: freshReviews.length || existingReviews.length,
                    photosCount: freshPhotos.length || existingPhotos.length,
                    postsCount: freshPosts.length || existingPosts.length,
                    businessInfo: {
                        displayName: mergedBusinessInfo.displayName,
                        rating: mergedBusinessInfo.rating,
                        totalReviewCount: mergedBusinessInfo.totalReviewCount,
                    },
                    lastSyncedAt: syncResult.lastSyncedAt,
                    nextSyncAt: syncResult.nextSyncAt,
                },
            },
            { status: 200 }
        );

    } catch (error: any) {
        console.error('[SYNC ERROR]', error);

        // Log failed sync attempt
        try {
            const { id: websiteId } = await params;
            await prisma.syncHistory.create({
                data: {
                    websiteId,
                    userId: '', // You might need to get this from session
                    syncType: 'manual',
                    status: 'failed',
                    errorMessage: error.message,
                    errorDetails: { stack: error.stack },
                    fetchedAt: new Date(),
                },
            });
        } catch (logError) {
            console.error('Failed to log sync error:', logError);
        }

        return NextResponse.json(
            {
                error: 'Sync failed',
                details: error.message || 'Unknown error',
            },
            { status: 500 }
        );
    }
}

// ============================================================================
// GET - Fetch sync status and history
// ============================================================================

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: websiteId } = await params;

    try {
        // ✅ Fetch both current status and history
        const [cachedData, history] = await Promise.all([
            prisma.websiteCachedData.findUnique({
                where: { websiteId },
                select: {
                    lastSyncedAt: true,
                    nextSyncAt: true,
                    isSyncing: true,
                    lastSyncError: true,
                    syncRetryCount: true,
                },
            }),
            prisma.syncHistory.findMany({
                where: { websiteId },
                orderBy: { fetchedAt: 'desc' },
                take: 10,
            }),
        ]);

        return NextResponse.json(
            {
                current: cachedData || {
                    lastSyncedAt: null,
                    nextSyncAt: null,
                    isSyncing: false,
                    lastSyncError: null,
                    syncRetryCount: 0,
                },
                history: history || [],
            },
            { status: 200 }
        );

    } catch (error: any) {
        console.error('[SYNC STATUS ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch sync status', details: error.message },
            { status: 500 }
        );
    }
}