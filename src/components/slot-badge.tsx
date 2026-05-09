"use client";

import { useSlot, SlotResource } from "@/lib/use-slot";
import { cn } from "@/lib/utils";

interface SlotBadgeProps {
  slot: SlotResource;
  label: string;
  showBar?: boolean;
  className?: string;
}

// Shared styles (kept outside to avoid re-creation on each render)
const STATUS_STYLES = {
  ok: {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 transition-colors",
    bar: "bg-emerald-500",
    dot: "bg-emerald-500",
    text: "",
  },
  warning: {
    badge: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 transition-colors",
    bar: "bg-amber-500",
    dot: "bg-amber-500",
    text: "text-amber-700",
  },
  exceeded: {
    badge: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 transition-colors",
    bar: "bg-red-500",
    dot: "bg-red-500",
    text: "text-red-700",
  },
} as const;

// Small reusable UI pieces
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

const Dot = ({ className }: { className?: string }) => (
  <span
    className={cn("w-2 h-2 rounded-full flex-shrink-0", className)}
    aria-hidden
  />
);

export function SlotBadge({
  slot,
  label,
  showBar = false,
  className,
}: SlotBadgeProps) {
  const { data, isLoading } = useSlot(slot);

  // Loading
  if (isLoading) {
    return (
      <Badge className={className}>
        <span className="w-12 h-2 rounded bg-neutral-200 animate-pulse" />
      </Badge>
    );
  }

  // Error / no data
  if (!data) {
    return (
      <Badge className="bg-red-50 text-red-700 border-red-200">
        Not available
      </Badge>
    );
  }

  const used = data.current;
  const limit = data.limit;
  const hasLimit = limit > 0;

  // Status calculation (cleaner + reusable logic)
  const ratio = hasLimit ? used / limit : 0;

  let status: keyof typeof STATUS_STYLES = "ok";
  if (hasLimit) {
    if (used >= limit) status = "exceeded";
    else if (ratio >= 0.8) status = "warning";
  }

  const styles = STATUS_STYLES[status];
  const pct = hasLimit ? Math.min(100, Math.round(ratio * 100)) : 0;

  return (
    <div className={cn("inline-flex flex-col gap-1", className)}>
      <Badge className={styles.badge}>
        <Dot className={styles.dot} />
        {label}
        <span className="opacity-60">·</span>
        <span className={cn("tabular-nums", styles.text)}>
          {hasLimit ? `${used}/${limit}` : used}
        </span>
      </Badge>

      {showBar && hasLimit && (
        <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              styles.bar
            )}
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={used}
            aria-valuemin={0}
            aria-valuemax={limit}
            aria-label={`${label}: ${used} of ${limit} used`}
          />
        </div>
      )}
    </div>
  );
}
