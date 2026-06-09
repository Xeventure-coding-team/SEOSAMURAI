"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useUsage, UsageMetric, useFeature } from "@/lib/use-usage";
import { useSlot, SlotResource } from "@/lib/use-slot";
import { cn } from "@/lib/utils";
import { Lock, Star, AlertCircle, ArrowRight, Check } from "lucide-react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type PlanGateMode =
  | { type: "no_plan" }
  | { type: "metric"; metric: UsageMetric }
  | { type: "slot"; slot: SlotResource }
  | { type: "feature"; feature: string };

type GateSize = "full" | "small";

interface PlanGateProps {
  mode: PlanGateMode;
  children: React.ReactNode;
  size?: GateSize;
  featureName?: string;
  description?: string;
  upgradeHref?: string;
  className?: string;
  availableOn?: string[];
}

// ─── Variant config ───────────────────────────────────────────────────────────

type GateVariant = "premium" | "limit" | "locked";

interface VariantCfg {
  label: string;
  Icon: React.FC<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  badgeBg: string;
  badgeText: string;
  btnBg: string;
  btnHover: string;
  accentBar: string;
  borderColor: string;
}

const variantCfg: Record<GateVariant, VariantCfg> = {
  premium: {
    label: "Premium feature",
    Icon: ({ className }) => <Star className={className} />,
    iconBg: "bg-[#EEEDFE] dark:bg-[#3C3489]",
    iconColor: "text-[#534AB7] dark:text-[#CECBF6]",
    badgeBg: "bg-[#EEEDFE] dark:bg-[#3C3489]/40",
    badgeText: "text-[#3C3489] dark:text-[#CECBF6]",
    btnBg: "bg-[#534AB7] hover:bg-[#3C3489]",
    btnHover: "",
    accentBar: "bg-[#534AB7]",
    borderColor: "border-[#AFA9EC]/40 dark:border-[#3C3489]/40",
  },
  limit: {
    label: "Limit reached",
    Icon: ({ className }) => <AlertCircle className={className} />,
    iconBg: "bg-[#FCEBEB] dark:bg-[#791F1F]/40",
    iconColor: "text-[#A32D2D] dark:text-[#F7C1C1]",
    badgeBg: "bg-[#FCEBEB] dark:bg-[#791F1F]/40",
    badgeText: "text-[#791F1F] dark:text-[#F7C1C1]",
    btnBg: "bg-[#A32D2D] hover:bg-[#791F1F]",
    btnHover: "",
    accentBar: "bg-[#E24B4A]",
    borderColor: "border-[#F09595]/40 dark:border-[#791F1F]/40",
  },
  locked: {
    label: "Not on your plan",
    Icon: ({ className }) => <Lock className={className} />,
    iconBg: "bg-[#FAEEDA] dark:bg-[#633806]/40",
    iconColor: "text-[#854F0B] dark:text-[#FAC775]",
    badgeBg: "bg-[#FAEEDA] dark:bg-[#633806]/40",
    badgeText: "text-[#633806] dark:text-[#FAC775]",
    btnBg: "bg-[#854F0B] hover:bg-[#633806]",
    btnHover: "",
    accentBar: "bg-[#BA7517]",
    borderColor: "border-[#EF9F27]/30 dark:border-[#633806]/40",
  },
};


// ─── Upgrade button ───────────────────────────────────────────────────────────

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
        "inline-flex items-center gap-2 font-medium text-white rounded-lg transition-all duration-150 active:scale-[0.97]",
        cfg.btnBg,
        small ? "text-xs px-3 py-1.5" : "text-sm px-5 py-2.5"
      )}
    >
      {label}
      <ArrowRight className={small ? "h-3 w-3" : "h-4 w-4"} />
    </button>
  );
}

// ─── Usage bar ────────────────────────────────────────────────────────────────

function UsageBar({ used, total, variant }: { used: number; total: number; variant: GateVariant }) {
  const pct = Math.min(Math.round((used / total) * 100), 100);
  const cfg = variantCfg[variant];
  return (
    <div className="w-full flex flex-col gap-1.5">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Usage this month</span>
        <span className="tabular-nums font-medium">{used.toLocaleString()} / {total.toLocaleString()}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", cfg.accentBar)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Full gate — blurred overlay design ──────────────────────────────────────

interface FullGateProps {
  variant: GateVariant;
  children: React.ReactNode;
  heading: string;
  description: string;
  upgradeHref: string;
  ctaLabel?: string;
  chips?: string[];
  usageData?: { used: number; total: number };
}

// ─── Full gate — simple centered overlay ──────────────────────────────────────
function FullGate({
  variant,
  children,
  heading,
  description,
  upgradeHref,
  ctaLabel,
}: FullGateProps) {
  return (
    <div className="relative rounded-2xl overflow-hidden flex flex-col items-center justify-center min-h-[520px]">

      {/* Blurred background */}
      <div
        className="absolute inset-0 pointer-events-none select-none opacity-40"
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-background/60" />

      {/* Card */}
      <div className="relative z-10 my-auto bg-card border border-border rounded-2xl px-8 py-10 flex flex-col items-center gap-4 text-center max-w-md w-full mx-6">

        <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
          <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-medium text-foreground leading-snug">
            {heading}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
            {description}{" "}
            <Link
              href={upgradeHref}
              className="text-blue-600 underline underline-offset-2 hover:text-blue-700 transition-colors"
            >
              upgrade your plan
            </Link>
            .
          </p>
        </div>

        <div className="flex flex-col items-center gap-2 w-full mt-1">
          <Link href={upgradeHref} className="w-full">
            <button className="w-full flex items-center justify-center gap-2 bg-foreground text-background text-sm font-medium rounded-lg px-6 py-2.5 hover:opacity-90 active:scale-[0.97] transition-all">
              {ctaLabel ?? "Upgrade plan"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
          <p className="text-xs text-muted-foreground">
            Plans start at $24/mo · Cancel anytime
          </p>
        </div>

      </div>
    </div>
  )
}

// ─── Small gate — inline banner ───────────────────────────────────────────────

function SmallGate({
  variant,
  featureName,
  description,
  upgradeHref,
  usageData,
}: {
  variant: GateVariant;
  featureName?: string;
  description?: string;
  upgradeHref: string;
  usageData?: { used: number; total: number };
}) {
  const cfg = variantCfg[variant];
  return (
    <div className={cn(
      "flex items-center gap-3 rounded-xl border px-4 py-3 bg-card",
      cfg.borderColor
    )}>
      <div className={cn("w-1 self-stretch rounded-full shrink-0", cfg.accentBar)} />
      <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", cfg.iconBg)}>
        <cfg.Icon className={cn("h-4 w-4", cfg.iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("text-[11px] font-semibold uppercase tracking-wider", cfg.badgeText)}>
            {cfg.label}
          </span>
          {featureName && (
            <span className="text-[13px] font-medium text-foreground truncate">{featureName}</span>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
        {usageData && (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full rounded-full", cfg.accentBar)}
                style={{ width: `${Math.min(Math.round((usageData.used / usageData.total) * 100), 100)}%` }}
              />
            </div>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {usageData.used.toLocaleString()} / {usageData.total.toLocaleString()}
            </span>
          </div>
        )}
      </div>
      <div className="shrink-0">
        <UpgradeBtn href={upgradeHref} variant={variant} small />
      </div>
    </div>
  );
}

// ─── Content builders ─────────────────────────────────────────────────────────

function NoPlanContent({ size, featureName, description, upgradeHref, children }: {
  size: GateSize; featureName?: string; description?: string; upgradeHref: string; children: React.ReactNode;
}) {
  const desc = description ?? "Choose a plan to unlock advanced features, deeper insights, and powerful tools.";
  if (size === "small") {
    return <SmallGate variant="premium" featureName={featureName} description={desc} upgradeHref={upgradeHref} />;
  }
  return (
    <FullGate
      variant="premium"
      heading={`Unlock ${featureName ?? "premium features"} for your workspace`}
      description={desc}
      ctaLabel="Choose a plan"
      chips={["Unlimited access", "Priority support", "Advanced analytics"]}
      upgradeHref={upgradeHref}
    >
      {children}
    </FullGate>
  );
}

function UsageExceededContent({ size, featureName, description, upgradeHref, isSlot, usageData, children }: {
  size: GateSize; featureName?: string; description?: string; upgradeHref: string;
  isSlot: boolean; usageData?: { used: number; total: number }; children: React.ReactNode;
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
      heading={`Your ${featureName ?? (isSlot ? "slot" : "usage")} limit is reached`}
      description={desc}
      usageData={usageData}
      upgradeHref={upgradeHref}
    >
      {children}
    </FullGate>
  );
}

function FeatureLockedContent({ size, featureName, description, upgradeHref, availableOn, children }: {
  size: GateSize; featureName?: string; description?: string; upgradeHref: string;
  availableOn?: string[]; children: React.ReactNode;
}) {
  const plans = availableOn ?? ["Pro plan"];
  const desc = description ?? `${featureName ?? "This feature"} is not included in your current plan.`;
  if (size === "small") {
    return <SmallGate variant="locked" featureName={featureName} description={desc} upgradeHref={upgradeHref} />;
  }
  return (
    <FullGate
      variant="locked"
      heading={`${featureName ?? "This feature"} requires a higher plan`}
      description={desc}
      chips={plans}
      upgradeHref={upgradeHref}
    >
      {children}
    </FullGate>
  );
}

// ─── Inner gate wrappers ──────────────────────────────────────────────────────

function MetricPlanGate({ metric, size, featureName, description, upgradeHref, children }: {
  metric: UsageMetric; size: GateSize; featureName?: string; description?: string; upgradeHref: string; children: React.ReactNode;
}) {
  const { data, isLoading, statusFor } = useUsage();
  if (isLoading || !data) return <>{children}</>;
  if (!data.plan) return <NoPlanContent size={size} featureName={featureName} description={description} upgradeHref={upgradeHref}>{children}</NoPlanContent>;
  if (statusFor(metric) === "exceeded") {
    return (
      <UsageExceededContent size={size} featureName={featureName} description={description} upgradeHref={upgradeHref} isSlot={false}
        usageData={{ used: data.used[metric], total: data.limits[metric] }}>
        {children}
      </UsageExceededContent>
    );
  }
  return <>{children}</>;
}

function SlotPlanGate({ slot, size, featureName, description, upgradeHref, children }: {
  slot: SlotResource; size: GateSize; featureName?: string; description?: string; upgradeHref: string; children: React.ReactNode;
}) {
  const { isLoading, canAdd, data } = useSlot(slot);
  if (isLoading) return <>{children}</>;
  if (!data) return <NoPlanContent size={size} featureName={featureName} description={description} upgradeHref={upgradeHref}>{children}</NoPlanContent>;
  if (!canAdd) return <UsageExceededContent size={size} featureName={featureName} description={description} upgradeHref={upgradeHref} isSlot>{children}</UsageExceededContent>;
  return <>{children}</>;
}

function FeaturePlanGate({ feature, size, featureName, description, upgradeHref, children, availableOn }: {
  feature: string; size: GateSize; featureName?: string; description?: string; upgradeHref: string; children: React.ReactNode; availableOn?: string[];
}) {
  const { data, isLoading } = useUsage();
  const allowed = useFeature(feature);
  if (isLoading || !data) return <>{children}</>;
  if (!data.plan) return <NoPlanContent size={size} featureName={featureName} description={description} upgradeHref={upgradeHref}>{children}</NoPlanContent>;
  if (!allowed) return <FeatureLockedContent size={size} featureName={featureName} description={description} upgradeHref={upgradeHref} availableOn={availableOn}>{children}</FeatureLockedContent>;
  return <>{children}</>;
}

function NoPlanGateInner({ size, featureName, description, upgradeHref, children }: {
  size: GateSize; featureName?: string; description?: string; upgradeHref: string; children: React.ReactNode;
}) {
  const { data, isLoading } = useUsage();
  if (isLoading) return <>{children}</>;
  if (!data?.plan) return <NoPlanContent size={size} featureName={featureName} description={description} upgradeHref={upgradeHref}>{children}</NoPlanContent>;
  return <>{children}</>;
}

// ─── Public: PlanGate ─────────────────────────────────────────────────────────

export function PlanGate({
  mode,
  children,
  size = "full",
  featureName,
  description,
  upgradeHref = "/app/settings/billing",
  className,
  availableOn,
}: PlanGateProps) {
  const inner = (() => {
    if (mode.type === "no_plan") return <NoPlanGateInner size={size} featureName={featureName} description={description} upgradeHref={upgradeHref}>{children}</NoPlanGateInner>;
    if (mode.type === "metric") return <MetricPlanGate metric={mode.metric} size={size} featureName={featureName} description={description} upgradeHref={upgradeHref}>{children}</MetricPlanGate>;
    if (mode.type === "slot") return <SlotPlanGate slot={mode.slot} size={size} featureName={featureName} description={description} upgradeHref={upgradeHref}>{children}</SlotPlanGate>;
    if (mode.type === "feature") return <FeaturePlanGate feature={mode.feature} size={size} featureName={featureName} description={description} upgradeHref={upgradeHref} availableOn={availableOn}>{children}</FeaturePlanGate>;
    return <>{children}</>;
  })();

  return <div className={cn("w-full", className)}>{inner}</div>;
}

export { UpgradeBtn as UpgradeButton };
export type { GateSize, GateVariant, PlanGateProps };