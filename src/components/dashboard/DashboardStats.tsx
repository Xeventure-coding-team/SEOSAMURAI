"use client"

import { useMemo, useState, useCallback } from "react"
import useSWR from "swr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"
import {
  TrendingUp,
  TrendingDown,
  MapPin,
  Calendar,
  Target,
  Activity,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Info,
  Search,
  SlidersHorizontal,
  ListFilter,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useUser } from "@stackframe/stack"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { Separator } from "../ui/separator"

// Types
interface DashboardStats {
  overview: {
    totalLocations: number
    activeLocations: number
    totalKeywords: number
    activeKeywordTracking: number
    competitorAnalyses: number
  }
  scheduledPosts: {
    total: number
    pending: number
    published: number
    failed: number
    upcoming: Array<{
      id: string
      summary: string
      scheduledAt: string
      locationId: string
      viewColor: string
    }>
  }
  rankings: {
    averageRank: number | null
    recentRankings: Array<{
      keyword: string
      rank: number | null
      previousRank: number | null
      rankChange: string
      rankChangeValue: number
      location: string
      createdAt: string
      url?: string | null
    }>
    topPerformingKeywords: Array<{
      keyword: string
      rank: number
      location: string
      url: string | null
      previousRank?: number | null
    }>
    recentChanges: Array<{
      keyword: string
      rank: number | null
      previousRank: number | null
      rankChange: string
      rankChangeValue: number
      location: string
    }>
  }
  integrations: {
    gmbConnected: boolean
    gmbAccountName: string | null
    gmbTokenValid: boolean
  }
  lastUpdated: string
}

// Helper function to get rank color
const getRankColor = (rank: number): string => {
  if (rank <= 3) return "#10b981" // green-500
  if (rank <= 5) return "#22c55e" // green-400
  if (rank <= 7) return "#84cc16" // lime-500
  return "#eab308" // yellow-500
}

// Custom Tooltip Component
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    const improvement = data.previousRank ? data.previousRank - data.displayRank : 0

    return (
      <div className="bg-background border rounded-lg shadow-lg p-3 space-y-2">
        <p className="font-semibold text-sm">{data.keyword}</p>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <MapPin className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">{data.location}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Current Rank:</span>
            <Badge variant="outline" className="bg-green-500/10 text-green-600">
              #{data.displayRank}
            </Badge>
          </div>
          {data.previousRank && (
            <>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Previous Rank:</span>
                <span className="font-medium">#{data.previousRank}</span>
              </div>
              {improvement > 0 && (
                <div className="flex items-center gap-1 text-green-600">
                  <TrendingUp className="h-3 w-3" />
                  <span className="font-medium">
                    Improved by {improvement} position{improvement !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
              {improvement < 0 && (
                <div className="flex items-center gap-1 text-red-600">
                  <TrendingDown className="h-3 w-3" />
                  <span className="font-medium">
                    Dropped by {Math.abs(improvement)} position{Math.abs(improvement) !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    )
  }
  return null
}

type KeywordFilter = "all" | "wins" | "drops" | "top3" | "top10"
type SortBy = "best-rank" | "biggest-gains" | "biggest-drops" | "alpha"

function rankDelta(current?: number | null, previous?: number | null) {
  if (!current || !previous) return 0
  return previous - current // positive = improvement
}

function formatLastUpdated(iso?: string) {
  if (!iso) return "N/A"
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return "N/A"
  }
}

export default function DashboardStats() {
  const user = useUser()

  const fetcher = useCallback(async ([url, uid]: [string, string]) => {
    const res = await fetch(url, { headers: { "x-user-id": uid } })
    if (!res.ok) throw new Error("Failed to load statistics")
    return (await res.json()) as DashboardStats
  }, [])

  const {
    data: stats,
    error,
    isLoading,
    mutate,
    isValidating,
  } = useSWR(user?.id ? ["/api/dashboard/stats", user.id] : null, fetcher, { revalidateOnFocus: false })

  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<KeywordFilter>("all")
  const [sortBy, setSortBy] = useState<SortBy>("best-rank")
  const [location, setLocation] = useState<string>("all")

  const allLocations = useMemo(() => {
    const set = new Set<string>()
    if (stats) {
      stats.rankings.topPerformingKeywords.forEach((k) => set.add(k.location))
      stats.rankings.recentRankings.forEach((k) => set.add(k.location))
    }
    return ["all", ...Array.from(set).sort()]
  }, [stats])

  const recommendations = useMemo(() => {
    const recs = stats?.rankings.recentRankings
      .filter((r) => typeof r.rank === "number" && r.rank !== null)
      .map((r) => ({
        ...r,
        delta: rankDelta(r.rank, r.previousRank),
      }))
      .filter((r) => {
        const rank = r.rank as number
        const isNearTop = rank > 10 && rank <= 20
        const fastRiser = r.delta >= 3
        const slipping = r.delta <= -3 && rank <= 20
        return isNearTop || fastRiser || slipping
      })
      .slice(0, 10)

    return recs
  }, [stats])

  const filteredKeywords = useMemo(() => {
    let list =
      stats?.rankings.topPerformingKeywords.map((k) => ({
        ...k,
        delta: rankDelta(k.rank, k.previousRank),
      })) || []

    if (location !== "all") {
      list = list.filter((k) => k.location === location)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((k) => k.keyword.toLowerCase().includes(q))
    }

    if (filter === "wins") {
      list = list.filter((k) => (k.delta ?? 0) > 0)
    } else if (filter === "drops") {
      list = list.filter((k) => (k.delta ?? 0) < 0)
    } else if (filter === "top3") {
      list = list.filter((k) => k.rank <= 3)
    } else if (filter === "top10") {
      list = list.filter((k) => k.rank <= 10)
    }

    switch (sortBy) {
      case "best-rank":
        list.sort((a, b) => a.rank - b.rank)
        break
      case "biggest-gains":
        list.sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))
        break
      case "biggest-drops":
        list.sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0))
        break
      case "alpha":
        list.sort((a, b) => a.keyword.localeCompare(b.keyword))
        break
    }

    return list
  }, [stats, filter, sortBy, search, location])

  const chartData = useMemo(
    () =>
      filteredKeywords.map((item) => ({
        ...item,
        invertedRank: 11 - item.rank,
        displayRank: item.rank,
      })),
    [filteredKeywords],
  )

  const handleRefresh = async () => {
    await mutate()
  }

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 p-6">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <p className="text-center text-muted-foreground">
              {error instanceof Error ? error.message : "Unable to load dashboard statistics"}
            </p>
            <Button onClick={handleRefresh} variant="outline">
              Try Again
            </Button>
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
          <span
            className={cn("text-xs", isValidating ? "text-muted-foreground" : "text-muted-foreground")}
            aria-live="polite"
          >
            Last updated: {formatLastUpdated(stats?.lastUpdated)}
          </span>
          <Button
            onClick={handleRefresh}
            disabled={isValidating}
            variant="outline"
            size="sm"
            aria-label="Refresh dashboard data"
            className="w-full sm:w-auto bg-transparent"
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", isValidating && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Locations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Locations</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.overview.totalLocations}</div>
            <p className="text-xs text-muted-foreground">{stats?.overview.activeLocations} active this month</p>
          </CardContent>
        </Card>

        {/* Keywords Tracked */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Keywords Tracked</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.overview.totalKeywords}</div>
            <p className="text-xs text-muted-foreground">{stats?.overview.activeKeywordTracking} actively monitored</p>
          </CardContent>
        </Card>

        {/* Avg Rank */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Rank</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.rankings.averageRank ? `#${stats.rankings.averageRank}` : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">Last 7 days average</p>
          </CardContent>
        </Card>

        {/* Scheduled Posts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Posts</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.scheduledPosts.pending}</div>
            <p className="text-xs text-muted-foreground">{stats?.scheduledPosts.total} total posts</p>
          </CardContent>
        </Card>
      </div>


      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">

        <div className="hidden">
          {/* Keyword Details with filters */}
          <Card>
            <CardHeader className="space-y-3 d-none">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Keyword Details</CardTitle>
                  <CardDescription>Explore performance, changes, and opportunities</CardDescription>
                </div>
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Keyword details help" className="shrink-0">
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">What am I seeing?</h4>
                      <p className="text-xs text-muted-foreground">
                        Each row is a keyword and location combo. Look for green “Wins” badges and low rank numbers for
                        quick impact.
                      </p>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </div>

              {/* Controls */}
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full min-w-0 sm:flex-1">
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search keywords"
                      aria-label="Search keywords"
                      className="pl-8"
                    />
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>

                  <div className="flex flex-wrap items-center gap-1 w-full sm:w-auto">
                    <Button
                      variant={filter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilter("all")}
                      aria-pressed={filter === "all"}
                      className="w-full sm:w-auto"
                    >
                      <ListFilter className="mr-2 h-4 w-4" />
                      All
                    </Button>
                    <Button
                      variant={filter === "wins" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilter("wins")}
                      aria-pressed={filter === "wins"}
                      className="w-full sm:w-auto"
                    >
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Wins
                    </Button>
                    <Button
                      variant={filter === "drops" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilter("drops")}
                      aria-pressed={filter === "drops"}
                      className="w-full sm:w-auto"
                    >
                      <TrendingDown className="mr-2 h-4 w-4" />
                      Drops
                    </Button>
                    <Button
                      variant={filter === "top3" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilter("top3")}
                      aria-pressed={filter === "top3"}
                      className="w-full sm:w-auto"
                    >
                      Top 3
                    </Button>
                    <Button
                      variant={filter === "top10" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilter("top10")}
                      aria-pressed={filter === "top10"}
                      className="w-full sm:w-auto"
                    >
                      Top 10
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1">
                    <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Sort</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 w-full sm:w-auto">
                    <Button
                      variant={sortBy === "best-rank" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSortBy("best-rank")}
                      aria-pressed={sortBy === "best-rank"}
                      className="w-full sm:w-auto"
                    >
                      Best rank
                    </Button>
                    <Button
                      variant={sortBy === "biggest-gains" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSortBy("biggest-gains")}
                      aria-pressed={sortBy === "biggest-gains"}
                      className="w-full sm:w-auto"
                    >
                      Biggest gains
                    </Button>
                    <Button
                      variant={sortBy === "biggest-drops" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSortBy("biggest-drops")}
                      aria-pressed={sortBy === "biggest-drops"}
                      className="w-full sm:w-auto"
                    >
                      Biggest drops
                    </Button>
                    <Button
                      variant={sortBy === "alpha" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSortBy("alpha")}
                      aria-pressed={sortBy === "alpha"}
                      className="w-full sm:w-auto"
                    >
                      A–Z
                    </Button>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground" aria-live="polite">
                  Showing {filteredKeywords.length} of {stats?.rankings.topPerformingKeywords.length} keywords
                  {location !== "all" ? ` in ${location}` : ""}.
                </div>
              </div>
            </CardHeader>

            <CardContent className="overflow-hidden">
              {/* Detailed List */}
              <ScrollArea className="min-h-[500px] pr-2">
                <div className="space-y-3">
                  {filteredKeywords.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="rounded-full bg-muted p-3 mb-3">
                        <Search className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium mb-1">No results</p>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        Try a different search term, clear filters, or switch locations.
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {filteredKeywords.map((keyword, idx) => {
                        const improvement = keyword.delta ?? 0
                        const isWin = improvement > 0
                        const isDrop = improvement < 0
                        const isTop3 = keyword.rank <= 3

                        return (
                          <li
                            key={`${keyword.keyword}-${keyword.location}-${idx}`}
                            className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors outline-none"
                            tabIndex={0}
                            role="group"
                            aria-label={`${keyword.keyword} in ${keyword.location}, rank #${keyword.rank}${isWin ? `, improved by ${improvement}` : isDrop ? `, dropped by ${Math.abs(improvement)}` : ""}`}
                          >
                            <Badge
                              variant="outline"
                              className="shrink-0 mt-0.5"
                              style={{
                                backgroundColor: `${getRankColor(keyword.rank)}15`,
                                borderColor: getRankColor(keyword.rank),
                                color: getRankColor(keyword.rank),
                              }}
                            >
                              #{keyword.rank}
                            </Badge>

                            <div className="flex-1 min-w-0 space-y-1.5">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium leading-tight">{keyword.keyword}</p>
                                {keyword.url && (
                                  <a
                                    href={keyword.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                                    aria-label="Open ranking URL in new tab"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  <span>{keyword.location}</span>
                                </div>

                                {isWin && (
                                  <Badge
                                    variant="secondary"
                                    className="flex items-center gap-1 bg-green-500/10 text-green-600 border-green-200"
                                  >
                                    <TrendingUp className="h-3 w-3" />
                                    <span>
                                      +{improvement}
                                      {keyword.previousRank ? ` from #${keyword.previousRank}` : ""}
                                    </span>
                                  </Badge>
                                )}

                                {isDrop && (
                                  <Badge
                                    variant="secondary"
                                    className="flex items-center gap-1 bg-red-500/10 text-red-600 border-red-200"
                                  >
                                    <TrendingDown className="h-3 w-3" />
                                    <span>
                                      {improvement}
                                      {keyword.previousRank ? ` from #${keyword.previousRank}` : ""}
                                    </span>
                                  </Badge>
                                )}

                                {!isWin && !isDrop && keyword.previousRank && (
                                  <Badge variant="secondary" className="text-xs">
                                    Stable
                                  </Badge>
                                )}

                                {isTop3 && (
                                  <Badge variant="outline" className="text-xs">
                                    High visibility
                                  </Badge>
                                )}
                              </div>

                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {keyword.rank <= 3
                                  ? `Excellent visibility in ${keyword.location}. Most clicks happen in the top 3.`
                                  : keyword.rank <= 5
                                    ? `Great performance in ${keyword.location}. A few optimizations could push into top 3.`
                                    : `Good ranking in ${keyword.location}. Keep optimizing to improve visibility and clicks.`}
                              </p>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="hidden">
          {/* Top Performing Keywords with Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    Top Performing Keywords
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </HoverCardTrigger>
                      <HoverCardContent className="w-80">
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm">What are Top Performing Keywords?</h4>
                          <p className="text-xs text-muted-foreground">
                            These are keywords where your business ranks in the top 10 positions on Google for specific
                            locations. Higher rankings (closer to #1) mean more visibility to potential customers
                            searching for your services.
                          </p>
                          <div className="pt-2 border-t space-y-1">
                            <p className="text-xs font-medium">Chart Guide:</p>
                            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                              <li>Taller bars = better rankings</li>
                              <li>Green colors = excellent positions (1-3)</li>
                              <li>Hover over bars for details</li>
                            </ul>
                          </div>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  </CardTitle>
                  <CardDescription>
                    Filtered view: {filteredKeywords.length} keyword{filteredKeywords.length !== 1 ? "s" : ""}
                    {location !== "all" ? ` in ${location}` : ""}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>

              {chartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="rounded-full bg-muted p-3 mb-3">
                    <TrendingUp className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium mb-1">No top rankings to display</p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Adjust filters or clear your search to see more results.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 20, left: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="keyword"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                        tick={{ fontSize: 11 }}
                        className="text-muted-foreground"
                        tickFormatter={(v: string) => (typeof v === "string" && v.length > 12 ? `${v.slice(0, 12)}…` : v)}
                      />
                      <YAxis
                        domain={[0, 10]}
                        ticks={[0, 2, 4, 6, 8, 10]}
                        tick={{ fontSize: 11 }}
                        className="text-muted-foreground"
                        label={{
                          value: "Rank Quality",
                          angle: -90,
                          position: "insideLeft",
                          style: { fontSize: 11 },
                        }}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0, 0, 0, 0.05)" }} />
                      <Bar dataKey="invertedRank" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={getRankColor(entry.displayRank)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <Separator className="mb-4" />

              <div className="mb-6">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  How to read your keyword performance
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Short, plain-language tips so everyone can follow along
                </p>
              </div>

              <Accordion type="single" defaultValue="guide" collapsible>
                <AccordionItem value="guide">
                  <AccordionTrigger className="text-sm">Open quick guide</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    <ul className="list-disc list-inside space-y-1">
                      <li>Lower rank numbers are better. #1 is the top position on Google.</li>
                      <li>Green = strong positions (top 3). Yellow = good but room to grow (4–10).</li>
                      <li>“Wins” are keywords moving up. “Drops” are moving down.</li>
                      <li>Filter by Wins/Drops/Top 3 and search to find what matters fast.</li>
                      <li>Use Recommendations to spot quick wins (near top 10) and fast risers.</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

            </CardContent>
          </Card>
        </div>

        {/* Recommendations */} 
        <Card>
          <CardHeader>
            <CardTitle>Recommended Keywords</CardTitle>
            <CardDescription>Quick wins and important changes to focus on</CardDescription>
          </CardHeader>
          <CardContent>
            {recommendations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No recommendations at the moment. Check back after new rankings collect.
              </p>
            ) : (
              <ul className="space-y-3">
                {recommendations.map((r, idx) => {
                  const rank = r.rank as number
                  const delta = r.delta ?? 0
                  const isNearTop = rank > 10 && rank <= 20
                  const fastRiser = delta >= 3
                  const slipping = delta <= -3 && rank <= 20

                  let note = ""
                  if (fastRiser) note = "Fast riser — keep momentum with fresh content and internal links."
                  else if (isNearTop) note = "Near top 10 — small improvements can push this onto page 1."
                  else if (slipping) note = "At risk — investigate competitors or content freshness."

                  return (
                    <li
                      key={`${r.keyword}-${r.location}-${idx}`}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium leading-tight">{r.keyword}</p>
                          <div className="flex items-center gap-2">
                            {fastRiser && (
                              <Badge className="bg-green-500/10 text-green-600 border-green-200">Fast riser</Badge>
                            )}
                            {isNearTop && <Badge variant="outline">Near top 10</Badge>}
                            {slipping && <Badge className="bg-red-500/10 text-red-600 border-red-200">At risk</Badge>}
                          </div>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>{r.location}</span>
                          </div>
                          <Badge variant="outline">#{rank}</Badge>
                          {r.previousRank != null && (
                            <span
                              className={cn(
                                delta > 0 ? "text-green-600" : delta < 0 ? "text-red-600" : "text-muted-foreground",
                              )}
                            >
                              {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : "no change"} from #{r.previousRank}
                            </span>
                          )}
                        </div>
                        {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Scheduled Posts */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Posts</CardTitle>
            <CardDescription>Scheduled for the next 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.scheduledPosts.upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No upcoming posts scheduled</p>
              ) : (
                stats?.scheduledPosts.upcoming.map((post) => (
                  <div key={post.id} className="flex items-start justify-between space-x-4">
                    <div
                      className="w-1 h-full rounded-full"
                      style={{ backgroundColor: post.viewColor }}
                      aria-hidden="true"
                    />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none line-clamp-2">{post.summary}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(post.scheduledAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Posts Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Posts Status</CardTitle>
            <CardDescription>Overview of your scheduled posts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">Pending</span>
                </div>
                <span className="text-2xl font-bold">{stats?.scheduledPosts.pending}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Published</span>
                </div>
                <span className="text-2xl font-bold">{stats?.scheduledPosts.published}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium">Failed</span>
                </div>
                <span className="text-2xl font-bold">{stats?.scheduledPosts.failed}</span>
              </div>
            </div>
          </CardContent>
        </Card>


      </div>

    </div>
  )
}

// Loading Skeleton Component
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="space-y-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
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
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-4">
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
