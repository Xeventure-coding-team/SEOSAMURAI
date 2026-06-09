"use client";

import { useUsage, UsageMetric, UsageStatus } from "@/lib/use-usage";
import { useSlot, SlotResource } from "@/lib/use-slot";
import { cn } from "@/lib/utils";
import { TrendingUp, Clock, Circle } from "lucide-react";
import { ReactNode } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────

type UsageBadgeProps = 
  | { metric: UsageMetric; label: string; className?: string; compact?: boolean }
  | { slot: SlotResource; label: string; className?: string; compact?: boolean };

interface StatusStyle {
  dotColor: string;
  textColor: string;
  message: string;
}

// ─── Status styles — modern minimal ────────────────────────────────────────────

const STATUS_STYLES: Record<UsageStatus, StatusStyle> = {
  ok: {
    dotColor: "bg-emerald-400",
    textColor: "text-emerald-600 dark:text-emerald-400",
    message: "Good",
  },
  warning: {
    dotColor: "bg-amber-400",
    textColor: "text-amber-600 dark:text-amber-400",
    message: "Getting there",
  },
  exceeded: {
    dotColor: "bg-zinc-400",
    textColor: "text-zinc-500 dark:text-zinc-400",
    message: "Maxed",
  },
};

// ─── Components ────────────────────────────────────────────────────────────────

const LoadingBadge = ({ className, compact }: { className?: string; compact?: boolean }) => (
  <div className={cn(
    "animate-pulse rounded-full bg-gradient-to-r from-zinc-100 to-zinc-50 dark:from-zinc-800 dark:to-zinc-900",
    compact ? "h-6 w-24" : "h-7 w-32",
    className
  )} />
);

const FlatBadge = ({ label, message, className, compact }: { label: string; message: string; className?: string; compact?: boolean }) => (
  <div className={cn(
    "inline-flex items-center gap-1.5 rounded-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800",
    compact ? "px-2.5 py-0.5" : "px-3 py-1",
    className
  )}>
    <Circle className="w-1.5 h-1.5 fill-zinc-300 dark:fill-zinc-700 text-zinc-300 dark:text-zinc-700" />
    <span className={cn(
      "font-mono text-[11px] font-medium tracking-tight text-zinc-500 dark:text-zinc-500",
      compact && "text-[10px]"
    )}>
      {label}
    </span>
    <span className={cn(
      "text-[11px] text-zinc-400 dark:text-zinc-600",
      compact && "text-[10px]"
    )}>
      {message}
    </span>
  </div>
);

const SegmentedBadge = ({
  label, current, limit, status, className, compact
}: {
  label: string; current: number; limit: number; status: UsageStatus; className?: string; compact?: boolean;
}) => {
  const s = STATUS_STYLES[status];
  const percent = (current / limit) * 100;
  
  return (
    <div className={cn(
      "group relative inline-flex items-center gap-2 rounded-full bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all duration-200",
      compact ? "pl-2 pr-2.5 py-0.5" : "pl-2.5 pr-3 py-1",
      className
    )}>
      {/* Animated progress ring */}
      <div className="relative">
        <Circle className={cn(
          "w-2 h-2 transition-all duration-300",
          s.dotColor,
          status === "exceeded" && "opacity-40"
        )} />
        {status === "warning" && (
          <div className="absolute inset-0 animate-ping w-2 h-2 rounded-full bg-amber-400 opacity-40" />
        )}
      </div>
      
      {/* Label */}
      <span className={cn(
        "font-mono text-[11px] font-medium tracking-tight text-zinc-600 dark:text-zinc-400",
        compact && "text-[10px]"
      )}>
        {label}
      </span>
      
      {/* Usage bar (modern touch) */}
      <div className="w-8 h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div 
          className={cn("h-full transition-all duration-500 ease-out rounded-full", s.dotColor)}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      
      {/* Numbers */}
      <span className={cn(
        "font-mono tabular-nums text-[11px] font-medium",
        s.textColor,
        compact && "text-[10px]"
      )}>
        {current}/{limit}
      </span>
      
      {/* Status message - subtle */}
      <span className={cn(
        "text-[11px] text-zinc-400 dark:text-zinc-600 transition-opacity",
        compact && "hidden sm:inline",
        !compact && "hidden md:inline"
      )}>
        {s.message}
      </span>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

export function UsageBadge(props: UsageBadgeProps) {
  const { label, className, compact = false } = props;

  // Slot variant
  if ("slot" in props) {
    const { data, isLoading, canAdd } = useSlot(props.slot);
    if (isLoading && !data) return <LoadingBadge className={className} compact={compact} />;
    if (!data) return null;
    if (data.limit === 0) return <FlatBadge label={label} message="Not included" className={className} compact={compact} />;
    
    const status: UsageStatus = !canAdd ? "exceeded" : data.remaining <= 2 ? "warning" : "ok";
    return <SegmentedBadge label={label} current={data.current} limit={data.limit} status={status} className={className} compact={compact} />;
  }

  // Metric variant
  const { data, isLoading, statusFor, error } = useUsage();
  if (isLoading && !data && !error) return <LoadingBadge className={className} compact={compact} />;
  if (error || !data?.plan) return <FlatBadge label={label} message={error ? "Unavailable" : "No plan"} className={className} compact={compact} />;
  
  const limit = data.limits[props.metric];
  if (limit === 0) return <FlatBadge label={label} message="Not included" className={className} compact={compact} />;
  
  return <SegmentedBadge 
    label={label} 
    current={data.used[props.metric]} 
    limit={limit} 
    status={statusFor(props.metric)} 
    className={className} 
    compact={compact}
  />;
}