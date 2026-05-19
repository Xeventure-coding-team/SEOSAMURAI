"use client";

import { usePageStore } from '@/store/usePageStore';
import { useEffect } from 'react';
import { useUsage, UsageMetric } from '@/lib/use-usage';
import { SlotResource, useSlot } from '@/lib/use-slot';
import { cn } from '@/lib/utils';
import { FileText, MessageSquare, CalendarClock, ScanLine, Image, Tags, Zap, MapPin, Globe } from 'lucide-react';
import { SubscriptionBadge } from '../subscription/SubscriptionBadge';

// ─── Monthly metrics ──────────────────────────────────────────────────────────

const METRIC_CONFIG: Record<UsageMetric, { label: string; icon: React.ElementType; description: string }> = {
    postsUsed: { label: "Posts", icon: FileText, description: "Published this month" },
    aiReviewRepliesUsed: { label: "AI replies", icon: MessageSquare, description: "AI-generated review replies" },
    scheduledPostsUsed: { label: "Scheduled posts", icon: CalendarClock, description: "Posts queued this month" },
    geoGridScansUsed: { label: "Geo scans", icon: ScanLine, description: "Grid scans run this month" },
    keywordTrackingUsed: { label: "Keywords", icon: Tags, description: "Keywords currently tracked" },
};

const METRICS = Object.keys(METRIC_CONFIG) as UsageMetric[];

// ─── Shared helpers ───────────────────────────────────────────────────────────

function getStatus(used: number, limit: number): "ok" | "warn" | "over" {
    const p = used / limit;
    return p >= 1 ? "over" : p >= 0.8 ? "warn" : "ok";
}

const STATUS = {
    ok: { icon: "bg-emerald-50 text-emerald-700", badge: "bg-emerald-50 text-emerald-800 border border-emerald-200", fill: "bg-emerald-500" },
    warn: { icon: "bg-amber-50 text-amber-700", badge: "bg-amber-50 text-amber-800 border border-amber-200", fill: "bg-amber-500" },
    over: { icon: "bg-red-50 text-red-700", badge: "bg-red-50 text-red-800 border border-red-200", fill: "bg-red-500" },
};

// ─── Shared card UI ───────────────────────────────────────────────────────────

function UsageCard({ label, icon: Icon, description, used, limit, lifetime = false }: {
    label: string; icon: React.ElementType; description: string;
    used: number; limit: number; lifetime?: boolean;
}) {
    const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
    const rem = Math.max(0, limit - used);
    const status = getStatus(used, limit);
    const st = STATUS[status];
    const badgeText = status === "over" ? "Limit reached" : status === "warn" ? "Almost full" : `${rem} left`;
    const remainText = status === "over" ? "No slots left" : `${rem} remaining`;

    return (
        <div className="flex flex-col gap-5 p-6 rounded-xl border bg-background">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                    <div className={cn("w-11 h-11 rounded-lg flex items-center justify-center shrink-0", st.icon)}>
                        <Icon className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[15px] font-medium">{label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {description}
                        </p>
                    </div>
                </div>
                <span className={cn("text-xs font-medium px-3 py-1 rounded-full shrink-0", st.badge)}>
                    {badgeText}
                </span>
            </div>
            <div className="flex flex-col gap-2.5">
                <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-medium tabular-nums">{used}</span>
                    <span className="text-sm text-muted-foreground">/ {limit}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all duration-700", st.fill)} style={{ width: `${pct}%` }} />
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{pct}% used</span>
                    <span className={cn("text-xs font-medium",
                        status === "over" ? "text-red-600" : status === "warn" ? "text-amber-600" : "text-emerald-700"
                    )}>{remainText}</span>
                </div>
            </div>
        </div>
    );
}

function CardSkeleton() {
    return (
        <div className="flex flex-col gap-4 p-5 rounded-xl border bg-background animate-pulse">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-muted" />
                    <div className="flex flex-col gap-1.5">
                        <div className="h-3.5 w-24 rounded bg-muted" />
                        <div className="h-3 w-32 rounded bg-muted" />
                    </div>
                </div>
                <div className="h-6 w-20 rounded-full bg-muted" />
            </div>
            <div className="flex flex-col gap-2">
                <div className="h-1.5 w-full rounded-full bg-muted" />
                <div className="flex justify-between">
                    <div className="h-3 w-12 rounded bg-muted" />
                    <div className="h-3 w-10 rounded bg-muted" />
                </div>
            </div>
        </div>
    );
}

// ─── Slot card (review posters) ───────────────────────────────────────────────

function SlotCard({ slot, label, description, icon }: {
    slot: SlotResource;
    label: string;
    description: string;
    icon: React.ElementType;
}) {
    const { data, isLoading } = useSlot(slot);

    if (isLoading || !data) return <CardSkeleton />;

    return (
        <UsageCard
            label={label}
            icon={icon}
            description={description}
            used={data.current}
            limit={data.limit}
            lifetime
        />
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UsagePage() {
    const setPageName = usePageStore((s) => s.setPageName);
    const { data, isLoading, error, refresh } = useUsage();

    useEffect(() => { setPageName('Usages'); }, []);

    const totalUsed = data ? METRICS.reduce((a, m) => a + data.used[m], 0) : 0;
    const topMetric = data ? METRICS.reduce((a, m) => (data.used[m] / data.limits[m] > data.used[a] / data.limits[a] ? m : a), METRICS[0]) : null;
    const topPct = topMetric && data ? Math.round((data.used[topMetric] / data.limits[topMetric]) * 100) : 0;

    const periodEnd = data ? new Date(data.periodEnd) : null;
    const daysLeft = periodEnd ? Math.ceil((periodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
    const resetDate = periodEnd ? periodEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

    return (
        <div className="flex flex-col items-center gap-8 p-6">
            <div className="w-full max-w-5xl">

                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-3xl font-semibold tracking-tight">Usage</h1>
                        {data && (
                            <p className="text-base text-muted-foreground">
                                Billing period · <span className="font-semibold text-foreground">
                                    {new Date(data.periodEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                                </span>
                                {data.periodStale && <span className="ml-1 text-amber-500 text-xs">(may have renewed)</span>}
                            </p>
                        )}
                    </div>
                    <SubscriptionBadge size="lg" />
                </div>

                {/* Summary strip */}
                <div className="grid grid-cols-3 gap-4 mt-8">
                    {[
                        { label: "Total used", value: isLoading ? "—" : String(totalUsed), sub: "actions across all metrics" },
                        {
                            label: "Most consumed",
                            value: isLoading
                                ? "—"
                                : topMetric
                                    ? METRIC_CONFIG[topMetric].label
                                    : "—",
                            sub: isLoading
                                ? "—"
                                : `${Number.isFinite(topPct) ? topPct : 0}% of limit used`,
                        },
                         { label: "Resets in", value: isLoading ? "—" : daysLeft !== null ? `${daysLeft} days` : "—", sub: isLoading ? "—" : resetDate },
                    ].map((s) => (
                        <div key={s.label} className="flex flex-col gap-1 p-5 rounded-xl bg-muted/50 border">
                            <span className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</span>
                            <span className="text-3xl font-medium mt-1">{s.value}</span>
                            <span className="text-sm text-muted-foreground">{s.sub}</span>
                        </div>
                    ))}
                </div>

                {/* Error */}
                {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 text-center mt-8">
                        Failed to load usage. <button onClick={() => refresh()} className="underline">Try again</button>
                    </div>
                )}

                {/* Grid — monthly metrics + lifetime slot */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                    {isLoading || !data
                        ? METRICS.map((m) => <CardSkeleton key={m} />)
                        : METRICS.map((m) => (
                            <UsageCard
                                key={m}
                                label={METRIC_CONFIG[m].label}
                                icon={METRIC_CONFIG[m].icon}
                                description={METRIC_CONFIG[m].description}
                                used={data.used[m]}
                                limit={data.limits[m]}
                            />
                        ))
                    }
                    {/* Lifetime slots */}
                    <SlotCard slot="locations" label="Locations" description="Business locations added" icon={MapPin} />
                    <SlotCard slot="websites" label="Websites" description="Websites connected" icon={Globe} />
                    <SlotCard slot="reviewPosters" label="Review Posters" description="Poster images created" icon={Image} />
                </div>

            </div>
        </div>
    );
}