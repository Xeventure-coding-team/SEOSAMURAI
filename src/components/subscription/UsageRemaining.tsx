"use client";

import { useUsage, UsageMetric } from "@/lib/use-usage";
import { useSlot, SlotResource } from "@/lib/use-slot";
import { cn } from "@/lib/utils";
import Link from "next/link";

const METRIC_CONFIG: Record<UsageMetric, { label: string }> = {
  postsUsed: { label: "Posts" },
  aiReviewRepliesUsed: { label: "AI Replies" },
  scheduledPostsUsed: { label: "Scheduled" },
  geoGridScansUsed: { label: "Geo Scans" },
  keywordTrackingUsed: { label: "Keywords" },
  aiImageUsed: { label: "AI Images" }
};

const SLOT_CONFIG: Record<SlotResource, { label: string }> = {
  locations: { label: "Locations" },
  websites: { label: "Websites" },
  reviewPosters: { label: "Review Posters" },
};

function BarRow({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const exceeded = used >= limit;
  const warning = !exceeded && pct >= 80;

  return (
    <div className="flex items-center gap-2 font-bold">
      <span className="w-[72px] shrink-0 text-[11px] text-white truncate">{label}</span>
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
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-2 px-1 py-[3px] animate-pulse">
      <div className="h-2 w-[72px] rounded bg-white/10 shrink-0" />
      <div className="flex-1 h-[3px] rounded-full bg-white/10" />
      <div className="h-2 w-7 rounded bg-white/10 shrink-0" />
    </div>
  );
}

function SlotRow({ slot }: { slot: SlotResource }) {
  const { data, isLoading } = useSlot(slot);
  if (isLoading || !data) return <SkeletonRow />;
  return <BarRow label={SLOT_CONFIG[slot].label} used={data.current} limit={data.limit} />;
}

interface UsageRemainingProps {
  metrics?: UsageMetric[];
  slots?: SlotResource[];
  showBadge?: boolean;
  compact?: boolean;
  title?: string;
  showExpiry?: boolean;
  className?: string;
}

export function UsageRemaining({
  metrics,
  slots,
  showBadge = true,
  compact = false,
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
    "keywordTrackingUsed",
  ];

  const shownSlots: SlotResource[] = slots ?? [];

  return (
    <div className={cn("flex flex-col", compact ? "gap-3" : "gap-4", className)}>
      {title && <p className="text-xs text-white">{title}</p>}

      {!showExpiry && (
        <>
          {showBadge && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-widest text-white">Usage</span>
              <Link href="/app/usages" className="text-xs underline">View Usages</Link>
            </div>
          )}

          {/* Monthly metrics */}
          {isLoading || !data
            ? shownMetrics.map((m) => <SkeletonRow key={m} />)
            : shownMetrics.map((m) => (
              <BarRow key={m} label={METRIC_CONFIG[m].label} used={data.used[m]} limit={data.limits[m]} />
            ))
          }

          {/* Lifetime slots */}
          {shownSlots.map((s) => <SlotRow key={s} slot={s} />)}
        </>
      )}

      {showExpiry && !isLoading && (
        <>
          {data && data.plan ? (
            <div className="flex items-center gap-1.5 text-md text-muted-foreground">
              <span>Plan renews</span>
              <span className="font-medium text-foreground">
                {new Date(data.periodEnd).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric",
                })}
              </span>
              {data.periodStale && (
                <span className="text-amber-500">(may have renewed)</span>
              )}
            </div>
          ) : (
            <Link
              href="/app/settings/billing"
              className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 hover:underline"
            >
              <span>No active plan</span>
              <span className="font-medium underline underline-offset-2">Upgrade →</span>
            </Link>
          )}
        </>
      )}


      {showExpiry && isLoading && (
        <div className="h-3 w-36 rounded animate-pulse bg-muted" />
      )}

    </div>
  );
}