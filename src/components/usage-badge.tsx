"use client";

import { useUsage, UsageMetric, UsageStatus } from "@/lib/use-usage";
import { useSlot, SlotResource } from "@/lib/use-slot";
import { cn } from "@/lib/utils";

interface MetricBadgeProps {
  metric: UsageMetric;
  slot?: never;
  label: string;
  showBar?: boolean;
  className?: string;
}

interface SlotBadgeProps {
  slot: SlotResource;
  metric?: never;
  label: string;
  showBar?: boolean;
  className?: string;
}

type UsageBadgeProps = MetricBadgeProps | SlotBadgeProps;

const STATUS_STYLES: Record<UsageStatus, { badge: string; bar: string; text: string }> = {
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

const Dot = ({ className }: { className?: string }) => (
  <span className={cn("w-2 h-2 rounded-full flex-shrink-0", className)} aria-hidden />
);

const Badge = ({ className, children }: any) => (
  <span className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium border", className)}>
    {children}
  </span>
);

// ─── Slot variant ─────────────────────────────────────────────────────────────

function SlotBadgeInner({ slot, label, className }: SlotBadgeProps) {
  const { data, isLoading, canAdd } = useSlot(slot);

  if (isLoading || !data) {
    return (
      <Badge className={className}>
        <span className="w-12 h-2 rounded bg-neutral-200 animate-pulse" />
      </Badge>
    );
  }

  if (data.limit === 0) {
    return (
      <Badge className={cn("bg-gray-50 text-gray-500 border-gray-200", className)}>
        <Dot className="bg-gray-400" />
        {label}
        <span className="opacity-60">· Not included</span>
      </Badge>
    );
  }

  const status: UsageStatus = !canAdd ? "exceeded" : data.remaining <= 1 ? "warning" : "ok";
  const styles = STATUS_STYLES[status];

  return (
    <Badge className={cn(styles.badge, className)}>
      <Dot className={styles.bar} />
      {label}
      <span className="opacity-60">·</span>
      <span className={cn("tabular-nums", styles.text)}>
        {data.current}/{data.limit}
      </span>
    </Badge>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

export function UsageBadge({ label, className, ...props }: UsageBadgeProps) {
  if ("slot" in props && props.slot) {
    return <SlotBadgeInner slot={props.slot} label={label} className={className} />;
  }

  return <MetricBadgeInner metric={(props as MetricBadgeProps).metric} label={label} className={className} />;
}

// ─── Metric variant (original) ────────────────────────────────────────────────

function MetricBadgeInner({ metric, label, className }: MetricBadgeProps) {
  const { data, isLoading, pctFor, statusFor, error } = useUsage();

  if (isLoading || (!data && !error)) {
    return (
      <Badge className={className}>
        <span className="w-12 h-2 rounded bg-neutral-200 animate-pulse" />
      </Badge>
    );
  }

  if (error) {
    return <Badge className="bg-red-50 text-red-700 border-red-200">Not available</Badge>;
  }

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

  return (
    <Badge className={cn(styles.badge, className)}>
      <Dot className={styles.bar} />
      {label}
      <span className="opacity-60">·</span>
      <span className={cn("tabular-nums", styles.text)}>
        {used}/{limit}
      </span>
    </Badge>
  );
}