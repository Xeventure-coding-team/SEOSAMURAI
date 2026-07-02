import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import axios from 'axios';
import { prisma } from '../../../../lib/prisma';
import { canUse } from '@/lib/actions/can-use';
import { canAddSlot } from '@/lib/slots';
import { stackServerApp } from '@/stack';
import { checkRateLimit, getIdentifier } from '../../../../lib/rate-limit';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const user = await stackServerApp.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const locationId = searchParams.get('locationId');

        // ✅ Always scope to authenticated user — no client-provided userId
        const where: any = { userId: user.id };
        if (locationId) where.locationId = locationId;

        const websites = await prisma.website.findMany({
            where,
            include: { cachedData: true },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ websites }, { status: 200 });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to fetch websites', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

/**
 * Upload logo to ImageKit using REST API
 */
async function uploadLogoToImageKit(
    file: Buffer,
    fileName: string,
    subdomain: string
): Promise<{ url: string; fileId: string; name: string }> {
    try {
        const IMAGEKIT_UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload';
        const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY;

        if (!IMAGEKIT_PRIVATE_KEY) {
            throw new Error('IMAGEKIT_PRIVATE_KEY not configured');
        }

        // Validate file
        if (!file || file.length === 0) {
            throw new Error('File is empty');
        }

        if (file.length > 5 * 1024 * 1024) {
            throw new Error(`File too large: ${file.length} bytes. Maximum 5MB allowed.`);
        }

        // Create FormData
        const formData = new FormData();
        const blob = new Blob([file], { type: 'application/octet-stream' });
        formData.append('file', blob, fileName);
        formData.append('fileName', fileName);
        formData.append('folder', `/websites/${subdomain}`);
        formData.append('tags', ['website-logo', subdomain]);
        formData.append('useUniqueFileName', 'true');

        // Create auth header
        const authHeader = `Basic ${Buffer.from(`${IMAGEKIT_PRIVATE_KEY}:`).toString('base64')}`;

        const response = await axios.post(IMAGEKIT_UPLOAD_URL, formData, {
            headers: {
                'Authorization': authHeader,
            },
            timeout: 30000,
        });

        return {
            url: response.data.url,
            fileId: response.data.fileId,
            name: response.data.name,
        };
    } catch (error: any) {
        throw new Error(`Failed to upload logo: ${error.response?.data?.message || error.message}`);
    }
}

/**
 * Delete image from ImageKit
 */
async function deleteImageFromImageKit(fileId: string): Promise<void> {
    try {
        const IMAGEKIT_DELETE_URL = `https://api.imagekit.io/v1/files/${fileId}`;
        const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY;

        if (!IMAGEKIT_PRIVATE_KEY) {
            throw new Error('IMAGEKIT_PRIVATE_KEY not configured');
        }

        const authHeader = `Basic ${Buffer.from(`${IMAGEKIT_PRIVATE_KEY}:`).toString('base64')}`;

        await axios.delete(IMAGEKIT_DELETE_URL, {
            headers: {
                'Authorization': authHeader,
            },
            timeout: 10000,
        });
    } catch (error: any) {
    }
}

function generateRandomSuffix(length = 4) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();

        // =========================
        // BASIC FIELDS
        // =========================
        const userId = formData.get('userId') as string;
        const locationId = formData.get('locationId') as string | null;
        const accountId = formData.get('accountId') as string | null;
        const subdomain = formData.get('subdomain') as string;
        const title = formData.get('title') as string | null;
        const description = formData.get('description') as string | null;
        const primaryColor = formData.get('primaryColor') as string | null;
        const secondaryColor = formData.get('secondaryColor') as string | null;
        const fontFamily = formData.get('fontFamily') as string | null;
        const enabledSectionsStr = formData.get('enabledSections') as string | null;
        const logoFile = formData.get('logo') as File | null;

        // =========================
        // GMB PAYLOAD FIELDS
        // =========================
        const businessInfoStr = formData.get('businessInfo') as string | null;
        const reviewsStr = formData.get('reviews') as string | null;
        const mediaStr = formData.get('media') as string | null;
        const postsStr = formData.get('posts') as string | null;
        const locationStr = formData.get('location') as string | null;
        const locationDataStr = formData.get('locationData') as string | null;

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

        const slot = await canAddSlot(userId, "websites");
        if (!slot.ok) return NextResponse.json({
            hasPermission: false,
            success: false,
            exist: false,
            message: '',
            error: "Website limit reached",
        }, { status: 403 });



        // =========================
        // PARSE ALL JSON FIELDS
        // =========================
        let businessInfo: any = {};
        let reviewsToSave: any[] = [];
        let mediaToSave: any[] = [];
        let postsToSave: any[] = [];
        let fullLocation: any = null;
        let locationData: any = null;
        // ✅ Parse enabledSections ONCE here — not inline in the object below
        let enabledSections: string[] = ['hero', 'reviews', 'gallery', 'contact'];

        try {
            if (businessInfoStr) businessInfo = JSON.parse(businessInfoStr);
            if (reviewsStr) reviewsToSave = JSON.parse(reviewsStr);
            if (mediaStr) mediaToSave = JSON.parse(mediaStr);
            if (postsStr) postsToSave = JSON.parse(postsStr);
            if (locationStr) fullLocation = JSON.parse(locationStr);
            if (locationDataStr) locationData = JSON.parse(locationDataStr);
            if (enabledSectionsStr) enabledSections = JSON.parse(enabledSectionsStr);
        } catch (err: any) {
            return NextResponse.json(
                { error: 'Invalid JSON payload', details: err.message },
                { status: 400 }
            );
        }

        // =========================
        // VALIDATION
        // =========================
        const errors: string[] = [];
        if (!userId) errors.push('userId is required');
        if (!subdomain) errors.push('subdomain is required');
        if (subdomain && !/^[a-z0-9-]+$/.test(subdomain))
            errors.push('subdomain must be lowercase alphanumeric and hyphens only');
        if (subdomain && subdomain.length < 3)
            errors.push('subdomain must be at least 3 characters');

        if (errors.length > 0) {
            return NextResponse.json(
                { error: 'Validation failed', details: errors },
                { status: 400 }
            );
        }

        // =========================
        // SUBDOMAIN UNIQUENESS
        // =========================
        let finalSubdomain = subdomain;
        let exists = await prisma.website.findUnique({ where: { subdomain: finalSubdomain } });
        while (exists) {
            finalSubdomain = `${subdomain}-${generateRandomSuffix(4)}`;
            exists = await prisma.website.findUnique({ where: { subdomain: finalSubdomain } });
        }

        // =========================
        // LOGO UPLOAD
        // =========================
        let logoUrl: string | null = null;

        if (logoFile && logoFile.size > 0) {
            try {
                const buffer = Buffer.from(await logoFile.arrayBuffer());
                const fileName = `${finalSubdomain}-logo-${Date.now()}`;
                const uploadResult = await uploadLogoToImageKit(buffer, fileName, finalSubdomain);
                logoUrl = uploadResult.url;
            } catch (error: any) {
                return NextResponse.json(
                    { error: 'Logo upload failed', details: error.message },
                    { status: 400 }
                );
            }
        }

        // =========================
        // WEBSITE DATA — exact schema match
        // =========================
        const websiteData = {
            userId,
            locationId: locationId || '',   // schema has String (non-optional)
            accountId: accountId || '',   // schema has String (non-optional)
            subdomain: finalSubdomain,

            title: title || businessInfo?.displayName || 'My Business',
            description: description || '',

            logoUrl,

            primaryColor: primaryColor || '#10b981',
            secondaryColor: secondaryColor || '#f59e0b',
            fontFamily: fontFamily || 'Inter',

            // ✅ Already parsed above — no double JSON.parse
            enabledSections,

            isPublished: true,
            publishedAt: new Date(),
        };

        // =========================
        // CACHED DATA — store everything from GMB, nothing dropped
        // =========================
        // Merge fullLocation + locationData into businessInfo under reserved keys
        // so nothing is silently discarded (schema has no separate column for them)
        const fullBusinessInfo = {
            ...businessInfo,
            ...(fullLocation ? { _rawLocation: fullLocation } : {}),
            ...(locationData ? { _rawLocationData: locationData } : {}),
        };

        // =========================
        // DB TRANSACTION
        // =========================
        const result = await prisma.$transaction(async (tx) => {
            const website = await tx.website.create({
                data: websiteData,
            });

            const cachedData = await tx.websiteCachedData.create({
                data: {
                    websiteId: website.id,

                    // ✅ Full business info including raw location blobs
                    businessInfo: fullBusinessInfo,

                    // ✅ Always save arrays — never coerce to null
                    reviews: reviewsToSave,
                    photos: mediaToSave,
                    posts: postsToSave,

                    lastSyncedAt: new Date(),
                    nextSyncAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                    syncInterval: 24,
                },
            });

            return { website, cachedData };
        });

        // =========================
        // RESPONSE
        // =========================
        return NextResponse.json(
            {
                message: 'Website created successfully',
                website: result.website,
                cachedData: result.cachedData,
                logoUrl,
                summary: {
                    name: businessInfo?.displayName,
                    address: businessInfo?.formattedAddress,
                    rating: businessInfo?.rating,
                    reviewsSaved: reviewsToSave.length,
                    mediaSaved: mediaToSave.length,
                    postsSaved: postsToSave.length,
                    subdomain: finalSubdomain,
                    enabledSections,
                },
            },
            { status: 201 }
        );

    } catch (error: any) {
        return NextResponse.json(
            { error: 'Failed to create website', details: error.message || 'Unknown error' },
            { status: 500 }
        );
    }
}

/**
 * Update website logo
 */
export async function PATCH(req: NextRequest) {
    try {
        const formData = await req.formData();
        const websiteId = formData.get('websiteId') as string;
        const logoFile = formData.get('logo') as File | null;

        if (!websiteId) {
            return NextResponse.json({ error: 'websiteId is required' }, { status: 400 });
        }

        if (!logoFile || logoFile.size === 0) {
            return NextResponse.json({ error: 'Logo file is required' }, { status: 400 });
        }

        // Get current website
        const website = await prisma.website.findUnique({
            where: { id: websiteId },
        });

        if (!website) {
            return NextResponse.json({ error: 'Website not found' }, { status: 404 });
        }

        // Delete old logo if it exists
        if (website.logoFileId) {
            await deleteImageFromImageKit(website.logoFileId);
        }

        // Upload new logo
        try {
            const buffer = Buffer.from(await logoFile.arrayBuffer());
            const fileName = `${website.subdomain}-logo-${Date.now()}`;
            const uploadResult = await uploadLogoToImageKit(buffer, fileName, website.subdomain);

            // Update website
            const updated = await prisma.website.update({
                where: { id: websiteId },
                data: {
                    logoUrl: uploadResult.url,
                    logoFileId: uploadResult.fileId,
                    updatedAt: new Date(),
                },
            });

            return NextResponse.json(
                {
                    message: 'Logo updated successfully',
                    website: updated,
                    logoUrl: uploadResult.url,
                },
                { status: 200 }
            );
        } catch (error) {
            return NextResponse.json(
                {
                    error: 'Failed to upload new logo',
                    details: error instanceof Error ? error.message : 'Unknown error',
                },
                { status: 400 }
            );
        }
    } catch (error: any) {
        return NextResponse.json(
            {
                error: 'Failed to update logo',
                details: error.message || 'Unknown error',
            },
            { status: 500 }
        );
    }
}

/**
 * Delete website
 */
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const websiteId = searchParams.get('id');

        if (!websiteId) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 });
        }

        const website = await prisma.website.findUnique({
            where: { id: websiteId },
        });

        if (!website) {
            return NextResponse.json({ error: 'Website not found' }, { status: 404 });
        }

        // Delete logo from ImageKit
        if (website.logoFileId) {
            await deleteImageFromImageKit(website.logoFileId);
        }

        // Delete from database
        await prisma.website.delete({
            where: { id: websiteId },
        });

        return NextResponse.json({ message: 'Website deleted successfully' }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json(
            {
                error: 'Failed to delete website',
                details: error.message || 'Unknown error',
            },
            { status: 500 }
        );
    }
}