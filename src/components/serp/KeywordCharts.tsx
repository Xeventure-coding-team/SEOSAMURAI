"use client"

import { useMemo } from "react"
import { TrendingUp, TrendingDown, Minus, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { PieChart, Pie, Cell } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rankColor(rank) {
    if (!rank) return "#d4d4d8"
    if (rank === 1) return "#10b981"
    if (rank <= 3) return "#3b82f6"
    if (rank <= 10) return "#f59e0b"
    return "#d4d4d8"
}

function rankBadgeClass(rank) {
    if (!rank) return "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
    if (rank === 1) return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
    if (rank <= 3) return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800"
    if (rank <= 10) return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800"
    return "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
}

const MOVEMENT_CONFIG = {
    UP: { label: "Improved", color: "#10b981", Icon: TrendingUp },
    DOWN: { label: "Dropped", color: "#ef4444", Icon: TrendingDown },
    SAME: { label: "Unchanged", color: "#a1a1aa", Icon: Minus },
    NEW: { label: "New", color: "#3b82f6", Icon: Sparkles },
}

const chartConfig = {
    improved: { label: "Improved", color: "#10b981" },
    dropped: { label: "Dropped", color: "#ef4444" },
    unchanged: { label: "Unchanged", color: "#a1a1aa" },
    new: { label: "New", color: "#3b82f6" },
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function RankRow({ keyword, rank, pct }) {
    return (
        <div className="flex items-center gap-4 py-3 group">
            <span className="w-48 shrink-0 truncate text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                {keyword}
            </span>
            <div className="relative flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: rankColor(rank) }}
                />
            </div>
            <span
                className={cn(
                    "shrink-0 inline-flex items-center justify-center rounded-full border px-3 py-0.5 text-xs font-semibold tabular-nums min-w-[3rem]",
                    rankBadgeClass(rank)
                )}
            >
                #{rank}
            </span>
        </div>
    )
}

function MovementRow({ label, value, pct, color, Icon }) {
    return (
        <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
                <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                    style={{ background: `${color}18` }}
                >
                    <Icon className="h-3.5 w-3.5" style={{ color }} />
                </div>
                <span className="text-sm text-foreground">{label}</span>
            </div>
            <div className="flex items-center gap-3">
                <span className="text-lg font-semibold tabular-nums text-foreground leading-none">
                    {value}
                </span>
                <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                    {pct}%
                </span>
            </div>
        </div>
    )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function KeywordCharts({ keywords = [], metadata = {}, isLoading = false }) {
    const derived = useMemo(() => {
        const counts = { UP: 0, DOWN: 0, SAME: 0, NEW: 0 }
        keywords.forEach((k) => {
            if (k.rankChange && k.rankChange in counts) counts[k.rankChange]++
        })

        const barData = keywords
            .filter((k) => k.currentRank != null)
            .sort((a, b) => a.currentRank - b.currentRank)
            .slice(0, 10)
            .map((k) => ({
                keyword: k.keyword.length > 32 ? k.keyword.slice(0, 32) + "…" : k.keyword,
                rank: k.currentRank,
                pct: Math.round(((21 - Math.min(k.currentRank, 20)) / 20) * 100),
            }))

        const total = Math.max(keywords.length, 1)

        // If all keywords fall into one bucket the donut renders a single arc
        // that looks like a broken grey ring. Always keep all 4 slices so the
        // chart structure is clear — zero-value slices just disappear naturally.
        const pieData = [
            { name: "improved", value: counts.UP || 0, fill: "#10b981" },
            { name: "dropped", value: counts.DOWN || 0, fill: "#ef4444" },
            { name: "unchanged", value: counts.SAME || 0, fill: "#a1a1aa" },
            { name: "new", value: counts.NEW || 0, fill: "#3b82f6" },
        ]

        // Fallback for "all unchanged" — give SAME a proper color and keep rest 0
        const allSame = pieData.every((d, i) => i === 2 ? true : d.value === 0)

        const health = Math.round(((counts.UP + counts.SAME) / total) * 100)
        const upPct = Math.round((counts.UP / total) * 100)
        const samePct = Math.round((counts.SAME / total) * 100)
        const downPct = Math.round((counts.DOWN / total) * 100)

        return { barData, counts, pieData, allSame, health, upPct, samePct, downPct, total }
    }, [keywords])

    const { barData, counts, pieData, allSame, health, upPct, samePct, downPct, total } = derived

    const hasRanked = barData.length > 0
    const hasChanges = Object.values(counts).some(Boolean)

    const healthLabel = health >= 70 ? "Good" : health >= 40 ? "Average" : "Poor"
    const healthColor =
        health >= 70 ? "text-emerald-600 dark:text-emerald-400" :
            health >= 40 ? "text-amber-600 dark:text-amber-400" :
                "text-red-500"

    return (
        <div className="space-y-4">

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">
                        Keyword Performance
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {metadata.ranked ?? 0} of {metadata.total ?? 0} keywords ranked
                    </p>
                </div>
                {metadata.averageRank > 0 && (
                    <div className="text-right">
                        <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">
                            Avg. Rank
                        </p>
                        <p className="text-4xl font-bold tabular-nums leading-none text-foreground mt-1">
                            #{metadata.averageRank}
                        </p>
                    </div>
                )}
            </div>

            {/* Grid — items-start so cards don't stretch to equal height */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">

                {/* ── Left: Current rankings ── */}
                <Card className="shadow-none border-border/60">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-semibold text-foreground">
                                Current rankings
                            </CardTitle>
                            <div className="flex items-center gap-3">
                                {[
                                    { label: "#1", color: "#10b981" },
                                    { label: "2–3", color: "#3b82f6" },
                                    { label: "4–10", color: "#f59e0b" },
                                    { label: "11+", color: "#d4d4d8" },
                                ].map(({ label, color }) => (
                                    <span key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <span className="h-2 w-2 rounded-sm shrink-0" style={{ background: color }} />
                                        {label}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </CardHeader>

                    {/* pb-5 only — no forced min-height, card hugs content */}
                    <CardContent className="pt-0">
                        {isLoading ? (
                            <div className="space-y-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="flex items-center gap-4 py-3">
                                        <div className="h-4 w-48 rounded animate-pulse bg-muted" />
                                        <div className="h-2 flex-1 rounded-full animate-pulse bg-muted" />
                                        <div className="h-6 w-12 rounded-full animate-pulse bg-muted" />
                                    </div>
                                ))}
                            </div>
                        ) : !hasRanked ? (
                            <div className="py-8 text-center">
                                <p className="text-sm font-medium text-foreground">No ranking data yet</p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Run a batch update to see positions.
                                </p>
                            </div>
                        ) : (
                            /* divide-y naturally sizes the card to exactly fit the rows */
                            <div className="divide-y divide-border/50">
                                {barData.map((item, i) => (
                                    <RankRow key={i} {...item} />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ── Right: Movement ── */}
                <Card className="shadow-none border-border/60">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold text-foreground">
                            Movement
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="pt-0 space-y-5">
                        {isLoading ? (
                            <div className="flex gap-8">
                                <div className="h-44 w-44 rounded-full animate-pulse bg-muted shrink-0" />
                                <div className="flex-1 space-y-1 pt-1">
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <div key={i} className="flex justify-between py-3">
                                            <div className="h-4 w-24 rounded animate-pulse bg-muted" />
                                            <div className="h-4 w-12 rounded animate-pulse bg-muted" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : !hasChanges ? (
                            <div className="py-8 text-center">
                                <p className="text-sm font-medium text-foreground">No movement data</p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Run an initial check to start tracking.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-8">

                                    {/* Donut — fixed 176px, content-independent */}
                                    <div className="relative shrink-0" style={{ height: 176, width: 176 }}>
                                        <ChartContainer config={chartConfig} className="h-full w-full">
                                            <PieChart>
                                                <Pie
                                                    data={pieData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={52}
                                                    outerRadius={76}
                                                    dataKey="value"
                                                    strokeWidth={3}
                                                    stroke="hsl(var(--card))"
                                                    isAnimationActive
                                                    animationBegin={0}
                                                    animationDuration={500}
                                                    animationEasing="ease-out"
                                                    // When all are SAME/one colour, paddingAngle adds
                                                    // visible gaps so it's clear it's a real chart
                                                    paddingAngle={pieData.filter(d => d.value > 0).length > 1 ? 2 : 0}
                                                >
                                                    {pieData.map((entry, i) => (
                                                        <Cell key={i} fill={entry.fill} />
                                                    ))}
                                                </Pie>
                                                <ChartTooltip
                                                    content={
                                                        <ChartTooltipContent
                                                            formatter={(value, name) => [
                                                                `${value} keyword${value !== 1 ? "s" : ""}`,
                                                                chartConfig[name]?.label ?? name,
                                                            ]}
                                                        />
                                                    }
                                                />
                                            </PieChart>
                                        </ChartContainer>
                                        {/* Center label */}
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                            <span className="text-3xl font-bold tabular-nums text-foreground leading-none">
                                                {total}
                                            </span>
                                            <span className="text-xs text-muted-foreground mt-1">keywords</span>
                                        </div>
                                    </div>

                                    {/* Movement rows — divide-y hugs to content height */}
                                    <div className="flex-1 divide-y divide-border/50">
                                        {Object.entries(MOVEMENT_CONFIG).map(([key, cfg]) => {
                                            const val = counts[key]
                                            const pct = Math.round((val / Math.max(total, 1)) * 100)
                                            return (
                                                <MovementRow
                                                    key={key}
                                                    label={cfg.label}
                                                    value={val}
                                                    pct={pct}
                                                    color={cfg.color}
                                                    Icon={cfg.Icon}
                                                />
                                            )
                                        })}
                                    </div>
                                </div>

                                <Separator className="opacity-40" />

                                
                                {/* Portfolio health */}
                                <div className="space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">Portfolio health</span>
                                        <span className={cn("text-sm font-semibold", healthColor)}>
                                            {health}% · {healthLabel}
                                        </span>
                                    </div>
                                    <div className="flex h-2 w-full overflow-hidden rounded-full bg-secondary">
                                        <div className="h-full bg-muted-foreground/60 transition-all duration-700" style={{ width: `${upPct}%` }} />
                                        <div className="h-full bg-muted-foreground/30 transition-all duration-700" style={{ width: `${samePct}%` }} />
                                        <div className="h-full bg-muted-foreground/10 transition-all duration-700" style={{ width: `${downPct}%` }} />
                                    </div>
                                    <div className="flex gap-5">
                                        {[
                                            { label: "Improved" },
                                            { label: "Stable" },
                                            { label: "Dropped" },
                                        ].map(({ label }) => (
                                            <span key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <span className="h-2 w-2 rounded-full shrink-0 bg-muted-foreground/60" />
                                                {label}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                            </>
                        )}
                    </CardContent>
                </Card>

            </div>
        </div>
    )
}