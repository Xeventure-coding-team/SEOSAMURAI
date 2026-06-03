"use client";

import React, { cloneElement, isValidElement, useEffect, useRef } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useUsage, UsageMetric, UsageStatus } from "@/lib/use-usage";
import { cn } from "@/lib/utils";
import { SlotResource, useSlot } from "@/lib/use-slot";

// ─── Types ────────────────────────────────────────────────────────────────────

type MetricGateProps = {
  metric: UsageMetric;
  slot?: never;
};

type SlotGateProps = {
  slot: SlotResource;
  metric?: never;
};

type UsageGateProps = (MetricGateProps | SlotGateProps) & {
  children: React.ReactElement;
  tooltipText?: string;
  warnOnly?: boolean;
  onBlocked?: () => void;
  className?: string;
};

const STATUS_TOOLTIP: Record<UsageStatus, string> = {
  ok: "",
  warning: "You're approaching your monthly limit",
  exceeded: "Monthly limit reached — upgrade to continue",
};

// ─── Shimmer skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton({ children }: { children: React.ReactElement }) {
  const muted = isValidElement(children)
    ? cloneElement(
      children as React.ReactElement<React.ButtonHTMLAttributes<HTMLButtonElement>>,
      {
        disabled: true,
        "aria-disabled": true,
        className: cn(
          (children.props as { className?: string }).className,
          "opacity-30 pointer-events-none cursor-not-allowed",
          "animate-pulse"
        ),
      }
    )
    : children;

  return <span className="inline-flex">{muted}</span>;
}

// ─── Usage ring indicator ─────────────────────────────────────────────────────

function UsageRing({
  pct,
  status,
  size = 32,
}: {
  pct: number;
  status: UsageStatus;
  size?: number;
}) {
  const r = (size - 4) / 2;
  const circ = 2 * Math.PI * r;
  const fill = Math.min(pct / 100, 1) * circ;

  const trackColor =
    status === "exceeded"
      ? "stroke-red-200 dark:stroke-red-900"
      : status === "warning"
        ? "stroke-amber-200 dark:stroke-amber-900"
        : "stroke-gray-200 dark:stroke-gray-700";

  const progressColor =
    status === "exceeded"
      ? "#ef4444"
      : status === "warning"
        ? "#f59e0b"
        : "#10b981";

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        strokeWidth={3}
        className={trackColor}
        stroke="currentColor"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        strokeWidth={3}
        stroke={progressColor}
        strokeDasharray={circ}
        strokeDashoffset={circ - fill}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />
    </svg>
  );
}

// ─── Tooltip content ──────────────────────────────────────────────────────────

interface TooltipBodyProps {
  blocked: boolean;
  status: UsageStatus;
  tip: string;
  used?: number;
  limit?: number;
}

function TooltipBody({ blocked, status, tip, used, limit }: TooltipBodyProps) {
  const pct = used != null && limit ? Math.round((used / limit) * 100) : null;

  return (
    <div className="flex flex-col gap-3 max-w-[172px]">
      {/* Header row */}
      <div className="flex items-center gap-2.5">
        {pct != null && limit != null && (
          <UsageRing
            pct={pct}
            status={status}
            size={34}
          />
        )}
        <div className="flex flex-col gap-0.5">
          <p className="text-[14px] font-medium leading-tight text-white/95">
            {blocked ? "Limit reached" : status === "warning" ? "Almost there" : "Usage"}
          </p>
          {pct != null && limit != null && (
            <p className="text-[12px] text-white/55 tabular-nums">
              {used?.toLocaleString()} / {limit.toLocaleString()} used
            </p>
          )}
        </div>
      </div>

      {/* Tip text */}
      <p className="text-[14px] leading-relaxed text-white/75 border-t border-white/10 pt-2.5">
        {tip}
      </p>

      {/* Progress bar (if we have data) */}
      {pct != null && (
        <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden -mt-1">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              status === "exceeded" && "bg-red-400",
              status === "warning" && "bg-amber-400",
              status === "ok" && "bg-emerald-400"
            )}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      )}

      {/* CTA */}
      {blocked && (
        <a
          href="/app/settings/billing"
          className={cn(
            "inline-flex items-center justify-center gap-1.5",
            "rounded-lg px-3 py-2 text-[12px] font-medium",
            "bg-white text-gray-900 hover:bg-white/90",
            "transition-all duration-150 active:scale-[0.98]",
            "shadow-sm"
          )}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          Upgrade plan
        </a>
      )}
    </div>
  );
}

// ─── Lock badge ───────────────────────────────────────────────────────────────

function LockBadge() {
  return (
    <span
      className={cn(
        "absolute -top-1.5 -right-1.5 z-10",
        "flex items-center justify-center",
        "w-[18px] h-[18px] rounded-full",
        "bg-red-500 ring-2 ring-white dark:ring-gray-900",
        "shadow-sm pointer-events-none",
        "animate-in zoom-in-75 duration-200"
      )}
    >
      <svg
        width="9"
        height="9"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    </span>
  );
}

// ─── Warning dot ──────────────────────────────────────────────────────────────

function WarningDot() {
  return (
    <span
      className={cn(
        "absolute -top-1 -right-1 z-10",
        "w-[10px] h-[10px] rounded-full",
        "bg-amber-400 ring-2 ring-white dark:ring-gray-900",
        "pointer-events-none",
        "animate-pulse"
      )}
      aria-hidden
    />
  );
}

// ─── Shared gate shell ────────────────────────────────────────────────────────

interface GateShellProps {
  blocked: boolean;
  status: UsageStatus;
  tip: string;
  used?: number;
  limit?: number;
  onBlocked?: () => void;
  className?: string;
  children: React.ReactElement;
}

function GateShell({
  blocked,
  status,
  tip,
  used,
  limit,
  onBlocked,
  className,
  children,
}: GateShellProps) {
  const gatedChild = isValidElement(children)
    ? cloneElement(
      children as React.ReactElement<React.ButtonHTMLAttributes<HTMLButtonElement>>,
      {
        disabled: blocked || (children.props as { disabled?: boolean }).disabled,
        "aria-disabled": blocked,
        onClick: blocked
          ? (e: React.MouseEvent) => {
            e.preventDefault();
            onBlocked?.();
          }
          : (children.props as { onClick?: React.MouseEventHandler }).onClick,
        className: cn(
          (children.props as { className?: string }).className,
          blocked && "opacity-50 cursor-not-allowed pointer-events-none",
          !blocked &&
          status === "warning" &&
          "ring-1 ring-amber-400/60 ring-offset-1",
          className
        ),
      }
    )
    : children;

  return (
    <Tooltip.Provider delayDuration={120}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span
            className={cn(
              "relative inline-flex",
              blocked && "cursor-not-allowed"
            )}
            tabIndex={blocked ? 0 : undefined}
            aria-label={blocked ? tip : undefined}
          >
            {blocked && <LockBadge />}
            {!blocked && status === "warning" && <WarningDot />}
            {gatedChild}
          </span>
        </Tooltip.Trigger>

        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            align="center"
            sideOffset={10}
            className={cn(
              "z-50 rounded-xl px-3 py-3 shadow-xl",
              "border border-white/10",
              // Contextual background tinting
              blocked
                ? "bg-gray-900 dark:bg-gray-800"
                : status === "warning"
                  ? "bg-amber-900/95 dark:bg-amber-950/95"
                  : "bg-gray-900 dark:bg-gray-800",
              "backdrop-blur-sm",
              "will-change-transform",
              "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
              "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
              "data-[side=top]:slide-in-from-bottom-1",
              "data-[side=bottom]:slide-in-from-top-1",
              "duration-150"
            )}
          >
            <TooltipBody
              blocked={blocked}
              status={status}
              tip={tip}
              used={used}
              limit={limit}
            />
            <Tooltip.Arrow
              className={cn(
                blocked
                  ? "fill-gray-900 dark:fill-gray-800"
                  : status === "warning"
                    ? "fill-amber-900/95"
                    : "fill-gray-900 dark:fill-gray-800"
              )}
            />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

// ─── Metric gate ──────────────────────────────────────────────────────────────

function MetricGate({
  metric,
  children,
  tooltipText,
  warnOnly = false,
  onBlocked,
  className,
}: MetricGateProps & Omit<UsageGateProps, "metric" | "slot">) {
  const { canUse, statusFor, data, isLoading, error } = useUsage();

  if (isLoading || !data) return <LoadingSkeleton>{children}</LoadingSkeleton>;
  if (error) return <>{children}</>;

  const status = statusFor(metric);
  const blocked = warnOnly ? false : !canUse(metric);

  const used = data.used[metric];
  const limit = data.limits[metric];
  const remaining = limit != null ? Math.max(0, limit - used) : null;

  const tip =
    tooltipText ??
    (blocked
      ? limit != null
        ? `You've used all ${limit.toLocaleString()} available this month.`
        : "You've reached your monthly limit."
      : status === "warning"
        ? remaining != null
          ? `${STATUS_TOOLTIP.warning} — ${remaining.toLocaleString()} remaining.`
          : STATUS_TOOLTIP.warning
        : remaining != null && limit != null
          ? `${remaining.toLocaleString()} of ${limit.toLocaleString()} remaining this month.`
          : "Usage data unavailable.");

  return (
    <GateShell
      blocked={blocked}
      status={status}
      tip={tip}
      used={used}
      limit={limit}
      onBlocked={onBlocked}
      className={className}
    >
      {children}
    </GateShell>
  );
}

// ─── Slot gate ────────────────────────────────────────────────────────────────

function SlotGate({
  slot,
  children,
  tooltipText,
  onBlocked,
  className,
}: SlotGateProps & Omit<UsageGateProps, "metric" | "slot">) {
  const { canAdd, remaining, isLoading, data } = useSlot(slot);

  if (isLoading) return <LoadingSkeleton>{children}</LoadingSkeleton>;

  const blocked = !canAdd;
  const label   = slot === "locations" ? "location" : slot === "websites" ? "website" : "review poster";

  const tip =
    tooltipText ??
    (blocked
      ? `Your ${label} limit has been reached. Upgrade to add more.`
      : `${remaining} ${label} slot${remaining === 1 ? "" : "s"} remaining.`);

  return (
    <GateShell
      blocked={blocked}
      status={blocked ? "exceeded" : remaining <= 1 ? "warning" : "ok"}
      tip={tip}
      used={data?.current}    
      limit={data?.limit}     
      onBlocked={onBlocked}
      className={className}
    >
      {children}
    </GateShell>
  );
}
// ─── Public API ───────────────────────────────────────────────────────────────

export function UsageGate(props: UsageGateProps) {
  if (props.slot) {
    const { slot, children, tooltipText, onBlocked, className } = props;
    return (
      <SlotGate slot={slot} onBlocked={onBlocked} tooltipText={tooltipText} className={className}>
        {children}
      </SlotGate>
    );
  }

  const { metric, children, tooltipText, warnOnly, onBlocked, className } = props;
  return (
    <MetricGate
      metric={metric}
      warnOnly={warnOnly}
      onBlocked={onBlocked}
      tooltipText={tooltipText}
      className={className}
    >
      {children}
    </MetricGate>
  );
}