"use client";

import { useUsage } from "@/lib/use-usage";
import { cn } from "@/lib/utils";
import { Sparkles, Zap, Shield, Star, CalendarClock, AlertCircle } from "lucide-react";
import { forwardRef } from "react";

// ============================================================================
// Types & Configuration
// ============================================================================
type Size = "sm" | "md" | "lg";
type Variant = "default" | "expiry" | "metrics";

const PLAN_CONFIG = {
  starter: {
    label: "Starter",
    icon: Zap,
    class: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    dot: "bg-blue-500",
    hoverClass: "hover:bg-blue-100 dark:hover:bg-blue-950/60",
  },
  growth: {                                         // ← ADD THIS
    label: "Growth",
    icon: Sparkles,
    class: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800",
    dot: "bg-violet-500",
    hoverClass: "hover:bg-violet-100 dark:hover:bg-violet-950/60",
  },
  pro: {
    label: "Pro",
    icon: Shield,
    class: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    dot: "bg-amber-500",
    hoverClass: "hover:bg-amber-100 dark:hover:bg-amber-950/60",
  },
  free: {
    label: "Free",
    icon: Zap,
    class: "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
    dot: "bg-zinc-400",
    hoverClass: "hover:bg-zinc-200 dark:hover:bg-zinc-800/80",
  },
} as const;

type PlanType = keyof typeof PLAN_CONFIG;

const SIZE_CONFIG = {
  sm: {
    badge: "px-2 py-0.5 text-[10px]",
    icon: "h-2.5 w-2.5",
    dot: "h-1 w-1",
    calendar: "h-3 w-3",
    text: "text-[10px]",
  },
  md: {
    badge: "px-2.5 py-1 text-xs",
    icon: "h-3 w-3",
    dot: "h-1.5 w-1.5",
    calendar: "h-3.5 w-3.5",
    text: "text-xs",
  },
  lg: {
    badge: "px-3 py-1.5 text-sm",
    icon: "h-3.5 w-3.5",
    dot: "h-2 w-2",
    calendar: "h-4 w-4",
    text: "text-sm",
  },
} as const;

// ============================================================================
// Sub-components
// ============================================================================

interface AnimatedDotProps {
  colorClass: string;
  size: Size;
}

const AnimatedDot = ({ colorClass, size }: AnimatedDotProps) => {
  const dotSize = SIZE_CONFIG[size].dot;
  
  return (
    <span className="relative flex">
      <span
        className={cn(
          "absolute inline-flex animate-ping rounded-md opacity-60",
          dotSize,
          colorClass
        )}
        aria-hidden="true"
      />
      <span
        className={cn(
          "relative inline-flex rounded-md",
          dotSize,
          colorClass
        )}
        aria-hidden="true"
      />
    </span>
  );
};

// ============================================================================
// Loading State
// ============================================================================

const LoadingSkeleton = ({ size, className }: { size: Size; className?: string }) => (
  <div className={cn("flex flex-col gap-2", className)}>
    <span
      className={cn(
        "inline-flex animate-pulse rounded-md border bg-zinc-100 dark:bg-zinc-800",
        size === "sm" && "h-5 w-16",
        size === "md" && "h-6 w-20",
        size === "lg" && "h-7 w-24"
      )}
      aria-label="Loading subscription data"
    />
  </div>
);

// ============================================================================
// Main Component
// ============================================================================

export interface SubscriptionBadgeProps {
  /** Size variant */
  size?: Size;
  /** Additional CSS classes */
  className?: string;
  /** Show the animated pulse dot */
  showDot?: boolean;
  /** Display variant */
  variant?: Variant;
  /** Custom label (overrides default plan label) */
  customLabel?: string;
  /** Whether the badge is interactive (adds hover effects) */
  interactive?: boolean;
  /** Click handler for interactive mode */
  onClick?: () => void;
}

export const SubscriptionBadge = forwardRef<HTMLDivElement, SubscriptionBadgeProps>(
  (
    {
      size = "md",
      className,
      showDot = true,
      variant = "default",
      customLabel,
      interactive = false,
      onClick,
    },
    ref
  ) => {
    const { data, isLoading, error } = useUsage();

    // Loading state
    if (isLoading) {
      return <LoadingSkeleton size={size} className={className} />;
    }

    // Error state
    if (error || !data) {
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 dark:border-red-800/50 dark:bg-red-950/20 dark:text-red-300",
            className
          )}
          role="status"
          aria-label="Failed to load subscription data"
        >
          <AlertCircle className="h-3.5 w-3.5" />
          Error loading plan
        </span>
      );
    }

    // Determine plan key and config
    const planKey = (data.plan?.toLowerCase() ?? "free") as PlanType;
    const config = PLAN_CONFIG[planKey] ?? PLAN_CONFIG.free;
    const Icon = config.icon;
    const displayLabel = customLabel ?? config.label;
    const sizeStyles = SIZE_CONFIG[size];

    // Interactive badge wrapper props
    const interactiveProps = interactive
      ? {
          role: "button",
          tabIndex: 0,
          onClick,
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              onClick?.();
            }
          },
        }
      : {};

    const badgeContent = (
      <>
        {showDot && <AnimatedDot colorClass={config.dot} size={size} />}
        <Icon className={sizeStyles.icon} aria-hidden="true" />
        <span>{displayLabel}</span>
      </>
    );

    // ============================================================
    // Variant: Expiry
    // ============================================================
    if (variant === "expiry") {
      const expiryDate = data.periodEnd ? new Date(data.periodEnd) : null;
      const isStale = data.periodStale;

      return (
        <div
          ref={ref}
          className={cn("flex flex-col gap-1.5", className)}
          {...interactiveProps}
        >
          {/* Plan Badge */}
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
              sizeStyles.badge,
              config.class,
              interactive && cn("cursor-pointer hover:opacity-80", config.hoverClass)
            )}
          >
            {badgeContent}
          </span>

          {/* Expiry Info */}
          {expiryDate && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarClock className={sizeStyles.calendar} aria-hidden="true" />
              <span className="tabular-nums">
                Expires{" "}
                <time dateTime={expiryDate.toISOString()} className="font-medium text-foreground">
                  {expiryDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </time>
                {isStale && (
                  <span className="ml-1.5 inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    pending
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
      );
    }

    // ============================================================
    // Variant: Metrics
    // ============================================================
    if (variant === "metrics") {
      const totalUsed = Object.values(data.used ?? {}).reduce((a, b) => a + b, 0);
      const totalLimit = Object.values(data.limits ?? {}).reduce((a, b) => a + b, 0);
      const usagePercentage = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;
      const isNearLimit = usagePercentage >= 80;
      const isOverLimit = usagePercentage >= 100;

      return (
        <div
          ref={ref}
          className={cn("flex flex-col gap-2", className)}
          {...interactiveProps}
        >
          {/* Plan Badge */}
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
              sizeStyles.badge,
              config.class,
              interactive && cn("cursor-pointer hover:opacity-80", config.hoverClass)
            )}
          >
            {badgeContent}
          </span>

          {/* Metrics Section */}
          <div className="space-y-2 rounded-md border bg-muted/30 p-3">
            {/* Usage Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Usage</span>
                <span
                  className={cn(
                    "font-medium",
                    isOverLimit && "text-red-600 dark:text-red-400",
                    isNearLimit && !isOverLimit && "text-amber-600 dark:text-amber-400"
                  )}
                >
                  {Math.round(usagePercentage)}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    isOverLimit
                      ? "bg-red-500"
                      : isNearLimit
                      ? "bg-amber-500"
                      : "bg-primary"
                  )}
                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                  role="progressbar"
                  aria-valuenow={totalUsed}
                  aria-valuemin={0}
                  aria-valuemax={totalLimit}
                />
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Used <span className="font-medium text-foreground">{totalUsed.toLocaleString()}</span></span>
              <span className="text-muted-foreground">Limit <span className="font-medium text-foreground">{totalLimit.toLocaleString()}</span></span>
            </div>

            {/* Warning for near/over limit */}
            {(isNearLimit || isOverLimit) && (
              <p
                className={cn(
                  "flex items-center gap-1 text-[10px] font-medium",
                  isOverLimit
                    ? "text-red-600 dark:text-red-400"
                    : "text-amber-600 dark:text-amber-400"
                )}
              >
                <AlertCircle className="h-3 w-3" />
                {isOverLimit ? "Limit exceeded" : "Approaching limit"}
              </p>
            )}
          </div>
        </div>
      );
    }

    // ============================================================
    // Default Variant: Just the badge
    // ============================================================
    return (
      <span
        ref={ref as any}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
          sizeStyles.badge,
          config.class,
          interactive && cn("cursor-pointer hover:opacity-80", config.hoverClass),
          className
        )}
        {...interactiveProps}
      >
        {badgeContent}
      </span>
    );
  }
);

SubscriptionBadge.displayName = "SubscriptionBadge";