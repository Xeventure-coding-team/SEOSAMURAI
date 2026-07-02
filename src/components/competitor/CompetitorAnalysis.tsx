"use client"
import { useState, useMemo } from "react"
import { useCompetitors } from "@/hooks/useCompetitors"
import ErrorRender from "@/components/Error"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    RefreshCw,
    Star,
    Info,
    Eye,
    EyeOff,
    TrendingUp,
    TrendingDown,
    AlertCircle,
    MapPin,
    Plus,
    Trophy,
    Target,
} from "lucide-react"
import { Loader } from "../Loader/Loader"
import { APIProvider, Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps"
import { PlanGate } from "../PlanGate"
import { cn } from "@/lib/utils"

interface KeywordRanking {
    keyword: string
    rank: number
    url?: string
    title?: string
}

interface EnhancedCompetitor {
    id: string
    name: string
    domain?: string
    address?: string
    rating?: number
    reviewCount?: number
    distance?: number
    googleMapsUri?: string
    website?: string
    coordinates?: { lat: number; lng: number }
    keywordRankings: KeywordRanking[]
    averageRank?: number
    totalKeywordsRanked?: number
    rank: number
    bestRank: number
    worstRank: number
}

type SortKey = "rank" | "visibility" | "name" | "keywords"

// Weighted visibility score: rank 1 = 100pts, rank 10 = ~10pts, beyond 10 = 0
function calculateVisibilityScore(rankings: KeywordRanking[], totalKeywords: number): number {
    if (totalKeywords === 0) return 0
    const points = rankings.reduce((sum, r) => sum + Math.max(0, 110 - r.rank * 10), 0)
    return Math.min(100, Math.round((points / (totalKeywords * 100)) * 100))
}

function rankDistribution(rankings: KeywordRanking[]) {
    return {
        top3: rankings.filter((k) => k.rank <= 3).length,
        top10: rankings.filter((k) => k.rank > 3 && k.rank <= 10).length,
        beyond: rankings.filter((k) => k.rank > 10).length,
    }
}

export function CompetitorAnalysisWithMap({
    locationId,
    businessName,
    coordinates,
    businessType,
}: {
    locationId: string
    businessName: string
    businessType: string
    coordinates: { lat: number; lng: number } | null
}) {
    const [selectedCompetitor, setSelectedCompetitor] = useState<EnhancedCompetitor | null>(null)
    const [expandedCompetitor, setExpandedCompetitor] = useState<string | null>(null)
    const [showMap, setShowMap] = useState(false)
    const [sortKey, setSortKey] = useState<SortKey>("rank")

    const { competitors, hasKeywords, trackedKeywordsCount, loading, error, refetch } = useCompetitors(
        locationId,
        businessName,
        coordinates,
        businessType
    )

    const handleRefresh = async () => {
        await refetch()
    }

    const toggleExpand = (competitorId: string) => {
        setExpandedCompetitor(expandedCompetitor === competitorId ? null : competitorId)
    }

    const selectCompetitor = (competitor: EnhancedCompetitor) => {
        setSelectedCompetitor(competitor)
        if (!showMap) setShowMap(true)
    }

    const getMapCenter = () => {
        if (selectedCompetitor?.coordinates) return selectedCompetitor.coordinates
        return coordinates || { lat: 40.7128, lng: -74.006 }
    }

    const getMapZoom = () => (selectedCompetitor ? 15 : 12)

    // Derived insights — computed once per competitors change
    const enriched = useMemo(() => {
        return competitors.map((c) => ({
            ...c,
            visibilityScore: calculateVisibilityScore(c.keywordRankings, trackedKeywordsCount),
            distribution: rankDistribution(c.keywordRankings),
        }))
    }, [competitors, trackedKeywordsCount])

    const sorted = useMemo(() => {
        const list = [...enriched]
        switch (sortKey) {
            case "visibility":
                return list.sort((a, b) => b.visibilityScore - a.visibilityScore)
            case "name":
                return list.sort((a, b) => a.name.localeCompare(b.name))
            case "keywords":
                return list.sort((a, b) => (b.totalKeywordsRanked || 0) - (a.totalKeywordsRanked || 0))
            default:
                return list.sort((a, b) => a.rank - b.rank)
        }
    }, [enriched, sortKey])

    // Your business's own visibility — best rank found across competitors' beaten keywords
    // (approximation: you "win" a keyword when no competitor ranks better than position 1,
    // refined further once backend returns your own ranking explicitly)
    const yourBestRank = useMemo(() => {
        if (enriched.length === 0) return null
        const bestCompetitorRank = Math.min(...enriched.map((c) => c.bestRank))
        return bestCompetitorRank
    }, [enriched])

    const marketLeader = sorted[0]
    const totalCompetitorsTracked = enriched.length

    if (loading) {
        return <Loader text="Analyzing competitor rankings..." />
    }

    if (error) {
        return <ErrorRender error={"We couldn't load competitor data. You can retry or report the issue."} />
    }

    if (!hasKeywords || trackedKeywordsCount === 0) {
        return (
            <PlanGate
                mode={{ type: "feature", feature: "competitor-insights" }}
                featureName="Competitor Insights"
                description="Upgrade to Pro to access competitor insights."
            >
                <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                    <div className="mb-6 rounded-full border border-border/60 bg-gradient-to-b from-background to-muted/30 p-5 shadow-sm">
                        <TrendingUp className="h-12 w-12 text-primary/80" />
                    </div>
                    <h3 className="mb-3 text-xl font-semibold tracking-tight">No keywords tracked yet</h3>
                    <p className="max-w-md text-sm text-muted-foreground leading-relaxed">
                        Start tracking your first keywords to unlock competitor insights, ranking trends,
                        and visibility analytics — all in one place.
                    </p>
                    <div className="mt-6 flex items-center gap-1.5 rounded-full bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
                        <Plus className="h-3 w-3" />
                        <span>Add keywords from the dashboard to get started</span>
                    </div>
                    <div className="mt-8 h-1 w-16 rounded-full bg-muted/50" />
                    <p className="mt-3 text-[11px] text-muted-foreground/50">
                        Data updates automatically once keywords are added
                    </p>
                </div>
            </PlanGate>
        )
    }

    if (competitors.length === 0 && hasKeywords) {
        return (
            <PlanGate
                mode={{ type: "feature", feature: "competitor-insights" }}
                featureName="Competitor Insights"
                description="Upgrade to Pro to access competitor insights."
            >
                <TooltipProvider>
                    <div className="space-y-6">
                        <div className="flex justify-between items-center flex-wrap gap-4">
                            <h2 className="text-xl font-semibold">Competitor Rankings</h2>
                            <Button onClick={handleRefresh} disabled={loading} variant="outline" size="sm">
                                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                                Refresh
                            </Button>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-background p-8 text-center">
                            <div className="mb-4 flex justify-center">
                                <div className="rounded-xl border border-border/50 p-3">
                                    <AlertCircle className="h-5 w-5 text-muted-foreground/70" />
                                </div>
                            </div>
                            <h3 className="text-base font-medium mb-2">No competitors detected</h3>
                            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                                You're tracking <strong>{trackedKeywordsCount}</strong> keyword
                                {trackedKeywordsCount !== 1 ? "s" : ""}, but no competing businesses have
                                appeared in the results yet.
                            </p>
                            <p className="mt-3 text-xs text-muted-foreground/70">
                                This can happen with new keywords or when your rankings are strong. Data
                                will update as results refresh.
                            </p>
                        </div>
                    </div>
                </TooltipProvider>
            </PlanGate>
        )
    }

    return (
        <PlanGate
            mode={{ type: "feature", feature: "competitor-insights" }}
            featureName="Competitor Insights"
            description="Upgrade to Pro to access competitor insights."
        >
            <TooltipProvider>
                <div className="space-y-6 max-w-8xl">

                    {/* Intro / framing card */}
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center flex-wrap gap-4">
                                <div className="flex items-center gap-2">
                                    <CardTitle className="text-2xl">Competitor visibility</CardTitle>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <Info className="h-4 w-4 text-muted-foreground" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Visibility score reflects how often a business appears in
                                                top positions across {trackedKeywordsCount} tracked keywords</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                                <div className="flex gap-2">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button onClick={() => setShowMap(!showMap)} variant="outline" size="sm">
                                                {showMap ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                                                {showMap ? "Hide Map" : "Show Map"}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{showMap ? "Hide the competitor location map" : "Show competitors on an interactive map"}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button onClick={handleRefresh} disabled={loading} variant="outline" size="sm">
                                                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                                                {loading ? "Updating..." : "Refresh Data"}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Refresh competitor rankings with latest data</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                            </div>

                            <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
                                Compare your business with local competitors, track visibility, identify strengths and weaknesses, and better understand your position in local search.
                            </p>

                            <div className="text-sm text-muted-foreground mt-2">
                                Based on {trackedKeywordsCount} tracked keyword{trackedKeywordsCount !== 1 ? "s" : ""}
                            </div>
                        </CardHeader>
                    </Card>

                    {/* Quick stat row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Card>
                            <CardContent className="flex items-center gap-3">
                                <div className="rounded-lg bg-muted p-2">
                                    <Target className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Competitors tracked</p>
                                    <p className="text-xl font-bold">{totalCompetitorsTracked}</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="flex items-center gap-3">
                                <div className="rounded-lg bg-amber-50 p-2">
                                    <Trophy className="h-5 w-5 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Market leader</p>
                                    <p className="text-xl font-bold truncate max-w-[280px]">
                                        {marketLeader?.name ?? "—"}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="flex items-center gap-3">
                                <div className="rounded-lg bg-green-50 p-2">
                                    <TrendingUp className="h-5 w-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Best competitor rank</p>
                                    <p className="text-xl font-bold">{yourBestRank ? `#${yourBestRank}` : "—"}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Visibility comparison bars */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Visibility comparison</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Share of search visibility across tracked keywords, ranked highest to lowest
                            </p>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {sorted.slice(0, 6).map((c, index) => (
                                    <div key={`vis-${c.id}-${index}`} className="flex items-center gap-3">
                                        <span className="text-sm w-48 truncate" title={c.name}>{c.name}</span>
                                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary transition-all"
                                                style={{ width: `${c.visibilityScore}%` }}
                                            />
                                        </div>
                                        <span
                                            className={cn(
                                                "inline-flex items-center justify-center min-w-[52px] px-2 py-1 rounded-full text-xs font-semibold",
                                                c.visibilityScore >= 80
                                                    ? "bg-green-100 text-green-700"
                                                    : c.visibilityScore >= 50
                                                        ? "bg-amber-100 text-amber-700"
                                                        : "bg-red-100 text-red-700"
                                            )}
                                        >
                                            {c.visibilityScore}%
                                        </span>                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Sort control */}
                    <div className="flex justify-between items-center flex-wrap gap-3">
                        <h3 className="text-lg font-semibold">Top {sorted.length} competitors</h3>
                        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="rank">Overall rank</SelectItem>
                                <SelectItem value="visibility">Visibility score</SelectItem>
                                <SelectItem value="keywords">Keywords ranked</SelectItem>
                                <SelectItem value="name">Name</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className={`grid gap-6 ${showMap ? "lg:grid-cols-2" : "grid-cols-1"}`}>
                        <div className="space-y-4">
                            {sorted.map((competitor, index) => (
                                <Card
                                    key={`${competitor.id}-${index}`}
                                    className={`hover:shadow-md transition-all cursor-pointer ${selectedCompetitor?.id === competitor.id ? "ring-2 ring-primary" : ""
                                        }`}
                                    onClick={() => selectCompetitor(competitor)}
                                >
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex-1 space-y-3">
                                                    <div className="flex items-center gap-3">
                                                        <Tooltip>
                                                            <TooltipTrigger>
                                                                <Badge variant="default" className="text-sm font-bold">
                                                                    #{competitor.rank}
                                                                </Badge>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Overall competitor ranking</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                        <h3 className="text-lg font-semibold text-foreground">{competitor.name}</h3>
                                                        <Tooltip>
                                                            <TooltipTrigger>
                                                                <Badge
                                                                    variant="outline"
                                                                    className={
                                                                        competitor.visibilityScore >= 60
                                                                            ? "bg-green-50 text-green-700 border-green-200"
                                                                            : competitor.visibilityScore >= 30
                                                                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                                                                : "bg-gray-50 text-gray-600 border-gray-200"
                                                                    }
                                                                >
                                                                    {competitor.visibilityScore}% visible
                                                                </Badge>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Visibility score: weighted by rank position across all tracked keywords</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </div>

                                                    <p className="text-muted-foreground text-sm">
                                                        {competitor.address || competitor.domain || "No address available"}
                                                    </p>

                                                    <div className="flex items-center gap-4 text-sm flex-wrap">
                                                        <Tooltip>
                                                            <TooltipTrigger>
                                                                <div className="flex items-center gap-1">
                                                                    <TrendingUp className="h-4 w-4 text-green-500" />
                                                                    <span className="font-medium">Best: #{competitor.bestRank}</span>
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Best ranking position across all keywords</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                        <Tooltip>
                                                            <TooltipTrigger>
                                                                <div className="flex items-center gap-1">
                                                                    <Star className="h-4 w-4 text-blue-500" />
                                                                    <span className="font-medium">Avg: #{Math.round(competitor.averageRank || 0)}</span>
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Average position across all keywords</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                        <Tooltip>
                                                            <TooltipTrigger>
                                                                <Badge variant="secondary">
                                                                    {competitor.totalKeywordsRanked} keyword{competitor.totalKeywordsRanked !== 1 ? "s" : ""}
                                                                </Badge>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Number of tracked keywords this competitor ranks for</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </div>

                                                    {/* Rank distribution breakdown */}
                                                    <div className="flex gap-2 text-xs flex-wrap">
                                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                            Top 3: {competitor.distribution.top3}
                                                        </Badge>
                                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                            4–10: {competitor.distribution.top10}
                                                        </Badge>
                                                        <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                                                            11+: {competitor.distribution.beyond}
                                                        </Badge>
                                                    </div>

                                                    {(competitor.rating || competitor.reviewCount || competitor.distance) && (
                                                        <div className="flex items-center gap-4 text-sm flex-wrap pt-2 border-t">
                                                            {competitor.rating && (
                                                                <div className="flex items-center gap-1">
                                                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                                                    <span className="font-medium">{competitor.rating}/5</span>
                                                                    {competitor.reviewCount && (
                                                                        <span className="text-muted-foreground ml-1">
                                                                            ({competitor.reviewCount} reviews)
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {competitor.distance && !competitor.rating && (
                                                                <div className="flex items-center gap-1 text-muted-foreground">
                                                                    <MapPin className="h-4 w-4" />
                                                                    <span className="font-medium">
                                                                        {(competitor.distance / 1000).toFixed(1)} km away
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex flex-col gap-2">
                                                    {competitor.googleMapsUri ? (
                                                        <Button asChild size="sm" className="whitespace-nowrap">
                                                            <a href={competitor.googleMapsUri} target="_blank" rel="noopener noreferrer">
                                                                View on Maps
                                                            </a>
                                                        </Button>
                                                    ) : competitor.website || competitor.domain ? (
                                                        <Button asChild size="sm" variant="outline" className="whitespace-nowrap">
                                                            <a href={competitor.website || `https://${competitor.domain}`} target="_blank" rel="noopener noreferrer">
                                                                Visit Website
                                                            </a>
                                                        </Button>
                                                    ) : null}
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            toggleExpand(competitor.id)
                                                        }}
                                                    >
                                                        {expandedCompetitor === competitor.id ? (
                                                            <>
                                                                <EyeOff className="h-4 w-4 mr-2" />
                                                                Hide Details
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Eye className="h-4 w-4 mr-2" />
                                                                View Details
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>

                                            {expandedCompetitor === competitor.id && (
                                                <div className="mt-4 pt-4 border-t">
                                                    <h4 className="text-sm font-semibold mb-3">Keyword rankings</h4>
                                                    <div className="space-y-2">
                                                        {competitor.keywordRankings.map((kr, idx) => (
                                                            <div key={idx} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                                                                <div className="flex-1">
                                                                    <span className="text-sm font-medium">{kr.keyword}</span>
                                                                    {kr.title && (
                                                                        <p className="text-xs text-muted-foreground truncate mt-1">{kr.title}</p>
                                                                    )}
                                                                </div>
                                                                <Badge
                                                                    variant="outline"
                                                                    className={`ml-2 ${kr.rank <= 3
                                                                        ? "bg-green-100 text-green-800 border-green-200"
                                                                        : kr.rank <= 10
                                                                            ? "bg-blue-100 text-blue-800 border-blue-200"
                                                                            : "bg-yellow-100 text-yellow-800 border-yellow-200"
                                                                        }`}
                                                                >
                                                                    #{kr.rank}
                                                                </Badge>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {showMap && (
                            <div className="lg:sticky lg:top-6 lg:self-start space-y-4">
                                <div className="h-[450px] rounded-lg overflow-hidden shadow-lg">
                                    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}>
                                        <Map
                                            center={getMapCenter()}
                                            zoom={getMapZoom()}
                                            mapId="competitor-analysis-map"
                                            className="w-full h-full"
                                            clickableIcons={false}
                                            disableDefaultUI={true}
                                        >
                                            {coordinates && (
                                                <AdvancedMarker position={coordinates}>
                                                    <Pin background="#3b82f6" borderColor="#1e40af" glyphColor="#ffffff">
                                                        <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                                                    </Pin>
                                                </AdvancedMarker>
                                            )}

                                            {sorted.map((competitor, index) => {
                                                const mockCoords = coordinates
                                                    ? {
                                                        lat: coordinates.lat + (Math.random() - 0.5) * 0.02,
                                                        lng: coordinates.lng + (Math.random() - 0.5) * 0.02,
                                                    }
                                                    : { lat: 40.7128, lng: -74.006 }

                                                return (
                                                    <AdvancedMarker
                                                        key={`${competitor.id}-${index}-pin`}
                                                        position={competitor.coordinates || mockCoords}
                                                        onClick={() => selectCompetitor(competitor)}
                                                    >
                                                        <Pin
                                                            background={selectedCompetitor?.id === competitor.id ? "#ef4444" : "#10b981"}
                                                            borderColor={selectedCompetitor?.id === competitor.id ? "#dc2626" : "#059669"}
                                                            glyphColor="#ffffff"
                                                        >
                                                            <div className="text-xs font-bold text-white">#{competitor.rank}</div>
                                                        </Pin>
                                                    </AdvancedMarker>
                                                )
                                            })}
                                        </Map>
                                    </APIProvider>
                                </div>

                                {selectedCompetitor && (
                                    <Card>
                                        <CardContent>
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <Badge variant="default" className="text-sm font-bold">
                                                        #{selectedCompetitor.rank}
                                                    </Badge>
                                                    <h4 className="font-semibold text-lg truncate">{selectedCompetitor.name}</h4>
                                                </div>

                                                <p className="text-sm text-muted-foreground">
                                                    {selectedCompetitor.address || selectedCompetitor.domain || "Online competitor"}
                                                </p>

                                                <div className="grid grid-cols-3 gap-4 text-center py-3 bg-muted/50 rounded-lg border">
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">Best Rank</p>
                                                        <p className="text-2xl font-bold text-green-600">#{selectedCompetitor.bestRank}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">Average</p>
                                                        <p className="text-2xl font-bold">#{Math.round(selectedCompetitor.averageRank || 0)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">Keywords</p>
                                                        <p className="text-2xl font-bold">{selectedCompetitor.totalKeywordsRanked}</p>
                                                    </div>
                                                </div>

                                                {(selectedCompetitor.rating || selectedCompetitor.reviewCount || selectedCompetitor.distance) && (
                                                    <div className="flex flex-wrap gap-4 text-sm pt-2 border-t">
                                                        {selectedCompetitor.rating && (
                                                            <div className="flex items-center gap-1">
                                                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                                                <span>{selectedCompetitor.rating}/5</span>
                                                                {selectedCompetitor.reviewCount && (
                                                                    <span className="text-muted-foreground ml-1">
                                                                        ({selectedCompetitor.reviewCount} reviews)
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                        {selectedCompetitor.distance && (
                                                            <div className="flex items-center gap-1">
                                                                <MapPin className="h-4 w-4" />
                                                                <span>{(selectedCompetitor.distance / 1000).toFixed(1)} km away</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="flex flex-col gap-2 pt-3">
                                                    {selectedCompetitor.googleMapsUri && (
                                                        <Button asChild size="sm" className="w-full">
                                                            <a href={selectedCompetitor.googleMapsUri} target="_blank" rel="noopener noreferrer">
                                                                View on Google Maps
                                                            </a>
                                                        </Button>
                                                    )}
                                                    {(selectedCompetitor.website || selectedCompetitor.domain) && (
                                                        <Button asChild size="sm" variant="outline" className="w-full">
                                                            <a href={selectedCompetitor.website || `https://${selectedCompetitor.domain}`} target="_blank" rel="noopener noreferrer">
                                                                Visit Website
                                                            </a>
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </TooltipProvider>
        </PlanGate>
    )
}