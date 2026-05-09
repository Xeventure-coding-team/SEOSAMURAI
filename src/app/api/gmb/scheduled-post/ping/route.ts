import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { ScheduledPostStatus } from "@/generated/prisma";
import axios from "axios";
import FormData from "form-data";
import { decrementUsage } from "@/lib/usage";

const BATCH_SIZE = 5;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;
const API_RATE_LIMIT_DELAY = 500;
const RETRY_BACKOFF_MINUTES = 15;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cleanAccountId(account: string): string {
  return account.startsWith("accounts/") ? account.replace("accounts/", "") : account;
}

function cleanLocationId(location: string): string {
  return location.startsWith("locations/") ? location.replace("locations/", "") : location;
}

const actionTypeMap: Record<string, string> = {
  "book-a-visit": "BOOK",
  "place-an-order": "ORDER",
  shop: "SHOP",
  "read-more": "LEARN_MORE",
  "sign-up": "SIGN_UP",
  call: "CALL",
  reserve: "RESERVE",
  "get-quote": "GET_QUOTE",
  appointment: "APPOINTMENT",
  NO_ACTION: "",
};

function getActionType(actionType: string): string | null {
  if (actionType === "NO_ACTION" || !actionType) return null;
  return actionTypeMap[actionType] || actionType.toUpperCase();
}

function validatePhoneNumber(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) {
    const digits = cleaned.replace(/\D/g, "");
    if (digits.startsWith("91") && digits.length === 12) return `tel:+${digits}`;
    if (digits.startsWith("1") && digits.length === 11) return `tel:+${digits}`;
    throw new Error("Invalid international phone number.");
  }
  let cleanPhone = cleaned.replace(/\D/g, "");
  if (cleanPhone.startsWith("0")) cleanPhone = cleanPhone.slice(1);
  if (cleanPhone.length === 10) return `tel:+91${cleanPhone}`;
  if (cleanPhone.length === 11 && cleanPhone.startsWith("1")) return `tel:+${cleanPhone}`;
  throw new Error("Invalid phone number format.");
}

function validateUrl(url: string): string {
  try {
    let validUrl = url;
    if (!url.startsWith("http://") && !url.startsWith("https://")) validUrl = `https://${url}`;
    new URL(validUrl);
    return validUrl;
  } catch {
    throw new Error("Invalid URL format");
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES, delay = RETRY_DELAY): Promise<T> {
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

// ─── Token refresh — per-user mutex to prevent race conditions ────────────────

const tokenRefreshLocks = new Map<string, Promise<string>>();

async function getValidAccessToken(integration: any): Promise<string> {
  const userId = integration.user_id || integration.userId;
  const now = new Date();
  const expiry = new Date(integration.tokenExpiry);

  // Add 60s buffer — don't wait until the last second
  if (now < new Date(expiry.getTime() - 60_000)) {
    return integration.accessToken;
  }

  // If a refresh is already in flight for this user, reuse it
  if (tokenRefreshLocks.has(userId)) {
    return tokenRefreshLocks.get(userId)!;
  }

  const refreshPromise = (async () => {
    try {
      const params = new URLSearchParams();
      params.append("client_id", process.env.GOOGLE_CLIENT_ID!);
      params.append("client_secret", process.env.GOOGLE_CLIENT_SECRET!);
      params.append("refresh_token", integration.refreshToken);
      params.append("grant_type", "refresh_token");

      const res = await axios.post("https://oauth2.googleapis.com/token", params);
      const newAccessToken = res.data.access_token;
      const newExpiry = new Date(Date.now() + res.data.expires_in * 1000);

      await prisma.gmbIntegration.update({
        where: { id: integration.id },
        data: { accessToken: newAccessToken, tokenExpiry: newExpiry },
      });

      // Update in-memory so other posts in same run use the new token
      integration.accessToken = newAccessToken;
      integration.tokenExpiry = newExpiry;

      return newAccessToken;
    } finally {
      tokenRefreshLocks.delete(userId);
    }
  })();

  tokenRefreshLocks.set(userId, refreshPromise);
  return refreshPromise;
}

// ─── Image handling ───────────────────────────────────────────────────────────

async function uploadToImgKit(file: Buffer, fileName: string): Promise<string> {
  const IMAGEKIT_UPLOAD_URL = "https://upload.imagekit.io/api/v1/files/upload";
  const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY;
  const IMAGEKIT_PUBLIC_KEY = process.env.IMAGEKIT_PUBLIC_KEY;

  if (!IMAGEKIT_PRIVATE_KEY || !IMAGEKIT_PUBLIC_KEY) throw new Error("ImageKit credentials not configured");

  const formData = new FormData();
  formData.append("file", file, fileName);
  formData.append("fileName", fileName);
  formData.append("folder", "/gmb-posts");

  const response = await axios.post(IMAGEKIT_UPLOAD_URL, formData, {
    headers: {
      ...formData.getHeaders(),
      Authorization: `Basic ${Buffer.from(`${IMAGEKIT_PRIVATE_KEY}:`).toString("base64")}`,
    },
    timeout: 30000,
  });

  return response.data.url;
}

async function resolveImageUrl(imageUrl: string): Promise<string> {
  // Try using the URL directly first
  try {
    const headResponse = await axios.head(imageUrl, { timeout: 5000 });
    if (headResponse.status === 200) return imageUrl;
  } catch {
    // Fall through to download + reupload
  }

  const response = await axios.get(imageUrl, {
    responseType: "arraybuffer",
    timeout: 15000,
    maxContentLength: 10 * 1024 * 1024,
  });

  const buffer = Buffer.from(response.data);
  const urlObj = new URL(imageUrl);
  let fileName = urlObj.pathname.split("/").pop() || `image-${Date.now()}`;

  if (!fileName.includes(".")) {
    const contentType = response.headers["content-type"];
    const ext = contentType?.includes("png")
      ? ".png"
      : contentType?.includes("gif")
        ? ".gif"
        : contentType?.includes("webp")
          ? ".webp"
          : ".jpg";
    fileName += ext;
  }

  return uploadToImgKit(buffer, fileName);
}

// ─── GMB post ─────────────────────────────────────────────────────────────────

async function postToGMB(scheduledPost: any, integration: any): Promise<{ success: boolean; error?: string; data?: any }> {
  const account = cleanAccountId(scheduledPost.accountId);
  const location = cleanLocationId(scheduledPost.locationId);

  // FIX: Don't silently fail on missing image — throw so retry logic kicks in
  if (!scheduledPost.imageUrl) {
    throw new Error("No image URL provided for post");
  }

  let imageUrl: string;
  try {
    imageUrl = await resolveImageUrl(scheduledPost.imageUrl);
  } catch (err: any) {
    throw new Error(`Image processing failed: ${err.message}`);
  }

  const postBody: any = {
    languageCode: scheduledPost.languageCode || "en-US",
    topicType: scheduledPost.topicType || "STANDARD",
    summary: scheduledPost.summary,
    media: [{ mediaFormat: "PHOTO", sourceUrl: imageUrl }],
  };

  if (scheduledPost.actionType && scheduledPost.actionUrl) {
    const actionType = getActionType(scheduledPost.actionType);
    if (actionType) {
      try {
        let actionUrl = scheduledPost.actionUrl;
        if (actionType === "CALL" && !actionUrl.startsWith("tel:")) {
          actionUrl = validatePhoneNumber(actionUrl);
        } else if (actionType !== "CALL") {
          actionUrl = validateUrl(actionUrl);
        }
        postBody.callToAction = { actionType, url: actionUrl };
      } catch (error: any) {
        // CTA failure is non-fatal — post without it
        console.warn(`Invalid CTA for post ${scheduledPost.id}, posting without it: ${error.message}`);
      }
    }
  }

  const accessToken = await getValidAccessToken(integration);

  const response = await withRetry(() =>
    axios.post(
      `https://mybusiness.googleapis.com/v4/accounts/${account}/locations/${location}/localPosts`,
      postBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    )
  );

  return { success: true, data: response.data };
}

// ─── Batch DB updates ─────────────────────────────────────────────────────────

async function batchUpdatePosts(
  updates: Array<{
    id: string;
    status: ScheduledPostStatus;
    publishedAt?: Date;
    publishedPostId?: string;
    errorMessage?: string;
    retryCount?: number;
    scheduledAt?: Date; // FIX: allow rescheduling retries
  }>
) {
  if (updates.length === 0) return;

  const promises = updates.map((update) =>
    prisma.scheduledPost.update({
      where: { id: update.id },
      data: {
        status: update.status,
        ...(update.publishedAt && { publishedAt: update.publishedAt }),
        ...(update.publishedPostId && { publishedPostId: update.publishedPostId }),
        ...(update.errorMessage !== undefined && { errorMessage: update.errorMessage }),
        ...(update.retryCount !== undefined && { retryCount: update.retryCount }),
        ...(update.scheduledAt && { scheduledAt: update.scheduledAt }), // FIX: reschedule retry
        updatedAt: new Date(),
      },
    })
  );

  await Promise.allSettled(promises);
}

// ─── CRON handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    let totalProcessed = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;
    let totalRetried = 0;
    const results: any[] = [];

    // FIX: Don't hardcode retryCount lte 3 — use maxRetries per post
    // FIX: Only pick up retried posts whose scheduledAt has passed (backed off)
    const allDuePosts = await prisma.scheduledPost.findMany({
      where: {
        OR: [
          { status: ScheduledPostStatus.PENDING },
          { status: ScheduledPostStatus.FAILED },
        ],
        scheduledAt: { lte: now },
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
        createdBy: true,
      },
    });

    if (allDuePosts.length === 0) {
      return NextResponse.json({
        message: "No scheduled posts found to process",
        timestamp: now.toISOString(),
        summary: { totalPostsFound: 0, totalPostsProcessed: 0, executionTime: `${Date.now() - startTime}ms` },
      });
    }

    const activeIntegrations = await prisma.gmbIntegration.findMany({
      where: { isActive: true },
      select: {
        id: true,
        userId: true,
        user_id: true,
        accountName: true,
        accountId: true,
        accessToken: true,
        refreshToken: true,
        tokenExpiry: true,
      },
    });

    const integrationMap = new Map<string, any>();
    activeIntegrations.forEach((integration) => {
      const userId = integration.user_id || integration.userId;
      integrationMap.set(userId, integration);
    });

    const activeUserIds = new Set(integrationMap.keys());

    // FIX: Filter uses per-post maxRetries, not hardcoded 3
    const validPosts = allDuePosts.filter((post) => {
      if (!activeUserIds.has(post.user_id)) return false;
      const retryCount = post.retryCount || 0;
      const maxRetries = post.maxRetries || MAX_RETRIES;
      return retryCount < maxRetries; // strict less-than — stop at limit
    });

    console.log(`Processing ${validPosts.length} valid posts out of ${allDuePosts.length} due`);

    const postsByUser = new Map<string, any[]>();
    validPosts.forEach((post) => {
      const posts = postsByUser.get(post.user_id) || [];
      posts.push(post);
      postsByUser.set(post.user_id, posts);
    });

    const userPromises = Array.from(postsByUser.entries()).map(async ([userId, userPosts]) => {
      const integration = integrationMap.get(userId);

      if (!integration) {
        return {
          userId,
          postsProcessed: 0,
          postsSuccessful: 0,
          postsFailed: userPosts.length,
          postsRetried: 0,
          errors: [`No active integration for user ${userId}`],
        };
      }

      const userResult = {
        userId,
        accountName: integration.accountName || "Unknown",
        accountId: integration.accountId || "Unknown",
        scheduledPostsFound: userPosts.length,
        postsProcessed: 0,
        postsSuccessful: 0,
        postsFailed: 0,
        postsRetried: 0,
        errors: [] as string[],
      };

      const dbUpdates: any[] = [];

      // Process in batches sequentially — avoids hammering GMB API
      for (let i = 0; i < userPosts.length; i += BATCH_SIZE) {
        const batch = userPosts.slice(i, i + BATCH_SIZE);

        // Process each batch concurrently, but batches are sequential
        const batchPromises = batch.map(async (post, index) => {
          if (index > 0) await sleep(API_RATE_LIMIT_DELAY * index); // stagger within batch

          userResult.postsProcessed++;
          const retryCount = post.retryCount || 0;
          const maxRetries = post.maxRetries || MAX_RETRIES;

          try {
            const result = await postToGMB(post, integration);

            userResult.postsSuccessful++;
            dbUpdates.push({
              id: post.id,
              status: ScheduledPostStatus.PUBLISHED,
              publishedAt: now,
              publishedPostId: result.data?.name || null,
              errorMessage: "", // clear previous errors
            });
            console.log(`✅ Posted: ${post.id}`);
          } catch (error: any) {
            const errMsg = error.response?.data?.error?.message || error.message;
            const newRetryCount = retryCount + 1;

            const isAuthError =
              errMsg.includes("invalid_grant") ||
              errMsg.includes("Token has been expired") ||
              errMsg.includes("Refresh token expired");

            const isHardFail =
              isAuthError ||
              errMsg.includes("LOCATION_NOT_FOUND") ||
              errMsg.includes("PERMISSION_DENIED") ||
              newRetryCount >= maxRetries;

            // After hard fail — release the slot back
            if (isHardFail) {
              userResult.postsFailed++;
              userResult.errors.push(`Post ${post.id}: ${errMsg}`);
              dbUpdates.push({
                id: post.id,
                status: ScheduledPostStatus.FAILED,
                retryCount: newRetryCount,
                errorMessage: isAuthError
                  ? `Auth failed (check integration): ${errMsg}`
                  : newRetryCount >= maxRetries
                    ? `Max retries (${maxRetries}) exceeded: ${errMsg}`
                    : errMsg,
              });

              // ── Release quota — post never published ─────────────────────────
              try {
                const usage = await prisma.usage.findUnique({
                  where: { stackUserId: post.user_id }
                });
                const wasAlreadyFailed = post.status === ScheduledPostStatus.FAILED;
                if (isHardFail) {
                  try {
                    const usage = await prisma.usage.findUnique({
                      where: { stackUserId: post.user_id }
                    });
                    if (usage && new Date(post.scheduledAt) >= usage.periodStart) {
                      await decrementUsage(post.user_id, "scheduledPostsUsed")
                    }
                  } catch (e) {
                    console.error(`Failed to decrement usage for post ${post.id}:`, e);
                  }
                }
              } catch (e) {
                console.error(`Failed to decrement usage for post ${post.id}:`, e);
              }
              // ─────────────────────────────────────────────────────────────────

              console.error(`❌ Hard fail post ${post.id}: ${errMsg}`);
            } else {
              // FIX: Reschedule retry with backoff instead of immediate re-pickup
              const nextRetryAt = new Date(Date.now() + RETRY_BACKOFF_MINUTES * 60 * 1000 * newRetryCount);
              userResult.postsRetried++;
              dbUpdates.push({
                id: post.id,
                status: ScheduledPostStatus.PENDING,
                retryCount: newRetryCount,
                scheduledAt: nextRetryAt, // backed-off retry time
                errorMessage: `Retry ${newRetryCount}/${maxRetries} at ${nextRetryAt.toISOString()}: ${errMsg}`,
              });
              console.log(`🔄 Retry ${newRetryCount}/${maxRetries} for post ${post.id} at ${nextRetryAt.toISOString()}`);
            }
          }


        });

        await Promise.allSettled(batchPromises);

        // Delay between batches (not just within)
        if (i + BATCH_SIZE < userPosts.length) {
          await sleep(1000);
        }
      }

      try {
        await batchUpdatePosts(dbUpdates);
      } catch (dbError: any) {
        console.error(`DB update error for user ${userId}:`, dbError.message);
        userResult.errors.push(`DB update failed: ${dbError.message}`);
      }

      return userResult;
    });

    const userResults = await Promise.allSettled(userPromises);

    userResults.forEach((result) => {
      if (result.status === "fulfilled") {
        const r = result.value;
        totalProcessed += r.postsProcessed;
        totalSuccessful += r.postsSuccessful;
        totalFailed += r.postsFailed;
        totalRetried += r.postsRetried;
        results.push(r);
      } else {
        console.error("User processing failed:", result.reason);
        results.push({ error: result.reason?.message, postsProcessed: 0 });
      }
    });

    return NextResponse.json({
      message: "✅ GMB CRON executed successfully",
      timestamp: now.toISOString(),
      executionTime: `${Date.now() - startTime}ms`,
      summary: {
        totalIntegrations: activeIntegrations.length,
        totalPostsFound: allDuePosts.length,
        totalValidPosts: validPosts.length,
        totalPostsProcessed: totalProcessed,
        totalPostsSuccessful: totalSuccessful,
        totalPostsFailed: totalFailed,
        totalPostsRetried: totalRetried,
        successRate: totalProcessed > 0 ? `${((totalSuccessful / totalProcessed) * 100).toFixed(1)}%` : "0%",
      },
      results: results.filter((r) => r.scheduledPostsFound > 0),
    });
  } catch (error) {
    console.error("❌ CRON failed:", error);
    return NextResponse.json(
      { error: "CRON execution failed", details: (error as Error).message, timestamp: new Date().toISOString(), executionTime: `${Date.now() - startTime}ms` },
      { status: 500 }
    );
  }
}