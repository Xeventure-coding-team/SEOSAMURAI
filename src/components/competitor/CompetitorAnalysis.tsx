"use client"
import { useState } from "react"
import { useCompetitors } from "@/hooks/useCompetitors"
import ErrorRender from "@/components/Error"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { RefreshCw, MapPin, Star, Clock, CheckCircle, MapIcon, Info, Eye, EyeOff } from "lucide-react"
import { APIProvider, Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps"
import { Loader } from "../Loader/Loader"

interface Competitor {
    id: string
    name: string
    address: string
    rating?: number
    reviewCount?: number
    distance: number
    googleMapsUri: string
    rank: number
    coordinates?: { lat: number; lng: number }
}

export function CompetitorAnalysisWithMap({
    locationId,
    businessType,
    coordinates,
}: {
    locationId: string
    businessType: string
    coordinates: { lat: number; lng: number } | null
}) {
    const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null)
    const [showMap, setShowMap] = useState(false)

    const { competitors, nextUpdateTime, canUpdate, hoursUntilNextUpdate, loading, error, refetch } = useCompetitors(
        locationId,
        businessType,
        coordinates,
    )

    const handleRefresh = async () => {
        if (canUpdate) {
            await refetch()
        }
    }

    function selectComponent(data: Competitor) {
        setSelectedCompetitor(data)
        setShowMap(true)
    }

    const getMapCenter = () => {
        if (selectedCompetitor?.coordinates) {
            return selectedCompetitor.coordinates
        }
        return coordinates || { lat: 40.7128, lng: -74.006 }
    }

    if (loading) {
        return <Loader text="Retrieving information..." />
    }

    if (error) {
        return <ErrorRender error={"We couldn't load this content. You can retry or report the issue."} />
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
                                        <p>Competitors are ranked by proximity and relevance to your business location</p>
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
                                            disabled={!canUpdate || loading}
                                            variant={canUpdate && !loading ? "default" : "secondary"}
                                            size="sm"
                                        >
                                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                                            {loading ? "Updating..." : "Update Data"}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>
                                            {canUpdate
                                                ? "Click to refresh competitor data with latest information"
                                                : `Data can be updated in ${Math.ceil(hoursUntilNextUpdate)} hours`}
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                        </div>

                        <div className="text-sm text-muted-foreground">
                            {canUpdate ? (
                                <div className="flex items-center gap-2 text-foreground">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                    <span className="font-medium">Update available now</span>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4" />
                                        <span>
                                            Next update available in:{" "}
                                            <span className="font-medium">{Math.ceil(hoursUntilNextUpdate)} hours</span>
                                        </span>
                                    </div>
                                    {nextUpdateTime && <p>Next update time: {nextUpdateTime.toLocaleString()}</p>}
                                </div>
                            )}
                        </div>
                    </CardHeader>
                </Card>

                <div className={`grid gap-6 ${showMap ? "lg:grid-cols-2" : "grid-cols-1"}`}>
                    <div className="space-y-4">
                        {competitors.map((competitor) => (
                            <Card
                                key={competitor.id}
                                className={`hover:shadow-md transition-all cursor-pointer ${selectedCompetitor?.id === competitor.id ? "ring-2 ring-primary" : ""
                                    }`}
                                onClick={() => selectComponent(competitor)}
                            >
                                <CardContent>
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
                                                        <p>Competitor ranking based on proximity and business relevance</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                                <h3 className="text-lg font-semibold text-foreground">{competitor.name}</h3>
                                            </div>

                                            <p className="text-muted-foreground">{competitor.address}</p>

                                            <div className="flex items-center gap-4 text-sm flex-wrap">
                                                {competitor.rating && (
                                                    <div className="flex items-center gap-1">
                                                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                                        <span className="font-medium">{competitor.rating}/5</span>
                                                    </div>
                                                )}
                                                {competitor.reviewCount && (
                                                    <span className="text-muted-foreground">({competitor.reviewCount} reviews)</span>
                                                )}
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
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button asChild size="sm" className="whitespace-nowrap">
                                                        <a href={competitor.googleMapsUri} target="_blank" rel="noopener noreferrer">
                                                            View on Maps
                                                        </a>
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Open this competitor's location in Google Maps</p>
                                                </TooltipContent>
                                            </Tooltip>
                                            <div className="text-xs text-muted-foreground text-center">Rank #{competitor.rank}</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        {competitors.length === 0 && !loading && (
                            <Card>
                                <CardContent className="text-center py-12">
                                    <div className="space-y-2">
                                        <p className="text-muted-foreground">No competitors found in your area.</p>
                                        <p className="text-sm text-muted-foreground">
                                            Try adjusting your search criteria or check back later.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
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
                                <Card>
                                    <CardContent className="p-3">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="default" className="text-xs">
                                                    #{selectedCompetitor.rank}
                                                </Badge>
                                                <h4 className="font-medium text-sm truncate">{selectedCompetitor.name}</h4>
                                            </div>
                                            <p className="text-xs text-muted-foreground line-clamp-1">{selectedCompetitor.address}</p>
                                            <div className="flex items-center gap-3 text-xs">
                                                {selectedCompetitor.rating && (
                                                    <div className="flex items-center gap-1">
                                                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                                        <span>{selectedCompetitor.rating}/5</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" />
                                                    <span>{(selectedCompetitor.distance / 1000).toFixed(1)} km away</span>
                                                </div>
                                            </div>
                                            <Button asChild size="sm" className="w-full h-7 text-xs">
                                                <a href={selectedCompetitor.googleMapsUri} target="_blank" rel="noopener noreferrer">
                                                    View on Google Maps
                                                </a>
                                            </Button>
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
