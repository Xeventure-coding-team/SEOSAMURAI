"use client";

import { useUsage, UsageMetric, UsageStatus } from "@/lib/use-usage";
import { cn } from "@/lib/utils";

interface UsageBadgeProps {
  metric: UsageMetric;
  label: string;
  showBar?: boolean;
  className?: string;
}

const STATUS_STYLES: Record<
  UsageStatus,
  { badge: string; bar: string; text: string }
> = {
  ok: {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 transition-colors",
    bar: "bg-emerald-500",
    text: "",
  },
  warning: {
    badge: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 transition-colors",
    bar: "bg-amber-500",
    text: "text-amber-700",
  },
  exceeded: {
    badge: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 transition-colors",
    bar: "bg-red-500",
    text: "text-red-700",
  },
};

// Small reusable dot
const Dot = ({ className }: { className?: string }) => (
  <span
    className={cn("w-2 h-2 rounded-full flex-shrink-0", className)}
    aria-hidden
  />
);

// Reusable badge wrapper
const Badge = ({ className, children }: any) => (
  <span
    className={cn(
      "inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium border",
      className
    )}
  >
    {children}
  </span>
);

export function UsageBadge({
  metric,
  label,
  showBar = false,
  className,
}: UsageBadgeProps) {
  const { data, isLoading, pctFor, statusFor, error } = useUsage();

  // Loading state
  if (isLoading || (!data && !error)) {
    return (
      <Badge className={className}>
        <span className="w-12 h-2 rounded bg-neutral-200 animate-pulse" />
      </Badge>
    );
  }

  // Error state
  if (error) {
    return (
      <Badge className="bg-red-50 text-red-700 border-red-200">
        Not available
      </Badge>
    );
  }

  // No plan
  if (!data?.plan) {
    return (
      <Badge className={cn("bg-gray-50 text-gray-500 border-gray-200", className)}>
        <Dot className="bg-gray-400" />
        {label}
        <span className="opacity-60">· No plan</span>
      </Badge>
    );
  }

  const used = data.used[metric];
  const limit = data.limits[metric];

  // Not included in plan
  if (limit === 0) {
    return (
      <Badge className={cn("bg-gray-50 text-gray-500 border-gray-200", className)}>
        <Dot className="bg-gray-400" />
        {label}
        <span className="opacity-60">· Not included</span>
      </Badge>
    );
  }

  const status = statusFor(metric);
  const styles = STATUS_STYLES[status];
  const pct = pctFor(metric);

  return (
    <div className={cn("inline-flex flex-col gap-1", className)}>
      <Badge className={styles.badge}>
        <Dot className={styles.bar} />
        {label}
        <span className="opacity-60">·</span>
        <span className={cn("tabular-nums", styles.text)}>
          {used}/{limit}
        </span>
      </Badge>
    </div>
  );
}
