import { PLANS, PlanId } from "@/lib/stripe";
import { UsageData, UsageMetric } from "@/lib/use-usage";
import { prisma } from "../../lib/prisma";

const METRIC_TO_LIMIT: Record<UsageMetric, keyof (typeof PLANS)[0]["limits"]> = {
  postsUsed:            "postsPerMonth",
  aiReviewRepliesUsed:  "aiReviewReplies",
  scheduledPostsUsed:   "scheduledPosts",
  geoGridScansUsed:     "geoGridScans",
  reviewPostersUsed:    "reviewPoster",
  keywordTrackingUsed:  "keywordTracking",
};

function zeroed(): Record<UsageMetric, number> {
  return {
    postsUsed:            0,
    aiReviewRepliesUsed:  0,
    scheduledPostsUsed:   0,
    geoGridScansUsed:     0,
    reviewPostersUsed:    0,
    keywordTrackingUsed:  0,
  };
}

const EMPTY: UsageData = {
  used:        zeroed(),
  limits:      zeroed(),
  periodEnd:   new Date().toISOString(),
  plan:        null,
  periodStale: false,
};

/**
 * Core usage resolver — used by both:
 *   • /api/usage route handler  (client SWR refetch)
 *   • Dashboard layout           (server-side prefetch → SWR fallback)
 */
export async function getUsageData(stackUserId: string): Promise<UsageData> {
  const subscription = await prisma.subscription.findUnique({
    where:   { stackUserId },
    include: { usage: true },
  });

  // No subscription found
  if (!subscription) return EMPTY;

  // Subscription exists but is not active / trialing
  if (
    subscription.status !== "ACTIVE" &&
    subscription.status !== "TRIALING"
  ) {
    return EMPTY;
  }

  const planId = subscription.plan.toLowerCase() as PlanId;
  const plan   = PLANS.find((p) => p.id === planId);

  // Unknown plan id — shouldn't happen in production, but be safe
  if (!plan) return EMPTY;

  const usage = subscription.usage;

  const used: Record<UsageMetric, number> = {
    postsUsed:            usage?.postsUsed            ?? 0,
    aiReviewRepliesUsed:  usage?.aiReviewRepliesUsed  ?? 0,
    scheduledPostsUsed:   usage?.scheduledPostsUsed   ?? 0,
    geoGridScansUsed:     usage?.geoGridScansUsed     ?? 0,
    reviewPostersUsed:    usage?.reviewPostersUsed     ?? 0,
    keywordTrackingUsed:  usage?.keywordTrackingUsed  ?? 0,
  };

  const limits = Object.fromEntries(
    (Object.keys(used) as UsageMetric[]).map((metric) => [
      metric,
      plan.limits[METRIC_TO_LIMIT[metric]] as number,
    ])
  ) as Record<UsageMetric, number>;

  const periodEnd  = usage?.periodEnd ?? subscription.stripeCurrentPeriodEnd;
  const periodStale = periodEnd < new Date();

  return {
    used,
    limits,
    periodEnd:   periodEnd.toISOString(),
    plan:        planId,
    periodStale,
  };
}