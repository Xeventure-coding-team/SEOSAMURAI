"use client"

import { useMemo, useCallback } from "react"
import useSWR from "swr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useUser } from "@stackframe/stack"
import GMBDashboardCards from "./gmb-dashboard-card"

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
  // UserProgress — global summary
  progress?: {
    totalPoints: number
    currentLevel: number
    tasksCompleted: number
    locationsCount: number
  }
  lastUpdated: string
}

function rankDelta(current?: number | null, previous?: number | null) {
  if (!current || !previous) return 0
  return previous - current
}

function formatLastUpdated(iso?: string) {
  if (!iso) return "N/A"
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return "N/A"
  }
}

function deriveRankingData(stats: DashboardStats | undefined) {
  if (!stats) return { topPerformingKeywords: [], recentRankings: [] }

  const keywords: KeywordEntry[] = stats.keywords ?? []

  const ranked = keywords
    .filter((k) => k.rank !== null)
    .sort((a, b) => (a.rank as number) - (b.rank as number))
    .map((k) => ({ keyword: k.keyword, rank: k.rank as number, location: k.location, url: null, previousRank: null }))

  const trackedKeywords =
    ranked.length > 0
      ? ranked
      : keywords.map((k) => ({
        keyword: k.keyword,
        rank: null as unknown as number,
        location: k.location,
        url: null,
        previousRank: null,
      }))

  const recentRankings = keywords
    .filter((k) => k.rank !== null && k.rankChange !== null)
    .map((k) => ({
      keyword: k.keyword,
      rank: k.rank,
      previousRank: null,
      rankChange: k.rankChange ?? "UNCHANGED",
      rankChangeValue: k.rankChangeValue,
      location: k.location,
      createdAt: k.lastChecked,
      url: null,
    }))

  return { topPerformingKeywords: trackedKeywords, recentRankings }
}

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
      ? stats.rankings.topPerformingKeywords
      : derived.topPerformingKeywords
    const recent = stats?.rankings?.recentRankings?.length
      ? stats.rankings.recentRankings
      : derived.recentRankings
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

  // Build props for GMBDashboardCards
  const gmbStats = {
    overview: stats?.overview || {
      totalLocations: 0, activeLocations: 0, totalKeywords: 0,
      keywordsWithRankData: 0, rankDataStale: false, lastRankedAt: null,
    },
    gmb: stats?.gmb || {
      connected: false, accountName: null, tokenValid: false,
      tokenDaysLeft: null, tokenExpiry: null,
    },
    rankings: {
      inTopTen: stats?.rankings?.inTopTen || 0,
      improved: stats?.rankings?.improved || 0,
    },
    scheduledPosts: {
      pending: stats?.scheduledPosts?.pending || 0,
      total: stats?.scheduledPosts?.total || 0,
      failed: stats?.scheduledPosts?.failed || 0,
      nextPost: stats?.scheduledPosts?.nextPost || null,
      upcoming: stats?.scheduledPosts?.upcoming || [],
    },
    // UserProgress fields — directly from API, no transformation needed
    progress: {
      totalPoints: stats?.progress?.totalPoints ?? 0,
      currentLevel: stats?.progress?.currentLevel ?? 1,
      tasksCompleted: stats?.progress?.tasksCompleted ?? 0,
      locationsCount: stats?.progress?.locationsCount ?? 0,
    },
  }

  if (isLoading) return <DashboardSkeleton />

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 p-6">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <p className="text-center text-muted-foreground">
              {error instanceof Error ? error.message : "Unable to load dashboard statistics"}
            </p>
            <Button onClick={() => mutate()} variant="outline">Try Again</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Overview of your business performance</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <span className="text-xs text-muted-foreground">
            Last updated: {formatLastUpdated(stats?.lastUpdated)}
          </span>
          <Button onClick={() => mutate()} disabled={isValidating} variant="outline" size="sm">
            <RefreshCw className={cn("mr-2 h-4 w-4", isValidating && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      <GMBDashboardCards stats={gmbStats} isLoading={false} />

      <div className="grid gap-6 lg:grid-cols-2">

        {/* Tracked Keywords */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Tracked Keywords
            </CardTitle>
            <CardDescription className="text-sm">
              Monitoring
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-0">
            {topPerformingKeywords.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-5">
                No data
              </p>
            ) : (
              <div className="space-y-3">
                {topPerformingKeywords.slice(0, 5).map((kw, i) => (
                  <div key={i} className="flex items-center justify-between pb-2">
                    <div className="min-w-0">
                      <p className="text-md font-medium truncate">
                        {kw.keyword}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {kw.location}
                      </p>
                    </div>

                    <Badge>
                      {kw.rank ? (
                      <span className="text-sm font-medium">
                        #{kw.rank}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        —
                      </span>
                    )}
                    </Badge>

                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

 {/* Recommendations */}
<Card>
  <CardHeader className="pb-3">
    <CardTitle className="text-base font-semibold">
      Recommendations
    </CardTitle>
    <CardDescription className="text-sm">
      Quick wins and keywords to watch
    </CardDescription>
  </CardHeader>

  <CardContent className="pt-0">
    {recommendations.length === 0 ? (
      <div className="py-5 space-y-1 text-center">
        <p className="text-sm text-muted-foreground">
          No rank movement detected yet
        </p>
        <p className="text-sm text-muted-foreground">
          Recommendations appear once data is available
        </p>
      </div>
    ) : (
      <div className="space-y-3">
        {recommendations.slice(0, 5).map((r, idx) => {
          const rank = r.rank as number
          const isImproving = (r.delta ?? 0) > 0

          return (
            <div key={idx} className="flex items-start gap-2">
              {isImproving ? (
                <TrendingUp className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              )}

              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {r.keyword}
                </p>
                <p className="text-sm text-muted-foreground">
                  Rank #{rank} • {r.location}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    )}
  </CardContent>
</Card>

        {/* Upcoming Posts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Upcoming Posts
            </CardTitle>
            <CardDescription className="text-sm">
              Next 14 days
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-0">
            {!stats?.scheduledPosts?.upcoming?.length ? (
              <p className="text-sm text-muted-foreground text-center py-5">
                No posts scheduled
              </p>
            ) : (
              <div className="space-y-3">
                {stats.scheduledPosts.upcoming.slice(0, 5).map((post) => (
                  <div key={post.id} className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {post.summary}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(post.scheduledAt).toLocaleDateString()}
                      </p>
                    </div>

                    <Clock className="h-4 w-4 text-muted-foreground ml-2 shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Post Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Post Status
            </CardTitle>
            <CardDescription className="text-sm">
              Overview of scheduled content
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span className="text-sm">Pending</span>
                </div>
                <span className="text-sm font-semibold">
                  {stats?.scheduledPosts?.pending ?? 0}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Published</span>
                </div>
                <span className="text-sm font-semibold">
                  {stats?.scheduledPosts?.published ?? 0}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm">Failed</span>
                </div>
                <span className="text-sm font-semibold">
                  {stats?.scheduledPosts?.failed ?? 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>


      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader><Skeleton className="h-4 w-24" /></CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-48" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[...Array(3)].map((_, j) => (
                <Skeleton key={j} className="h-12 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}