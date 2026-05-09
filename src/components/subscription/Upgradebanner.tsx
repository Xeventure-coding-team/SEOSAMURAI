"use client";

import { useState, useEffect } from "react";
import { useUsage } from "@/lib/use-usage";
import { cn } from "@/lib/utils";
import { X, ArrowRight, Zap, AlertTriangle, Lock } from "lucide-react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type BannerVariant = "exceeded" | "warning" | "no-plan";

interface BannerConfig {
  variant:   BannerVariant;
  icon:      React.ElementType;
  heading:   string;
  body:      string;
  cta:       string;
  storageKey: string;
  wrapperClass: string;
  iconClass:    string;
  ctaClass:     string;
}

// ─── Banner variants ──────────────────────────────────────────────────────────

function getBannerConfig(
  variant: BannerVariant,
  metricLabel: string,
  plan: string | null
): BannerConfig {
  if (variant === "no-plan") {
    return {
      variant,
      icon:        Lock,
      heading:     "No active subscription",
      body:        "Unlock all features by choosing a plan that fits your workflow.",
      cta:         "View plans",
      storageKey:  "upgrade-banner-no-plan-dismissed",
      wrapperClass:"bg-zinc-900 border-zinc-700 text-white dark:bg-zinc-950 dark:border-zinc-800",
      iconClass:   "text-zinc-300",
      ctaClass:    "bg-white text-zinc-900 hover:bg-zinc-100",
    };
  }

  if (variant === "exceeded") {
    return {
      variant,
      icon:        Lock,
      heading:     `${metricLabel} limit reached`,
      body:        `You've hit your ${plan ?? "current"} plan limit. Upgrade to keep everything running.`,
      cta:         "Upgrade now",
      storageKey:  `upgrade-banner-exceeded-${plan}-dismissed`,
      wrapperClass:"bg-red-600 border-red-700 text-white dark:bg-red-700 dark:border-red-800",
      iconClass:   "text-red-200",
      ctaClass:    "bg-white text-red-600 hover:bg-red-50",
    };
  }

  // warning
  return {
    variant,
    icon:        AlertTriangle,
    heading:     `Approaching ${metricLabel} limit`,
    body:        "You're at 80%+ on one or more features. Upgrade before you hit the wall.",
    cta:         "Upgrade plan",
    storageKey:  `upgrade-banner-warning-${plan}-dismissed`,
    wrapperClass:"bg-amber-500 border-amber-600 text-white dark:bg-amber-600 dark:border-amber-700",
    iconClass:   "text-amber-100",
    ctaClass:    "bg-white text-amber-700 hover:bg-amber-50",
  };
}

// ─── Public component ─────────────────────────────────────────────────────────

interface UpgradeBannerProps {
  className?: string;
  /** Force a specific variant (useful for testing) */
  forceVariant?: BannerVariant;
}

export function UpgradeBanner({ className, forceVariant }: UpgradeBannerProps) {
  const { data, isLoading } = useUsage();
  const [dismissed, setDismissed] = useState(false);
  const [mounted,   setMounted]   = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (isLoading || !mounted) return null;

  // ── Determine which variant to show ──────────────────────────────────────

  let variant: BannerVariant | null = forceVariant ?? null;
  let worstMetric = "";

  if (!variant) {
    if (!data || !data.plan) {
      variant = "no-plan";
    } else {
      // Check all metrics — show worst case
      const metrics = Object.keys(data.used) as Array<keyof typeof data.used>;
      let hasExceeded = false;
      let hasWarning  = false;

      for (const m of metrics) {
        const pct = data.limits[m] > 0
          ? data.used[m] / data.limits[m]
          : 0;
        if (pct >= 1)   { hasExceeded = true; worstMetric = m; break; }
        if (pct >= 0.8) { hasWarning  = true; worstMetric = m; }
      }

      if (hasExceeded) variant = "exceeded";
      else if (hasWarning) variant = "warning";
    }
  }

  // Nothing to show
  if (!variant) return null;

  const metricLabels: Record<string, string> = {
    postsUsed:            "Posts",
    aiReviewRepliesUsed:  "AI Replies",
    scheduledPostsUsed:   "Scheduled Posts",
    geoGridScansUsed:     "Geo Scans",
    reviewPostersUsed:    "Review Posters",
    keywordTrackingUsed:  "Keywords",
  };

  const config = getBannerConfig(
    variant,
    metricLabels[worstMetric] ?? "Usage",
    data?.plan ?? null
  );

  // ── Check session dismissal ───────────────────────────────────────────────

  if (dismissed) return null;

  const sessionKey = `banner-dismissed-${config.storageKey}`;
  if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(sessionKey)) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(sessionKey, "1");
    }
  };

  const Icon = config.icon;

  return (
    <div
      role="alert"
      className={cn(
        "relative flex items-center gap-3 border px-4 py-3 text-sm",
        "animate-in slide-in-from-top-1 fade-in duration-300",
        config.wrapperClass,
        className
      )}
    >
      {/* Icon */}
      <Icon className={cn("h-4 w-4 shrink-0", config.iconClass)} aria-hidden />

      {/* Text */}
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="font-semibold">{config.heading}.</span>
        <span className="opacity-90">{config.body}</span>
      </div>

      {/* CTA */}
      <Link
        href="/settings/billing"
        className={cn(
          "shrink-0 inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
          config.ctaClass
        )}
      >
        {config.cta}
        <ArrowRight className="h-3 w-3" />
      </Link>

      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        aria-label="Dismiss banner"
        className="ml-1 shrink-0 rounded p-0.5 opacity-70 hover:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}