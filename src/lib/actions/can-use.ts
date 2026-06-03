import { getPlanLimits, PlanId } from "@/lib/stripe";
import { prisma } from "../../../lib/prisma";
import { IncrementResult } from "../usage";

// All checkable features — boolean flags + numeric usage metrics
export type Feature =
  | "bulk-posts" | "bulkPosts"
  | "competitor-insights" | "competitorInsights"
  | "advanced-analytics" | "analytics"
  | "media-upload" | "mediaUpload"
  | "review-tracking" | "reviewTracking"
  | "tasks"
  | "posts" | "postsPerMonth"
  | "ai-review-replies" | "aiReviewReplies"
  | "scheduled-posts" | "scheduledPosts"
  | "geo-grid-scans" | "geoGridScans"
  | "review-posters" | "reviewPoster"
  | "keyword-tracking" | "keywordTracking" | "aiImage";

// Maps any alias → the PlanLimits key
const TO_LIMIT_KEY: Record<string, string> = {
  // boolean features
  "bulk-posts": "bulkPosts",
  "competitor-insights": "competitorInsights",
  "advanced-analytics": "analytics",
  "media-upload": "mediaUpload",
  "review-tracking": "reviewTracking",
  // numeric features → limit key
  "posts": "postsPerMonth",
  "ai-review-replies": "aiReviewReplies",
  "scheduled-posts": "scheduledPosts",
  "geo-grid-scans": "geoGridScans",
  "review-posters": "reviewPoster",
  "keyword-tracking": "keywordTracking",

  "task-achievements": "taskAchievements",
  "taskAchievements": "taskAchievements",
  "task-milestones": "taskMilestones",
  "taskMilestones": "taskMilestones",
  "ai-image": "aiImage",
  "aiImage": "aiImage",
};

// Maps numeric limit key → usage row column
const TO_USAGE_KEY: Record<string, string> = {
  postsPerMonth: "postsUsed",
  aiReviewReplies: "aiReviewRepliesUsed",
  scheduledPosts: "scheduledPostsUsed",
  geoGridScans: "geoGridScansUsed",
  reviewPoster: "reviewPostersUsed",
  keywordTracking: "keywordTrackingUsed",
  aiImage: "aiImagesUsed",
};

export type CanUseResult =
  | { ok: true; plan: PlanId; type: "boolean" }
  | { ok: true; plan: PlanId; type: "numeric"; used: number; limit: number; remaining: number }
  | { ok: false; plan: PlanId | null; reason: "no_subscription" | "plan_limit" | "limit_reached" | "unknown_feature" | "period_expired" };


export function getCode(result: CanUseResult | IncrementResult): string {
  if (result.ok) return "";
  const reason = (result as { reason: string }).reason;
  switch (reason) {
    case "no_subscription": return "NO_SUBSCRIPTION";
    case "limit_reached": return "LIMIT_REACHED";
    case "period_expired": return "PERIOD_EXPIRED";
    default: return "PLAN_LIMIT";
  }
}

export async function canUse(
  stackUserId: string,
  feature: string
): Promise<CanUseResult> {
  // ── 1. Load subscription + usage safely ──────────────────────────────────
  const subscription = await prisma.subscription.findUnique({
    where: { stackUserId },
    include: { usage: true },
  }).catch(() => null);

  if (!subscription) return { ok: false, reason: "no_subscription", plan: null };

  const planId = subscription.plan.toLowerCase() as PlanId;
  const limits = getPlanLimits(planId);

  // ── 2. Resolve feature → limit key ───────────────────────────────────────
  const limitKey = TO_LIMIT_KEY[feature] ?? feature;

  if (!(limitKey in limits)) {
    return { ok: false, reason: "unknown_feature", plan: planId };
  }

  const limitValue = limits[limitKey as keyof typeof limits];

  // ── 3a. Boolean feature ───────────────────────────────────────────────────
  if (typeof limitValue === "boolean") {
    return limitValue
      ? { ok: true, plan: planId, type: "boolean" }
      : { ok: false, plan: planId, reason: "plan_limit" };
  }

  // ── 3b. Numeric feature — check usage count ───────────────────────────────
  const limit = limitValue as number;
  const usageKey = TO_USAGE_KEY[limitKey];
  const usage = subscription.usage;

  if (!usage) {
    // No usage row yet — treat as 0 used
    return { ok: true, plan: planId, type: "numeric", used: 0, limit, remaining: limit };
  }

  // Check billing period hasn't expired
  if (usage.periodEnd < new Date()) {
    return { ok: false, plan: planId, reason: "period_expired" };
  }

  const used = (usage[usageKey as keyof typeof usage] as number) ?? 0;

  if (used >= limit) {
    return { ok: false, plan: planId, reason: "limit_reached" };
  }

  return {
    ok: true,
    plan: planId,
    type: "numeric",
    used,
    limit,
    remaining: limit - used,
  };
}

/**
 * Redirect-on-fail. Works for both boolean and numeric features.
 */
export async function requireFeature(
  stackUserId: string,
  feature: string
): Promise<Extract<CanUseResult, { ok: true }>> {
  const { redirect } = await import("next/navigation");
  const result = await canUse(stackUserId, feature);

  if (!result.ok) {
    const reason = (result as { reason: string }).reason;
    const params = new URLSearchParams({
      reason: reason === "no_subscription" ? "subscription_required"
        : reason === "limit_reached" ? "usage_limit_reached"
          : "upgrade_required",
      feature,
    });
    redirect(`/pricing?${params}`);
  }

  return result as Extract<CanUseResult, { ok: true }>;
}

const FEATURE_LABELS: Record<string, string> = {
  "posts": "Posts",
  "postsPerMonth": "Posts",
  "ai-review-replies": "AI Review Replies",
  "aiReviewReplies": "AI Review Replies",
  "scheduled-posts": "Scheduled Posts",
  "scheduledPosts": "Scheduled Posts",
  "geo-grid-scans": "Geo Grid Scans",
  "geoGridScans": "Geo Grid Scans",
  "review-posters": "Review Posters",
  "reviewPoster": "Review Posters",
  "keyword-tracking": "Keyword Tracking",
  "keywordTracking": "Keyword Tracking",
  "bulk-posts": "Bulk Posting",
  "bulkPosts": "Bulk Posting",
  "advanced-analytics": "Advanced Analytics",
  "analytics": "Analytics",
  "competitor-insights": "Competitor Insights",
  "competitorInsights": "Competitor Insights",
  "review-tracking": "Review Tracking",
  "reviewTracking": "Review Tracking",
  "media-upload": "Media Upload",
  "mediaUpload": "Media Upload",
  "tasks": "Tasks",
  "task-achievements": "taskAchievements",
  "task-milestones": "taskMilestones",
  "ai-image": "AI Image Generation",
  "aiImage": "AI Image Generation",
};


type FailedResult =
  | Extract<CanUseResult, { ok: false }>
  | Extract<IncrementResult, { ok: false }>;

export function canUseErrorMessage(
  result: CanUseResult | IncrementResult,
  feature: string
): string {
  const label = FEATURE_LABELS[feature] ?? feature;

  if (result.ok) return "";

  const reason = (result as FailedResult).reason;

  switch (reason) {
    case "limit_reached": return `Monthly ${label} limit reached`;
    case "plan_limit": return `${label} is not available on your current plan. Please upgrade.`;
    case "no_subscription": return `An active subscription is required to use ${label}.`;
    case "period_expired": return `Your billing period has expired. Please check your subscription.`;
    case "unknown_feature": return `Feature "${feature}" not recognised.`;
    case "no_usage": return `Usage data not found. Please contact support.`;
    default: return `Cannot use ${label} right now.`;
  }
}