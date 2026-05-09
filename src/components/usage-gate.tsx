"use client";

import React, { cloneElement, isValidElement } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Lock } from "lucide-react";
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
  /** Show warning at 80%+ but still allow action (metric only) */
  warnOnly?: boolean;
  onBlocked?: () => void;
  className?: string;
};

const STATUS_TOOLTIP: Record<UsageStatus, string> = {
  ok: "",
  warning: "You're approaching your monthly limit",
  exceeded: "Monthly limit reached — upgrade to continue",
};

// ─── Loading skeleton ─────────────────────────────────────────────────────────
// Renders while SWR is fetching so there's zero layout shift or flash.

function LoadingSkeleton({ children }: { children: React.ReactElement }) {
  const muted = isValidElement(children)
    ? cloneElement(
        children as React.ReactElement<React.ButtonHTMLAttributes<HTMLButtonElement>>,
        {
          disabled: true,
          "aria-disabled": true,
          className: cn(
            (children.props as { className?: string }).className,
            "opacity-40 pointer-events-none cursor-not-allowed"
          ),
        }
      )
    : children;

  return <span className="inline-flex">{muted}</span>;
}

// ─── Internal: monthly metric gate ───────────────────────────────────────────

function MetricGate({
  metric,
  children,
  tooltipText,
  warnOnly = false,
  onBlocked,
  className,
}: MetricGateProps & Omit<UsageGateProps, "metric" | "slot">) {
  const { canUse, statusFor, data, isLoading, error } = useUsage();

  // Show muted skeleton while loading — prevents the 2-second naked-button flash
  if (isLoading || !data) {
    return <LoadingSkeleton>{children}</LoadingSkeleton>;
  }

  // Fail open on transient network errors — don't gate users due to a blip
  if (error) {
    return <>{children}</>;
  }

  const status = statusFor(metric);
  // FIX: was hardcoded `true` — now correctly derived from hook
  const blocked = warnOnly ? false : !canUse(metric);

  const used      = data.used[metric];
  const limit     = data.limits[metric];
  const remaining = Math.max(0, limit - used);

  const tip =
    tooltipText ??
    (blocked
      ? `Monthly limit reached — upgrade to continue (${used}/${limit})`
      : status === "warning"
        ? `${STATUS_TOOLTIP.warning} — ${remaining} left`
        : `${remaining} of ${limit} remaining this month`);

  return (
    <GateShell
      blocked={blocked}
      status={status}
      tip={tip}
      onBlocked={onBlocked}
      className={className}
    >
      {children}
    </GateShell>
  );
}

// ─── Internal: slot resource gate ────────────────────────────────────────────

function SlotGate({
  slot,
  children,
  tooltipText,
  onBlocked,
  className,
}: SlotGateProps & Omit<UsageGateProps, "metric" | "slot">) {
  const { canAdd, remaining, isLoading } = useSlot(slot);

  if (isLoading) {
    return <LoadingSkeleton>{children}</LoadingSkeleton>;
  }

  const blocked = !canAdd;
  const label   = slot === "locations" ? "location" : "website";

  const tip =
    tooltipText ??
    (blocked
      ? `${label} limit reached — upgrade to continue`
      : `${remaining} ${label} slot${remaining === 1 ? "" : "s"} remaining`);

  return (
    <GateShell
      blocked={blocked}
      status={blocked ? "exceeded" : "ok"}
      tip={tip}
      onBlocked={onBlocked}
      className={className}
    >
      {children}
    </GateShell>
  );
}

// ─── Internal: shared shell ───────────────────────────────────────────────────

interface GateShellProps {
  blocked: boolean;
  status: UsageStatus;
  tip: string;
  onBlocked?: () => void;
  className?: string;
  children: React.ReactElement;
}

function GateShell({
  blocked,
  status,
  tip,
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
            !blocked && status === "warning" && "border-amber-400 text-amber-800 bg-amber-50",
            className
          ),
        }
      )
    : children;

  return (
    <Tooltip.Provider delayDuration={150}>
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
            {blocked && (
              <span className="absolute -top-2 -right-2 z-10 flex items-center justify-center w-5 h-5 rounded-full bg-red-500 shadow-md ring-2 ring-white pointer-events-none">
                <Lock className="w-3 h-3 text-white" aria-hidden />
              </span>
            )}
            {gatedChild}
          </span>
        </Tooltip.Trigger>

        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            align="center"
            sideOffset={8}
            className={cn(
              "z-50 max-w-[260px] rounded-lg px-4 py-3 text-sm shadow-lg",
              "bg-primary text-primary-foreground leading-relaxed",
              "animate-in fade-in-0 zoom-in-95",
              "data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
            )}
          >
            <div className="flex flex-col gap-2">
              <span>{tip}</span>
              {blocked && (
                <a
                  href="/settings/billing"
                  className="inline-flex items-center justify-center rounded-md bg-white/90 px-3 py-1.5 text-xs font-medium text-primary hover:bg-white transition"
                >
                  Upgrade Plan
                </a>
              )}
            </div>
            <Tooltip.Arrow className="fill-primary" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

// ─── Public: unified gate ─────────────────────────────────────────────────────

export function UsageGate(props: UsageGateProps) {
  if (props.slot) {
    const { slot, children, tooltipText, onBlocked, className } = props;
    return (
      <SlotGate
        slot={slot}
        onBlocked={onBlocked}
        tooltipText={tooltipText}
        className={className}
      >
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