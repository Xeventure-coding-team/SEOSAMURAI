"use client";

import { useUsage, UsageMetric, UsageStatus } from "@/lib/use-usage";
import { useSlot, SlotResource } from "@/lib/use-slot";
import { cn } from "@/lib/utils";
import { AlertTriangle, XCircle, CheckCircle2 } from "lucide-react";
import { ReactNode } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface BaseBadgeProps {
  label: string;
  showBar?: boolean;
  className?: string;
}

interface MetricBadgeProps extends BaseBadgeProps {
  metric: UsageMetric;
  slot?: never;
}

interface SlotBadgeProps extends BaseBadgeProps {
  slot: SlotResource;
  metric?: never;
}

type UsageBadgeProps = MetricBadgeProps | SlotBadgeProps;

interface StatusStyle {
  badge: string;
  bar: string;
  barTrack: string;
  text: string;
  dot: string;
  icon: ReactNode;
  extraWrap?: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<UsageStatus, StatusStyle> = {
  ok: {
    badge:
      "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 transition-colors",
    bar: "bg-emerald-500",
    barTrack: "bg-black/10",
    dot: "bg-emerald-500",
    text: "",
    icon: <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />,
  },
  warning: {
    badge:
      "bg-amber-50 text-amber-800 border-amber-300 shadow-sm shadow-amber-200/80 hover:bg-amber-100 transition-colors",
    bar: "bg-amber-500",
    barTrack: "bg-amber-200/60",
    dot: "bg-amber-500",
    text: "text-amber-900 font-bold",
    icon: (
      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-amber-600 animate-[pulse_1.8s_ease-in-out_infinite]" />
    ),
  },
  exceeded: {
    badge:
      "bg-red-600 text-white border-red-700 shadow-lg shadow-red-400/50 scale-[1.03] hover:bg-red-700 transition-all duration-150",
    bar: "bg-white/70",
    barTrack: "bg-red-800/40",
    dot: "bg-white",
    text: "text-white font-extrabold tracking-wide",
    icon: (
      <XCircle className="w-4 h-4 flex-shrink-0 animate-[pulse_0.9s_ease-in-out_infinite]" />
    ),
    extraWrap:
      "ring-2 ring-red-400 ring-offset-1 animate-[pulse_2s_ease-in-out_infinite] rounded-lg",
  },
};

// ─── Sub-components ────────────────────────────────────────────────────────────

const ProgressBar = ({
  percentage,
  barClass,
  trackClass,
}: {
  percentage: number;
  barClass: string;
  trackClass: string;
}) => (
  <span
    className={cn(
      "relative inline-block w-14 h-1.5 rounded-full overflow-hidden flex-shrink-0",
      trackClass
    )}
  >
    <span
      className={cn(
        "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
        barClass
      )}
      style={{ width: `${Math.min(percentage, 100)}%` }}
    />
  </span>
);

const Badge = ({
  className,
  wrapClass,
  children,
}: {
  className?: string;
  wrapClass?: string;
  children: ReactNode;
}) => {
  const inner = (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border",
        className
      )}
    >
      {children}
    </span>
  );
  return wrapClass ? <span className={wrapClass}>{inner}</span> : inner;
};

// Only shown on true first-load (no stale data yet)
const LoadingBadge = ({ className }: { className?: string }) => (
  <Badge className={cn("border-neutral-200", className)}>
    <span className="w-12 h-2 rounded bg-neutral-200 animate-pulse" />
  </Badge>
);

const DisabledBadge = ({
  label,
  className,
}: {
  label: string;
  className?: string;
}) => (
  <Badge className={cn("bg-gray-50 text-gray-500 border-gray-200", className)}>
    <span className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
    {label}
    <span className="opacity-60">· Not included</span>
  </Badge>
);

const ErrorBadge = () => (
  <Badge className="bg-red-50 text-red-700 border-red-200">
    <XCircle className="w-3.5 h-3.5" />
    Not available
  </Badge>
);

const NoPlanBadge = ({
  label,
  className,
}: {
  label: string;
  className?: string;
}) => (
  <Badge className={cn("bg-gray-50 text-gray-500 border-gray-200", className)}>
    <span className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
    {label}
    <span className="opacity-60">· No plan</span>
  </Badge>
);

const UsageContent = ({
  label,
  current,
  limit,
  status,
  showBar,
  className,
}: {
  label: string;
  current: number;
  limit: number;
  status: UsageStatus;
  showBar?: boolean;
  className?: string;
}) => {
  const styles = STATUS_STYLES[status];
  const percentage = limit > 0 ? (current / limit) * 100 : 0;

  return (
    <Badge className={cn(styles.badge, className)} wrapClass={styles.extraWrap}>
      {styles.icon}
      <span className="font-medium">{label}</span>
      <span className={cn("opacity-70", status === "exceeded" && "text-white")}>
        ·
      </span>
      <span className={cn("tabular-nums", styles.text)}>
        {current}/{limit}
      </span>
      {showBar && (
        <ProgressBar
          percentage={percentage}
          barClass={styles.bar}
          trackClass={styles.barTrack}
        />
      )}
    </Badge>
  );
};

// ─── Slot Variant ──────────────────────────────────────────────────────────────

const SlotBadgeInner = ({ slot, label, showBar, className }: SlotBadgeProps) => {
  const { data, isLoading, canAdd } = useSlot(slot);

  // Show skeleton only on true first-load — keep stale data visible during refetch
  if (isLoading && !data) return <LoadingBadge className={className} />;
  if (!data) return null;

  if (data.limit === 0) return <DisabledBadge label={label} className={className} />;

  const status: UsageStatus = !canAdd
    ? "exceeded"
    : data.remaining <= 1
    ? "warning"
    : "ok";

  return (
    <UsageContent
      label={label}
      current={data.current}
      limit={data.limit}
      status={status}
      showBar={showBar}
      className={className}
    />
  );
};

// ─── Metric Variant ────────────────────────────────────────────────────────────

const MetricBadgeInner = ({
  metric,
  label,
  showBar,
  className,
}: MetricBadgeProps) => {
  const { data, isLoading, statusFor, error } = useUsage();

  // Show skeleton only on true first-load — keep stale data visible during refetch
  if (isLoading && !data && !error) return <LoadingBadge className={className} />;
  if (error) return <ErrorBadge />;
  if (!data?.plan) return <NoPlanBadge label={label} className={className} />;

  const used = data.used[metric];
  const limit = data.limits[metric];

  if (limit === 0) return <DisabledBadge label={label} className={className} />;

  return (
    <UsageContent
      label={label}
      current={used}
      limit={limit}
      status={statusFor(metric)}
      showBar={showBar}
      className={className}
    />
  );
};

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * UsageBadge — displays a metric or slot limit with status-aware styling.
 *
 * @example <UsageBadge metric="api_calls" label="API Calls" showBar />
 * @example <UsageBadge slot="seats" label="Team Seats" />
 */
export function UsageBadge({ label, className, ...props }: UsageBadgeProps) {
  if ("slot" in props && props.slot != null) {
    return (
      <SlotBadgeInner
        slot={props.slot}
        label={label}
        showBar={props.showBar}
        className={className}
      />
    );
  }

  const { metric, showBar } = props as MetricBadgeProps;

  if (!metric) {
    console.warn("UsageBadge: `metric` is required when `slot` is not provided");
    return null;
  }

  return (
    <MetricBadgeInner
      metric={metric}
      label={label}
      showBar={showBar}
      className={className}
    />
  );
}