"use client";

import { ArrowUpRight, TriangleAlert, X, Zap, AlertCircle } from "lucide-react";
import { useSlot, SlotResource } from "@/lib/use-slot";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState, useMemo, useEffect } from "react";

interface SlotInfoBannerProps {
  slot: SlotResource;
  resourceName?: string;
  upgradeHref?: string;
  onRemove?: () => void;
  onDismiss?: () => void;
  className?: string;
  variant?: "default" | "subtle" | "bold"; // New: visual intensity
  animated?: boolean; // New: add entrance animation
}

export function SlotInfoBanner({
  slot,
  resourceName = "item",
  upgradeHref = "/app/settings/billing",
  onRemove,
  onDismiss,
  className,
  variant = "bold",
  animated = true,
}: SlotInfoBannerProps) {
  const { data, isLoading } = useSlot(slot);
  const [dismissed, setDismissed] = useState(false);
  const [isVisible, setIsVisible] = useState(!animated);

  useEffect(() => {
    if (animated && !isLoading && data) {
      // Small delay for entrance animation
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    } else if (!animated) {
      setIsVisible(true);
    }
  }, [animated, isLoading, data]);

  const { status, used, limit, remaining, ratio } = useMemo(() => {
    if (!data) {
      return { status: "hidden" as const, used: 0, limit: 0, remaining: 0, ratio: 0 };
    }

    const used = data.current;
    const limit = data.limit;
    const hasLimit = limit > 0;

    if (!hasLimit) {
      return { status: "hidden" as const, used, limit, remaining: 0, ratio: 0 };
    }

    const ratio = used / limit;
    const isOverCapacity = used > limit;
    const isNearLimit = !isOverCapacity && ratio >= 0.8;
    const status = isOverCapacity ? "over-capacity" : isNearLimit ? "near-limit" : "hidden";
    const remaining = limit - used;

    return { status, used, limit, remaining, ratio };
  }, [data]);

  if (isLoading || dismissed || status === "hidden") return null;

  const isOverCapacity = status === "over-capacity";
  const name = resourceName.toLowerCase();
  const plural = `${name}s`;
  const percentage = Math.min(Math.round((used / limit) * 100), 100);

  // Bold & catching styles
  const boldStyles = {
    overCapacity: {
      container: "border-2 border-red-500 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/40 dark:to-red-900/30 shadow-lg shadow-red-500/20",
      iconBg: "bg-red-500",
      iconColor: "text-white",
      title: "text-red-900 dark:text-red-100 font-extrabold",
      subtitle: "text-red-700 dark:text-red-300",
      counter: "text-red-600 dark:text-red-400 font-bold",
      upgradeButton: "bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg transition-all",
      progressBar: "bg-red-500",
    },
    nearLimit: {
      container: "border-2 border-amber-500 bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-950/40 dark:to-amber-900/30 shadow-lg shadow-amber-500/20",
      iconBg: "bg-amber-500",
      iconColor: "text-white",
      title: "text-amber-900 dark:text-amber-100 font-extrabold",
      subtitle: "text-amber-700 dark:text-amber-300",
      counter: "text-amber-600 dark:text-amber-400 font-bold",
      upgradeButton: "bg-amber-600 hover:bg-amber-700 text-white shadow-md hover:shadow-lg transition-all",
      progressBar: "bg-amber-500",
    },
  };

  // Default styles (original intensity)
  const defaultStyles = {
    overCapacity: {
      container: "border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30",
      iconBg: "bg-red-100 dark:bg-red-900/50",
      iconColor: "text-red-600 dark:text-red-400",
      title: "text-red-700 dark:text-red-300 font-semibold",
      subtitle: "text-red-500/80 dark:text-red-400/70",
      counter: "text-red-500 dark:text-red-400",
      upgradeButton: "bg-red-600 hover:bg-red-700 text-white dark:bg-red-700",
      progressBar: "bg-red-500",
    },
    nearLimit: {
      container: "border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30",
      iconBg: "bg-amber-100 dark:bg-amber-900/50",
      iconColor: "text-amber-600 dark:text-amber-400",
      title: "text-amber-700 dark:text-amber-300 font-semibold",
      subtitle: "text-amber-500/80 dark:text-amber-400/70",
      counter: "text-amber-500 dark:text-amber-400",
      upgradeButton: "bg-amber-600 hover:bg-amber-700 text-white",
      progressBar: "bg-amber-500",
    },
  };

  // Subtle styles (minimal)
  const subtleStyles = {
    overCapacity: {
      container: "border-l-4 border-red-500 bg-white dark:bg-zinc-900 shadow-sm",
      iconBg: "bg-red-100 dark:bg-red-900/30",
      iconColor: "text-red-600 dark:text-red-400",
      title: "text-red-700 dark:text-red-300 font-medium",
      subtitle: "text-zinc-600 dark:text-zinc-400",
      counter: "text-red-600 dark:text-red-400",
      upgradeButton: "bg-zinc-900 hover:bg-zinc-800 text-white",
      progressBar: "bg-red-500",
    },
    nearLimit: {
      container: "border-l-4 border-amber-500 bg-white dark:bg-zinc-900 shadow-sm",
      iconBg: "bg-amber-100 dark:bg-amber-900/30",
      iconColor: "text-amber-600 dark:text-amber-400",
      title: "text-amber-700 dark:text-amber-300 font-medium",
      subtitle: "text-zinc-600 dark:text-zinc-400",
      counter: "text-amber-600 dark:text-amber-400",
      upgradeButton: "bg-zinc-900 hover:bg-zinc-800 text-white",
      progressBar: "bg-amber-500",
    },
  };

  const styleSet = variant === "bold" ? boldStyles : variant === "subtle" ? subtleStyles : defaultStyles;
  const currentStyle = isOverCapacity ? styleSet.overCapacity : styleSet.nearLimit;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "relative rounded-xl overflow-hidden transition-all duration-300",
        isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4",
        currentStyle.container,
        variant === "bold" && "animate-pulse-subtle",
        className
      )}
    >
      {/* Progress bar at top for bold variant */}
      {variant === "bold" && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-black/5">
          <div
            className={cn("h-full transition-all duration-500", currentStyle.progressBar)}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}

      <div className="flex items-start gap-4 px-5 py-4">
        {/* Animated Icon */}
        <div className="relative">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              currentStyle.iconBg,
              variant === "bold" && "scale-100 animate-bounce-in"
            )}
            aria-hidden="true"
          >
            {isOverCapacity ? (
              <AlertCircle className={cn("h-5 w-5", currentStyle.iconColor)} />
            ) : (
              <Zap className={cn("h-5 w-5", currentStyle.iconColor)} />
            )}
          </div>

        </div>

        {/* Text Content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className={cn("text-base", currentStyle.title)}>
              {isOverCapacity ? "⚠️ Limit Exceeded!" : "⚡ Almost at Limit!"}
            </p>
            <span
              className={cn(
                "font-mono text-sm font-bold px-2.5 py-1 rounded-lg",
                "shadow-sm",
                isOverCapacity
                  ? "bg-red-500 text-white"
                  : "bg-amber-500 text-white"
              )}
            >
              {used}/{limit} · {percentage}%
            </span>
          </div>

          <p className={cn("text-sm", currentStyle.subtitle)}>
            {isOverCapacity
              ? `Your ${plural} have exceeded the limit. ${Math.abs(remaining)} over capacity — some may stop syncing!`
              : `Only ${remaining} ${remaining === 1 ? name : plural} remaining. Upgrade now to avoid interruptions.`}
          </p>

          {/* Visual meter for subtle variant */}
          {variant === "subtle" && (
            <div className="mt-2 h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={cn("h-full transition-all duration-500", currentStyle.progressBar)}
                style={{ width: `${percentage}%` }}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {isOverCapacity && onRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className={cn(
                "h-8 px-3 text-sm font-medium",
                "hover:bg-red-100 dark:hover:bg-red-900/30",
                "transition-all duration-200",
                variant === "bold" && "border border-red-300 dark:border-red-700"
              )}
              aria-label={`Remove a ${name}`}
            >
              Remove one
            </Button>
          )}

          <Button
            asChild
            size="default"
            className={cn(
              "h-9 gap-2 px-4 text-sm font-semibold rounded-lg",
              "transition-all duration-200",
              variant === "bold" && "hover:scale-105 active:scale-95 shadow-lg",
              currentStyle.upgradeButton
            )}
          >
            <Link href={upgradeHref}>
              Upgrade Now
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Dismiss Button */}
        {!isOverCapacity && (
          <button
            onClick={handleDismiss}
            className={cn(
              "shrink-0 rounded p-1",
              "hover:bg-black/5 dark:hover:bg-white/5",
              "transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-offset-2",
              isOverCapacity ? "focus:ring-red-500" : "focus:ring-amber-500"
            )}
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
