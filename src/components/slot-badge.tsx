"use client";

import { AlertTriangle, CheckCircle2, XCircle, Clock, TrendingUp, Users, Flame } from "lucide-react";
import { useSlot, SlotResource } from "@/lib/use-slot";
import { cn } from "@/lib/utils";

interface SlotBadgeProps {
  slot: SlotResource;
  label?: string;
  showBar?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  showDetails?: boolean;
  showPercentage?: boolean;
  showRemainingTime?: boolean;
}

const STYLES = {
  ok: {
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    bar: "bg-emerald-500",
    icon: CheckCircle2,
    text: "Available",
  },
  warning: {
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
    bar: "bg-amber-500",
    icon: AlertTriangle,
    text: "Limited",
  },
  exceeded: {
    badge: "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20",
    bar: "bg-red-500",
    icon: XCircle,
    text: "Full",
  },
} as const;

const SIZE_STYLES = {
  sm: {
    container: "gap-1",
    badge: "px-2.5 py-1 text-xs",
    icon: "h-3 w-3",
    label: "text-[10px]",
    count: "text-xs",
    leftBadge: "text-[10px] px-1 py-0.5",
    detailsText: "text-[10px]",
    detailsIcon: "h-2.5 w-2.5",
  },
  md: {
    container: "gap-1.5",
    badge: "px-3 py-1.5 text-sm",
    icon: "h-3.5 w-3.5",
    label: "text-[11px]",
    count: "text-sm",
    leftBadge: "text-[11px] px-1.5 py-0.5",
    detailsText: "text-[11px]",
    detailsIcon: "h-3 w-3",
  },
  lg: {
    container: "gap-2",
    badge: "px-4 py-2 text-base",
    icon: "h-4 w-4",
    label: "text-xs",
    count: "text-base",
    leftBadge: "text-xs px-2 py-0.5",
    detailsText: "text-xs",
    detailsIcon: "h-3.5 w-3.5",
  },
};

export function SlotBadge({ 
  slot, 
  label, 
  showBar = false, 
  className,
  size = "md",
  showDetails = false,
  showPercentage = false,
  showRemainingTime = false,
}: SlotBadgeProps) {
  const { data, isLoading } = useSlot(slot);

  if (isLoading) {
    return (
      <div className={cn("flex flex-col", SIZE_STYLES[size].container)}>
        <div className={cn(
          "rounded-lg bg-muted animate-pulse",
          SIZE_STYLES[size].badge,
          className
        )} />
      </div>
    );
  }

  if (!data) return null;

  const used = data.current;
  const limit = data.limit;
  const hasLimit = limit > 0;
  const ratio = hasLimit ? used / limit : 0;
  const percentage = hasLimit ? Math.min(100, Math.round(ratio * 100)) : 0;
  const remaining = hasLimit ? limit - used : Infinity;
  const isUnlimited = !hasLimit || limit === 0;
  const isOverCapacity = hasLimit && used > limit;

  const status: keyof typeof STYLES =
    hasLimit && used >= limit ? "exceeded"
    : hasLimit && ratio >= 0.8 ? "warning"
    : "ok";

  const styles = STYLES[status];
  const sizeStyles = SIZE_STYLES[size];
  const Icon = styles.icon;

  const getUrgentRemainingText = () => {
    if (isUnlimited) return "∞";
    if (isOverCapacity) return `+${used - limit} over`;
    if (remaining === 0) return "Full";
    if (remaining === 1) return "🔥 Last 1!";
    if (remaining <= 3) return `⚠️ Only ${remaining}!`;
    if (remaining <= 5) return `${remaining} left`;
    return `${remaining}`;
  };

  const getStatusText = () => {
    if (isOverCapacity) return "Overbooked";
    if (status === "warning") {
      if (remaining <= 3) return "Critical!";
      if (remaining <= 5) return "Urgent";
      return "Limited";
    }
    return styles.text;
  };

  const getUrgencyHint = () => {
    if (isUnlimited) return null;
    if (isOverCapacity) return "No spots available";
    if (remaining === 0) return "Check back later";
    if (remaining === 1) return "Last slot! Act now";
    if (remaining <= 3) return "Almost gone!";
    if (remaining <= 5) return "Filling fast";
    if (remaining <= 10) return `${remaining} spots left`;
    return null;
  };

  return (
    <div className={cn("flex flex-col", sizeStyles.container, className)}>
      {/* Main Badge */}
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-lg font-medium transition-all",
          "backdrop-blur-sm cursor-default",
          sizeStyles.badge,
          styles.badge,
          (remaining === 1 || isOverCapacity) && "animate-pulse"
        )}
      >
        <Icon className={cn("shrink-0", sizeStyles.icon)} />
        
        <span className={cn("font-semibold uppercase tracking-wider", sizeStyles.label)}>
          {label || getStatusText()}
        </span>
        
        <div className="w-px h-3 bg-current opacity-20" />
        
        <span className={cn("font-mono font-bold tabular-nums", sizeStyles.count)}>
          {isUnlimited ? "∞" : `${used}/${limit}`}
        </span>

        {!isUnlimited && (
          <span className={cn(
            "rounded-md font-bold whitespace-nowrap",
            remaining === 1 ? "bg-red-500/30 text-red-600 dark:text-red-400" :
            remaining <= 3 ? "bg-orange-500/20 text-orange-600" :
            "bg-black/5 dark:bg-white/10",
            sizeStyles.leftBadge
          )}>
            {getUrgentRemainingText()}
          </span>
        )}
      </div>

      {/* Compact details - only shows when showDetails is true */}
      {showDetails && (
        <div className="space-y-1 mt-0.5">
          {getUrgencyHint() && (
            <div className="flex items-center gap-1.5">
              {remaining <= 3 ? (
                <Flame className={cn("text-red-500", sizeStyles.detailsIcon)} />
              ) : (
                <Clock className={cn("text-amber-500", sizeStyles.detailsIcon)} />
              )}
              <span className={cn(
                "font-medium",
                remaining === 1 ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400",
                sizeStyles.detailsText
              )}>
                {getUrgencyHint()}
              </span>
            </div>
          )}

          {/* Progress bar */}
          {showBar && !isUnlimited && !isOverCapacity && (
            <div className="space-y-0.5">
              <div className="relative h-1 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    styles.bar,
                    percentage >= 90 && "animate-pulse"
                  )}
                  style={{ width: `${Math.min(100, percentage)}%` }}
                />
              </div>
              {showPercentage && (
                <div className="flex justify-end">
                  <span className={cn(
                    "font-mono text-muted-foreground",
                    sizeStyles.detailsText
                  )}>
                    {percentage}%
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}