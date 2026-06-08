"use client";

import { useUsage, UsageMetric, UsageStatus } from "@/lib/use-usage";
import { useSlot, SlotResource } from "@/lib/use-slot";
import { cn } from "@/lib/utils";
import { AlertTriangle, XCircle } from "lucide-react";
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
  border:      string;
  left:        string;
  divider:     string;
  middle:      string;
  middleBg:    string;
  right:       string;
  icon:        ReactNode;
  message:     string;
}

// ─── Status styles ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<UsageStatus, StatusStyle> = {
  ok: {
    border:   "border-zinc-300 dark:border-zinc-600",
    left:     "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300",
    divider:  "bg-zinc-300 dark:bg-zinc-600",
    middleBg: "bg-white dark:bg-zinc-900",
    middle:   "text-zinc-500 dark:text-zinc-400",
    right:    "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300",
    icon:     null,
    message:  "Available",
  },
  warning: {
    border:   "border-amber-400 dark:border-amber-700",
    left:     "bg-amber-400 text-white dark:bg-amber-600 dark:text-white",
    divider:  "bg-amber-300 dark:bg-amber-700",
    middleBg: "bg-amber-50 dark:bg-amber-950",
    middle:   "text-amber-700 dark:text-amber-300",
    right:    "bg-amber-400 text-white dark:bg-amber-600 dark:text-white",
    icon:     <AlertTriangle className="w-3 h-3 flex-shrink-0" />,
    message:  "Near limit",
  },
  exceeded: {
    border:   "border-red-500 dark:border-red-700",
    left:     "bg-red-500 text-white dark:bg-red-700 dark:text-white",
    divider:  "bg-red-400 dark:bg-red-600",
    middleBg: "bg-red-50 dark:bg-red-950",
    middle:   "text-red-600 dark:text-red-300",
    right:    "bg-red-500 text-white dark:bg-red-700 dark:text-white",
    icon:     <XCircle className="w-3 h-3 flex-shrink-0" />,
    message:  "Limit exceeded",
  },
};

// ─── Sub-components ────────────────────────────────────────────────────────────

const LoadingBadge = ({ className }: { className?: string }) => (
  <div className={cn(
    "inline-flex h-[28px] w-36 animate-pulse rounded-full",
    "bg-zinc-100 dark:bg-zinc-800",
    className
  )} />
);

const FlatBadge = ({
  label,
  message,
  className,
}: {
  label: string;
  message: string;
  className?: string;
}) => (
  <div className={cn(
    "inline-flex items-stretch overflow-hidden rounded-full border cursor-default",
    "border-zinc-300 dark:border-zinc-600",
    className
  )}>
    <div className="flex items-center px-3 py-1 bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
      <span className="text-[11px] font-bold uppercase tracking-widest whitespace-nowrap">{label}</span>
    </div>
    <div className="w-px bg-zinc-300 dark:bg-zinc-600" />
    <span className="flex items-center px-3 py-1 text-xs bg-white dark:bg-zinc-900 text-zinc-400 dark:text-zinc-500 whitespace-nowrap">
      {message}
    </span>
  </div>
);

// ─── Core segmented badge ──────────────────────────────────────────────────────

const SegmentedBadge = ({
  label,
  current,
  limit,
  status,
  className,
}: {
  label:     string;
  current:   number;
  limit:     number;
  status:    UsageStatus;
  className?: string;
}) => {
  const s = STATUS_STYLES[status];

  return (
    <div className={cn(
      "inline-flex items-stretch overflow-hidden rounded-full border cursor-default w-fit shadow-sm",
      s.border,
      className
    )}>
      {/* Left — icon + label, solid filled */}
      <div className={cn("flex items-center gap-1.5 px-3 py-1", s.left)}>
        {s.icon}
        <span className="text-[11px] font-bold uppercase tracking-widest whitespace-nowrap">
          {label}
        </span>
      </div>

      {/* Divider */}
      <div className={cn("w-px", s.divider)} />

      {/* Middle — status message */}
      <span className={cn(
        "flex items-center px-3 py-1 text-xs font-medium whitespace-nowrap",
        s.middleBg,
        s.middle,
      )}>
        {s.message}
      </span>

      {/* Divider */}
      <div className={cn("w-px", s.divider)} />

      {/* Right — used/limit, solid filled */}
      <span className={cn(
        "flex items-center gap-0.5 px-3 py-1 text-xs font-bold font-mono tabular-nums whitespace-nowrap",
        s.right,
      )}>
        <span>{current}</span>
        <span className="opacity-60">/</span>
        <span>{limit}</span>
      </span>
    </div>
  );
};

// ─── Slot variant ──────────────────────────────────────────────────────────────

const SlotBadgeInner = ({ slot, label, className }: SlotBadgeProps) => {
  const { data, isLoading, canAdd } = useSlot(slot);

  if (isLoading && !data) return <LoadingBadge className={className} />;
  if (!data)              return null;
  if (data.limit === 0)   return <FlatBadge label={label} message="Not included" className={className} />;

  const status: UsageStatus =
    !canAdd             ? "exceeded" :
    data.remaining <= 2 ? "warning"  :
                          "ok";

  return (
    <SegmentedBadge
      label={label}
      current={data.current}
      limit={data.limit}
      status={status}
      className={className}
    />
  );
};

// ─── Metric variant ────────────────────────────────────────────────────────────

const MetricBadgeInner = ({ metric, label, className }: MetricBadgeProps) => {
  const { data, isLoading, statusFor, error } = useUsage();

  if (isLoading && !data && !error) return <LoadingBadge className={className} />;
  if (error)       return <FlatBadge label={label} message="Not available" className={className} />;
  if (!data?.plan) return <FlatBadge label={label} message="No plan" className={className} />;

  const used  = data.used[metric];
  const limit = data.limits[metric];

  if (limit === 0) return <FlatBadge label={label} message="Not included" className={className} />;

  return (
    <SegmentedBadge
      label={label}
      current={used}
      limit={limit}
      status={statusFor(metric)}
      className={className}
    />
  );
};

// ─── Public API ────────────────────────────────────────────────────────────────

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

  const { metric } = props as MetricBadgeProps;

  if (!metric) {
    console.warn("UsageBadge: `metric` is required when `slot` is not provided");
    return null;
  }

  return (
    <MetricBadgeInner
      metric={metric}
      label={label}
      showBar={props.showBar}
      className={className}
    />
  );
}