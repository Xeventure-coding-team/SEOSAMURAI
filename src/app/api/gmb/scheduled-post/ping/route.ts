import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { ScheduledPostStatus } from "@/generated/prisma";
import axios from "axios";
import FormData from "form-data";

// Configuration for batch processing
const BATCH_SIZE = 10; // Process 10 posts simultaneously
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const API_RATE_LIMIT_DELAY = 100; // 100ms between API calls per user

// Helper functions
function cleanAccountId(account: string): string {
  return account.startsWith('accounts/') ? account.replace('accounts/', '') : account;
}

function cleanLocationId(location: string): string {
  return location.startsWith('locations/') ? location.replace('locations/', '') : location;
}

// Action type mapping (same as manual posting)
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

function getActionType(actionType: string): string | null {
  if (actionType === 'NO_ACTION' || !actionType) return null;
  return actionTypeMap[actionType] || actionType.toUpperCase();
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

// Optimized image processing with caching
const imageCache = new Map<string, string>();

async function uploadToImgKit(file: Buffer, fileName: string): Promise<string> {
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
    },
    timeout: 30000 // 30 second timeout
  });

  return response.data.url;
}

async function downloadAndUploadImage(imageUrl: string): Promise<string> {
  try {
    // First try to use the image URL directly
    const headResponse = await axios.head(imageUrl, { timeout: 5000 });
    if (headResponse.status === 200) {
      return imageUrl;
    }
  } catch (error) {
    // Continue to download and upload
  }

  try {
    // Download the image
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 15000,
      maxContentLength: 10 * 1024 * 1024 // 10MB limit
    });

    const buffer = Buffer.from(response.data);
    const url = new URL(imageUrl);
    let fileName = url.pathname.split('/').pop() || `image-${Date.now()}`;

    if (!fileName.includes('.')) {
      const contentType = response.headers['content-type'];
      const ext = contentType?.includes('png') ? '.png' :
        contentType?.includes('gif') ? '.gif' :
          contentType?.includes('webp') ? '.webp' : '.jpg';
      fileName += ext;
    }

    return await uploadToImgKit(buffer, fileName);

  } catch (error: any) {
    console.error(`Failed to process image ${imageUrl}:`, error.message);
    throw new Error(`Image processing failed: ${error.message}`);
  }
}

async function processImageWithCache(imageUrl: string): Promise<string> {
  // Check cache first
  if (imageCache.has(imageUrl)) {
    return imageCache.get(imageUrl)!;
  }

  try {
    const processedUrl = await downloadAndUploadImage(imageUrl);
    imageCache.set(imageUrl, processedUrl);
    return processedUrl;
  } catch (error: any) {
    console.error(`Failed to process image ${imageUrl}:`, error.message);
    throw new Error(`Image processing failed: ${error.message}`);
  }
}

// Optimized sleep function
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Retry wrapper with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
  delay = RETRY_DELAY
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      await sleep(delay);
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

async function getValidAccessToken(integration: any) {
  const now = new Date();
  const expiry = new Date(integration.tokenExpiry);

  if (now < expiry) {
    return integration.accessToken; // still valid
  }

  // Refresh token
  const params = new URLSearchParams();
  params.append("client_id", process.env.GOOGLE_CLIENT_ID!);
  params.append("client_secret", process.env.GOOGLE_CLIENT_SECRET!);
  params.append("refresh_token", integration.refreshToken);
  params.append("grant_type", "refresh_token");

  const res = await axios.post("https://oauth2.googleapis.com/token", params);

  const newAccessToken = res.data.access_token;
  const newExpiry = new Date(Date.now() + res.data.expires_in * 1000);

  // Update DB
  await prisma.gmbIntegration.update({
    where: { id: integration.id },
    data: {
      accessToken: newAccessToken,
      tokenExpiry: newExpiry,
    },
  });

  return newAccessToken;
}

async function postToGMB(scheduledPost: any, integration: any) {
  try {
    const account = cleanAccountId(scheduledPost.accountId);
    const location = cleanLocationId(scheduledPost.locationId);

    let imageUrl;
    if (scheduledPost.imageUrl) {
      imageUrl = await processImageWithCache(scheduledPost.imageUrl);
    }
    if (!imageUrl) {
      return { success: false, error: "No image provided for post" };
    }

    const postBody: any = {
      languageCode: scheduledPost.languageCode || "en-US",
      topicType: scheduledPost.topicType || "STANDARD",
      summary: scheduledPost.summary,
      media: [{ mediaFormat: "PHOTO", sourceUrl: imageUrl }],
    };

    // ✅ Call-to-action logic implementation
    if (scheduledPost.actionType && scheduledPost.actionUrl) {
      const actionType = getActionType(scheduledPost.actionType);
      
      if (actionType) {
        try {
          let actionUrl = scheduledPost.actionUrl;
          
          // Handle phone numbers
          if (actionType === 'CALL' && !actionUrl.startsWith('tel:')) {
            actionUrl = validatePhoneNumber(actionUrl);
          } else if (actionType !== 'CALL') {
            // Validate URL for non-call actions
            actionUrl = validateUrl(actionUrl);
          }

          postBody.callToAction = {
            actionType: actionType,
            url: actionUrl
          };
        } catch (error: any) {
          console.warn(`Invalid action URL for post ${scheduledPost.id}: ${error.message}`);
          // Continue without CTA rather than failing the entire post
        }
      }
    }

    // ✅ Get fresh token here
    const accessToken = await getValidAccessToken(integration);

    const response = await withRetry(async () => {
      return axios.post(
        `https://mybusiness.googleapis.com/v4/accounts/${account}/locations/${location}/localPosts`,
        postBody,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );
    });

    return { success: true, data: response.data };
  } catch (error: any) {
    const errorMessage = error.response?.data?.error?.message || error.message;
    console.error(`GMB API Error for post ${scheduledPost.id}:`, errorMessage);
    console.error(`Full error response:`, error.response?.data);
    return { success: false, error: errorMessage };
  }
}

// Batch database updates for better performance
async function batchUpdatePosts(updates: Array<{
  id: string;
  status: ScheduledPostStatus;
  publishedAt?: Date;
  publishedPostId?: string;
  errorMessage?: string;
  retryCount?: number;
}>) {
  if (updates.length === 0) return;

  const promises = updates.map(update =>
    prisma.scheduledPost.update({
      where: { id: update.id },
      data: {
        status: update.status,
        ...(update.publishedAt && { publishedAt: update.publishedAt }),
        ...(update.publishedPostId && { publishedPostId: update.publishedPostId }),
        ...(update.errorMessage && { errorMessage: update.errorMessage }),
        ...(update.retryCount !== undefined && { retryCount: update.retryCount }),
        updatedAt: new Date()
      }
    })
  );

  await Promise.allSettled(promises);
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // 🔐 Protect with secret
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const results: any[] = [];
    let totalProcessed = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;
    let totalRetried = 0;

    // 1️⃣ Get all due posts
    const allDuePosts = await prisma.scheduledPost.findMany({
      where: {
        OR: [
          { status: ScheduledPostStatus.PENDING },
          {
            status: ScheduledPostStatus.FAILED,
          },
        ],
        scheduledAt: { lte: now },
        retryCount: { lte: 3 },
      },
      orderBy: { scheduledAt: "asc" },
      select: {
        id: true,
        user_id: true,
        summary: true,
        languageCode: true,
        topicType: true,
        mediaFormat: true,
        imageUrl: true,
        originalImageUrl: true,
        actionType: true,
        actionUrl: true,
        accountId: true,
        locationId: true,
        accessToken: true,
        scheduledAt: true,
        timezone: true,
        retryCount: true,
        maxRetries: true,
        viewColor: true,
        createdBy: true
      }
    });


    if (allDuePosts.length === 0) {
      return NextResponse.json({
        message: "No scheduled posts found to process",
        timestamp: now.toISOString(),
        summary: {
          totalPostsFound: 0,
          totalPostsProcessed: 0,
          executionTime: `${Date.now() - startTime}ms`
        }
      });
    }

    // 2️⃣ Get active integrations
    const activeIntegrations = await prisma.gmbIntegration.findMany({
      where: {
        isActive: true,
        // Remove token expiry check here - we'll handle refresh in getValidAccessToken
      },
      select: {
        id: true,
        userId: true,
        user_id: true,
        accountName: true,
        accountId: true,
        accessToken: true,
        refreshToken: true,
        tokenExpiry: true
      }
    });

    const activeUserIds = new Set(activeIntegrations.map(i => i.user_id || i.userId));
    
    // Create integration lookup map
    const integrationMap = new Map();
    activeIntegrations.forEach(integration => {
      const userId = integration.user_id || integration.userId;
      integrationMap.set(userId, integration);
    });

    // 3️⃣ Filter posts to only include users with active integrations and valid retry count
    const validPosts = allDuePosts.filter(post => {
      // Check if user has active integration
      if (!activeUserIds.has(post.user_id)) return false;

      // Check retry logic - only process if retryCount < maxRetries
      const retryCount = post.retryCount || 0;
      const maxRetries = post.maxRetries || 3;

      return retryCount <= maxRetries;
    });

    console.log(`✅ Found ${validPosts.length} posts from users with active integrations`);

    // 4️⃣ Group posts by user for efficient processing
    const postsByUser = new Map<string, any[]>();
    validPosts.forEach(post => {
      const posts = postsByUser.get(post.user_id) || [];
      posts.push(post);
      postsByUser.set(post.user_id, posts);
    });

    // 5️⃣ Process users concurrently with batching
    const userPromises = Array.from(postsByUser.entries()).map(async ([userId, userPosts]) => {
      const integration = integrationMap.get(userId);
      
      if (!integration) {
        console.error(`No integration found for user ${userId}`);
        return {
          userId: userId,
          accountName: 'Unknown',
          accountId: 'Unknown',
          scheduledPostsFound: userPosts.length,
          postsProcessed: 0,
          postsSuccessful: 0,
          postsFailed: userPosts.length,
          postsRetried: 0,
          errors: [`No active integration found for user ${userId}`]
        };
      }

      const userResult = {
        userId: userId,
        accountName: integration?.accountName || 'Unknown',
        accountId: integration?.accountId || 'Unknown',
        scheduledPostsFound: userPosts.length,
        postsProcessed: 0,
        postsSuccessful: 0,
        postsFailed: 0,
        postsRetried: 0,
        errors: [] as string[]
      };

      const dbUpdates: Array<{
        id: string;
        status: ScheduledPostStatus;
        publishedAt?: Date;
        publishedPostId?: string;
        errorMessage?: string;
        retryCount?: number;
      }> = [];

      // Process posts in batches to avoid overwhelming the API
      for (let i = 0; i < userPosts.length; i += BATCH_SIZE) {
        const batch = userPosts.slice(i, i + BATCH_SIZE);

        const batchPromises = batch.map(async (post, index) => {
          // Add small delay to respect rate limits
          if (index > 0) {
            await sleep(API_RATE_LIMIT_DELAY);
          }

          try {
            const result = await postToGMB(post, integration);
            userResult.postsProcessed++;

            if (result.success) {
              userResult.postsSuccessful++;
              dbUpdates.push({
                id: post.id,
                status: ScheduledPostStatus.PUBLISHED,
                publishedAt: now,
                publishedPostId: result.data?.name || null
              });
              console.log(`✅ Successfully posted: ${post.id}`);
            } else {
              // Check if it's an authentication error that shouldn't be retried
              const isAuthError = result.error.includes('Authentication failed') || 
                                result.error.includes('invalid_grant') || 
                                result.error.includes('Refresh token expired');
              
              if (isAuthError) {
                // Don't retry auth errors, mark as failed immediately
                userResult.postsFailed++;
                userResult.errors.push(`Post ${post.id}: ${result.error}`);
                dbUpdates.push({
                  id: post.id,
                  status: ScheduledPostStatus.FAILED,
                  retryCount: (post.retryCount || 0) + 1,
                  errorMessage: `Authentication failed: ${result.error}`
                });
                console.error(`❌ Auth error for post: ${post.id} - ${result.error}`);
              } else {
                // Handle retry logic for non-auth errors
                const newRetryCount = (post.retryCount || 0) + 1;
                const maxRetries = post.maxRetries || 3;

                if (newRetryCount < maxRetries) {
                  // Mark for retry
                  userResult.postsRetried++;
                  dbUpdates.push({
                    id: post.id,
                    status: ScheduledPostStatus.PENDING, // Keep as pending for retry
                    retryCount: newRetryCount,
                    errorMessage: `Retry ${newRetryCount}/${maxRetries}: ${result.error}`
                  });
                  console.log(`🔄 Retry ${newRetryCount}/${maxRetries} for post: ${post.id}`);
                } else {
                  // Max retries reached, mark as failed
                  userResult.postsFailed++;
                  userResult.errors.push(`Post ${post.id}: Max retries exceeded - ${result.error}`);
                  dbUpdates.push({
                    id: post.id,
                    status: ScheduledPostStatus.FAILED,
                    retryCount: newRetryCount,
                    errorMessage: `Failed after ${maxRetries} retries: ${result.error}`
                  });
                  console.error(`❌ Max retries exceeded for post: ${post.id}`);
                }
              }
            }
          } catch (error: any) {
            userResult.postsProcessed++;
            const newRetryCount = (post.retryCount || 0) + 1;
            const maxRetries = post.maxRetries || 3;

            if (newRetryCount < maxRetries) {
              userResult.postsRetried++;
              dbUpdates.push({
                id: post.id,
                status: ScheduledPostStatus.PENDING,
                retryCount: newRetryCount,
                errorMessage: `Retry ${newRetryCount}/${maxRetries}: ${error.message}`
              });
            } else {
              userResult.postsFailed++;
              userResult.errors.push(`Post ${post.id}: ${error.message}`);
              dbUpdates.push({
                id: post.id,
                status: ScheduledPostStatus.FAILED,
                retryCount: newRetryCount,
                errorMessage: `Failed after ${maxRetries} retries: ${error.message}`
              });
            }
          }
        });

        await Promise.allSettled(batchPromises);
      }

      // Batch update database
      try {
        await batchUpdatePosts(dbUpdates);
      } catch (dbError: any) {
        console.error(`Database update error for user ${userId}:`, dbError.message);
        userResult.errors.push(`Database update failed: ${dbError.message}`);
      }

      return userResult;
    });

    // Wait for all users to be processed
    const userResults = await Promise.allSettled(userPromises);

    userResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const userResult = result.value;
        totalProcessed += userResult.postsProcessed;
        totalSuccessful += userResult.postsSuccessful;
        totalFailed += userResult.postsFailed;
        totalRetried += userResult.postsRetried;
        results.push(userResult);
      } else {
        console.error(`Failed to process user:`, result.reason);
        results.push({
          userId: 'unknown',
          error: result.reason.message,
          postsProcessed: 0,
          postsSuccessful: 0,
          postsFailed: 0,
          postsRetried: 0
        });
      }
    });

    const executionTime = Date.now() - startTime;

    return NextResponse.json({
      message: "✅ GMB CRON executed successfully",
      timestamp: now.toISOString(),
      executionTime: `${executionTime}ms`,
      summary: {
        totalIntegrations: activeIntegrations.length,
        totalPostsFound: allDuePosts.length,
        totalValidPosts: validPosts.length,
        totalPostsProcessed: totalProcessed,
        totalPostsSuccessful: totalSuccessful,
        totalPostsFailed: totalFailed,
        totalPostsRetried: totalRetried,
        successRate: totalProcessed > 0 ? `${((totalSuccessful / totalProcessed) * 100).toFixed(1)}%` : '0%'
      },
      results: results.filter(r => r.scheduledPostsFound > 0), // Only return users with posts
    });

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error("❌ CRON execution failed:", error);

    return NextResponse.json({
      error: "CRON execution failed",
      details: (error as Error).message,
      timestamp: new Date().toISOString(),
      executionTime: `${executionTime}ms`
    }, { status: 500 });
  }
}