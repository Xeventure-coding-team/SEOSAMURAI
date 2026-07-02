import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import axios from 'axios';
import { stackServerApp } from '@/stack';
import { checkRateLimit, getIdentifier } from '../../../../../lib/rate-limit';


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
        // Silently fail on deletion
    }
}


export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const website = await prisma.website.findUnique({
            where: { id: params.id },
            include: { cachedData: true },
        });

        if (!website) {
            return NextResponse.json({ error: 'Website not found' }, { status: 404 });
        }

        return NextResponse.json({ website });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch website' }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await req.json();

        const user = await stackServerApp.getUser();
        if (!user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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


        const website = await prisma.website.update({
            where: { id: params.id },
            data: body,
            include: { cachedData: true },
        });

        return NextResponse.json({ website });
    } catch (error: any) {
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Website not found' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Failed to update website' }, { status: 500 });
    }
}


/**
 * Update website
 */
export async function PUT(req: NextRequest) {
    try {
        const { pathname } = new URL(req.url);
        const websiteId = pathname.split('/').pop();

        const user = await stackServerApp.getUser();
        if (!user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }


        if (!websiteId) {
            return NextResponse.json({ error: 'websiteId is required' }, { status: 400 });
        }

        const formData = await req.formData();

        // Get current website
        const website = await prisma.website.findUnique({
            where: { id: websiteId, userId: user.id },
        });

        if (!website) {
            return NextResponse.json({ error: 'Website not found' }, { status: 404 });
        }

        // =========================
        // PARSE FORM DATA
        // =========================
        const title = formData.get('title') as string | null;
        const description = formData.get('description') as string | null;
        const primaryColor = formData.get('primaryColor') as string | null;
        const secondaryColor = formData.get('secondaryColor') as string | null;
        const fontFamily = formData.get('fontFamily') as string | null;
        const enabledSectionsStr = formData.get('enabledSections') as string | null;
        const logoFile = formData.get('logo') as File | null;

        let enabledSections: string[] | undefined;
        if (enabledSectionsStr) {
            try {
                enabledSections = JSON.parse(enabledSectionsStr);
            } catch (err: any) {
                return NextResponse.json(
                    { error: 'Invalid enabledSections JSON', details: err.message },
                    { status: 400 }
                );
            }
        }

        // =========================
        // LOGO UPLOAD (if provided)
        // =========================
        let logoUrl = website.logoUrl;

        if (logoFile && logoFile.size > 0) {
            try {
                // Delete old logo if exists
                if (website.logoFileId) {
                    await deleteImageFromImageKit(website.logoFileId);
                }

                // Upload new logo
                const buffer = Buffer.from(await logoFile.arrayBuffer());
                const fileName = `${website.subdomain}-logo-${Date.now()}`;
                const uploadResult = await uploadLogoToImageKit(buffer, fileName, website.subdomain);
                logoUrl = uploadResult.url;
            } catch (error: any) {
                return NextResponse.json(
                    { error: 'Logo upload failed', details: error.message },
                    { status: 400 }
                );
            }
        }

        // =========================
        // UPDATE WEBSITE
        // =========================
        const updateData: any = {
            updatedAt: new Date(),
        };

        if (title !== null) updateData.title = title;
        if (description !== null) updateData.description = description;
        if (primaryColor !== null) updateData.primaryColor = primaryColor;
        if (secondaryColor !== null) updateData.secondaryColor = secondaryColor;
        if (fontFamily !== null) updateData.fontFamily = fontFamily;
        if (enabledSections) updateData.enabledSections = enabledSections;
        if (logoUrl) updateData.logoUrl = logoUrl;

        const updatedWebsite = await prisma.website.update({
            where: { id: websiteId },
            data: updateData,
        });

        return NextResponse.json(
            {
                message: 'Website updated successfully',
                website: updatedWebsite,
            },
            { status: 200 }
        );

    } catch (error: any) {
        return NextResponse.json(
            { error: 'Failed to update website', details: error.message || 'Unknown error' },
            { status: 500 }
        );
    }
}


export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await stackServerApp.getUser();
        if (!user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await prisma.website.delete({
            where: { id: params.id, userId: user.id },
        });

        return NextResponse.json({ message: 'Website deleted' });
    } catch (error: any) {
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Website not found' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Failed to delete website' }, { status: 500 });
    }
}