"use client"

import { useState, useRef } from "react"
import { AdvancedMarker, Map } from "@vis.gl/react-google-maps"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { MapPin, Trophy, Star, X } from "lucide-react"

interface GridPoint {
  lat: number
  lng: number
  index: number
}

interface SearchResult {
  id: string
  displayName: {
    text: string
    languageCode: string
  }
  formattedAddress?: string
  rating?: number
  userRatingCount?: number
  businessStatus?: string
  types?: string[]
}

interface RankingData {
  gridPoint: GridPoint
  rank: number
  businessFound: boolean
  detectedBusinessName?: string
  matchDetails?: string
  results?: SearchResult[]
}

interface GridData {
  center: {
    lat: number
    lng: number
  }
  gridSize: string
  distance: string
  rankings: RankingData[]
  summary: {
    averageRank: number
    bestRank: number
    worstRank: number
    visibilityPercentage: number
    topRankings: number
    goodRankings: number
    poorRankings: number
    notFound: number
    totalGridPoints: number
  }
  businessName?: string
  keyword?: string
}

interface GridRankingMapProps {
  data?: {
    center?: {
      lat: number
      lng: number
    }
    gridSize?: string
    distance?: string
    businessPlaceId?: string
    keyword?: string
    businessName?: string
    rankings?: RankingData[]
    summary?: {
      averageRank: number
      bestRank: number
      worstRank: number
      visibilityPercentage: number
      topRankings: number
      goodRankings: number
      poorRankings: number
      notFound: number
      totalGridPoints: number
    }
  }
  mapKey: number
  zoomLevel: string
}

export default function GridRankingMap({ data, mapKey, zoomLevel }: GridRankingMapProps) {
  const [selectedGridPoint, setSelectedGridPoint] = useState<RankingData | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const defaultCenter = { lat: 37.7749, lng: -122.4194 }
  const center = data?.center || defaultCenter
  const TARGET_BUSINESS_PLACE_ID = data?.businessPlaceId

  console.log(data)

  const getZoomLevel = (value: string): number => {
    switch (value) {
      case "Close Zoom":
        return 16
      case "Medium Zoom":
        return 14
      case "Far Zoom":
        return 12
      case "Default Zoom Level":
      default:
        return 14
    }
  }

  const rankings = data?.rankings || []

  const getRankColor = (rank: number | null | undefined): string => {
    if (rank == null) return "#ef4444" // handle null or undefined
    if (rank <= 3) return "#10b981" // green-500 - Excellent
    if (rank <= 7) return "#f59e0b" // yellow-500 - Good
    if (rank <= 10) return "#f97316" // orange-500 - Fair
    return "#ef4444" // red-500 - Poor/Not Found (rank 20+)
  }

  const getRankBadgeVariant = (rank: number): "default" | "secondary" | "destructive" | "outline" => {
    if (rank <= 3) return "default" // Green
    if (rank <= 7) return "secondary" // Yellow
    if (rank <= 10) return "outline" // Orange
    return "destructive" // Red for rank 20+
  }

  const handleMarkerClick = (ranking: RankingData) => {
    setSelectedGridPoint(ranking)
    setIsSheetOpen(true)
  }

  const GridMarker = ({ ranking }: { ranking: RankingData }) => {
    const isTargetBusinessFound = ranking.businessFound
    const actualRank = ranking.rank

    // Determine display rank - use the actual rank if business is found, otherwise show 20+
    const displayRank = isTargetBusinessFound && actualRank ? actualRank : 20

    // Determine color based on the actual rank
    const color = isTargetBusinessFound && actualRank ? getRankColor(actualRank) : "#ef4444" // red for not found

    return (
      <div
        className="w-12 h-12 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-white font-bold text-sm cursor-pointer transform transition-all duration-200 hover:scale-110 relative z-10"
        style={{ backgroundColor: color }}
        onClick={() => handleMarkerClick(ranking)}
      >
        {displayRank >= 20 ? "20+" : displayRank}
        {displayRank <= 3 && <Trophy className="w-3 h-3 absolute -top-1 -right-1 text-yellow-400" />}
        {displayRank >= 20 && <X className="w-3 h-3 absolute -top-1 -right-1 text-white" />}
      </div>
    )
  }

  return (
    <div className="h-full w-full relative" ref={mapRef}>
      <Map
        key={mapKey}
        defaultCenter={center}
        defaultZoom={getZoomLevel(zoomLevel)}
        mapId="grid-ranking-map"
        className="w-full h-full"
        clickableIcons={false}
      >
        {rankings.map((ranking) => (
          <AdvancedMarker
            key={ranking.gridPoint.index}
            position={{ lat: ranking.gridPoint.lat, lng: ranking.gridPoint.lng }}
          >
            <GridMarker ranking={ranking} />
          </AdvancedMarker>
        ))}
      </Map>

      <Card className="absolute bottom-4 right-4 bg-card/95 backdrop-blur-sm border-border/50">
        <CardContent className="p-4">
          <div className="space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Ranking Legend
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                <span>Rank 1-3 (Excellent)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded-full border-2 border-white" />
                <span>Rank 4-7 (Good)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 rounded-full border-2 border-white" />
                <span>Rank 8-10 (Fair)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white" />
                <span>Rank 20+ (Not Found)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="flex flex-col h-full sm:max-w-2xl p-0" side="right">
          <SheetHeader className="p-6 pb-4 border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <SheetTitle className="flex items-center gap-2 text-xl">
                  <MapPin className="w-5 h-5 text-primary" />
                  Grid Point {(selectedGridPoint?.gridPoint?.index || 0) + 1}
                </SheetTitle>
                <SheetDescription className="text-sm mt-1">
                  {selectedGridPoint?.gridPoint?.lat?.toFixed(6)}, {selectedGridPoint?.gridPoint?.lng?.toFixed(6)}
                </SheetDescription>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 mt-4">
              <div className="text-center">
                <div className="text-lg font-bold" style={{ color: getRankColor(selectedGridPoint?.rank || 0) }}>
                  #{selectedGridPoint?.rank || "N/A"}
                </div>
                <div className="text-xs text-muted-foreground">Current</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">#{data?.summary?.bestRank || "N/A"}</div>
                <div className="text-xs text-muted-foreground">Best</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">
                  #{data?.summary?.averageRank ? data.summary.averageRank.toFixed(1) : "N/A"}
                </div>
                <div className="text-xs text-muted-foreground">Average</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">{data?.summary?.visibilityPercentage || 0}%</div>
                <div className="text-xs text-muted-foreground">Visibility</div>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Complete Search Results
                </h3>
                <Badge variant="outline" className="text-sm">
                  {selectedGridPoint?.results?.length || 0} businesses found
                </Badge>
              </div>

              <div className="space-y-3">
                {selectedGridPoint?.results && selectedGridPoint.results.length > 0 ? (
                  selectedGridPoint.results.map((result, index) => {
                    const actualRank = index + 1
                    const isTargetBusiness =
                      result.id === TARGET_BUSINESS_PLACE_ID ||
                      (selectedGridPoint?.detectedBusinessName &&
                        result.displayName?.text
                          ?.toLowerCase()
                          .includes(selectedGridPoint.detectedBusinessName.toLowerCase()))

                    const displayRank = actualRank

                    return (
                      <Card
                        key={result.id}
                        className={`hover:shadow-md transition-all duration-200 border hover:border-primary/20 ${
                          isTargetBusiness ? "ring-2 ring-primary/20 bg-primary/5" : ""
                        }`}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1">
                              <Badge
                                variant={getRankBadgeVariant(displayRank)}
                                className="text-sm font-mono min-w-[2.5rem] justify-center py-1 px-2 font-bold shrink-0"
                                style={{
                                  backgroundColor: isTargetBusiness ? getRankColor(actualRank) : undefined,
                                  color: isTargetBusiness ? "white" : undefined,
                                }}
                              >
                                #{actualRank}
                              </Badge>
                              <div className="flex-1 space-y-2 min-w-0">
                                <h4 className="font-semibold text-base leading-tight break-words">
                                  {result.displayName?.text || "Unknown Business"}
                                  {isTargetBusiness && (
                                    <span className="ml-2 text-xs text-primary font-normal">(Your Business)</span>
                                  )}
                                </h4>
                                {result.formattedAddress && (
                                  <p className="text-sm text-muted-foreground flex items-start gap-2">
                                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <span className="break-words">{result.formattedAddress}</span>
                                  </p>
                                )}
                              </div>
                            </div>

                            {result.rating && (
                              <div className="flex items-center gap-2 bg-muted px-2 py-1 rounded text-sm shrink-0">
                                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                <span className="font-semibold">{result.rating}</span>
                                {result.userRatingCount && (
                                  <span className="text-muted-foreground">({result.userRatingCount})</span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-wrap mt-3">
                            {result.businessStatus && (
                              <Badge variant="outline" className="text-xs">
                                {result.businessStatus.toLowerCase().replace("_", " ")}
                              </Badge>
                            )}
                            {result.types &&
                              result.types.slice(0, 2).map((type, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {type.replace(/_/g, " ")}
                                </Badge>
                              ))}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })
                ) : (
                  <Card className="border-dashed border-2">
                    <CardContent className="text-center py-12">
                      <MapPin className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                      <h4 className="font-semibold text-lg mb-2">No Search Results</h4>
                      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                        No businesses were found for this grid point. This could indicate a data collection issue or
                        sparse business density in this area.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
