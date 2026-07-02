"use client"

import { useMemo, useCallback, useState } from "react"
import useSWR from "swr"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  TrendingUp, TrendingDown, AlertCircle, RefreshCw,
  CheckCircle2, XCircle, Clock, Search, Lightbulb,
  CalendarDays, ArrowUpRight, ArrowDownRight, BarChart3,
  Mail, MessageCircle, ArrowRight, Circle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useUser } from "@hexclave/next"
import Link from "next/link"
import GMBDashboardCards from "./gmb-dashboard-card"

const SUPPORT_EMAIL = "info@rankerly.app"
const SUPPORT_URL = "http://localhost:3000/app/contact-support"

function timeOfDayGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

// ─── Welcome / support card ────────────────────────────────────────────────────
function WelcomeCard({ name }: { name: string }) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="px-4 py-4 border-b border-border">
        <p className="text-base font-semibold leading-none">
          {timeOfDayGreeting()}, {name}
        </p>
        <p className="text-sm text-muted-foreground mt-1.5 leading-snug">
          Here's how your business is showing up today
        </p>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Need a hand with anything on Rankerly? We're happy to help.
        </p>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="flex items-center gap-2.5 rounded-md border border-border bg-muted/20 px-3 py-2.5 hover:bg-muted/40 transition-colors"
        >
          <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium truncate">{SUPPORT_EMAIL}</span>
        </a>
        <Link
          href={SUPPORT_URL}
          className="flex items-center gap-2.5 rounded-md border border-border bg-muted/20 px-3 py-2.5 hover:bg-muted/40 transition-colors"
        >
          <MessageCircle className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium flex-1">Contact support</span>
          <ArrowRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
        </Link>
      </div>
    </div>
  )
}

// ─── Getting started checklist — gives the sidebar real weight instead of ── //
// ─── floating a single small card above a wall of empty space ───────────── //
interface ChecklistTask {
  label: string
  done: boolean
  href: string
}

function GettingStartedCard({ tasks }: { tasks: ChecklistTask[] }) {
  const doneCount = tasks.filter((t) => t.done).length
  const allDone = doneCount === tasks.length

  if (allDone) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20 px-4 py-3.5 flex items-center gap-2.5">
        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">All set up — nice work</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="px-4 py-4 border-b border-border">
        <p className="text-base font-semibold leading-none">Getting started</p>
        <p className="text-sm text-muted-foreground mt-1.5 leading-none">
          {doneCount} of {tasks.length} done
        </p>
      </div>
      <div className="p-4 flex flex-col gap-1">
        {tasks.map((task) => (
          <Link
            key={task.label}
            href={task.href}
            className="flex items-center gap-2.5 rounded-md px-2 py-2.5 hover:bg-muted/40 transition-colors"
          >
            {task.done ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            )}
            <span className={cn("text-sm flex-1", task.done ? "text-muted-foreground line-through" : "font-medium")}>
              {task.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

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

function rankBadgeTone(rank: number | null): { className: string; label: string } {
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
  iconTone = "slate",
  title,
  subtitle,
  accent = false,
  headerRight,
  children,
}: {
  icon: React.ElementType
  iconTone?: "blue" | "amber" | "purple" | "slate"
  title: string
  subtitle?: string
  accent?: boolean
  headerRight?: React.ReactNode
  children: React.ReactNode
}) {
  const iconTones: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400",
    slate: "bg-muted text-muted-foreground",
  }
  return (
    <div className={cn(
      "rounded-lg border bg-card",
      accent ? "border-blue-200 dark:border-blue-900/50 shadow-sm" : "border-border"
    )}>
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-border">
        <div className={cn("h-7 w-7 rounded-md flex items-center justify-center shrink-0", iconTones[iconTone])}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold leading-none">{title}</p>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1.5 leading-none">{subtitle}</p>
          )}
        </div>
        {headerRight}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function EmptyState({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
      <Icon className="h-10 w-10 text-muted-foreground/30" />
      <p className="text-lg font-medium text-muted-foreground">{title}</p>
    </div>
  )
}

// A keyword reduced to its essential shape: the term and where it stands.
function KeywordChip({ keyword, location, rank }: { keyword: string; location: string; rank: number | null }) {
  const badge = rankBadgeTone(rank)
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/20 pl-3 pr-2 py-2" title={location}>
      <span className="text-sm font-medium truncate max-w-[160px]">{keyword}</span>
      <Badge variant="outline" className={cn("text-xs font-bold tabular-nums px-1.5 py-0", badge.className)}>
        {badge.label}
      </Badge>
    </div>
  )
}

function RankDeltaIcon({ value }: { value: number }) {
  if (value > 0) return <ArrowUpRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
  if (value < 0) return <ArrowDownRight className="h-4 w-4 text-red-500" />
  return null
}

function CountBadge({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string
  value: number | string
  icon?: React.ElementType
  tone?: "default" | "good" | "warn" | "bad"
}) {
  const tones: Record<string, string> = {
    default: "bg-muted text-muted-foreground border-transparent",
    good: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
    warn: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
    bad: "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800",
  }
  return (
    <Badge variant="outline" className={cn("gap-1.5 text-sm font-medium py-1.5 px-3", tones[tone])}>
      {Icon && <Icon className="h-3.5 w-3.5" />}
      <span className="font-bold tabular-nums">{value}</span> {label}
    </Badge>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DashboardStats() {
  const user = useUser()
  const [showAllKeywords, setShowAllKeywords] = useState(false)
  const KEYWORD_CAP = 8

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
    // Best rankings first; unranked keywords sink to the bottom.
    const sortedTop = [...top].sort((a, b) => {
      if (a.rank == null && b.rank == null) return 0
      if (a.rank == null) return 1
      if (b.rank == null) return -1
      return a.rank - b.rank
    })
    return { topPerformingKeywords: sortedTop, recentRankings: recent }
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

  const userName = (user as any)?.displayName || (user as any)?.primaryEmail?.split("@")[0] || "there"

  const postTotal = (stats?.scheduledPosts?.pending ?? 0) + (stats?.scheduledPosts?.published ?? 0) + (stats?.scheduledPosts?.failed ?? 0)
  const top3Count = topPerformingKeywords.filter(k => k.rank && k.rank <= 3).length
  const top10Count = topPerformingKeywords.filter(k => k.rank && k.rank <= 10).length
  const failedPosts = stats?.scheduledPosts?.failed ?? 0

  const checklistTasks: ChecklistTask[] = [
    { label: "Connect Google Business", done: !!stats?.gmb?.connected, href: "/app/settings/gmb" },
    { label: "Add a location", done: (stats?.overview?.totalLocations ?? 0) > 0, href: "/app/locations" },
    { label: "Track a keyword", done: topPerformingKeywords.length > 0, href: "/app/keywords" },
    { label: "Schedule a post", done: postTotal > 0, href: "/app/post/schedule" },
  ]

  if (isLoading) return <DashboardSkeleton />

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="rounded-lg border border-border bg-card p-8 flex flex-col items-center gap-4 max-w-sm w-full text-center">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <div>
            <p className="text-base font-semibold mb-1">Couldn't load your dashboard</p>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : "Something went wrong on our end"}
            </p>
          </div>
          <Button onClick={() => mutate()} variant="outline" size="sm">Try again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-5 w-full">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4 items-start">

        {/* ── Left: main content ── */}
        <div className="space-y-4 min-w-0">

          {/* ── Header ── */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Updated {formatLastUpdated(stats?.lastUpdated)}
              </p>
            </div>
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

          {/* ── Status strip: GMB, locations, progress, next post ── */}
          <GMBDashboardCards stats={gmbStats} isLoading={false} />

          {/* ── Failed posts alert — only shows up if it's actually a problem ── */}
          {failedPosts > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20 px-4 py-2.5">
              <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
              <p className="text-xs text-red-700 dark:text-red-400">
                {failedPosts} post{failedPosts !== 1 ? "s" : ""} failed to publish
              </p>
              <Badge variant="outline" className="ml-auto text-xs bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800">
                Needs attention
              </Badge>
            </div>
          )}

          {/* ── Rankings: the anchor card — big numbers + capped, sorted chips ── */}
          <SectionCard
            icon={Search}
            iconTone="blue"
            accent
            title="Rankings"
            subtitle={`${topPerformingKeywords.length} keyword${topPerformingKeywords.length !== 1 ? "s" : ""} tracked`}
          >
            {topPerformingKeywords.length === 0 ? (
              <EmptyState icon={Search} title="No keywords tracked yet" />
            ) : (
              <div className="space-y-4">
                <div className="flex items-end gap-6">
                  <div>
                    <p className="text-3xl font-bold tabular-nums leading-none text-emerald-600 dark:text-emerald-400">{top3Count}</p>
                    <p className="text-xs text-muted-foreground mt-1.5">in top 3</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold tabular-nums leading-none text-amber-600 dark:text-amber-400">{top10Count}</p>
                    <p className="text-xs text-muted-foreground mt-1.5">in top 10</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold tabular-nums leading-none text-muted-foreground">{topPerformingKeywords.length}</p>
                    <p className="text-xs text-muted-foreground mt-1.5">tracked total</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(showAllKeywords ? topPerformingKeywords : topPerformingKeywords.slice(0, KEYWORD_CAP)).map((kw, i) => (
                    <KeywordChip key={i} keyword={kw.keyword} location={kw.location} rank={kw.rank} />
                  ))}
                </div>
                {topPerformingKeywords.length > KEYWORD_CAP && (
                  <button
                    onClick={() => setShowAllKeywords((v) => !v)}
                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {showAllKeywords ? "Show less" : `+${topPerformingKeywords.length - KEYWORD_CAP} more keywords`}
                  </button>
                )}
              </div>
            )}
          </SectionCard>

          {/* ── Quick wins: every recommendation, badge-driven ── */}
          <SectionCard icon={Lightbulb} iconTone="amber" title="Quick wins" subtitle="Movement worth acting on">
            {recommendations.length === 0 ? (
              <EmptyState icon={Lightbulb} title="No recommendations yet" />
            ) : (
              <div className="flex flex-col gap-2.5">
                {recommendations.map((r, idx) => {
                  const rank = r.rank as number
                  const isImproving = (r.delta ?? 0) > 0
                  return (
                    <div key={idx} className="flex items-center gap-2.5">
                      {isImproving
                        ? <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        : <TrendingDown className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <span className="text-base truncate block">{r.keyword}</span>
                        <span className="text-sm text-muted-foreground">{r.location}</span>
                      </div>
                      <RankDeltaIcon value={r.delta ?? 0} />
                      <Badge variant="outline" className={cn("text-sm font-bold tabular-nums", rankBadgeTone(rank).className)}>
                        #{rank}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </SectionCard>

          {/* ── Upcoming posts: every scheduled post, compact rows ── */}
          <SectionCard
            icon={CalendarDays}
            iconTone="purple"
            title="Upcoming posts"
            subtitle={`Next 14 days${stats?.scheduledPosts?.upcoming?.length ? ` · ${stats.scheduledPosts.upcoming.length} scheduled` : ""}`}
          >
            {!stats?.scheduledPosts?.upcoming?.length ? (
              <EmptyState icon={CalendarDays} title="No posts scheduled" />
            ) : (
              <div className="flex flex-col gap-2">
                {stats.scheduledPosts.upcoming.map((post) => (
                  <div key={post.id} className="flex items-center gap-3">
                    <div
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: post.viewColor || "#6366f1" }}
                    />
                    <span className="text-base truncate flex-1">{post.summary}</span>
                    <Badge variant="outline" className="text-sm font-medium bg-muted text-muted-foreground border-transparent shrink-0">
                      {new Date(post.scheduledAt).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true,
                      })}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* ── Post status: counts as badges instead of a progress bar ── */}
          <SectionCard icon={BarChart3} title="Post status" subtitle={`${postTotal} total posts`}>
            <div className="flex flex-wrap gap-2">
              <CountBadge label="pending" value={stats?.scheduledPosts?.pending ?? 0} icon={Clock} tone="warn" />
              <CountBadge label="published" value={stats?.scheduledPosts?.published ?? 0} icon={CheckCircle2} tone="good" />
              <CountBadge label="failed" value={stats?.scheduledPosts?.failed ?? 0} icon={XCircle} tone={failedPosts > 0 ? "bad" : "default"} />
            </div>
          </SectionCard>
        </div>

        {/* ── Right: welcome / support / getting started ── */}
        <div className="space-y-4">
          <WelcomeCard name={userName} />
          <GettingStartedCard tasks={checklistTasks} />
        </div>
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="px-4 py-5 w-full">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4 items-start">
        <div className="space-y-4 min-w-0">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-7 w-28" />
              <Skeleton className="h-3.5 w-36" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>

          <div className="rounded-lg border border-border bg-card divide-y sm:divide-y-0 sm:divide-x sm:grid sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-4 px-4">
                <Skeleton className="h-4.5 w-4.5 rounded shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            ))}
          </div>

          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card">
              <div className="px-4 py-4 border-b border-border flex items-center gap-2">
                <Skeleton className="h-4.5 w-4.5 rounded" />
                <Skeleton className="h-4.5 w-24" />
              </div>
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card">
            <div className="px-4 py-4 border-b border-border">
              <Skeleton className="h-4.5 w-32" />
            </div>
            <div className="p-4 space-y-3">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card">
            <div className="px-4 py-4 border-b border-border">
              <Skeleton className="h-4.5 w-32" />
            </div>
            <div className="p-4 space-y-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}