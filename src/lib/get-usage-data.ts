import { PLANS, PlanId, PlanLimits } from "@/lib/stripe";
import { UsageData, UsageMetric, SlotMetric } from "@/lib/use-usage";
import { prisma } from "../../lib/prisma";

const METRIC_TO_LIMIT: Record<UsageMetric, keyof PlanLimits> = {
  postsUsed: "postsPerMonth",
  aiReviewRepliesUsed: "aiReviewReplies",
  scheduledPostsUsed: "scheduledPosts",
  geoGridScansUsed: "geoGridScans",
  keywordTrackingUsed: "keywordTracking",
  aiImageUsed: "aiImage",
};

function zeroed(): Record<UsageMetric, number> {
  return {
    postsUsed: 0,
    aiReviewRepliesUsed: 0,
    scheduledPostsUsed: 0,
    geoGridScansUsed: 0,
    keywordTrackingUsed: 0,
    aiImageUsed: 0,
  };
}

function zeroedSlots(): Record<SlotMetric, number> {
  return {
    locationsUsed: 0,
    websitesUsed: 0,
    reviewPostersUsed: 0,
  };
}

const EMPTY: UsageData = {
  used: zeroed(),
  limits: zeroed(),
  slots: zeroedSlots(),
  slotLimits: zeroedSlots(),
  periodEnd: new Date().toISOString(),
  plan: null,
  periodStale: false,
};

export async function getUsageData(stackUserId: string): Promise<UsageData> {
  const subscription = await prisma.subscription.findUnique({
    where: { stackUserId },
    include: { usage: true },
  });

  if (!subscription) return EMPTY;

  if (
    subscription.status !== "ACTIVE" &&
    subscription.status !== "TRIALING"
  ) {
    return EMPTY;
  }

  const planId = subscription.plan.toLowerCase() as PlanId;
  const plan = PLANS.find((p) => p.id === planId);

  if (!plan) return EMPTY;

  const usage = subscription.usage;

  const used: Record<UsageMetric, number> = {
    postsUsed: usage?.postsUsed ?? 0,
    aiReviewRepliesUsed: usage?.aiReviewRepliesUsed ?? 0,
    scheduledPostsUsed: usage?.scheduledPostsUsed ?? 0,
    geoGridScansUsed: usage?.geoGridScansUsed ?? 0,
    keywordTrackingUsed: usage?.keywordTrackingUsed ?? 0,
    aiImageUsed: usage?.aiImageUsed ?? 0,

  };

  const limits = Object.fromEntries(
    (Object.keys(used) as UsageMetric[]).map((metric) => [
      metric,
      plan.limits[METRIC_TO_LIMIT[metric]] as number,
    ])
  ) as Record<UsageMetric, number>;

  const periodEnd = usage?.periodEnd ?? subscription.stripeCurrentPeriodEnd;
  const periodStale = periodEnd < new Date();

  const slots: Record<SlotMetric, number> = {
    locationsUsed: 0,
    websitesUsed: 0,
    reviewPostersUsed: usage?.reviewPostersUsed ?? 0,
  };

  const slotLimits: Record<SlotMetric, number> = {
    locationsUsed: plan.limits.locations,
    websitesUsed: plan.limits.websites,
    reviewPostersUsed: plan.limits.reviewPoster,
  };

  return {
    used,
    limits,
    slots,
    slotLimits,
    periodEnd: periodEnd.toISOString(),
    plan: planId,
    periodStale,
  };
}