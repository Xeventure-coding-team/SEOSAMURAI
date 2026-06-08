"use client";

import { AlertTriangle, XCircle, Clock, MapPin, Infinity } from "lucide-react";
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
      <div className="inline-flex h-[30px] w-36 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800" />
    );
  }

  if (!data) return null;

  const used: number = data.current;
  const limit: number = data.limit;

  const hasLimit = limit > 0;
  const isUnlimited = !hasLimit;
  const isOverCapacity = hasLimit && used > limit;

  const remaining: number = hasLimit ? limit - used : Number.POSITIVE_INFINITY;

  const ratio = hasLimit ? used / limit : 0;
  const percentage = hasLimit
    ? Math.min(100, Math.round(ratio * 100))
    : 0;

  const isWarning = !isOverCapacity && hasLimit && ratio >= 0.8;
  const isNearLimit = !isOverCapacity && hasLimit && remaining <= 3;

  // Variant helpers — single source of truth
  const variant =
    isOverCapacity ? "exceeded" :
      isNearLimit ? "warning" :
        isUnlimited ? "unlimited" :
          "ok";

  const variantClasses = {
    exceeded: {
      border: "border-red-300 dark:border-red-800",
      left: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
      divider: "bg-red-200 dark:bg-red-800",
      middle: "text-red-500 dark:text-red-400",
      right: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
      bar: "bg-red-400",
    },
    warning: {
      border: "border-amber-300 dark:border-amber-800",
      left: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
      divider: "bg-amber-200 dark:bg-amber-800",
      middle: "text-amber-500 dark:text-amber-400",
      right: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
      bar: "bg-amber-400",
    },
    unlimited: {
      border: "border-teal-200 dark:border-teal-800",
      left: "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
      divider: "bg-teal-200 dark:bg-teal-800",
      middle: "text-teal-500 dark:text-teal-400",
      right: "",
      bar: "bg-teal-400",
    },
    ok: {
      border: "border-zinc-200 dark:border-zinc-700",
      left: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
      divider: "bg-zinc-200 dark:bg-zinc-700",
      middle: "text-zinc-400 dark:text-zinc-500",
      right: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
      bar: "bg-zinc-300 dark:bg-zinc-600",
    },
  }[variant];

  const Icon =
    isOverCapacity ? XCircle :
      isNearLimit ? AlertTriangle :
        isUnlimited ? Infinity :
          MapPin;

  const getDescriptiveText = () => {
    if (isUnlimited) return "No limit";
    if (isOverCapacity) return "Limit exceeded";
    if (remaining === 0) return "Limit reached";
    if (remaining <= 3) return `${remaining} remaining`;
    if (remaining <= 10) return `${remaining} remaining`;
    return `${remaining} available`;
  };

  return (
    <div className={cn("flex flex-col", className)}>
      <div className={cn(
        "inline-flex items-stretch overflow-hidden rounded-full border cursor-default w-fit",
        variantClasses.border,
      )}>

        {/* Left — icon + label */}
        <div className={cn(
          "flex items-center gap-1.5 px-3 py-1",
          variantClasses.left,
        )}>
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span className="text-[11px] font-bold uppercase tracking-widest whitespace-nowrap">
            {label}
          </span>
        </div>

        {/* Divider */}
        <div className={cn("w-px", variantClasses.divider)} />

        {/* Middle — descriptive message */}
        <span className={cn(
          "flex items-center px-3 py-1 text-xs bg-white dark:bg-zinc-900 whitespace-nowrap",
          variantClasses.middle,
        )}>
          {getDescriptiveText()}
        </span>

        {/* Right — used/limit count */}
        {!isUnlimited && (
          <>
            <div className={cn("w-px", variantClasses.divider)} />
            <span className={cn(
              "flex items-center gap-0.5 px-3 py-1 text-xs font-semibold font-mono tabular-nums whitespace-nowrap",
              variantClasses.right,
            )}>
              <span>{used}</span>
              <span className="opacity-40">/</span>
              <span>{limit}</span>
            </span>
          </>
        )}

      </div>

      {/* Details */}
      {showDetails && (
        <div className="space-y-2 mt-1.5 px-1">
          {showBar && !isUnlimited && !isOverCapacity && (
            <div className="space-y-1">
              <div className="relative h-1 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-white/10">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    variantClasses.bar,
                    percentage >= 90 && "animate-pulse",
                  )}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              {showPercentage && (
                <div className="flex justify-end">
                  <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
                    {percentage}%
                  </span>
                </div>
              )}
            </div>
          )}

          {showRemainingTime && !isUnlimited && remaining > 0 && (
            <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500">
              <Clock className="h-3 w-3" />
              <span className="text-[11px]">~{Math.ceil(remaining / 5)} days left</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}