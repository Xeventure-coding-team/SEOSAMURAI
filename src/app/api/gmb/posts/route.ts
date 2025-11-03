// app/api/gmb/posts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { z } from 'zod';
import FormData from 'form-data';

// Validation schemas
const createPostSchema = z.object({
    postContent: z.string().min(1, 'Post content is required'),
    actionButton: z.string().nullable().optional(),
    publicationDate: z.string().optional(),
    actionLink: z.string().nullable().optional(),
    publicationTime: z.string().optional(),
    callPhone: z.string().nullable().optional(),
    account: z.string().min(1, 'Account is required'),
    location: z.string().min(1, 'Location is required'),
    accessToken: z.string().min(1, 'Access token is required'),
    image_url: z.string().optional(),
    avatar: z.string().optional(),
});

const updatePostSchema = z.object({
    summary: z.string().optional(),
    callToAction: z.object({
        actionType: z.enum([
            "book-a-visit",
            "place-an-order",
            "shop",
            "read-more",
            "sign-up",
            "call",
            "reserve",
            "get-quote",
            "appointment"
        ]).optional(),
        url: z.string().optional(),
    }).optional().nullable(),
    image_url: z.string().optional(),
    media: z.string().optional(),
});

// Action type mapping
const actionTypeMap: Record<string, string> = {
    'book-a-visit': 'BOOK',
    'place-an-order': 'ORDER',
    'shop': 'SHOP',
    'read-more': 'LEARN_MORE',
    'sign-up': 'SIGN_UP',
    'call': 'CALL',
    'reserve': 'RESERVE',
    'get-quote': 'GET_QUOTE',
    'appointment': 'APPOINTMENT',
    'NO_ACTION': ''
};

// Helper function to clean account ID
function cleanAccountId(account: string): string {
    // Remove 'accounts/' prefix if present
    if (account.startsWith('accounts/')) {
        return account.replace('accounts/', '');
    }
    return account;
}

// Helper function to clean location ID
function cleanLocationId(location: string): string {
    // Remove 'locations/' prefix if present
    if (location.startsWith('locations/')) {
        return location.replace('locations/', '');
    }
    return location;
}

// Helper functions
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
        formData.append('folder', '/gmb-posts');

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

async function downloadAndUploadImage(imageUrl: string): Promise<string> {
    try {
        // First try to use the image URL directly
        // Check if it's a publicly accessible URL
        const response = await axios.head(imageUrl);

        if (response.status === 200) {
            // If the image is publicly accessible, use it directly
            return imageUrl;
        }
    } catch (error) {
        console.log('Image not directly accessible, downloading and uploading to ImageKit');
    }

    try {
        // Download the image
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 10000
        });
        const buffer = Buffer.from(response.data);

        // Generate filename
        const url = new URL(imageUrl);
        const pathname = url.pathname;
        let fileName = pathname.split('/').pop() || 'image';

        // Ensure file has extension
        if (!fileName.includes('.')) {
            const contentType = response.headers['content-type'];
            if (contentType?.includes('jpeg') || contentType?.includes('jpg')) {
                fileName += '.jpg';
            } else if (contentType?.includes('png')) {
                fileName += '.png';
            } else if (contentType?.includes('gif')) {
                fileName += '.gif';
            } else if (contentType?.includes('webp')) {
                fileName += '.webp';
            } else {
                fileName += '.jpg'; // default
            }
        }

        // Upload to ImageKit
        return await uploadToImgKit(buffer, fileName);
    } catch (error: any) {
        console.error('Failed to download and upload image:', error.message);
        throw new Error('Failed to process image');
    }
}

function getActionType(actionButton: string): string | null {
    if (actionButton === 'NO_ACTION') return null;
    return actionTypeMap[actionButton] || actionButton.toUpperCase();
}

function validatePhoneNumber(phone: string): string {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 10) {
        return `tel:+1${cleanPhone}`;
    } else if (cleanPhone.length === 11 && cleanPhone.startsWith('1')) {
        return `tel:+${cleanPhone}`;
    }
    throw new Error('Invalid phone number format. Please provide a 10-digit US phone number.');
}

function validateUrl(url: string): string {
    try {
        let validUrl = url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            validUrl = `https://${url}`;
        }
        new URL(validUrl);
        return validUrl;
    } catch {
        throw new Error('Invalid URL format');
    }
}

// GET - Fetch posts
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const accessToken = searchParams.get('accessToken');
        const rawAccount = searchParams.get('account');
        const rawLocation = searchParams.get('location');
        const pageSize = searchParams.get('pageSize') || '10';
        const pageToken = searchParams.get('pageToken');

        if (!accessToken || !rawAccount || !rawLocation) {
            return NextResponse.json({
                success: false,
                message: 'Missing required parameters: accessToken, account, or location'
            }, { status: 400 });
        }

        // Clean the account and location IDs
        const account = cleanAccountId(rawAccount);
        const location = cleanLocationId(rawLocation);

        console.log('Cleaned IDs:', { account, location });

        // Build API URL with pagination
        let apiUrl = `https://mybusiness.googleapis.com/v4/accounts/${account}/locations/${location}/localPosts?pageSize=${pageSize}`;
        if (pageToken) {
            apiUrl += `&pageToken=${pageToken}`;
        }

        console.log('GET API URL:', apiUrl);

        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        return NextResponse.json({
            success: true,
            data: response.data,
            pagination: {
                nextPageToken: response.data.nextPageToken,
                totalSize: response.data.totalSize
            }
        });

    } catch (error: any) {
        console.error('Error fetching GMB posts:', error.message);

        if (error.response?.status === 401) {
            return NextResponse.json({
                success: false,
                message: 'Unauthorized. Please refresh your GMB token.'
            }, { status: 401 });
        }

        if (error.response?.status === 403) {
            return NextResponse.json({
                success: false,
                message: 'Forbidden. Check your GMB account permissions.'
            }, { status: 403 });
        }

        return NextResponse.json({
            success: false,
            message: 'Failed to fetch posts',
            error: error.response?.data?.error?.message || error.message
        }, { status: 500 });
    }
}

// POST - Create new post
export async function POST(request: NextRequest) {
    try {
        const contentType = request.headers.get('content-type');
        let body: any;
        let file: Buffer | null = null;
        let fileName: string | null = null;

        if (contentType?.includes('multipart/form-data')) {
            // Handle form data with file upload
            const formData = await request.formData();
            const uploadedFile = formData.get('file') as File;

            if (uploadedFile) {
                file = Buffer.from(await uploadedFile.arrayBuffer());
                fileName = uploadedFile.name;
            }

            // Parse other form fields
            body = {};
            for (const [key, value] of formData.entries()) {
                if (key !== 'file') {
                    body[key] = value;
                }
            }
        } else {
            // Handle JSON body
            body = await request.json();
        }

        const validatedData = createPostSchema.parse(body);

        const {
            postContent,
            actionButton,
            actionLink,
            callPhone,
            account: rawAccount,
            location: rawLocation,
            accessToken,
            image_url,
        } = validatedData;

        // Clean the account and location IDs
        const account = cleanAccountId(rawAccount);
        const location = cleanLocationId(rawLocation);

        let imageUrl: string | undefined;

        // Handle image upload/processing
        if (file && fileName) {
            // File uploaded directly - upload to ImageKit
            imageUrl = await uploadToImgKit(file, fileName);
        } else if (image_url) {
            // Image URL provided - try direct use or download and upload
            imageUrl = await downloadAndUploadImage(image_url);
        }

        if (!imageUrl) {
            return NextResponse.json({
                success: false,
                error: 'No image provided. Please upload a file or provide an image URL.'
            }, { status: 400 });
        }

        const actionButtonConverted = actionButton === "null" ? null : actionButton;
        const actionLinkConverted = actionLink === "null" ? null : actionLink;
        const callPhoneConverted = callPhone === "null" ? null : callPhone;

        let actionType = null;
        if (actionButtonConverted) {
            actionType = getActionType(actionButtonConverted);
        }


        const postBody: any = {
            languageCode: "en-US",
            topicType: "STANDARD",
            summary: postContent,
            media: [
                {
                    mediaFormat: 'PHOTO',
                    sourceUrl: imageUrl,
                },
            ],
        };

        // Handle call to action
        if (actionButtonConverted && actionButtonConverted !== 'NO_ACTION' && actionType) {
            const callToAction: any = {
                actionType: actionType
            };

            if (actionType === 'CALL') {
                if (callPhoneConverted) {
                    try {
                        callToAction.url = validatePhoneNumber(callPhoneConverted);
                    } catch (error: any) {
                        return NextResponse.json({
                            success: false,
                            error: error.message
                        }, { status: 400 });
                    }
                }
            } else if (actionLinkConverted) {
                try {
                    callToAction.url = validateUrl(actionLinkConverted);
                } catch (error: any) {
                    return NextResponse.json({
                        success: false,
                        error: error.message
                    }, { status: 400 });
                }
            }

            postBody.callToAction = callToAction;
        }

        // Construct the API endpoint
        const apiEndpoint = `https://mybusiness.googleapis.com/v4/accounts/${account}/locations/${location}/localPosts`;
        const response = await axios.post(apiEndpoint, postBody, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        return NextResponse.json({
            success: true,
            data: response.data,
            message: 'Post created successfully'
        });

    } catch (error: any) {
        console.error('Error creating GMB post:', error.message);

        if (error.response) {
            console.error('Error Response Data:', JSON.stringify(error.response.data, null, 2));
            console.error('Error Response Status:', error.response.status);
            console.error('Error Response Headers:', error.response.headers);
        }

        if (error.name === 'ZodError') {
            return NextResponse.json({
                success: false,
                message: 'Invalid request data',
                errors: error.errors
            }, { status: 400 });
        }

        // Handle specific error cases
        if (error.response?.status === 404) {
            return NextResponse.json({
                success: false,
                message: 'Location not found. Please verify the account and location IDs are correct.',
                error: 'The specified GMB location does not exist or you do not have access to it.'
            }, { status: 404 });
        }

        return NextResponse.json({
            success: false,
            message: 'Failed to create post',
            error: error.response?.data?.error?.message || error.message
        }, { status: 500 });
    }
}

// PUT/PATCH - Update post
export async function PATCH(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const accessToken = searchParams.get('accessToken');
        const rawAccount = searchParams.get('account');
        const rawLocation = searchParams.get('location');
        const postName = searchParams.get('postName');

        if (!accessToken || !rawAccount || !rawLocation || !postName) {
            return NextResponse.json({
                success: false,
                message: 'Missing required parameters'
            }, { status: 400 });
        }

        // Clean the account and location IDs
        const account = cleanAccountId(rawAccount);
        const location = cleanLocationId(rawLocation);

        const contentType = request.headers.get('content-type');
        let body: any;
        let file: Buffer | null = null;
        let fileName: string | null = null;

        if (contentType?.includes('multipart/form-data')) {
            // Handle form data with file upload
            const formData = await request.formData();
            const uploadedFile = formData.get('file') as File;

            if (uploadedFile) {
                file = Buffer.from(await uploadedFile.arrayBuffer());
                fileName = uploadedFile.name;
            }

            // Parse other form fields
            body = {};
            for (const [key, value] of formData.entries()) {
                if (key !== 'file') {
                    try {
                        // Try to parse as JSON for complex objects
                        body[key] = JSON.parse(value as string);
                    } catch {
                        // Use as string if not valid JSON
                        body[key] = value;
                    }
                }
            }
        } else {
            // Handle JSON body
            body = await request.json();
        }

        const postData = updatePostSchema.parse(body);

        // Handle post name format
        let fullPostName;
        if (postName.includes('accounts/')) {
            fullPostName = postName;
        } else {
            fullPostName = `accounts/${account}/locations/${location}/localPosts/${postName}`;
        }

        const endpoint = `https://mybusiness.googleapis.com/v4/${fullPostName}`;

        const payload: any = {};
        const updateMask: string[] = [];

        // Handle summary update
        if (postData.summary !== undefined && postData.summary !== null) {
            const trimmedSummary = postData.summary.trim();
            if (trimmedSummary.length > 0) {
                payload.summary = trimmedSummary;
                updateMask.push('summary');
            }
        }

        // Function to convert action type to GMB format
        const convertToGMBActionType = (actionType: string): string => {
            switch (actionType) {
                case 'book-a-visit':
                    return 'BOOK';
                case 'place-an-order':
                    return 'ORDER';
                case 'shop':
                    return 'SHOP';
                case 'read-more':
                    return 'LEARN_MORE';
                case 'sign-up':
                    return 'SIGN_UP';
                case 'call':
                    return 'CALL';
                case 'reserve':
                    return 'RESERVE';
                case 'get-quote':
                    return 'GET_QUOTE';
                case 'appointment':
                    return 'APPOINTMENT';
                // Handle uppercase versions too
                case 'BOOK':
                case 'ORDER':
                case 'SHOP':
                case 'LEARN_MORE':
                case 'SIGN_UP':
                case 'CALL':
                case 'RESERVE':
                case 'GET_QUOTE':
                case 'APPOINTMENT':
                    return actionType;
                default:
                    throw new Error(`Invalid actionType: ${actionType}. Must be one of: book-a-visit, place-an-order, shop, read-more, sign-up, call, reserve, get-quote, appointment`);
            }
        };

        // Handle call to action
        if (postData.callToAction === null) {
            payload.callToAction = null;
            updateMask.push('callToAction');
        } else if (postData.callToAction) {
            const { actionType, url } = postData.callToAction;

            // Validate actionType exists
            if (!actionType) {
                return NextResponse.json({
                    success: false,
                    message: 'actionType is required when callToAction is provided'
                }, { status: 400 });
            }

            let gmbActionType: string;
            try {
                gmbActionType = convertToGMBActionType(actionType);
            } catch (error: any) {
                return NextResponse.json({
                    success: false,
                    message: error.message
                }, { status: 400 });
            }

            const validActionTypes = ['BOOK', 'ORDER', 'SHOP', 'LEARN_MORE', 'SIGN_UP', 'CALL', 'RESERVE', 'GET_QUOTE', 'APPOINTMENT'];

            if (!validActionTypes.includes(gmbActionType)) {
                return NextResponse.json({
                    success: false,
                    message: `Invalid action type. Must be one of: ${validActionTypes.join(', ')}`
                }, { status: 400 });
            }

            const formattedAction: any = { actionType: gmbActionType };

            if (gmbActionType === 'CALL' && url) {
                try {
                    formattedAction.url = validatePhoneNumber(url);
                } catch (error: any) {
                    return NextResponse.json({
                        success: false,
                        message: error.message
                    }, { status: 400 });
                }
            } else if (gmbActionType !== 'CALL' && url) {
                try {
                    formattedAction.url = validateUrl(url);
                } catch (error: any) {
                    return NextResponse.json({
                        success: false,
                        message: error.message
                    }, { status: 400 });
                }
            }

            payload.callToAction = formattedAction;
            updateMask.push('callToAction');
        }

        // Handle media update
        if (file && fileName) {
            // New file uploaded - upload to ImageKit
            const imageUrl = await uploadToImgKit(file, fileName);
            payload.media = [{
                mediaFormat: 'PHOTO',
                sourceUrl: imageUrl,
            }];
            updateMask.push('media');
        } else if (postData.image_url) {
            // New image URL provided
            const imageUrl = await downloadAndUploadImage(postData.image_url);
            payload.media = [{
                mediaFormat: 'PHOTO',
                sourceUrl: imageUrl,
            }];
            updateMask.push('media');
        } else if (postData.media === 'remove') {
            // Remove all images
            payload.media = [];
            updateMask.push('media');
        }

        if (updateMask.length === 0) {
            return NextResponse.json({
                success: false,
                message: 'No valid fields to update'
            }, { status: 400 });
        }

        const finalEndpoint = `${endpoint}?updateMask=${updateMask.join(',')}`;

        const response = await axios.patch(finalEndpoint, payload, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        return NextResponse.json({
            success: true,
            message: 'Post updated successfully',
            data: response.data,
            updatedFields: updateMask
        });

    } catch (error: any) {
        console.error('Error updating post:', error.message);

        if (error.name === 'ZodError') {
            return NextResponse.json({
                success: false,
                message: 'Invalid request data',
                errors: error.errors
            }, { status: 400 });
        }

        let statusCode = 500;
        let errorMessage = 'Failed to update post';

        if (error.response) {
            statusCode = error.response.status;

            if (error.response.data?.error?.message) {
                errorMessage = error.response.data.error.message;
            } else if (error.response.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.response.statusText) {
                errorMessage = `API Error: ${error.response.statusText}`;
            }

            // Handle specific GMB API errors
            if (statusCode === 400) {
                if (errorMessage.includes('media')) {
                    errorMessage = 'Invalid media format or size. Image must be JPG/PNG/GIF and under 10MB.';
                } else if (errorMessage.includes('callToAction')) {
                    errorMessage = 'Invalid call-to-action format. Please check the action type and URL.';
                }
            } else if (statusCode === 401) {
                errorMessage = 'Authentication failed. Please refresh your access token.';
            } else if (statusCode === 403) {
                errorMessage = 'Permission denied. Check your Google My Business account permissions.';
            } else if (statusCode === 404) {
                errorMessage = 'Post not found. It may have been deleted.';
            } else if (statusCode === 413) {
                errorMessage = 'Image too large. Maximum size is 10MB.';
            }
        }

        return NextResponse.json({
            success: false,
            message: errorMessage
        }, { status: statusCode });
    }
}

// DELETE - Delete post
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const accessToken = searchParams.get('accessToken');
        const rawAccount = searchParams.get('account');
        const rawLocation = searchParams.get('location');
        const postName = searchParams.get('postName');

        if (!accessToken || !rawAccount || !rawLocation || !postName) {
            return NextResponse.json({
                success: false,
                message: 'Missing required parameters: accessToken, account, location, or postName'
            }, { status: 400 });
        }

        // Clean the account and location IDs
        const account = cleanAccountId(rawAccount);
        const location = cleanLocationId(rawLocation);

        const decodedPostName = decodeURIComponent(postName);

        // Build API endpoint
        let apiEndpoint;
        if (decodedPostName.includes('accounts/') && decodedPostName.includes('localPosts/')) {
            apiEndpoint = `https://mybusiness.googleapis.com/v4/${decodedPostName}`;
        } else {
            apiEndpoint = `https://mybusiness.googleapis.com/v4/accounts/${account}/locations/${location}/localPosts/${decodedPostName}`;
        }

        console.log('DELETE API Endpoint:', apiEndpoint);

        const response = await axios.delete(apiEndpoint, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Delete response:', response.status);

        return NextResponse.json({
            success: true,
            message: 'Post deleted successfully',
            postName: decodedPostName
        });

    } catch (error: any) {
        console.error('Error deleting post:', error.message);

        if (error.response?.status === 401) {
            return NextResponse.json({
                success: false,
                message: 'Unauthorized. Please refresh your GMB token.'
            }, { status: 401 });
        }

        if (error.response?.status === 404) {
            return NextResponse.json({
                success: false,
                message: 'Post not found or already deleted.'
            }, { status: 404 });
        }

        if (error.response?.status === 403) {
            return NextResponse.json({
                success: false,
                message: 'Forbidden. You may not have permission to delete this post.'
            }, { status: 403 });
        }

        return NextResponse.json({
            success: false,
            message: 'Failed to delete post',
            error: error.response?.data?.error?.message || error.message
        }, { status: 500 });
    }
}