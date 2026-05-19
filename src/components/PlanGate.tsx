"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useUsage, UsageMetric, useFeature } from "@/lib/use-usage";
import { useSlot, SlotResource } from "@/lib/use-slot";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type PlanGateMode =
  | { type: "no_plan" }
  | { type: "metric"; metric: UsageMetric }
  | { type: "slot"; slot: SlotResource }
  | { type: "feature"; feature: string };

/** `full`  – replaces the page area with a rich gate card (default)  */
/** `small` – renders a compact inline banner; children are hidden     */
type GateSize = "full" | "small";

interface PlanGateProps {
  mode: PlanGateMode;
  children: React.ReactNode;
  size?: GateSize;
  featureName?: string;
  description?: string;
  upgradeHref?: string;
  className?: string;
}

// ─── Variant config ───────────────────────────────────────────────────────────

type GateVariant = "premium" | "limit" | "locked";

interface VariantCfg {
  label: string;
  /** Tailwind classes for the small badge pill */
  pillBg: string;
  pillText: string;
  /** Accent line color for the small banner */
  accentBar: string;
  /** Icon character rendered via a simple inline svg */
  Icon: React.FC<{ size?: number }>;
  /** CTA button bg */
  btnBg: string;
  btnHover: string;
  /** Full-card tint classes */
  cardBorder: string;
  iconRingBg: string;
  iconColor: string;
  headingColor: string;
}

const IconStar: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const IconAlert: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const IconLock: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const variantCfg: Record<GateVariant, VariantCfg> = {
  premium: {
    label: "Premium feature",
    pillBg: "bg-[#EEEDFE]",
    pillText: "text-[#3C3489]",
    accentBar: "bg-[#534AB7]",
    Icon: IconStar,
    btnBg: "bg-[#534AB7]",
    btnHover: "hover:bg-[#3C3489]",
    cardBorder: "border-[#AFA9EC]/40",
    iconRingBg: "bg-[#EEEDFE]",
    iconColor: "text-[#534AB7]",
    headingColor: "text-[#26215C] dark:text-[#CECBF6]",
  },
  limit: {
    label: "Limit reached",
    pillBg: "bg-[#FCEBEB]",
    pillText: "text-[#791F1F]",
    accentBar: "bg-[#E24B4A]",
    Icon: IconAlert,
    btnBg: "bg-[#A32D2D]",
    btnHover: "hover:bg-[#791F1F]",
    cardBorder: "border-[#F09595]/40",
    iconRingBg: "bg-[#FCEBEB]",
    iconColor: "text-[#A32D2D]",
    headingColor: "text-[#501313] dark:text-[#F7C1C1]",
  },
  locked: {
    label: "Not on your plan",
    pillBg: "bg-[#FAEEDA]",
    pillText: "text-[#633806]",
    accentBar: "bg-[#BA7517]",
    Icon: IconLock,
    btnBg: "bg-[#854F0B]",
    btnHover: "hover:bg-[#633806]",
    cardBorder: "border-[#EF9F27]/30",
    iconRingBg: "bg-[#FAEEDA]",
    iconColor: "text-[#854F0B]",
    headingColor: "text-[#412402] dark:text-[#FAC775]",
  },
};

// ─── Shared: upgrade button ───────────────────────────────────────────────────

function UpgradeBtn({
  href,
  variant,
  label = "Upgrade plan",
  small,
}: {
  href: string;
  variant: GateVariant;
  label?: string;
  small?: boolean;
}) {
  const router = useRouter();
  const cfg = variantCfg[variant];
  return (
    <button
      onClick={() => router.push(href)}
      className={cn(
        "inline-flex items-center gap-2 font-medium text-white rounded-lg transition-all duration-150",
        "active:scale-[0.97]",
        cfg.btnBg,
        cfg.btnHover,
        small ? "text-xs px-3 py-1.5" : "text-sm px-4 py-2.5"
      )}
    >
      {label}
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    </button>
  );
}

// ─── Small variant ────────────────────────────────────────────────────────────
// Inline banner — doesn't replace children, just floats above them.

interface SmallGateProps {
  variant: GateVariant;
  featureName?: string;
  description?: string;
  upgradeHref: string;
  usageData?: { used: number; total: number };
}

function SmallGate({ variant, featureName, description, upgradeHref, usageData }: SmallGateProps) {
  const cfg = variantCfg[variant];
  const pct = usageData ? Math.min(Math.round((usageData.used / usageData.total) * 100), 100) : null;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border px-4 py-3",
        "bg-white dark:bg-gray-950",
        cfg.cardBorder
      )}
    >
      {/* Accent bar */}
      <div className={cn("w-0.5 self-stretch rounded-full shrink-0", cfg.accentBar)} />

      {/* Icon */}
      <span className={cn("flex items-center justify-center w-7 h-7 rounded-lg shrink-0", cfg.iconRingBg, cfg.iconColor)}>
        <cfg.Icon size={14} />
      </span>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("text-[11px] font-semibold uppercase tracking-widest", cfg.pillText)}>
            {cfg.label}
          </span>
          {featureName && (
            <span className="text-[13px] font-medium text-gray-800 dark:text-gray-100 truncate">
              {featureName}
            </span>
          )}
        </div>
        {description && (
          <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{description}</p>
        )}
        {pct != null && (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div
                className={cn("h-full rounded-full", cfg.accentBar)}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[11px] tabular-nums text-gray-400">
              {usageData!.used.toLocaleString()} / {usageData!.total.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="shrink-0">
        <UpgradeBtn href={upgradeHref} variant={variant} small />
      </div>
    </div>
  );
}

// ─── Full variant ─────────────────────────────────────────────────────────────
// Rich two-column card that replaces the page content.

interface FullGateProps {
  variant: GateVariant;
  heading: React.ReactNode;
  description: string;
  upgradeHref: string;
  ctaLabel?: string;
  chips?: React.ReactNode;
  meta?: React.ReactNode;
}

function FullGate({ variant, heading, description, upgradeHref, ctaLabel, chips, meta }: FullGateProps) {
  const cfg = variantCfg[variant];

  return (
    <div
      className={cn(
        "w-full rounded-2xl border overflow-hidden",
        "bg-white dark:bg-gray-950",
        cfg.cardBorder
      )}
    >
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_260px] min-h-[300px]">

        {/* Left: content */}
        <div className="flex flex-col justify-center gap-5 p-8 sm:p-10">

          {/* Pill */}
          <span className={cn(
            "inline-flex items-center gap-1.5 w-fit rounded-full px-3 py-1",
            "text-[10px] font-semibold tracking-[0.08em] uppercase",
            cfg.pillBg, cfg.pillText
          )}>
            <cfg.Icon size={11} />
            {cfg.label}
          </span>

          {/* Heading */}
          <h3 className={cn(
            "font-serif text-[1.75rem] sm:text-[2rem] font-normal leading-[1.18]",
            cfg.headingColor
          )}>
            {heading}
          </h3>

          {/* Description */}
          <p className="text-[14px] sm:text-[15px] leading-relaxed text-gray-500 dark:text-gray-400 max-w-sm">
            {description}
          </p>

          {meta && <div>{meta}</div>}
          {chips && <div className="flex flex-wrap gap-2">{chips}</div>}

          {/* Actions */}
          <div className="flex items-center gap-4 flex-wrap mt-1">
            <UpgradeBtn href={upgradeHref} variant={variant} label={ctaLabel ?? "Upgrade plan"} />
            <a
              href="/settings/billing"
              className="text-[13px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              Learn more
            </a>
          </div>
        </div>

        {/* Right: geometric decoration */}
        <div
          className={cn(
            "hidden sm:flex items-center justify-center relative overflow-hidden",
            "bg-gray-50 dark:bg-gray-900/60"
          )}
        >
          {/* Concentric rings */}
          {[200, 152, 104, 64].map((s, i) => (
            <div
              key={s}
              className={cn("absolute rounded-full border", cfg.cardBorder)}
              style={{ width: s, height: s, opacity: 1 - i * 0.18 }}
            />
          ))}
          {/* Icon center */}
          <div className={cn(
            "relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center",
            cfg.iconRingBg, cfg.iconColor
          )}>
            <cfg.Icon size={24} />
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Feature chip ─────────────────────────────────────────────────────────────

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <polyline points="20 6 9 17 4 12" />
      </svg>
      {children}
    </span>
  );
}

// ─── Usage progress bar ───────────────────────────────────────────────────────

function UsageBar({ used, total, label, variant }: { used: number; total: number; label: string; variant: GateVariant }) {
  const pct = Math.min(Math.round((used / total) * 100), 100);
  const cfg = variantCfg[variant];
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-xs text-gray-500">
        <span>{label}</span>
        <span className="tabular-nums font-medium">{used.toLocaleString()} / {total.toLocaleString()}</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", cfg.accentBar)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Block builders ───────────────────────────────────────────────────────────

function NoPlanContent({
  size,
  featureName,
  description,
  upgradeHref,
}: {
  size: GateSize;
  featureName?: string;
  description?: string;
  upgradeHref: string;
}) {
  const desc = description ?? "Choose a plan to unlock advanced features, deeper insights, and powerful tools.";
  if (size === "small") {
    return <SmallGate variant="premium" featureName={featureName} description={desc} upgradeHref={upgradeHref} />;
  }
  return (
    <FullGate
      variant="premium"
      heading={<>Unlock <em className="not-italic">{featureName ?? "premium features"}</em> for your workspace</>}
      description={desc}
      ctaLabel="Choose a plan"
      chips={<><Chip>Unlimited access</Chip><Chip>Priority support</Chip><Chip>Advanced analytics</Chip></>}
      upgradeHref={upgradeHref}
    />
  );
}

function UsageExceededContent({
  size,
  featureName,
  description,
  upgradeHref,
  isSlot,
  usageData,
}: {
  size: GateSize;
  featureName?: string;
  description?: string;
  upgradeHref: string;
  isSlot: boolean;
  usageData?: { used: number; total: number; label: string };
}) {
  const desc = description ?? (isSlot
    ? "You've hit the maximum slots on your current plan. Upgrade to add more."
    : "You've used all your quota this billing cycle. Upgrade to restore access immediately.");

  if (size === "small") {
    return (
      <SmallGate
        variant="limit"
        featureName={featureName ?? (isSlot ? "Slot limit" : "Usage limit")}
        description={desc}
        upgradeHref={upgradeHref}
        usageData={usageData}
      />
    );
  }
  return (
    <FullGate
      variant="limit"
      heading={<>Your <em className="not-italic">{featureName ?? (isSlot ? "slot" : "usage")} limit</em> is reached</>}
      description={desc}
      meta={usageData ? <UsageBar {...usageData} variant="limit" /> : null}
      upgradeHref={upgradeHref}
    />
  );
}

function FeatureLockedContent({
  size,
  featureName,
  description,
  upgradeHref,
  availableOn,
}: {
  size: GateSize;
  featureName?: string;
  description?: string;
  upgradeHref: string;
  availableOn?: string[];
}) {
  const plans = availableOn ?? ["Pro plan", "Enterprise plan"];
  const desc = description ?? `${featureName ?? "This feature"} is not included in your current plan. Upgrade to unlock it.`;

  if (size === "small") {
    return <SmallGate variant="locked" featureName={featureName} description={desc} upgradeHref={upgradeHref} />;
  }
  return (
    <FullGate
      variant="locked"
      heading={<><em className="not-italic">{featureName ?? "This feature"}</em> requires a higher plan</>}
      description={desc}
      chips={plans.map((p) => <Chip key={p}>{p}</Chip>)}
      meta={
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-600">
          <span className="whitespace-nowrap">Available on</span>
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        </div>
      }
      upgradeHref={upgradeHref}
    />
  );
}

// ─── Inner gate wrappers ──────────────────────────────────────────────────────

function MetricPlanGate({ metric, size, featureName, description, upgradeHref, children }: {
  metric: UsageMetric; size: GateSize; featureName?: string; description?: string; upgradeHref: string; children: React.ReactNode;
}) {
  const { data, isLoading, statusFor } = useUsage();
  if (isLoading || !data) return <>{children}</>;
  if (!data.plan) return <NoPlanContent size={size} featureName={featureName} description={description} upgradeHref={upgradeHref} />;
  if (statusFor(metric) === "exceeded") {
    const used = data.used[metric];
    const total = data.limits[metric];
    return (
      <UsageExceededContent
        size={size} featureName={featureName} description={description} upgradeHref={upgradeHref}
        isSlot={false} usageData={{ used, total, label: "This month" }}
      />
    );
  }
  return <>{children}</>;
}

function SlotPlanGate({ slot, size, featureName, description, upgradeHref, children }: {
  slot: SlotResource; size: GateSize; featureName?: string; description?: string; upgradeHref: string; children: React.ReactNode;
}) {
  const { isLoading, canAdd, data } = useSlot(slot);
  if (isLoading) return <>{children}</>;
  if (!data) return <NoPlanContent size={size} featureName={featureName} description={description} upgradeHref={upgradeHref} />;
  if (!canAdd) return <UsageExceededContent size={size} featureName={featureName} description={description} upgradeHref={upgradeHref} isSlot />;
  return <>{children}</>;
}

function FeaturePlanGate({ feature, size, featureName, description, upgradeHref, children, availableOn }: {
  feature: string; size: GateSize; featureName?: string; description?: string; upgradeHref: string; children: React.ReactNode; availableOn?: string[];
}) {
  const { data, isLoading } = useUsage();
  const allowed = useFeature(feature);
  if (isLoading || !data) return <>{children}</>;
  if (!data.plan) return <NoPlanContent size={size} featureName={featureName} description={description} upgradeHref={upgradeHref} />;
  if (!allowed) return <FeatureLockedContent size={size} featureName={featureName} description={description} upgradeHref={upgradeHref} availableOn={availableOn} />;
  return <>{children}</>;
}

function NoPlanGateInner({ size, featureName, description, upgradeHref, children }: {
  size: GateSize; featureName?: string; description?: string; upgradeHref: string; children: React.ReactNode;
}) {
  const { data, isLoading } = useUsage();
  if (isLoading) return <>{children}</>;
  if (!data?.plan) return <NoPlanContent size={size} featureName={featureName} description={description} upgradeHref={upgradeHref} />;
  return <>{children}</>;
}

// ─── Public: PlanGate ─────────────────────────────────────────────────────────

export function PlanGate({
  mode,
  children,
  size = "full",
  featureName,
  description,
  upgradeHref = "/settings/billing",
  className,
}: PlanGateProps) {
  const inner = (() => {
    if (mode.type === "no_plan") {
      return (
        <NoPlanGateInner size={size} featureName={featureName} description={description} upgradeHref={upgradeHref}>
          {children}
        </NoPlanGateInner>
      );
    }
    if (mode.type === "metric") {
      return (
        <MetricPlanGate metric={mode.metric} size={size} featureName={featureName} description={description} upgradeHref={upgradeHref}>
          {children}
        </MetricPlanGate>
      );
    }
    if (mode.type === "slot") {
      return (
        <SlotPlanGate slot={mode.slot} size={size} featureName={featureName} description={description} upgradeHref={upgradeHref}>
          {children}
        </SlotPlanGate>
      );
    }
    if (mode.type === "feature") {
      return (
        <FeaturePlanGate feature={mode.feature} size={size} featureName={featureName} description={description} upgradeHref={upgradeHref}>
          {children}
        </FeaturePlanGate>
      );
    }
    return <>{children}</>;
  })();

  return <div className={cn("w-full", className)}>{inner}</div>;
}

// ─── Re-export for convenience ────────────────────────────────────────────────

export { UpgradeBtn as UpgradeButton };
export type { GateSize, GateVariant, PlanGateProps };