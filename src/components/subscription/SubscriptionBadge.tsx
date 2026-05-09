"use client";

import { useUsage } from "@/lib/use-usage";
import { cn } from "@/lib/utils";
import { Sparkles, Zap, Shield, Star, CalendarClock } from "lucide-react";

const PLAN_CONFIG = {
  starter: {
    label:  "Starter",
    icon:   Zap,
    class:  "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    dot:    "bg-blue-500",
  },
  pro: {
    label:  "Pro",
    icon:   Sparkles,
    class:  "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800",
    dot:    "bg-violet-500",
  },
  business: {
    label:  "Business",
    icon:   Shield,
    class:  "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-700 dark:border-amber-700",
    dot:    "bg-amber-500",
  },
  enterprise: {
    label:  "Enterprise",
    icon:   Star,
    class:  "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    dot:    "bg-emerald-500",
  },
} as const;

const FREE_CONFIG = {
  label: "Free",
  icon:  Zap,
  class: "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
  dot:   "bg-zinc-400",
};

type Size = "sm" | "md" | "lg";

interface SubscriptionBadgeProps {
  size?: Size;
  className?: string;
  /** Show the animated pulse dot */
  showDot?: boolean;
  /** Show expiry date instead of plan badge */
  showExpiry?: boolean;
  /** Show metrics (only applies when showExpiry is false) */
  showMetrics?: boolean;
}

export function SubscriptionBadge({
  size = "md",
  className,
  showDot = true,
  showExpiry = false,
  showMetrics = true,
}: SubscriptionBadgeProps) {
  const { data, isLoading } = useUsage();

  if (isLoading) {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <span
          className={cn(
            "inline-flex animate-pulse rounded-full border bg-zinc-100 dark:bg-zinc-800",
            size === "sm" && "h-5 w-16",
            size === "md" && "h-6 w-20",
            size === "lg" && "h-7 w-24"
          )}
        />
        {showExpiry && (
          <span
            className={cn(
              "animate-pulse rounded bg-zinc-100 dark:bg-zinc-800",
              size === "sm" && "h-3 w-24",
              size === "md" && "h-3.5 w-32",
              size === "lg" && "h-4 w-40"
            )}
          />
        )}
      </div>
    );
  }

  const planKey = (data?.plan ?? "free") as keyof typeof PLAN_CONFIG;
  const config = PLAN_CONFIG[planKey] ?? FREE_CONFIG;
  const Icon = config.icon;

  // If showing expiry, render the expiry information
  if (showExpiry && data) {
    return (
      <div className={cn("flex flex-col gap-1.5", className)}>
        {/* Plan Badge */}
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border font-medium tracking-wide",
            size === "sm" && "px-2 py-0.5 text-[10px]",
            size === "md" && "px-2.5 py-1 text-xs",
            size === "lg" && "px-3 py-1.5 text-sm",
            config.class
          )}
        >
          {showDot && (
            <span className="relative flex h-1.5 w-1.5">
              <span
                className={cn(
                  "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
                  config.dot
                )}
              />
              <span
                className={cn(
                  "relative inline-flex h-1.5 w-1.5 rounded-full",
                  config.dot
                )}
              />
            </span>
          )}
          <Icon
            className={cn(
              size === "sm" && "h-2.5 w-2.5",
              size === "md" && "h-3 w-3",
              size === "lg" && "h-3.5 w-3.5"
            )}
          />
          {config.label}
        </span>

        {/* Expiry Info */}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <CalendarClock className={cn(
            "shrink-0",
            size === "sm" && "h-3 w-3",
            size === "md" && "h-3.5 w-3.5",
            size === "lg" && "h-4 w-4"
          )} />
          <span className={cn(
            "tabular-nums",
            size === "sm" && "text-[10px]",
            size === "md" && "text-xs",
            size === "lg" && "text-sm"
          )}>
            Expires{" "}
            <span className="font-semibold text-foreground">
              {new Date(data.periodEnd).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            {data.periodStale && (
              <span className="ml-1 text-amber-500">(renewal pending)</span>
            )}
          </span>
        </div>

        {/* Metrics Section - only shown if showMetrics is true */}
        {showMetrics && data && (
          <div className="mt-2 space-y-2">
            <div className="h-px bg-border" />
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Used:</span>
                <span className="font-medium">
                  {Object.values(data.used).reduce((a, b) => a + b, 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Limit:</span>
                <span className="font-medium">
                  {Object.values(data.limits).reduce((a, b) => a + b, 0)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default: just show the plan badge
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium tracking-wide",
        size === "sm" && "px-2 py-0.5 text-[10px]",
        size === "md" && "px-2.5 py-1 text-xs",
        size === "lg" && "px-3 py-1.5 text-sm",
        config.class,
        className
      )}
    >
      {showDot && (
        <span className="relative flex h-1.5 w-1.5">
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
              config.dot
            )}
          />
          <span
            className={cn(
              "relative inline-flex h-1.5 w-1.5 rounded-full",
              config.dot
            )}
          />
        </span>
      )}
      <Icon
        className={cn(
          size === "sm" && "h-2.5 w-2.5",
          size === "md" && "h-3 w-3",
          size === "lg" && "h-3.5 w-3.5"
        )}
      />
      {config.label}
    </span>
  );
}