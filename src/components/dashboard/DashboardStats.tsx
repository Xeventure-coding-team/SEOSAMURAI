"use client"

import { useMemo, useCallback } from "react"
import useSWR from "swr"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  TrendingUp, TrendingDown, AlertCircle, RefreshCw,
  CheckCircle2, XCircle, Clock, Search, Lightbulb,
  CalendarDays, BarChart3, ArrowUpRight, ArrowDownRight,
  Minus, FileText,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useUser } from "@stackframe/stack"
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

function rankBadgeStyle(rank: number | null) {
  if (!rank) return "bg-muted text-muted-foreground"
  if (rank <= 3) return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-800"
  if (rank <= 10) return "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:ring-amber-800"
  return "bg-muted text-muted-foreground ring-1 ring-border"
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
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2.5">
          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-sm font-semibold leading-none">{title}</p>
            {subtitle && (
              <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        {action}
      </div>

      {/* Content - NO horizontal padding here, children will handle it */}
      <div className="flex-1">{children}</div>

      {/* Footer */}
      {footer && (
        <div className="border-t border-border bg-muted/20 px-5 py-3">{footer}</div>
      )}
    </div>
  )
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-1.5 text-center">
      <Icon className="h-7 w-7 text-muted-foreground/30 mb-1" />
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      {description && <p className="text-xs text-muted-foreground/70 max-w-[200px] leading-relaxed">{description}</p>}
    </div>
  )
}

function RankChange({ value }: { value: number }) {
  if (value > 0) return (
    <span className="flex items-center gap-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
      <ArrowUpRight className="h-3 w-3" />{value}
    </span>
  )
  if (value < 0) return (
    <span className="flex items-center gap-0.5 text-[11px] font-semibold text-red-500">
      <ArrowDownRight className="h-3 w-3" />{Math.abs(value)}
    </span>
  )
  return <Minus className="h-3 w-3 text-muted-foreground" />
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
        <div className="rounded-xl border border-border bg-card p-8 flex flex-col items-center gap-4 max-w-sm w-full text-center shadow-sm">
          <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-destructive" />
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
    <div className="px-4 py-4 space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of your business performance</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden sm:block">
            Last updated: {formatLastUpdated(stats?.lastUpdated)}
          </span>
          <Button onClick={() => mutate()} disabled={isValidating} variant="outline" size="sm" className="h-8 text-xs">
            <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", isValidating && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── GMB Cards ── */}
      <GMBDashboardCards stats={gmbStats} isLoading={false} />

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
        {/* Left column */}
        <div className="xl:col-span-2 flex flex-col gap-4">
          {/* Keywords Section - STRETCHED BORDERS */}
          <SectionCard
            icon={Search}
            title="Tracked Keywords"
            subtitle={`${topPerformingKeywords.length} keywords · ${top3Count} in top 3 · ${top10Count} in top 10`}
          >
            {topPerformingKeywords.length === 0 ? (
              <EmptyState icon={Search} title="No keywords tracked yet" description="Add keywords to start monitoring your rankings" />
            ) : (
              <div>
                {/* Header row - with horizontal padding */}
                <div className="grid grid-cols-[1fr_60px_52px] gap-3 px-5 py-2.5 border-b border-border">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Keyword</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-center">Rank</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-center">Δ</p>
                </div>
                {/* List items - EACH ITEM HAS FULL-WIDTH BORDER (border-b on the item itself) */}
                <div>
                  {topPerformingKeywords.slice(0, 8).map((kw, i) => (
                    <div 
                      key={i} 
                      className="grid grid-cols-[1fr_60px_52px] gap-3 items-center px-5 py-2.5 border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{kw.keyword}</p>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{kw.location}</p>
                      </div>
                      <div className="flex justify-center">
                        {kw.rank ? (
                          <span className={cn("text-xs font-bold px-2 py-0.5 rounded-md tabular-nums", rankBadgeStyle(kw.rank))}>
                            #{kw.rank}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not ranked</span>
                        )}
                      </div>
                      <div className="flex justify-center">
                        <RankChange value={rankDelta(kw.rank, kw.previousRank)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>

          {/* Upcoming Posts Section - STRETCHED BORDERS */}
          <SectionCard icon={CalendarDays} title="Upcoming Posts" subtitle="Next 14 days">
            {!stats?.scheduledPosts?.upcoming?.length ? (
              <EmptyState icon={CalendarDays} title="No posts scheduled" description="Schedule posts to see them appear here" />
            ) : (
              <div>
                {stats.scheduledPosts.upcoming.slice(0, 5).map((post, idx) => (
                  <div 
                    key={post.id} 
                    className={cn(
                      "flex items-center justify-between px-5 py-2.5 gap-3",
                      idx !== stats.scheduledPosts.upcoming.slice(0, 5).length - 1 && "border-b border-border"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: post.viewColor || "#6366f1" }} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{post.summary}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {new Date(post.scheduledAt).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", year: "numeric",
                            hour: "numeric", minute: "2-digit", hour12: true,
                          })}
                        </p>
                      </div>
                    </div>
                    <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Recommendations - STRETCHED BORDERS */}
          <SectionCard icon={Lightbulb} title="Recommendations" subtitle="Quick wins to act on">
            {recommendations.length === 0 ? (
              <EmptyState icon={Lightbulb} title="No recommendations yet" description="Appears once rank movement data is available" />
            ) : (
              <div>
                {recommendations.slice(0, 5).map((r, idx) => {
                  const rank = r.rank as number
                  const isImproving = (r.delta ?? 0) > 0
                  return (
                    <div 
                      key={idx} 
                      className={cn(
                        "flex items-start gap-3 px-5 py-2.5",
                        idx !== recommendations.slice(0, 5).length - 1 && "border-b border-border"
                      )}
                    >
                      <div className={cn("h-6 w-6 rounded-md flex items-center justify-center shrink-0 mt-0.5", isImproving ? "bg-emerald-50 dark:bg-emerald-950/40" : "bg-red-50 dark:bg-red-950/40")}>
                        {isImproving
                          ? <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          : <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{r.keyword}</p>
                        <p className="text-[11px] text-muted-foreground">Rank #{rank} · {r.location}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </SectionCard>

          {/* Post Status - STRETCHED BORDERS */}
          <SectionCard
            icon={FileText}
            title="Post Status"
            subtitle="Scheduled content overview"
            footer={
              <div className="space-y-1.5">
                <div className="flex h-1.5 w-full rounded-full overflow-hidden gap-0.5">
                  {postTotal > 0 ? (
                    <>
                      <div className="bg-amber-400 h-full" style={{ width: `${((stats?.scheduledPosts?.pending ?? 0) / postTotal) * 100}%` }} />
                      <div className="bg-emerald-500 h-full" style={{ width: `${((stats?.scheduledPosts?.published ?? 0) / postTotal) * 100}%` }} />
                      <div className="bg-red-500 h-full" style={{ width: `${((stats?.scheduledPosts?.failed ?? 0) / postTotal) * 100}%` }} />
                    </>
                  ) : (
                    <div className="bg-muted w-full h-full rounded-full" />
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">{postTotal} total posts</p>
              </div>
            }
          >
            <div>
              {[
                { label: "Pending", value: stats?.scheduledPosts?.pending ?? 0, icon: Clock, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/40" },
                { label: "Published", value: stats?.scheduledPosts?.published ?? 0, icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
                { label: "Failed", value: stats?.scheduledPosts?.failed ?? 0, icon: XCircle, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/40" },
              ].map(({ label, value, icon: Icon, color, bg }, idx) => (
                <div 
                  key={label} 
                  className={cn(
                    "flex items-center justify-between px-5 py-2.5",
                    idx !== 2 && "border-b border-border"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={cn("h-6 w-6 rounded-md flex items-center justify-center", bg)}>
                      <Icon className={cn("h-3.5 w-3.5", color)} />
                    </div>
                    <span className="text-sm text-muted-foreground">{label}</span>
                  </div>
                  <span className="text-sm font-bold tabular-nums">{value}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Summary - STRETCHED BORDERS */}
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
                <div 
                  key={label} 
                  className={cn(
                    "flex items-center justify-between px-5 py-2.5",
                    idx !== 5 && "border-b border-border"
                  )}
                >
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="text-sm font-bold tabular-nums">{value}</span>
                </div>
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
    <div className="px-4 py-4 space-y-4">
      <div className="space-y-1">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
        <div className="xl:col-span-2 flex flex-col gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border bg-muted/30">
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="px-5 divide-y divide-border">
                {[...Array(i === 0 ? 6 : 3)].map((_, j) => (
                  <div key={j} className="py-3 flex items-center gap-3">
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-6 w-10 rounded-md" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border bg-muted/30">
                <Skeleton className="h-4 w-28" />
              </div>
              <div className="px-5 divide-y divide-border">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="py-2.5 flex items-center justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-6" />
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