"use client"
import { useState } from "react"
import { useCompetitors } from "@/hooks/useCompetitors"
import ErrorRender from "@/components/Error"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { RefreshCw, Star, Info, Eye, EyeOff, TrendingUp, AlertCircle, MapPin, Clock, CheckCircle } from "lucide-react"
import { Loader } from "../Loader/Loader"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { APIProvider, Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps"

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

    const getMapCenter = () => {
        if (selectedCompetitor?.coordinates) {
            return selectedCompetitor.coordinates
        }
        return coordinates || { lat: 40.7128, lng: -74.006 }
    }

    if (loading) {
        return <Loader text="Analyzing competitor rankings..." />
    }

    if (error) {
        return <ErrorRender error={"We couldn't load competitor data. You can retry or report the issue."} />
    }

    // No keywords tracked state
    if (!hasKeywords || trackedKeywordsCount === 0) {
        return (
            <TooltipProvider>
                <div className="space-y-6 max-w-8xl">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl">Competitor Rankings</CardTitle>
                        </CardHeader>
                    </Card>

                    <Card>
                        <CardContent className="text-center py-16">
                            <div className="mx-auto mb-6 h-24 w-24 rounded-full bg-muted flex items-center justify-center">
                                <TrendingUp className="h-12 w-12 text-muted-foreground" />
                            </div>
                            <h3 className="text-2xl font-semibold mb-3">No Keywords Tracked Yet</h3>
                            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                                Add keywords to your tracker to see which competitors are ranking for those terms
                            </p>
                            <Alert className="max-w-lg mx-auto">
                                <Info className="h-4 w-4" />
                                <AlertTitle>How it works</AlertTitle>
                                <AlertDescription>
                                    Once you add keywords to track, we'll analyze the search results and show you which
                                    competitors are ranking for those terms, along with their positions.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                </div>
            </TooltipProvider>
        )
    }

    // No competitors found but has keywords
    if (competitors.length === 0 && hasKeywords) {
        return (
            <TooltipProvider>
                <div className="space-y-6 max-w-8xl">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center flex-wrap gap-4">
                                <CardTitle className="text-2xl">Competitor Rankings</CardTitle>
                                <Button onClick={handleRefresh} disabled={loading} variant="outline" size="sm">
                                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                                    Refresh Data
                                </Button>
                            </div>
                        </CardHeader>
                    </Card>

                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>No Competitor Data Available</AlertTitle>
                        <AlertDescription>
                            You're tracking {trackedKeywordsCount} keyword{trackedKeywordsCount !== 1 ? 's' : ''},
                            but we haven't found any competitors in the search results yet. This could mean:
                            <ul className="list-disc list-inside mt-2 space-y-1">
                                <li>Your keywords are very new and need time to gather data</li>
                                <li>Your business is dominating all tracked keywords</li>
                                <li>The search results haven't been updated recently</li>
                            </ul>
                        </AlertDescription>
                    </Alert>
                </div>
            </TooltipProvider>
        )
    }

    return (
        <TooltipProvider>
            <div className="space-y-6 max-w-8xl">
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center flex-wrap gap-4">
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-2xl">Top {competitors.length} Competitors</CardTitle>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Info className="h-4 w-4 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Competitors ranked by their average position across {trackedKeywordsCount} tracked keywords</p>
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
                                        <Button
                                            onClick={handleRefresh}
                                            disabled={loading}
                                            variant="outline"
                                            size="sm"
                                        >
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

                        <div className="text-sm text-muted-foreground mt-2">
                            Based on {trackedKeywordsCount} tracked keyword{trackedKeywordsCount !== 1 ? 's' : ''}
                        </div>
                    </CardHeader>
                </Card>

                <div className={`grid gap-6 ${showMap ? "lg:grid-cols-2" : "grid-cols-1"}`}>
                    <div className="space-y-4">
                        {competitors.map((competitor) => (
                            <Card
                                key={competitor.id}
                                className={`hover:shadow-md transition-all cursor-pointer ${selectedCompetitor?.id === competitor.id ? "ring-2 ring-primary" : ""}`}
                                onClick={() => setSelectedCompetitor(competitor)}
                            >
                                <CardContent className="p-6">
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
                                                </div>

                                                <p className="text-muted-foreground text-sm">
                                                    {competitor.address || competitor.domain || 'No address available'}
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
                                                                <span className="font-medium">Avg: #{competitor.averageRank}</span>
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Average position across all keywords</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                    <Tooltip>
                                                        <TooltipTrigger>
                                                            <Badge variant="secondary">
                                                                {competitor.totalKeywordsRanked} keyword{competitor.totalKeywordsRanked !== 1 ? 's' : ''}
                                                            </Badge>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Number of tracked keywords this competitor ranks for</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </div>

                                                {(competitor.rating || competitor.reviewCount || competitor.distance) && (
                                                    <div className="flex items-center gap-4 text-sm flex-wrap pt-2 border-t">
                                                        {competitor.rating && (
                                                            <Tooltip>
                                                                <TooltipTrigger>
                                                                    <div className="flex items-center gap-1">
                                                                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                                                        <span className="font-medium">{competitor.rating}/5</span>
                                                                    </div>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Google rating</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                        {competitor.reviewCount && (
                                                            <span className="text-muted-foreground">({competitor.reviewCount} reviews)</span>
                                                        )}
                                                        {competitor.distance && (
                                                            <Tooltip>
                                                                <TooltipTrigger>
                                                                    <div className="flex items-center gap-1 text-muted-foreground">
                                                                        <MapPin className="h-4 w-4" />
                                                                        <span className="font-medium">{(competitor.distance / 1000).toFixed(1)} km away</span>
                                                                    </div>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Distance from your business location</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                {competitor.googleMapsUri ? (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button asChild size="sm" className="whitespace-nowrap">
                                                                <a href={competitor.googleMapsUri} target="_blank" rel="noopener noreferrer">
                                                                    View on Maps
                                                                </a>
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Open competitor's location in Google Maps</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                ) : competitor.website || competitor.domain ? (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button asChild size="sm" className="whitespace-nowrap">
                                                                <a href={competitor.website || `https://${competitor.domain}`} target="_blank" rel="noopener noreferrer">
                                                                    Visit Website
                                                                </a>
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Open competitor's website</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                ) : null}

                                                {/* <Button 
                                                    variant="outline" 
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleExpand(competitor.id);
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
                                                </Button> */}
                                                <></>
                                            </div>
                                        </div>

                                        {/* Expanded keyword rankings */}
                                        {expandedCompetitor === competitor.id && (
                                            <div className="mt-4 pt-4 border-t">
                                                <h4 className="text-sm font-semibold mb-3">Keyword Rankings:</h4>
                                                <div className="space-y-2">
                                                    {competitor.keywordRankings.map((kr, idx) => (
                                                        <div key={idx} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                                                            <div className="flex-1">
                                                                <span className="text-sm font-medium">{kr.keyword}</span>
                                                                {kr.title && (
                                                                    <p className="text-xs text-muted-foreground truncate mt-1">
                                                                        {kr.title}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <Badge
                                                                variant="outline"
                                                                className={`ml-2 ${kr.rank <= 3 ? 'bg-green-100 text-green-800 border-green-200' :
                                                                    kr.rank <= 10 ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                                                        'bg-yellow-100 text-yellow-800 border-yellow-200'
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
                        <div className="lg:sticky lg:top-6 lg:self-start">
                            <div className="h-[450px]">
                                <div className="p-0 h-[calc(100%-60px)] rounded-md">
                                    <div className="w-full h-full rounded-lg overflow-hidden">
                                        <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}>
                                            <Map
                                                defaultCenter={getMapCenter()}
                                                defaultZoom={selectedCompetitor ? 15 : 12}
                                                style={{ borderRadius: "10px" }}
                                                mapId="competitor-analysis-map"
                                                className="w-full h-full rounded-md custom-map"
                                                clickableIcons={false}
                                                options={{
                                                    disableDefaultUI: true, // removes all controls
                                                }}
                                            >
                                                {coordinates && (
                                                    <AdvancedMarker position={coordinates}>
                                                        <Pin background="#3b82f6" borderColor="#1e40af" glyphColor="#ffffff">
                                                            <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                                                        </Pin>
                                                    </AdvancedMarker>
                                                )}

                                                {competitors.map((competitor) => {
                                                    const mockCoords = {
                                                        lat: (coordinates?.lat || 40.7128) + (Math.random() - 0.5) * 0.01,
                                                        lng: (coordinates?.lng || -74.006) + (Math.random() - 0.5) * 0.01,
                                                    }

                                                    return (
                                                        <AdvancedMarker
                                                            key={competitor.id}
                                                            position={competitor.coordinates || mockCoords}
                                                            onClick={() => setSelectedCompetitor(competitor)}
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
                                </div>
                            </div>

                            {selectedCompetitor && (
                                <Card className="mt-4">
                                    <CardContent className="p-3">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="default" className="text-xs">
                                                    #{selectedCompetitor.rank}
                                                </Badge>
                                                <h4 className="font-medium text-sm truncate">{selectedCompetitor.name}</h4>
                                            </div>
                                            <p className="text-xs text-muted-foreground line-clamp-1">
                                                {selectedCompetitor.address || selectedCompetitor.domain || 'No address'}
                                            </p>
                                            <div className="flex items-center gap-3 text-xs">
                                                {selectedCompetitor.rating && (
                                                    <div className="flex items-center gap-1">
                                                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                                        <span>{selectedCompetitor.rating}/5</span>
                                                    </div>
                                                )}
                                                {selectedCompetitor.reviewCount && (
                                                    <span className="text-muted-foreground">({selectedCompetitor.reviewCount} reviews)</span>
                                                )}
                                                {selectedCompetitor.distance && (
                                                    <div className="flex items-center gap-1">
                                                        <MapPin className="h-3 w-3" />
                                                        <span>{(selectedCompetitor.distance / 1000).toFixed(1)} km away</span>
                                                    </div>
                                                )}
                                            </div>
                                            {selectedCompetitor.googleMapsUri && (
                                                <Button asChild size="sm" className="w-full h-7 text-xs">
                                                    <a href={selectedCompetitor.googleMapsUri} target="_blank" rel="noopener noreferrer">
                                                        View on Google Maps
                                                    </a>
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </TooltipProvider>
    )
}