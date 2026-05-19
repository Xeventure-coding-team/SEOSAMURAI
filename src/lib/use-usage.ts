import useSWR from "swr";
import { getPlanLimits, PlanId } from "./stripe";

export type UsageMetric =
  | "postsUsed"
  | "aiReviewRepliesUsed"
  | "scheduledPostsUsed"
  | "geoGridScansUsed"
  | "keywordTrackingUsed"
  | "aiImageUsed"
  ;


export type SlotMetric = "locationsUsed" | "websitesUsed" | "reviewPostersUsed";

export interface UsageData {
  used: Record<UsageMetric, number>;
  limits: Record<UsageMetric, number>;
  slots: Record<SlotMetric, number>; 
  slotLimits: Record<SlotMetric, number>;
  periodEnd: string;
  plan: string | null;
  periodStale: boolean;
}

const FEATURE_ALIAS: Record<string, string> = {
  "bulk-posts": "bulkPosts",
  "competitor-insights": "competitorInsights",
  "advanced-analytics": "analytics",
  "media-upload": "mediaUpload",
  "review-tracking": "reviewTracking",
  "tasks": "tasks",
  bulkPosts: "bulkPosts",
  competitorInsights: "competitorInsights",
  mediaUpload: "mediaUpload",
  reviewTracking: "reviewTracking",
};


function resolveFeatureFromLimits(feature: string, planId: PlanId): boolean {
  const limitKey = FEATURE_ALIAS[feature] ?? feature;
  const limits = getPlanLimits(planId);
  if (!(limitKey in limits)) return false;
  const value = limits[limitKey as keyof typeof limits];
  return typeof value === "boolean" ? value : (value as number) > 0;
}

export type UsageStatus = "ok" | "warning" | "exceeded";

export function getMetricStatus(used: number, limit: number): UsageStatus {
  const pct = used / limit;
  if (pct >= 1) return "exceeded";
  if (pct >= 0.8) return "warning";
  return "ok";
}

export function getRemainingFor(data: UsageData, metric: UsageMetric) {
  return Math.max(0, data.limits[metric] - data.used[metric]);
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();

  if (!res.ok || json.error) {
    throw new Error(json.error || "Failed to fetch usage");
  }

  return json;
};

export function useUsage() {
  const { data, error, isLoading, mutate } = useSWR<UsageData>(
    "/api/usage",
    fetcher,
    { refreshInterval: 30_000 }
  );

  function canUse(metric: UsageMetric): boolean {
    if (!data) return false;
    return data.used[metric] < data.limits[metric];
  }

  function statusFor(metric: UsageMetric): UsageStatus {
    if (!data) return "ok";
    return getMetricStatus(data.used[metric], data.limits[metric]);
  }

  function pctFor(metric: UsageMetric): number {
    if (!data) return 0;
    return Math.min(100, Math.round((data.used[metric] / data.limits[metric]) * 100));
  }

  return { data, error, isLoading, canUse, statusFor, pctFor, refresh: mutate };
}

export function useFeature(feature: string): boolean {
  const { data } = useUsage();
  if (!data?.plan) return false;
  return resolveFeatureFromLimits(feature, data.plan as PlanId);
}