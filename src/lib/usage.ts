import { getPlanLimits, PlanId } from "@/lib/stripe";
import { prisma } from "../../lib/prisma";

export type UsageMetric =
  | "postsUsed"
  | "aiReviewRepliesUsed"
  | "scheduledPostsUsed"
  | "geoGridScansUsed"
  | "reviewPostersUsed"
  | "keywordTrackingUsed"
  | "aiImageUsed";

// Maps each UsageMetric → the corresponding PlanLimits key
const METRIC_TO_LIMIT: Record<UsageMetric, string> = {
  postsUsed: "postsPerMonth",
  aiReviewRepliesUsed: "aiReviewReplies",
  scheduledPostsUsed: "scheduledPosts",
  geoGridScansUsed: "geoGridScans",
  reviewPostersUsed: "reviewPoster",
  keywordTrackingUsed: "keywordTracking",
  aiImageUsed: "aiImage",
};

export type IncrementResult =
  | { ok: true; remaining: number }
  | { ok: false; reason: "no_subscription" | "no_usage" | "limit_reached" | "period_expired" };


export async function incrementUsage(
  stackUserId: string,
  metric: UsageMetric,
  by = 1
): Promise<IncrementResult> {
  // ── 1. Load subscription + usage ─────────────────────────────────────────
  const subscription = await prisma.subscription.findUnique({
    where: { stackUserId },
    include: { usage: true },
  });

  if (!subscription) return { ok: false, reason: "no_subscription" };


  const usage = subscription.usage ?? await prisma.usage.upsert({
    where: { stackUserId },
    update: {},
    create: {
      subscriptionId: subscription.id,
      stackUserId,
      periodStart: new Date(),
      periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      postsUsed: 0,
      aiReviewRepliesUsed: 0,
      scheduledPostsUsed: 0,
      geoGridScansUsed: 0,
      reviewPostersUsed: 0,
      keywordTrackingUsed: 0,
    },
  });


  if (!usage) return { ok: false, reason: "no_usage" };

  // ── 2. Check billing period hasn't expired (webhook may be delayed) ───────
  const effectivePeriodEnd = subscription.stripeCurrentPeriodEnd ?? usage.periodEnd;
  if (effectivePeriodEnd < new Date()) {
    return { ok: false, reason: "period_expired" };
  }
  // ── 3. Check limit ────────────────────────────────────────────────────────
  const planId = subscription.plan.toLowerCase() as PlanId;
  const limits = getPlanLimits(planId);
  const limitKey = METRIC_TO_LIMIT[metric] as keyof typeof limits;

  // Experimental: override aiReviewReplies limit server-side only
  const limit = metric === "aiReviewRepliesUsed"
    ? 500
    : limits[limitKey] as number;

  const current = usage[metric] as number;

  if (current + by > limit) {
    return { ok: false, reason: "limit_reached" };
  }

  // ── 4. Atomically increment ───────────────────────────────────────────────
  const updated = await prisma.usage.update({
    where: { id: usage.id },
    data: { [metric]: { increment: by } },
  });

  return {
    ok: true,
    remaining: limit - (updated[metric] as number),
  };
}

/**
 * Decrements a usage metric (e.g. when a post is deleted).
 * Will not go below 0.
 */
export async function decrementUsage(
  stackUserId: string,
  metric: UsageMetric,
  by = 1
): Promise<void> {
  const usage = await prisma.usage.findUnique({ where: { stackUserId } });
  if (!usage) return;

  const current = usage[metric] as number;
  await prisma.usage.update({
    where: { id: usage.id },
    data: { [metric]: Math.max(0, current - by) },
  });
}

/**
 * Resets all usage counters for a new billing period.
 * Call this from your Stripe webhook on invoice.paid / subscription renewed.
 */
export async function resetUsageForPeriod(
  stackUserId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<void> {
  await prisma.usage.update({
    where: { stackUserId },
    data: {
      postsUsed: 0,
      aiReviewRepliesUsed: 0,
      scheduledPostsUsed: 0,
      geoGridScansUsed: 0,
      reviewPostersUsed: 0,
      keywordTrackingUsed: 0,
      periodStart,
      periodEnd,
    },
  });
}

/**
 * Creates a fresh Usage row when a new subscription is created.
 * Call this from your Stripe webhook on checkout.session.completed.
 */
export async function createUsageForSubscription(opts: {
  subscriptionId: string;
  stackUserId: string;
  periodStart: Date;
  periodEnd: Date;
}): Promise<void> {
  await prisma.usage.create({
    data: {
      subscriptionId: opts.subscriptionId,
      stackUserId: opts.stackUserId,
      periodStart: opts.periodStart,
      periodEnd: opts.periodEnd,
      postsUsed: 0,
      aiReviewRepliesUsed: 0,
      scheduledPostsUsed: 0,
      geoGridScansUsed: 0,
      reviewPostersUsed: 0,
      keywordTrackingUsed: 0,
    },
  });
}