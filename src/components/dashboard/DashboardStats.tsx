"use client"

import { useMemo, useCallback } from "react"
import useSWR from "swr"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  TrendingUp, TrendingDown, AlertCircle, RefreshCw,
  CheckCircle2, XCircle, Clock, Search, Lightbulb,
  CalendarDays, BarChart3, ArrowUpRight, ArrowDownRight,
  Minus, FileText,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useUser } from "@hexclave/next"
import GMBDashboardCards from "./gmb-dashboard-card"

// ─── Types ────────────────────────────────────────────────────────────────────
interface KeywordEntry {
  keyword: string
  location: string
  locationId: string
  rank: number | null
  rankChange: string | null
  rankChangeValue: number
  lastChecked: string
  nextBatchUpdate: string | null
  isStale: boolean
  neverRanked: boolean
}

interface DashboardStats {
  overview: {
    totalLocations: number
    activeLocations: number
    totalKeywords: number
    keywordsWithRankData?: number
    rankDataStale?: boolean
    lastRankedAt?: string | null
  }
  keywords?: KeywordEntry[]
  scheduledPosts: {
    total: number
    pending: number
    published: number
    failed: number
    upcoming: Array<{
      id: string
      summary: string
      scheduledAt: string
      locationId?: string
      viewColor: string
    }>
    nextPost?: { summary: string; scheduledAt: string } | null
  }
  rankings: {
    topKeywords?: any[]
    improvedKeywords?: any[]
    recentRankings?: Array<{
      keyword: string
      rank: number | null
      previousRank: number | null
      rankChange: string
      rankChangeValue: number
      location: string
      createdAt: string
      url?: string | null
    }>
    topPerformingKeywords?: Array<{
      keyword: string
      rank: number
      location: string
      url: string | null
      previousRank?: number | null
    }>
    inTopTen?: number
    improved?: number
  }
  gmb?: {
    connected: boolean
    accountName: string | null
    tokenValid: boolean
    tokenDaysLeft: number | null
    tokenExpiry: string | null
  }
  progress?: {
    totalPoints: number
    currentLevel: number
    tasksCompleted: number
    locationsCount: number
  }
  lastUpdated: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function rankDelta(current?: number | null, previous?: number | null) {
  if (!current || !previous) return 0
  return previous - current
}

function formatLastUpdated(iso?: string) {
  if (!iso) return "N/A"
  try { return new Date(iso).toLocaleString() } catch { return "N/A" }
}

function deriveRankingData(stats: DashboardStats | undefined) {
  if (!stats) return { topPerformingKeywords: [], recentRankings: [] }
  const keywords: KeywordEntry[] = stats.keywords ?? []
  const ranked = keywords
    .filter((k) => k.rank !== null)
    .sort((a, b) => (a.rank as number) - (b.rank as number))
    .map((k) => ({ keyword: k.keyword, rank: k.rank as number, location: k.location, url: null, previousRank: null }))
  const trackedKeywords = ranked.length > 0
    ? ranked
    : keywords.map((k) => ({ keyword: k.keyword, rank: null as unknown as number, location: k.location, url: null, previousRank: null }))
  const recentRankings = keywords
    .filter((k) => k.rank !== null && k.rankChange !== null)
    .map((k) => ({
      keyword: k.keyword, rank: k.rank, previousRank: null,
      rankChange: k.rankChange ?? "UNCHANGED", rankChangeValue: k.rankChangeValue,
      location: k.location, createdAt: k.lastChecked, url: null,
    }))
  return { topPerformingKeywords: trackedKeywords, recentRankings }
}

function rankBadgeVariant(rank: number | null): { className: string; label: string } {
  if (!rank) return { className: "text-muted-foreground bg-muted border-transparent", label: "—" }
  if (rank <= 3) return {
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800",
    label: `#${rank}`,
  }
  if (rank <= 10) return {
    className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800",
    label: `#${rank}`,
  }
  return { className: "bg-muted text-muted-foreground border-border", label: `#${rank}` }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon,
  title,
  subtitle,
  children,
  footer,
  action,
}: {
  icon: React.ElementType
  title: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center shrink-0">
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">{title}</p>
            {subtitle && (
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-none">{subtitle}</p>
            )}
          </div>
        </div>
        {action}
      </div>
      <div className="flex-1">{children}</div>
      {footer && (
        <div className="border-t border-border bg-muted/30 px-4 py-3">{footer}</div>
      )}
    </div>
  )
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType
  title: string
  description?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-2 text-center px-6">
      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-1">
        <Icon className="h-4.5 w-4.5 text-muted-foreground/50" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground/60 max-w-[180px] leading-relaxed">{description}</p>
      )}
    </div>
  )
}

function RankChange({ value }: { value: number }) {
  if (value > 0)
    return (
      <Badge variant="outline" className="gap-0.5 text-[10px] font-semibold text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 px-1.5 py-0.5">
        <ArrowUpRight className="h-2.5 w-2.5" />
        {value}
      </Badge>
    )
  if (value < 0)
    return (
      <Badge variant="outline" className="gap-0.5 text-[10px] font-semibold text-red-500 border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-800 px-1.5 py-0.5">
        <ArrowDownRight className="h-2.5 w-2.5" />
        {Math.abs(value)}
      </Badge>
    )
  return <Minus className="h-3.5 w-3.5 text-muted-foreground/40" />
}

function TableRow({
  children,
  isLast = false,
}: {
  children: React.ReactNode
  isLast?: boolean
}) {
  return (
    <div className={cn("flex items-center px-4 py-2.5 hover:bg-muted/40 transition-colors", !isLast && "border-b border-border")}>
      {children}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DashboardStats() {
  const user = useUser()

  const fetcher = useCallback(async ([url, uid]: [string, string]) => {
    const res = await fetch(url, { headers: { "x-user-id": uid } })
    if (!res.ok) throw new Error("Failed to load statistics")
    return (await res.json()) as DashboardStats
  }, [])

  const { data: stats, error, isLoading, mutate, isValidating } = useSWR(
    user?.id ? ["/api/dashboard/stats", user.id] : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  const { topPerformingKeywords, recentRankings } = useMemo(() => {
    const derived = deriveRankingData(stats)
    const top = stats?.rankings?.topPerformingKeywords?.length
      ? stats.rankings.topPerformingKeywords : derived.topPerformingKeywords
    const recent = stats?.rankings?.recentRankings?.length
      ? stats.rankings.recentRankings : derived.recentRankings
    return { topPerformingKeywords: top, recentRankings: recent }
  }, [stats])

  const recommendations = useMemo(() => {
    if (!recentRankings.length) return []
    return recentRankings
      .filter((r) => typeof r.rank === "number" && r.rank !== null)
      .map((r) => ({ ...r, delta: rankDelta(r.rank, r.previousRank) }))
      .filter((r) => {
        const rank = r.rank as number
        return (rank > 10 && rank <= 20) || r.delta >= 3 || (r.delta <= -3 && rank <= 20)
      })
      .slice(0, 10)
  }, [recentRankings])

  const gmbStats = {
    overview: stats?.overview || { totalLocations: 0, activeLocations: 0, totalKeywords: 0, keywordsWithRankData: 0, rankDataStale: false, lastRankedAt: null },
    gmb: stats?.gmb || { connected: false, accountName: null, tokenValid: false, tokenDaysLeft: null, tokenExpiry: null },
    rankings: { inTopTen: stats?.rankings?.inTopTen || 0, improved: stats?.rankings?.improved || 0 },
    scheduledPosts: {
      pending: stats?.scheduledPosts?.pending || 0,
      total: stats?.scheduledPosts?.total || 0,
      failed: stats?.scheduledPosts?.failed || 0,
      nextPost: stats?.scheduledPosts?.nextPost || null,
      upcoming: stats?.scheduledPosts?.upcoming || [],
    },
    progress: {
      totalPoints: stats?.progress?.totalPoints ?? 0,
      currentLevel: stats?.progress?.currentLevel ?? 1,
      tasksCompleted: stats?.progress?.tasksCompleted ?? 0,
      locationsCount: stats?.progress?.locationsCount ?? 0,
    },
  }

  const postTotal = (stats?.scheduledPosts?.pending ?? 0) + (stats?.scheduledPosts?.published ?? 0) + (stats?.scheduledPosts?.failed ?? 0)
  const top3Count = topPerformingKeywords.filter(k => k.rank && k.rank <= 3).length
  const top10Count = topPerformingKeywords.filter(k => k.rank && k.rank <= 10).length

  if (isLoading) return <DashboardSkeleton />

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="rounded-lg border border-border bg-card p-8 flex flex-col items-center gap-4 max-w-sm w-full text-center shadow-sm">
          <div className="h-11 w-11 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="text-sm font-semibold mb-1">Failed to load dashboard</p>
            <p className="text-xs text-muted-foreground">
              {error instanceof Error ? error.message : "Unable to load dashboard statistics"}
            </p>
          </div>
          <Button onClick={() => mutate()} variant="outline" size="sm">Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-5 space-y-5 max-w-screen-5xl">

      {/* ── Header ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Overview of your business performance</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:block">
            Updated {formatLastUpdated(stats?.lastUpdated)}
          </span>
          <Button
            onClick={() => mutate()}
            disabled={isValidating}
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isValidating && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── GMB Cards ── */}
      <GMBDashboardCards stats={gmbStats} isLoading={false} />

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">

        {/* ── Left column ── */}
        <div className="xl:col-span-2 flex flex-col gap-4">

          {/* Keywords */}
          <SectionCard
            icon={Search}
            title="Tracked Keywords"
            subtitle={`${topPerformingKeywords.length} keywords · ${top3Count} top 3 · ${top10Count} top 10`}
          >
            {topPerformingKeywords.length === 0 ? (
              <EmptyState
                icon={Search}
                title="No keywords tracked yet"
                description="Add keywords to start monitoring your rankings"
              />
            ) : (
              <div>
                {/* Column headers */}
                <div className="grid grid-cols-[1fr_64px_52px] items-center px-4 py-2 border-b border-border bg-muted/30">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Keyword</span>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground text-center">Rank</span>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground text-center">Δ</span>
                </div>
                {topPerformingKeywords.slice(0, 8).map((kw, i) => {
                  const badge = rankBadgeVariant(kw.rank)
                  return (
                    <TableRow key={i} isLast={i === Math.min(topPerformingKeywords.length, 8) - 1}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate leading-tight">{kw.keyword}</p>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{kw.location}</p>
                      </div>
                      <div className="w-16 flex justify-center">
                        <Badge
                          variant="outline"
                          className={cn("text-xs font-bold tabular-nums px-2 py-0.5", badge.className)}
                        >
                          {badge.label}
                        </Badge>
                      </div>
                      <div className="w-13 flex justify-center">
                        <RankChange value={rankDelta(kw.rank, kw.previousRank)} />
                      </div>
                    </TableRow>
                  )
                })}
              </div>
            )}
          </SectionCard>

          {/* Upcoming Posts */}
          <SectionCard icon={CalendarDays} title="Upcoming Posts" subtitle="Next 14 days">
            {!stats?.scheduledPosts?.upcoming?.length ? (
              <EmptyState
                icon={CalendarDays}
                title="No posts scheduled"
                description="Schedule posts to see them appear here"
              />
            ) : (
              <div>
                {stats.scheduledPosts.upcoming.slice(0, 5).map((post, idx) => (
                  <TableRow
                    key={post.id}
                    isLast={idx === Math.min(stats.scheduledPosts.upcoming.length, 5) - 1}
                  >
                    <div
                      className="h-2 w-2 rounded-full shrink-0 mr-3"
                      style={{ backgroundColor: post.viewColor || "#6366f1" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate leading-tight">{post.summary}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {new Date(post.scheduledAt).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric",
                          hour: "numeric", minute: "2-digit", hour12: true,
                        })}
                      </p>
                    </div>
                    <Clock className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 ml-2" />
                  </TableRow>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* ── Right column ── */}
        <div className="flex flex-col gap-4">

          {/* Recommendations */}
          <SectionCard icon={Lightbulb} title="Recommendations" subtitle="Quick wins to act on">
            {recommendations.length === 0 ? (
              <EmptyState
                icon={Lightbulb}
                title="No recommendations yet"
                description="Appears once rank movement data is available"
              />
            ) : (
              <div>
                {recommendations.slice(0, 5).map((r, idx) => {
                  const rank = r.rank as number
                  const isImproving = (r.delta ?? 0) > 0
                  return (
                    <TableRow key={idx} isLast={idx === Math.min(recommendations.length, 5) - 1}>
                      <div
                        className={cn(
                          "h-7 w-7 rounded-md flex items-center justify-center shrink-0 mr-3",
                          isImproving
                            ? "bg-emerald-50 dark:bg-emerald-950/40"
                            : "bg-red-50 dark:bg-red-950/40"
                        )}
                      >
                        {isImproving
                          ? <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          : <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                        }
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate leading-tight">{r.keyword}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Rank #{rank} · {r.location}</p>
                      </div>
                    </TableRow>
                  )
                })}
              </div>
            )}
          </SectionCard>

          {/* Post Status */}
          <SectionCard
            icon={FileText}
            title="Post Status"
            subtitle="Scheduled content overview"
            footer={
              <div className="space-y-1.5">
                <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-muted gap-px">
                  {postTotal > 0 ? (
                    <>
                      <div
                        className="bg-amber-400 h-full rounded-l-full transition-all"
                        style={{ width: `${((stats?.scheduledPosts?.pending ?? 0) / postTotal) * 100}%` }}
                      />
                      <div
                        className="bg-emerald-500 h-full transition-all"
                        style={{ width: `${((stats?.scheduledPosts?.published ?? 0) / postTotal) * 100}%` }}
                      />
                      <div
                        className="bg-red-500 h-full rounded-r-full transition-all"
                        style={{ width: `${((stats?.scheduledPosts?.failed ?? 0) / postTotal) * 100}%` }}
                      />
                    </>
                  ) : null}
                </div>
                <p className="text-[11px] text-muted-foreground">{postTotal} total posts</p>
              </div>
            }
          >
            <div>
              {[
                {
                  label: "Pending",
                  value: stats?.scheduledPosts?.pending ?? 0,
                  icon: Clock,
                  iconClass: "text-amber-500",
                  bgClass: "bg-amber-50 dark:bg-amber-950/40",
                },
                {
                  label: "Published",
                  value: stats?.scheduledPosts?.published ?? 0,
                  icon: CheckCircle2,
                  iconClass: "text-emerald-600 dark:text-emerald-400",
                  bgClass: "bg-emerald-50 dark:bg-emerald-950/40",
                },
                {
                  label: "Failed",
                  value: stats?.scheduledPosts?.failed ?? 0,
                  icon: XCircle,
                  iconClass: "text-red-500",
                  bgClass: "bg-red-50 dark:bg-red-950/40",
                },
              ].map(({ label, value, icon: Icon, iconClass, bgClass }, idx) => (
                <TableRow key={label} isLast={idx === 2}>
                  <div className={cn("h-7 w-7 rounded-md flex items-center justify-center shrink-0 mr-3", bgClass)}>
                    <Icon className={cn("h-3.5 w-3.5", iconClass)} />
                  </div>
                  <span className="text-sm text-muted-foreground flex-1">{label}</span>
                  <span className="text-sm font-semibold tabular-nums">{value}</span>
                </TableRow>
              ))}
            </div>
          </SectionCard>

          {/* Summary */}
          <SectionCard icon={BarChart3} title="Summary" subtitle="At a glance">
            <div>
              {[
                { label: "Keywords tracked", value: topPerformingKeywords.length },
                { label: "In top 3", value: top3Count },
                { label: "In top 10", value: top10Count },
                { label: "Active locations", value: stats?.overview?.activeLocations ?? 0 },
                { label: "Total locations", value: stats?.overview?.totalLocations ?? 0 },
                { label: "Scheduled posts", value: stats?.scheduledPosts?.total ?? 0 },
              ].map(({ label, value }, idx) => (
                <TableRow key={label} isLast={idx === 5}>
                  <span className="text-sm text-muted-foreground flex-1">{label}</span>
                  <span className="text-sm font-semibold tabular-nums">{value}</span>
                </TableRow>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="px-4 py-5 space-y-5 max-w-screen-4xl mx-auto">
      {/* Header */}
      <div className="space-y-1.5">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-52" />
      </div>

      {/* Top cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-7 rounded-md" />
            </div>
            <Skeleton className="h-6 w-14" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
        <div className="xl:col-span-2 flex flex-col gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <Skeleton className="h-7 w-7 rounded-md" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="divide-y divide-border">
                {[...Array(i === 0 ? 6 : 4)].map((_, j) => (
                  <div key={j} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-5 w-10 rounded-md" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <Skeleton className="h-7 w-7 rounded-md" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="divide-y divide-border">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="flex items-center justify-between px-4 py-2.5">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-8" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}