"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Star, AlertCircle, Lock, ArrowRight, Check, Sparkles } from "lucide-react";
import { useUsage, UsageMetric, useFeature } from "@/lib/use-usage";
import { useSlot, SlotResource } from "@/lib/use-slot";
import { cn } from "@/lib/utils";
import Radar from './Radar';

// ─── Types ────────────────────────────────────────────────────────────────────

type PlanGateMode =
  | { type: "no_plan" }
  | { type: "metric"; metric: UsageMetric }
  | { type: "slot"; slot: SlotResource }
  | { type: "feature"; feature: string };

interface PlanGateProps {
  mode: PlanGateMode;
  children: React.ReactNode;
  featureName?: string;
  description?: string;
  upgradeHref?: string;
  className?: string;
}

// ─── Variants config ──────────────────────────────────────────────────────────

type GateVariant = "premium" | "limit" | "locked";

const variantConfig: Record<
  GateVariant,
  {
    badge: string;
    badgeClass: string;
    icon: React.FC<{ className?: string }>;
    headingColor: string;
    visualBg: string;
    ringColor: string;
    btnClass: string;
    iconBg: string;
    labelColor: string;
  }
> = {
  premium: {
    badge: "Premium Feature",
    badgeClass: "bg-primary/10 text-primary-dark",
    icon: ({ className }) => (
      <Star className={className} fill="currentColor" />
    ),
    headingColor: "text-primary",
    visualBg:
      "bg-gradient-to-br from-primary/10 to-[#E6F1FB] dark:from-[#26215C]/60 dark:to-[#042C53]/60",
    ringColor: "border-primary/15",
    btnClass:
      "bg-primary hover:bg-primary-dark shadow-[0_2px_8px_rgba(83,74,183,0.25)] hover:shadow-[0_4px_14px_rgba(83,74,183,0.3)]",
    iconBg: "bg-primary",
    labelColor: "text-primary dark:text-primary-light",
  },
  limit: {
    badge: "Limit Reached",
    badgeClass: "bg-[#FCEBEB] text-[#A32D2D] dark:bg-[#501313]/60 dark:text-[#F09595]",
    icon: ({ className }) => <AlertCircle className={className} />,
    headingColor: "text-[#A32D2D] dark:text-[#F09595]",
    visualBg:
      "bg-gradient-to-br from-[#FCEBEB] to-[#FAEEDA] dark:from-[#501313]/60 dark:to-[#412402]/60",
    ringColor: "border-[#A32D2D]/15",
    btnClass:
      "bg-[#A32D2D] hover:bg-[#791F1F] shadow-[0_2px_8px_rgba(163,45,45,0.2)]",
    iconBg: "bg-[#A32D2D]",
    labelColor: "text-[#A32D2D] dark:text-[#F09595]",
  },
  locked: {
    badge: "Not on your plan",
    badgeClass: "bg-[#FAEEDA] text-[#633806] dark:bg-[#412402]/60 dark:text-[#FAC775]",
    icon: ({ className }) => <Lock className={className} />,
    headingColor: "text-[#854F0B] dark:text-[#FAC775]",
    visualBg:
      "bg-gradient-to-br from-[#FAEEDA] to-[#EAF3DE] dark:from-[#412402]/60 dark:to-[#173404]/60",
    ringColor: "border-[#BA7517]/15",
    btnClass:
      "bg-[#BA7517] hover:bg-[#854F0B] shadow-[0_2px_8px_rgba(186,117,23,0.2)]",
    iconBg: "bg-[#BA7517]",
    labelColor: "text-[#854F0B] dark:text-[#FAC775]",
  },
};

// ─── Ring decoration ──────────────────────────────────────────────────────────

function VisualRings({ ringColor }: { ringColor: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {[120, 180, 260].map((size) => (
        <div
          key={size}
          className={cn("absolute rounded-full border", ringColor)}
          style={{ width: size, height: size }}
        />
      ))}
    </div>
  );
}

// ─── Gate Shell ───────────────────────────────────────────────────────────────

interface GateShellProps {
  variant: GateVariant;
  heading: React.ReactNode;
  description: string;
  cta: React.ReactNode;
  chips?: React.ReactNode;
  meta?: React.ReactNode;
  visualContent: React.ReactNode;
}

function GateShell({
  variant,
  heading,
  description,
  cta,
  chips,
  meta,
  visualContent,
}: GateShellProps) {
  const cfg = variantConfig[variant];

  return (
    <div className="w-full h-full overflow-hidden rounded-2xl border border-gray-200/80 dark:border-gray-800/80 bg-white dark:bg-gray-950 shadow-sm">
      <div className="grid grid-cols-2 sm:grid-cols-[1fr_280px] lg:grid-cols-[1fr_320px] min-h-[340px]">

        {/* Left: Content */}
        <div className="flex flex-col justify-center gap-5 p-8 sm:p-10">

          {/* Badge */}
          <span
            className={cn(
              "inline-flex items-center gap-1.5 w-fit rounded-full px-3 py-1 text-[11px] font-semibold tracking-widest uppercase",
              cfg.badgeClass
            )}
          >
            <cfg.icon className="h-3 w-3" />
            {cfg.badge}
          </span>

          {/* Heading */}
          <h3 className="font-serif text-[1.85rem] sm:text-[2rem] font-normal text-gray-900 dark:text-gray-50 leading-[1.2]">
            {heading}
          </h3>

          {/* Description */}
          <p className="text-sm sm:text-[15px] leading-relaxed text-gray-500 dark:text-gray-400 max-w-sm">
            {description}
          </p>

          {/* Meta (progress bar, plan chips, etc.) */}
          {meta && <div>{meta}</div>}

          {/* Feature chips */}
          {chips && <div className="flex flex-wrap gap-2">{chips}</div>}

          {/* CTA row */}
          <div className="flex items-center gap-3 flex-wrap mt-1">{cta}</div>
        </div>


        <div className="relative hidden sm:flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center">
              {[60, 100, 140, 180, 220, 260, 300].map((size, index) => (
                <div
                  key={size}
                  className="absolute rounded-full border border-blue-300/50 dark:border-blue-600/30 animate-ping"
                  style={{
                    width: size,
                    height: size,
                    animationDuration: `${3 + index * 0.5}s`,
                    animationDelay: `${index * 0.3}s`
                  }}
                />
              ))}
            </div>
            <div className="relative z-10 p-4 rounded-full bg-white dark:bg-gray-800 shadow-lg">
              <Sparkles className="h-10 w-10 text-blue-500 dark:text-blue-400" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Upgrade Button ───────────────────────────────────────────────────────────

export function UpgradeButton({
  variant = "upgrade",
  href = "/settings/billing",
  className,
  gateVariant = "premium",
}: {
  variant?: "no_plan" | "upgrade";
  href?: string;
  className?: string;
  gateVariant?: GateVariant;
}) {
  const router = useRouter();
  const label = variant === "no_plan" ? "Choose a plan" : "Upgrade plan";
  const cfg = variantConfig[gateVariant];

  return (
    <button
      onClick={() => router.push(href)}
      className={cn(
        "inline-flex items-center gap-2 font-semibold text-sm rounded-xl px-5 py-2.5 text-white",
        "transition-all duration-200 hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98]",
        cfg.btnClass,
        className
      )}
    >
      {label}
      <ArrowRight className="h-3.5 w-3.5 opacity-80" />
    </button>
  );
}

// ─── Chip helper ──────────────────────────────────────────────────────────────

function Chip({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium",
        muted
          ? "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
          : "bg-primary/10 text-primary-dark dark:bg-primary-dark/40 dark:text-primary-light"
      )}
    >
      {!muted && <Check className="h-3 w-3" />}
      {children}
    </span>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function UsageProgressBar({
  used,
  total,
  label,
}: {
  used: number;
  total: number;
  label: string;
}) {
  const pct = Math.min((used / total) * 100, 100);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
        <span className="text-xs font-semibold text-[#A32D2D] dark:text-[#F09595]">
          {used.toLocaleString()} / {total.toLocaleString()}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-[#E24B4A] dark:bg-[#F09595] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Visual icons ─────────────────────────────────────────────────────────────

function PremiumVisualIcon() {
  return (
    <div className="h-16 w-16 rounded-2xl bg-primary] flex items-center justify-center shadow-lg">
      <Star className="h-7 w-7 text-white" fill="white" />
    </div>
  );
}

function LimitVisualIcon() {
  return (
    <div className="h-16 w-16 rounded-2xl bg-[#A32D2D] flex items-center justify-center shadow-lg">
      <AlertCircle className="h-7 w-7 text-white" />
    </div>
  );
}

function LockedVisualIcon() {
  return (
    <div className="h-16 w-16 rounded-2xl bg-[#BA7517] flex items-center justify-center shadow-lg">
      <Lock className="h-7 w-7 text-white" />
    </div>
  );
}

// ─── Block variants ───────────────────────────────────────────────────────────

function NoPlanBlock({
  featureName,
  description,
  upgradeHref,
}: {
  featureName?: string;
  description?: string;
  upgradeHref: string;
}) {
  const router = useRouter();
  return (
    <div className="w-full max-w-6xl mx-auto min-h-screen flex items-center justify-center">
      <GateShell
        variant="premium"
        heading={
          <>
            Unlock{" "}
            <em className="not-italic text-primary dark:text-primary-light">
              {featureName ?? "premium features"}
            </em>{" "}
            for your workspace
          </>
        }
        description={
          description ??
          "Choose a plan to unlock advanced reporting, deeper insights, and powerful tools to grow your business."
        }
        chips={
          <>
            <Chip>Unlimited access</Chip>
            <Chip>Priority support</Chip>
            <Chip muted>+ more</Chip>
          </>
        }
        cta={
          <>
            <UpgradeButton variant="no_plan" href={upgradeHref} gateVariant="premium" />
          </>
        }
        visualContent={<PremiumVisualIcon />}
      />
    </div>
  );
}

function UsageExceededBlock({
  featureName,
  description,
  upgradeHref,
  isSlot,
  usageData,
}: {
  featureName?: string;
  description?: string;
  upgradeHref: string;
  isSlot: boolean;
  usageData?: { used: number; total: number; label: string };
}) {
  const heading = featureName
    ? `Your ${featureName} limit is reached`
    : isSlot
      ? "Slot limit reached"
      : "Usage limit reached";

  const defaultDesc = isSlot
    ? "You've hit the maximum slots on your current plan. Upgrade to add more."
    : "You've used all your quota this billing cycle. Upgrade to restore access immediately.";

  return (
    <div className="w-full max-w-6xl mx-auto min-h-screen flex items-center justify-center">
      <GateShell
        variant="limit"
        heading={
          <>
            Your{" "}
            <em className="not-italic text-[#A32D2D] dark:text-[#F09595]">
              {featureName ?? (isSlot ? "slot" : "usage")} limit
            </em>{" "}
            is reached
          </>
        }
        description={description ?? defaultDesc}
        meta={
          usageData ? (
            <UsageProgressBar
              used={usageData.used}
              total={usageData.total}
              label={usageData.label}
            />
          ) : null
        }
        cta={
          <>
            <UpgradeButton variant="upgrade" href={upgradeHref} gateVariant="limit" />
            <a
              href="#"
              className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              View usage →
            </a>
          </>
        }
        visualContent={<LimitVisualIcon />}
      />
    </div>
  );
}

function FeatureLockedBlock({
  featureName,
  description,
  upgradeHref,
  availableOn,
}: {
  featureName?: string;
  description?: string;
  upgradeHref: string;
  availableOn?: string[];
}) {
  const plans = availableOn ?? ["Pro plan", "Enterprise plan"];
  return (
    <div className="w-full max-w-6xl mx-auto min-h-screen flex items-center justify-center">
      <GateShell
        variant="locked"
        heading={
          <>
            <em className="not-italic text-[#854F0B] dark:text-[#FAC775]">
              {featureName ?? "This feature"}
            </em>{" "}
            requires a higher plan
          </>
        }
        description={
          description ??
          `${featureName ?? "This feature"} is not included in your current plan. Upgrade to unlock it.`
        }
        meta={
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>Available on</span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          </div>
        }
        chips={
          <>
            {plans.map((p) => (
              <Chip key={p} muted>
                <Check className="h-3 w-3" />
                {p}
              </Chip>
            ))}
          </>
        }
        cta={
          <>
            <UpgradeButton variant="upgrade" href={upgradeHref} gateVariant="locked" />
            <a
              href="#"
              className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              Learn more
            </a>
          </>
        }
        visualContent={<LockedVisualIcon />}
      />
    </div>
  );
}

// ─── Inner gates ──────────────────────────────────────────────────────────────

function MetricPlanGate({
  metric,
  featureName,
  description,
  upgradeHref,
  children,
}: {
  metric: UsageMetric;
  featureName?: string;
  description?: string;
  upgradeHref: string;
  children: React.ReactNode;
}) {
  const { data, isLoading, statusFor } = useUsage();

  if (isLoading || !data) return <>{children}</>;

  if (!data.plan) {
    return <NoPlanBlock featureName={featureName} description={description} upgradeHref={upgradeHref} />;
  }

  if (statusFor(metric) === "exceeded") {
    return (
      <UsageExceededBlock
        featureName={featureName}
        description={description}
        upgradeHref={upgradeHref}
        isSlot={false}
      />
    );
  }

  return <>{children}</>;
}

function SlotPlanGate({
  slot,
  featureName,
  description,
  upgradeHref,
  children,
}: {
  slot: SlotResource;
  featureName?: string;
  description?: string;
  upgradeHref: string;
  children: React.ReactNode;
}) {
  const { isLoading, canAdd, data } = useSlot(slot);

  if (isLoading) return <>{children}</>;

  if (!data) {
    return <NoPlanBlock featureName={featureName} description={description} upgradeHref={upgradeHref} />;
  }

  if (!canAdd) {
    return (
      <UsageExceededBlock
        featureName={featureName}
        description={description}
        upgradeHref={upgradeHref}
        isSlot
      />
    );
  }

  return <>{children}</>;
}

function FeaturePlanGate({
  feature,
  featureName,
  description,
  upgradeHref,
  children,
}: {
  feature: string;
  featureName?: string;
  description?: string;
  upgradeHref: string;
  children: React.ReactNode;
}) {
  const { data, isLoading } = useUsage();
  const allowed = useFeature(feature);

  if (isLoading || !data) return <>{children}</>;

  if (!data.plan) {
    return <NoPlanBlock featureName={featureName} description={description} upgradeHref={upgradeHref} />;
  }

  if (!allowed) {
    return (
      <FeatureLockedBlock
        featureName={featureName}
        description={description}
        upgradeHref={upgradeHref}
      />
    );
  }

  return <>{children}</>;
}

// ─── Public: PlanGate ─────────────────────────────────────────────────────────

export function PlanGate({
  mode,
  children,
  featureName,
  description,
  upgradeHref = "/settings/billing",
  className,
}: PlanGateProps) {
  const wrapper = (node: React.ReactNode) => (
    <div className={cn("w-full", className)}>{node}</div>
  );

  if (mode.type === "no_plan") {
    return wrapper(
      <NoPlanGate featureName={featureName} description={description} upgradeHref={upgradeHref}>
        {children}
      </NoPlanGate>
    );
  }

  if (mode.type === "metric") {
    return wrapper(
      <MetricPlanGate metric={mode.metric} featureName={featureName} description={description} upgradeHref={upgradeHref}>
        {children}
      </MetricPlanGate>
    );
  }

  if (mode.type === "slot") {
    return wrapper(
      <SlotPlanGate slot={mode.slot} featureName={featureName} description={description} upgradeHref={upgradeHref}>
        {children}
      </SlotPlanGate>
    );
  }

  if (mode.type === "feature") {
    return wrapper(
      <FeaturePlanGate feature={mode.feature} featureName={featureName} description={description} upgradeHref={upgradeHref}>
        {children}
      </FeaturePlanGate>
    );
  }

  return <>{children}</>;
}

// ─── No-plan gate ─────────────────────────────────────────────────────────────

function NoPlanGate({
  featureName,
  description,
  upgradeHref,
  className,
  children,
}: {
  featureName?: string;
  description?: string;
  upgradeHref: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { data, isLoading } = useUsage();

  if (isLoading) return <>{children}</>;

  return (
    <div className={cn("w-full", className)}>
      {data?.plan ? (
        children
      ) : (
        <NoPlanBlock featureName={featureName} description={description} upgradeHref={upgradeHref} />
      )}
    </div>
  );
}