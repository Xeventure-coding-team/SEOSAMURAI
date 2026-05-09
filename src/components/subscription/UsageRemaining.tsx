"use client";

import { useUsage, UsageMetric } from "@/lib/use-usage";
import { cn } from "@/lib/utils";
import { SubscriptionBadge } from "./SubscriptionBadge";
import {
  FileText,
  MessageSquare,
  CalendarClock,
  ScanLine,
  Image,
  Tags,
} from "lucide-react";
import Link from "next/link";

const METRIC_CONFIG: Record<
  UsageMetric,
  { label: string; icon: React.ElementType; description: string }
> = {
  postsUsed:           { label: "Posts",          icon: FileText,      description: "Posts published this month" },
  aiReviewRepliesUsed: { label: "AI Replies",     icon: MessageSquare, description: "AI-generated review replies" },
  scheduledPostsUsed:  { label: "Scheduled",      icon: CalendarClock, description: "Posts scheduled this month" },
  geoGridScansUsed:    { label: "Geo Scans",      icon: ScanLine,      description: "Geo grid scans run" },
  reviewPostersUsed:   { label: "Review Posters", icon: Image,         description: "Review poster images generated" },
  keywordTrackingUsed: { label: "Keywords",       icon: Tags,          description: "Keywords being tracked" },
};

function MetricRow({ metric, used, limit }: { metric: UsageMetric; used: number; limit: number }) {
  const config   = METRIC_CONFIG[metric];
  const Icon     = config.icon;
  const pct      = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const exceeded = used >= limit;
  const warning  = !exceeded && pct >= 80;

  return (
    <div className="flex items-center gap-2 font-bold">
      <span className="w-[72px] shrink-0 text-[11px] text-white truncate">{config.label}</span>
      <div className="flex-1 h-[3px] rounded-full bg-white/10 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            exceeded ? "bg-red-400" : warning ? "bg-amber-400" : "bg-emerald-400"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={cn(
        "shrink-0 text-[11px] tabular-nums w-7 text-right",
        exceeded ? "text-red-400" : warning ? "text-amber-400" : "text-white"
      )}>
        {used}<span>/{limit}</span>
      </span>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-2 px-1 py-[3px] animate-pulse">
      <div className="h-3 w-3 rounded bg-white/10 shrink-0" />
      <div className="h-2 w-[72px] rounded bg-white/10 shrink-0" />
      <div className="flex-1 h-[3px] rounded-full bg-white/10" />
      <div className="h-2 w-7 rounded bg-white/10 shrink-0" />
    </div>
  )
}

interface UsageRemainingProps {
  metrics?:    UsageMetric[];
  showBadge?:  boolean;
  compact?:    boolean;
  title?:      string;
  /** Show "Subscription expires on <date>" line instead of usage bars */
  showExpiry?: boolean;
  className?:  string;
}

export function UsageRemaining({
  metrics,
  showBadge  = true,
  compact    = false,
  title,
  showExpiry = false,
  className,
}: UsageRemainingProps) {
  const { data, isLoading } = useUsage();

  const shownMetrics: UsageMetric[] = metrics ?? [
    "postsUsed",
    "aiReviewRepliesUsed",
    "scheduledPostsUsed",
    "geoGridScansUsed",
    "reviewPostersUsed",
    "keywordTrackingUsed",
  ];

  return (
    <div className={cn("flex flex-col", compact ? "gap-3" : "gap-4", className)}>

      {title && (
        <p className="text-xs text-white">{title}</p>
      )}

      {/* ── Usage bars mode ───────────────────────────────────────────── */}
      {!showExpiry && (
        <>
          {showBadge && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-widest text-white">
                Usage
              </span>
              <Link href={'/app/usages'} className="text-xs underline">View Usages</Link>
            </div>
          )}

          {isLoading || !data
            ? shownMetrics.map((m) => <SkeletonRow key={m} />)
            : shownMetrics.map((m) => (
                <MetricRow
                  key={m}
                  metric={m}
                  used={data.used[m]}
                  limit={data.limits[m]}
                />
              ))}
        </>
      )}

      {/* ── Expiry line mode — uses normal theme colors ────────────────── */}
      {showExpiry && !isLoading && data && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-widest">
            Subscription
          </span>
          <p className="text-[13px]">
            Expires on{" "}
            <span className="font-semibold">
              {new Date(data.periodEnd).toLocaleDateString("en-US", {
                month: "long",
                day:   "numeric",
                year:  "numeric",
              })}
            </span>
            {data.periodStale && (
              <span className="ml-1 text-amber-400 text-[11px]">(may have renewed)</span>
            )}
          </p>
        </div>
      )}

      {/* Skeleton for expiry while loading */}
      {showExpiry && isLoading && (
        <div className="flex flex-col gap-1.5 animate-pulse">
          <div className="h-2.5 w-24 rounded bg-white/10" />
          <div className="h-4 w-40 rounded bg-white/10" />
        </div>
      )}
    </div>
  );
}