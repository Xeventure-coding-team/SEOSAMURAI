import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import FormData from 'form-data';
import axios from 'axios';
import { prisma } from "../../../../../lib/prisma";
import { stackServerApp } from '@/stack';

// Validation schemas
const createScheduledPostSchema = z.object({
    summary: z.string().min(1, 'Post content is required'),
    actionType: z.string().nullable().optional(),
    actionUrl: z.string().nullable().optional(),
    accountId: z.string().min(1, 'Account ID is required'),
    locationId: z.string().min(1, 'Location ID is required'),
    accessToken: z.string().min(1, 'Access token is required'),
    scheduledAt: z.string().min(1, 'Scheduled date/time is required'),
    timezone: z.string().optional().default('UTC'),
    image_url: z.string().optional(),
    createdBy: z.string().optional(),
});

const updateScheduledPostSchema = z.object({
    summary: z.string().optional(),
    mediaFormat: z.string().default("PHOTO"),
    actionType: z.string().nullable().optional(),
    actionUrl: z.string().nullable().optional(),
    scheduledAt: z.string().optional(),
    scheduledPublishTime: z.string().optional(), // Accept both formats
    timezone: z.string().optional(),
    status: z.enum(['PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED', 'CANCELLED', 'EXPIRED']).optional(),
    // Add nested callToAction support
    callToAction: z.object({
        actionType: z.string().optional(),
        url: z.string().optional(),
    }).optional().nullable(),
    // Add media support
    media: z.array(z.object({
        originalImageUrl: z.string().optional(),
        mediaFormat: z.string().default("PHOTO"),
        sourceUrl: z.string()
    })).optional(),
    imageUrl: z.string().optional() // Direct image URL
});


// Helper function to delete image from ImageKit
async function deleteFromImageKit(imageUrl: string): Promise<void> {
    try {
        const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY;
        const IMAGEKIT_PUBLIC_KEY = process.env.IMAGEKIT_PUBLIC_KEY;
        const IMAGEKIT_URL_ENDPOINT = 'https://ik.imagekit.io/9onnlplci'; // Your ImageKit URL endpoint

        if (!IMAGEKIT_PRIVATE_KEY || !IMAGEKIT_PUBLIC_KEY) {
            throw new Error('ImageKit credentials not configured');
        }

        // Extract file path from imageUrl
        const filePath = imageUrl.replace(`${IMAGEKIT_URL_ENDPOINT}/`, '');
        if (!filePath) {
            throw new Error('Invalid ImageKit URL');
        }

        // Step 1: Get fileId using ImageKit File Details API
        const fileDetailsResponse = await axios.get(
            'https://api.imagekit.io/v1/files/details',
            {
                params: { filePath },
                headers: {
                    Authorization: `Basic ${Buffer.from(`${IMAGEKIT_PRIVATE_KEY}:`).toString('base64')}`
                }
            }
        );

        const fileId = fileDetailsResponse.data.fileId;
        if (!fileId) {
            throw new Error('Could not retrieve fileId from ImageKit');
        }

        // Step 2: Delete the file using ImageKit Delete File API
        await axios.delete(`https://api.imagekit.io/v1/files/${fileId}`, {
            headers: {
                Authorization: `Basic ${Buffer.from(`${IMAGEKIT_PRIVATE_KEY}:`).toString('base64')}`
            }
        });

        console.log(`Successfully deleted ImageKit file: ${fileId}`);
    } catch (error: any) {
        console.error('ImageKit delete error:', error.message);
        throw new Error(`Failed to delete image from ImageKit: ${error.message}`);
    }
}

// Helper function to upload image to ImageKit
async function uploadToImgKit(file: Buffer, fileName: string): Promise<string> {
    try {
        const IMAGEKIT_UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload';
        const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY;
        const IMAGEKIT_PUBLIC_KEY = process.env.IMAGEKIT_PUBLIC_KEY;

        if (!IMAGEKIT_PRIVATE_KEY || !IMAGEKIT_PUBLIC_KEY) {
            throw new Error('ImageKit credentials not configured');
        }

        const formData = new FormData();
        formData.append('file', file, fileName);
        formData.append('fileName', fileName);
        formData.append('folder', '/scheduled-gmb-posts');

        const response = await axios.post(IMAGEKIT_UPLOAD_URL, formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Basic ${Buffer.from(`${IMAGEKIT_PRIVATE_KEY}:`).toString('base64')}`
            }
        });

        return response.data.url;
    } catch (error: any) {
        console.error('ImageKit upload error:', error.message);
        throw new Error('Failed to upload image to ImageKit');
    }
}

// Helper function to download and upload external images
async function downloadAndUploadImage(imageUrl: string): Promise<string> {
    try {
        // Try direct URL first
        const response = await axios.head(imageUrl);
        if (response.status === 200) {
            return imageUrl;
        }
    } catch {
        // Continue to download and upload
    }

    try {
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 10000
        });
        const buffer = Buffer.from(response.data);

        const url = new URL(imageUrl);
        let fileName = url.pathname.split('/').pop() || 'scheduled-image';

        if (!fileName.includes('.')) {
            const contentType = response.headers['content-type'];
            if (contentType?.includes('jpeg') || contentType?.includes('jpg')) {
                fileName += '.jpg';
            } else if (contentType?.includes('png')) {
                fileName += '.png';
            } else {
                fileName += '.jpg';
            }
        }

        return await uploadToImgKit(buffer, fileName);
    } catch (error: any) {
        throw new Error('Failed to process image: ' + error.message);
    }
}

// Helper to clean account/location IDs
function cleanId(id: string, prefix: string): string {
    return id.startsWith(prefix) ? id.replace(prefix, '') : id;
}

// GET - Fetch scheduled posts
export async function GET(request: NextRequest) {
    try {
        const user = await stackServerApp.getUser();
        const { searchParams } = new URL(request.url);
        const accountId = searchParams.get('accountId');
        const locationId = searchParams.get('locationId');
        const status = searchParams.get('status');
        const createdBy = searchParams.get('createdBy');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');

        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {};
        if (accountId) where.accountId = cleanId(accountId, 'accounts/');
        if (locationId) where.locationId = cleanId(locationId, 'locations/');
        if (status) where.status = status;
        if (createdBy) where.createdBy = createdBy;
        if (user?.id) where.user_id = user?.id;

        // Get posts with pagination
        const [posts, totalCount] = await Promise.all([
            prisma.scheduledPost.findMany({
                where,
                orderBy: { scheduledAt: 'asc' },
                skip,
                take: limit,
            }),
            prisma.scheduledPost.count({ where })
        ]);

        return NextResponse.json({
            success: true,
            data: posts,
            pagination: {
                page,
                limit,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limit)
            }
        });

    } catch (error: any) {
        console.error('Error fetching scheduled posts:', error);
        return NextResponse.json({
            success: false,
            message: 'Failed to fetch scheduled posts',
            error: error.message
        }, { status: 500 });
    }
}

// POST - Create scheduled post
export async function POST(request: NextRequest) {
    try {
        const user = await stackServerApp.getUser();
        const contentType = request.headers.get('content-type');
        let body: any;
        let file: Buffer | null = null;
        let fileName: string | null = null;

        // Handle form data or JSON
        if (contentType?.includes('multipart/form-data')) {
            const formData = await request.formData();
            const uploadedFile = formData.get('file') as File;

            if (uploadedFile) {
                file = Buffer.from(await uploadedFile.arrayBuffer());
                fileName = uploadedFile.name;
            }

            body = {};
            for (const [key, value] of formData.entries()) {
                if (key !== 'file') {
                    body[key] = value;
                }
            }
        } else {
            body = await request.json();
        }

        // Map frontend field names to schema field names
        const mappedBody = {
            summary: body.postContent || body.summary,
            actionType: body.actionButton === 'NO_ACTION' ? null : body.actionButton || body.actionType,
            actionUrl: body.actionLink === 'null' ? null : body.actionLink || body.actionUrl,
            accountId: body.account || body.accountId,
            locationId: body.location || body.selectedLocation || body.locationId,
            accessToken: body.accessToken,
            scheduledAt: body.scheduled || body.scheduledAt,
            timezone: body.timezone || 'UTC',
            image_url: body.image_url,
            createdBy: body.createdBy,
            viewColor: body.color || body.viewColor || '#1d4ed8'
        };

        // Validate input
        const validatedData = createScheduledPostSchema.parse(mappedBody);

        // Clean IDs
        const accountId = cleanId(validatedData.accountId, 'accounts/');
        const locationId = cleanId(validatedData.locationId, 'locations/');

        // Handle image
        let imageUrl: string;
        if (file && fileName) {
            imageUrl = await uploadToImgKit(file, fileName);
        } else if (validatedData.image_url) {
            imageUrl = await downloadAndUploadImage(validatedData.image_url);
        } else {
            return NextResponse.json({
                success: false,
                message: 'Image is required. Please upload a file or provide an image URL.'
            }, { status: 400 });
        }

        // Create scheduled post
        const scheduledPost = await prisma.scheduledPost.create({
            data: {
                summary: validatedData.summary,
                imageUrl,
                originalImageUrl: validatedData.image_url || null,
                actionType: validatedData.actionType === 'null' ? null : validatedData.actionType,
                actionUrl: validatedData.actionUrl === 'null' ? null : validatedData.actionUrl,
                accountId,
                locationId,
                accessToken: validatedData.accessToken,
                scheduledAt: new Date(validatedData.scheduledAt),
                timezone: validatedData.timezone,
                createdBy: validatedData.createdBy,
                viewColor: mappedBody.viewColor, // Add this field
                status: 'PENDING',
                user_id: user?.id,
            }
        });

        return NextResponse.json({
            success: true,
            data: scheduledPost,
            message: 'Scheduled post created successfully'
        });

    } catch (error: any) {
        if (error.name === 'ZodError') {
            return NextResponse.json({
                success: false,
                message: 'Invalid request data',
                errors: error.errors
            }, { status: 400 });
        }

        return NextResponse.json({
            success: false,
            message: 'Failed to create scheduled post',
            error: error.message
        }, { status: 500 });
    }
}

// PUT - Update scheduled post
export async function PUT(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({
                success: false,
                message: 'Post ID is required'
            }, { status: 400 });
        }

        // Parse request body
        let body: any;
        try {
            body = await request.json();
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            return NextResponse.json({
                success: false,
                message: 'Invalid JSON in request body'
            }, { status: 400 });
        }

        // Validate request body
        let validatedData;
        try {
            validatedData = updateScheduledPostSchema.parse(body);
        } catch (validationError: any) {
            console.error('Validation error:', validationError);
            return NextResponse.json({
                success: false,
                message: 'Invalid request data',
                errors: validationError.errors || validationError.message
            }, { status: 400 });
        }

        // Check if post exists and is editable
        let existingPost;
        try {
            existingPost = await prisma.scheduledPost.findUnique({
                where: { id }
            });
        } catch (dbError: any) {
            console.error('Database error finding post:', dbError);
            return NextResponse.json({
                success: false,
                message: 'Database error occurred'
            }, { status: 500 });
        }

        if (!existingPost) {
            return NextResponse.json({
                success: false,
                message: 'Scheduled post not found'
            }, { status: 404 });
        }

        if (existingPost.status === 'PUBLISHED') {
            return NextResponse.json({
                success: false,
                message: 'Cannot edit already published post'
            }, { status: 400 });
        }

        // Build update data
        const updateData: any = {};

        if (validatedData.summary) updateData.summary = validatedData.summary;

        // Handle scheduling time (accept both formats)
        if (validatedData.scheduledAt) {
            try {
                updateData.scheduledAt = new Date(validatedData.scheduledAt);
            } catch (dateError) {
                return NextResponse.json({
                    success: false,
                    message: 'Invalid scheduledAt date format'
                }, { status: 400 });
            }
        } else if (validatedData.scheduledPublishTime) {
            try {
                updateData.scheduledAt = new Date(validatedData.scheduledPublishTime);
            } catch (dateError) {
                return NextResponse.json({
                    success: false,
                    message: 'Invalid scheduledPublishTime date format'
                }, { status: 400 });
            }
        }

        if (validatedData.timezone) updateData.timezone = validatedData.timezone;
        if (validatedData.status) updateData.status = validatedData.status;

        // Handle callToAction (nested or flat format)
        if (validatedData.callToAction !== undefined) {
            if (validatedData.callToAction === null) {
                updateData.actionType = null;
                updateData.actionUrl = null;
            } else if (validatedData.callToAction) {
                updateData.actionType = validatedData.callToAction.actionType || null;
                updateData.actionUrl = validatedData.callToAction.url || null;
            }
        } else {
            // Handle flat format
            if (validatedData.actionType !== undefined) {
                updateData.actionType = validatedData.actionType === 'null' ? null : validatedData.actionType;
            }
            if (validatedData.actionUrl !== undefined) {
                updateData.actionUrl = validatedData.actionUrl === 'null' ? null : validatedData.actionUrl;
            }
        }

        // Handle media
        if (validatedData.media && validatedData.media.length > 0) {
            // Use the first media item's sourceUrl and mediaFormat
            updateData.imageUrl = validatedData.media[0].sourceUrl;
            updateData.mediaFormat = validatedData.media[0].mediaFormat || 'PHOTO';
            // Optionally set originalImageUrl if provided in media or elsewhere
            if (validatedData.media[0].originalImageUrl) {
                updateData.originalImageUrl = validatedData.media[0].originalImageUrl;
            }
        } else if (validatedData.imageUrl) {
            updateData.imageUrl = validatedData.imageUrl;
            updateData.mediaFormat = validatedData.mediaFormat || 'PHOTO'; // Default to PHOTO if not provided
        }

        let updatedPost;
        try {
            updatedPost = await prisma.scheduledPost.update({
                where: { id },
                data: updateData
            });
        } catch (updateError: any) {
            console.error('Database update error:', updateError);

            // Handle specific Prisma errors
            if (updateError.code === 'P2002') {
                return NextResponse.json({
                    success: false,
                    message: 'Duplicate value error'
                }, { status: 400 });
            }

            if (updateError.code === 'P2025') {
                return NextResponse.json({
                    success: false,
                    message: 'Record not found'
                }, { status: 404 });
            }

            return NextResponse.json({
                success: false,
                message: 'Failed to update post in database',
                error: updateError.message
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data: updatedPost,
            message: 'Scheduled post updated successfully'
        });

    } catch (error: any) {
        console.error('Unexpected error in PUT handler:', error);
        return NextResponse.json({
            success: false,
            message: 'An unexpected error occurred',
            error: error.message || 'Unknown error'
        }, { status: 500 });
    }
}

// DELETE - Delete scheduled post
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({
                success: false,
                message: 'Post ID is required'
            }, { status: 400 });
        }

        const existingPost = await prisma.scheduledPost.findUnique({
            where: { id }
        });

        if (!existingPost) {
            return NextResponse.json({
                success: false,
                message: 'Scheduled post not found'
            }, { status: 404 });
        }

        // Don't allow deletion of published posts
        if (existingPost.status === 'PUBLISHED') {
            return NextResponse.json({
                success: false,
                message: 'Cannot delete already published post'
            }, { status: 400 });
        }

        // Delete the associated ImageKit image if imageUrl exists
        if (existingPost.imageUrl) {
            try {
                await deleteFromImageKit(existingPost.imageUrl);
            } catch (imageError) {
                console.error('Failed to delete image');
            }
        }

        await prisma.scheduledPost.delete({
            where: { id }
        });

        return NextResponse.json({
            success: true,
            message: 'Scheduled post deleted successfully'
        });

    } catch (error: any) {
        console.error('Error deleting scheduled post:', error);
        return NextResponse.json({
            success: false,
            message: 'Failed to delete scheduled post',
            error: error.message
        }, { status: 500 });
    }
}