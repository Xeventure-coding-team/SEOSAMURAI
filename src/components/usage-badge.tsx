"use client";

import { useUsage, UsageMetric, UsageStatus } from "@/lib/use-usage";
import { useSlot, SlotResource } from "@/lib/use-slot";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────────

type UsageBadgeProps =
  | { metric: UsageMetric; label: string; className?: string; compact?: boolean }
  | { slot: SlotResource; label: string; className?: string; compact?: boolean };

// Only treat usage as "warning" once it crosses this percentage of the limit.
const NEAR_LIMIT_PCT = 98;

function statusFromPct(current: number, limit: number, blocked: boolean): UsageStatus {
  if (blocked) return "exceeded";
  const pct = limit > 0 ? (current / limit) * 100 : 0;
  return pct >= NEAR_LIMIT_PCT ? "warning" : "ok";
}

// ─── Status accents — used sparingly, only the dot + number carry color ───────

const STATUS_DOT: Record<UsageStatus, string> = {
  ok: "bg-foreground/30",
  warning: "bg-warning",
  exceeded: "bg-destructive",
};

const STATUS_TEXT: Record<UsageStatus, string> = {
  ok: "text-foreground",
  warning: "text-warning",
  exceeded: "text-destructive",
};

// ─── Shell ──────────────────────────────────────────────────────────────────────
// Vercel-style: 1px border, small radius (not pill), tight padding, no shadow.

function Shell({
  className,
  compact,
  children,
}: {
  className?: string;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-md border border-border bg-background",
        "transition-colors duration-150",
        compact ? "h-6 px-2" : "h-7 px-2.5",
        className
      )}
    >
      {children}
    </div>
  );
}

// ─── Loading ────────────────────────────────────────────────────────────────────

const LoadingBadge = ({ className, compact }: { className?: string; compact?: boolean }) => (
  <Shell className={cn("border-border/60", className)} compact={compact}>
    <span className="h-1.5 w-1.5 rounded-full bg-muted animate-pulse" />
    <span
      className={cn(
        "h-2.5 rounded-sm bg-muted animate-pulse",
        compact ? "w-12" : "w-16"
      )}
    />
  </Shell>
);

// ─── Flat (no usable limit / error) ───────────────────────────────────────────

const FlatBadge = ({
  label,
  message,
  className,
  compact,
}: {
  label: string;
  message: string;
  className?: string;
  compact?: boolean;
}) => (
  <Shell className={className} compact={compact}>
    <span
      className={cn(
        "font-mono uppercase tracking-wide text-muted-foreground",
        compact ? "text-[10px]" : "text-[11px]"
      )}
    >
      {label}
    </span>
    <span className={cn("text-muted-foreground/60", compact ? "text-[10px]" : "text-[11px]")}>
      {message}
    </span>
  </Shell>
);

// ─── Badge ──────────────────────────────────────────────────────────────────────
// Default look is near-monochrome. The progress bar and numerals only pick up
// color once status leaves "ok" — i.e. right at the limit, not throughout.

const Badge = ({
  label,
  current,
  limit,
  status,
  className,
  compact,
}: {
  label: string;
  current: number;
  limit: number;
  status: UsageStatus;
  className?: string;
  compact?: boolean;
}) => {
  const percent = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
  const isAttention = status !== "ok";

  return (
    <Shell className={className} compact={compact}>
      {/* dot */}
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[status])} />
        {status === "warning" && (
          <span className="absolute inset-0 rounded-full bg-warning animate-ping opacity-50" />
        )}
      </span>

      {/* label */}
      <span
        className={cn(
          "font-mono uppercase tracking-wide text-muted-foreground",
          compact ? "text-[10px]" : "text-[11px]"
        )}
      >
        {label}
      </span>

      {/* divider */}
      <span className="h-3 w-px bg-border" />

      {/* progress bar — only renders visibly once near/at limit */}
      <div
        className={cn(
          "h-1 rounded-full overflow-hidden bg-muted",
          compact ? "w-6" : "w-8"
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            isAttention ? STATUS_DOT[status] : "bg-foreground/40"
          )}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* numerals */}
      <span
        className={cn(
          "font-mono tabular-nums font-medium",
          STATUS_TEXT[status],
          compact ? "text-[10px]" : "text-[11px]"
        )}
      >
        {current}/{limit}
      </span>
    </Shell>
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
    if (data.limit === 0)
      return (
        <FlatBadge label={label} message="Not included" className={className} compact={compact} />
      );

    const status = statusFromPct(data.current, data.limit, !canAdd);
    return (
      <Badge
        label={label}
        current={data.current}
        limit={data.limit}
        status={status}
        className={className}
        compact={compact}
      />
    );
  }

  // Metric variant
  const { data, isLoading, error, canUse } = useUsage();
  if (isLoading && !data && !error) return <LoadingBadge className={className} compact={compact} />;
  if (error || !data?.plan)
    return (
      <FlatBadge
        label={label}
        message={error ? "Unavailable" : "No plan"}
        className={className}
        compact={compact}
      />
    );

  const limit = data.limits[props.metric];
  if (limit === 0)
    return <FlatBadge label={label} message="Not included" className={className} compact={compact} />;

  const current = data.used[props.metric];
  const status = statusFromPct(current, limit, !canUse(props.metric));

  return (
    <Badge
      label={label}
      current={current}
      limit={limit}
      status={status}
      className={className}
      compact={compact}
    />
  );
}