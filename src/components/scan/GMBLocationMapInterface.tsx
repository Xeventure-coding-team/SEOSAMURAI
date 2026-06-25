"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import dynamic from "next/dynamic"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  MapPin,
  AlertCircle,
  RefreshCw,
  Loader2,
  CheckCircle,
  Search,
  X,
  Menu,
  RotateCcw,
  Star,
} from "lucide-react"
import { useGMBStore } from "@/store/gmbStore"
import { cn } from "@/lib/utils"
import { UsageGate } from "../usage-gate"
import { Skeleton } from "../ui/skeleton"
import { ScrollArea } from "../ui/scroll-area"

const DynamicMap = dynamic(() => import("./map-component"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 bg-muted flex items-center justify-center">
      <div className="flex items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-lg font-medium">Loading map...</span>
      </div>
    </div>
  ),
})

export interface Competitor {
  id: string
  name: string
  averageRank: number
  appearances: number
  shareOfVoice: number
  good: number
  average: number
  poor?: number
  outOfTop20: number
  rating?: number
  userRatingCount?: number
  address?: string
}

interface Location {
  id: string
  name: string
  title: string
  location_id: string
  last_rank_updated: string
  displayName: string
  profile?: { description?: string }
  websiteUri?: string
  categories?: {
    primaryCategory?: { displayName: string }
    additionalCategories?: Array<{ displayName: string }>
  }
  storefrontAddress?: {
    addressLines?: string[]
    locality?: string
    administrativeArea?: string
    postalCode?: string
    regionCode?: string
  }
}

interface LocationDetails {
  data: {
    name: string
    storeCode?: string
    profile?: { description?: string }
    categories?: {
      primaryCategory?: { displayName: string }
      additionalCategories?: Array<{ displayName: string }>
    }
    metadata?: { placeId?: string }
  }
  locationData?: {
    name: string
    rating?: number
    formatted_address?: string
    geometry?: { location: { lat: number; lng: number } }
    opening_hours?: { weekday_text: string[] }
    website?: string
    reviews?: Array<{ author_name: string; rating: number; text: string; time: number }>
  }
  reviews?: {
    reviews?: Array<{
      reviewer?: { displayName: string }
      starRating: string
      comment: string
      createTime: string
    }>
    totalReviewCount?: number
    averageRating?: number
  }
  media?: {
    mediaItems?: Array<{ mediaFormat: string; googleUrl: string; name: string }>
  }
}

export interface GridRankResponse {
  success: boolean
  data: GridRankData
}

export interface GridRankData {
  businessName: string
  center: LatLng
  distance: string
  gridSize: string
  keyword: string
  metadata: Metadata
  rankings: Ranking[]
  summary: Summary
  totalGridPoints: number
  competitors: Competitor[]
}

export interface LatLng { lat: number; lng: number }

export interface Metadata {
  detectedFromGMB: boolean
  autoDetectedNames: string[]
  keywordsUsed: string[]
  placeIdProvided: boolean
  searchStrategy: string
}

export interface Ranking {
  gridPoint: GridPoint
  rank: number
  businessFound: boolean
  detectedBusinessName?: string
  matchDetails?: string
  results?: SearchResult[]
}

export interface GridPoint extends LatLng { index: number }

export interface SearchResult {
  id: string
  displayName: { text: string; languageCode: string }
  formattedAddress?: string
  rating?: number
  userRatingCount?: number
  categories?: Array<{ displayName: { text: string; languageCode: string } }>
  location?: LatLng
  primaryType?: string
  primaryTypeDisplayName?: { text: string; languageCode: string }
}

export interface Summary {
  averageRank: number
  bestRank: number
  worstRank: number
  visibilityPercentage: number
  topRankings: number
  [key: string]: number | undefined
}

interface LocationApiResponse {
  location: LocationDetails
  scheduledPosts: any[]
}

// ── Metric Pill ───────────────────────────────────────────────────────────────
function MetricPill({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col items-center px-4 border-r border-border last:border-0 shrink-0">
      <span className="text-[10px] text-muted-foreground whitespace-nowrap mb-0.5">{label}</span>
      <span className={cn("text-lg font-bold tabular-nums", color ?? "text-foreground")}>{value}</span>
    </div>
  )
}


export default function GMBLocationMapInterface() {
  const [locations, setLocations] = useState<Location[]>([])
  const [selectedLocation, setSelectedLocation] = useState<string>("")
  const [locationDetails, setLocationDetails] = useState<LocationDetails | null>(null)
  const [loadingLocations, setLoadingLocations] = useState(true)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mapKey, setMapKey] = useState(0)

  const [keywords, setKeywords] = useState("")
  const [keywordsList, setKeywordsList] = useState<string[]>([])
  const [gridSize, setGridSize] = useState("9 (3X3)")
  const [distance, setDistance] = useState("1 Mile")
  const [zoomLevel, setZoomLevel] = useState("Default Zoom Level")

  const [gridData, setGridData] = useState<GridRankData | null>(null)
  const [loadingGrid, setLoadingGrid] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const mapCenter: [number, number] = useMemo(() => {
    if (locationDetails?.locationData?.geometry?.location) {
      const { lat, lng } = locationDetails.locationData.geometry.location
      return [lat, lng]
    }
    return [11.6854, 76.1319]
  }, [locationDetails])

  const gmbAccountId = useGMBStore((state) => state.accountId)
  const accessToken = useGMBStore((state) => state.accessToken)
  const hasValidCredentials = gmbAccountId && accessToken

  const isSubmitDisabled = useMemo(() => {
    const hasLocation = !!selectedLocation?.trim()
    const hasKeywords = keywordsList.length > 0
    const notLoading = !loadingGrid && !loadingDetails && !loadingLocations
    return !hasLocation || !hasKeywords || !notLoading
  }, [selectedLocation, keywordsList, loadingGrid, loadingDetails, loadingLocations])

  const selectedLocationObj = useMemo(
    () => locations.find((l) => l.name === selectedLocation),
    [locations, selectedLocation]
  )

  const summary = gridData?.summary;
  const total = gridData?.totalGridPoints;

  const avgRank = summary?.averageRank;
  const visibility = summary?.visibilityPercentage;

  const good = (summary?.topRankings ?? 0) + (summary?.goodRankings ?? 0);
  const average = summary?.poorRankings ?? 0;
  const out = summary?.notFound ?? 0;

  const topResults: SearchResult[] = useMemo(() => {
    if (!gridData?.rankings) return []
    const seen = new Map<string, { result: SearchResult; rank: number }>()
    gridData.rankings.forEach((r) => {
      r.results?.forEach((res, i) => {
        const existing = seen.get(res.id)
        if (!existing || i + 1 < existing.rank) seen.set(res.id, { result: res, rank: i + 1 })
      })
    })
    return Array.from(seen.values())
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 10)
      .map((x) => x.result)
  }, [gridData])

  const fetchLocations = async () => {
    if (!accessToken) { setError("Access token missing. Please re-authenticate."); setLoadingLocations(false); return }
    try {
      setLoadingLocations(true)
      setError(null)
      const response = await fetch(`/api/gmb/locations?accessToken=${accessToken}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      const data = await response.json()
      if (data.accounts?.length > 0) setLocations(data.accounts)
      // Remove this line 👇
      // else setError("No business locations found. Check your GMB account.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch locations")
    } finally {
      setLoadingLocations(false)
    }
  }

  const fetchLocationDetails = async (locationName: string) => {
    if (!accessToken || !gmbAccountId) { setError("Missing credentials. Please re-authenticate."); return }
    try {
      setLoadingDetails(true)
      setError(null)
      const actualLocationId = locationName.startsWith("locations/") ? locationName.split("/")[1] : locationName
      const apiUrl = process.env.NEXT_PUBLIC_API_URL
      const url = `${apiUrl}/api/gmb/location?location_name=${encodeURIComponent(actualLocationId)}&access_token=${encodeURIComponent(accessToken)}&gmb_account_id=${encodeURIComponent(gmbAccountId)}`
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      const data: LocationApiResponse = await response.json()
      if (data?.location) setLocationDetails(data.location)
      else setError("No details found for this location.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch location details")
    } finally {
      setLoadingDetails(false)
    }
  }

  const fetchGridData = async (
    selectedLocation: string,
    gridSize: string,
    distance: string,
  ) => {
    try {
      setLoadingGrid(true)

      const location = locations.find((l) => l.id === selectedLocation)
      if (!location) throw new Error("Location not found")

      if (!locationDetails?.locationData?.geometry?.location) {
        throw new Error("Location coordinates not available")
      }

      const { lat, lng } = locationDetails.locationData.geometry.location

      // ✅ Resolve businessName and placeId from locationDetails directly
      const businessName = locationDetails?.locationData?.name || location?.displayName || location?.title
      const businessPlaceId = locationDetails?.data?.metadata?.placeId

      if (!businessName) throw new Error("Business name not available")

      const response = await fetch("/api/grid/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          center: { lat, lng },
          gridSize,
          distance,
          keywordsList,
          businessName,       // ✅ resolved from locationDetails
          businessPlaceId,    // ✅ resolved from locationDetails
          location_name: selectedLocation,
          newAccessToken: accessToken,
        }),
      })

      if (!response.ok) throw new Error(`Failed to fetch grid data: ${response.statusText}`)

      const data: GridRankResponse = await response.json()

      if (!data.success) throw new Error(data.error || "Failed to generate grid data")

      setGridData(data?.data)
      setMapKey((k) => k + 1)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to generate grid data")
    } finally {
      setLoadingGrid(false)
    }
  }

  const handleLocationSelect = (locationName: string) => {
    setSelectedLocation(locationName)
    setLocationDetails(null)
    setGridData(null)
    fetchLocationDetails(locationName)
  }

  const handleRetry = () => { setError(null); fetchLocations() }

  // In handleStartScan
  const handleStartScan = () => {
    if (!selectedLocation) { setError("Please select a business location first"); return }
    if (keywordsList.length === 0) { setError("Please add at least one keyword"); return }
    if (!gridData) {
      fetchGridData(selectedLocation, gridSize, distance) // ✅ no more businessName/placeId params
    }
  }

  useEffect(() => {
    if (hasValidCredentials) fetchLocations()
    else { setError("Please authenticate with Google My Business first"); setLoadingLocations(false) }
  }, [hasValidCredentials])

  const getLocationDisplayName = (location: Location) =>
    location.title || location.name.split("/").pop() || "Unknown Location"

  const getLocationAddress = (location: Location) => {
    if (location.storefrontAddress) {
      const { addressLines, locality, administrativeArea } = location.storefrontAddress
      return [...(addressLines || []), locality, administrativeArea].filter(Boolean).join(", ")
    }
    return "Address not available"
  }

  if (loadingLocations) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
            <div className="space-y-3 pl-14">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </Card>
      </div>
    )
  }



  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">

      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <div className="border-b border-border bg-card shrink-0">

        {/* Metrics + scan button row */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">

          <div className="flex items-center text-xs divide-x divide-border overflow-x-auto">
            <MetricPill
              label="Avg"
              value={avgRank ? avgRank.toFixed(1) : "—"}
            />

            <MetricPill
              label="SOV"
              value={visibility !== undefined ? `${visibility}%` : "—"}
            />

            <MetricPill
              label="Good"
              value={total ? Math.round((good / total) * 100) + "%" : "—"}
              color="text-emerald-600"
            />

            <MetricPill
              label="Avg"
              value={total ? Math.round((average / total) * 100) + "%" : "—"}
              color="text-amber-500"
            />

            <MetricPill
              label="Out"
              value={total ? Math.round((out / total) * 100) + "%" : "—"}
              color="text-red-500"
            />
          </div>

          <div className="ml-auto shrink-0">
            <UsageGate metric="geoGridScansUsed">
              <Button
                onClick={gridData ? () => setGridData(null) : handleStartScan}
                size="sm"
                className={cn("text-white", gridData ? "bg-red-500 hover:bg-red-600" : "")}
                disabled={isSubmitDisabled && !gridData}
              >
                {gridData ? (
                  <><RotateCcw className="mr-1.5 h-3.5 w-3.5" />Reset</>
                ) : loadingGrid ? (
                  <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Scanning...</>
                ) : (
                  <><Search className="mr-1.5 h-3.5 w-3.5" />Start Rank Scan</>
                )}
              </Button>
            </UsageGate>
          </div>
        </div>
      </div>

      {/* ── Error ───────────────────────────────────────────────────────────── */}
      {error && (
        <Alert variant="destructive" className="mx-4 mt-2 shrink-0">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={() => setError(null)} className="h-auto p-1">
              <X className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Mobile overlay */}
        {isSidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
        )}

        {/* ── Sidebar ───────────────────────────────────────────────────── */}
        <div className={cn(
          "w-80 bg-card border-r border-border flex flex-col shrink-0 overflow-hidden",
          "fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto",
          "transform transition-transform duration-300 ease-in-out lg:transform-none",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}>

          {/* Location selector + business card */}
          <div className="p-4 border-b border-border shrink-0 space-y-3">
            <Select value={selectedLocation} onValueChange={handleLocationSelect}>
              <SelectTrigger className="w-full h-9 text-sm">
                <SelectValue placeholder="Select a business location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{getLocationDisplayName(location)}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedLocationObj && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold truncate">{getLocationDisplayName(selectedLocationObj)}</span>
                  <Badge className="text-[10px] px-1.5 py-0 h-4 bg-primary text-primary-foreground shrink-0">You</Badge>
                </div>

                {locationDetails?.locationData?.rating && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "h-2.5 w-2.5",
                            i < Math.floor(locationDetails.locationData!.rating!)
                              ? "fill-yellow-400 text-yellow-400"
                              : "fill-muted text-muted"
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {locationDetails.locationData.rating}
                      {locationDetails.reviews?.totalReviewCount ? ` (${locationDetails.reviews.totalReviewCount})` : ""}
                    </span>
                    <div className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span className="border border-border rounded px-1.5 py-0.5">
                        SoV : {summary?.totalGridPoints ? Math.round((summary.topRankings / summary.totalGridPoints) * 100) + "%" : "—"}
                      </span>
                      <span className="border border-border rounded px-1.5 py-0.5">
                        AR : {summary?.averageRank ? summary.averageRank.toFixed(1) : "—"}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{getLocationAddress(selectedLocationObj)}</span>
                </div>
              </div>
            )}

            {loadingDetails && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />Loading details...
              </div>
            )}

            {locations.length === 0 && !loadingLocations && (
              <div className="flex items-center gap-2 text-xs text-amber-600">
                <AlertCircle className="h-3 w-3" />No locations found
                <Button variant="ghost" size="sm" onClick={handleRetry} className="text-primary p-0 h-auto text-xs">
                  <RefreshCw className="h-3 w-3 mr-1" />Retry
                </Button>
              </div>
            )}
          </div>

          {/* Scan controls */}
          <div className="p-4 border-b border-border shrink-0 space-y-3">
            <Input
              placeholder="Enter keyword"
              value={keywords}
              onChange={(e) => {
                const value = e.target.value
                setKeywords(value)
                setKeywordsList(value.trim() ? [value.trim()] : [])
              }}
              className="h-9 text-sm"
            />

            <div className="flex gap-2">
              <Select value={gridSize} onValueChange={setGridSize}>
                <SelectTrigger className="h-9 text-sm flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="9 (3X3)">3×3 Grid</SelectItem>
                  <SelectItem value="25 (5X5)">5×5 Grid</SelectItem>
                  <SelectItem value="49 (7X7)">7×7 Grid</SelectItem>
                  <SelectItem value="81 (9X9)">9×9 Grid</SelectItem>
                </SelectContent>
              </Select>
              <Select value={distance} onValueChange={setDistance}>
                <SelectTrigger className="h-9 text-sm flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.5 Mile">0.5 Mile</SelectItem>
                  <SelectItem value="1 Mile">1 Mile</SelectItem>
                  <SelectItem value="2 Miles">2 Miles</SelectItem>
                  <SelectItem value="5 Miles">5 Miles</SelectItem>
                  <SelectItem value="10 Miles">10 Miles</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loadingGrid && (
              <div className="flex items-center gap-2 text-xs text-primary">
                <Loader2 className="h-3 w-3 animate-spin" />Generating grid points...
              </div>
            )}
            {gridData && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                <CheckCircle className="h-3 w-3" />{gridData.totalGridPoints} grid points generated
              </div>
            )}
            {isSubmitDisabled && !gridData && (
              <p className="text-xs text-muted-foreground">
                {!selectedLocation ? "Select a location to continue" : keywordsList.length === 0 ? "Enter a keyword to continue" : ""}
              </p>
            )}
          </div>

          {/* Competitor list */}
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 360px)' }}>

            <div className="sticky top-0 backdrop-blur-sm px-3 py-2 border-b border-border z-10 bg-primary">
              <span className="text-[12px] font-semibold text-white uppercase tracking-wide">
                Competitors
              </span>
            </div>

            {gridData?.competitors?.length > 0 ? (
              <div className="pb-6">
                {[...gridData.competitors]
                  .sort((a, b) => b.shareOfVoice - a.shareOfVoice)
                  .map((comp, idx) => {
                    const isYou =
                      comp.id === selectedLocationObj?.location_id ||
                      comp.name?.toLowerCase().includes(
                        selectedLocationObj?.displayName?.toLowerCase() || ""
                      );

                    let badge = "W";
                    let badgeClasses = "bg-red-500 text-white";
                    let barColor = "bg-red-500";

                    if (comp.shareOfVoice >= 70) {
                      badge = "D";
                      badgeClasses = "bg-green-600 text-white";
                      barColor = "bg-green-600";
                    } else if (comp.shareOfVoice >= 40) {
                      badge = "S";
                      badgeClasses = "bg-yellow-500 text-white";
                      barColor = "bg-yellow-500";
                    }

                    return (
                      <div
                        key={comp.id}
                        className={`relative px-3 py-3 border-b border-border transition ${isYou ? "bg-background" : "hover:bg-muted/40"
                          }`}
                      >
                        {isYou && (
                          <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary" />
                        )}

                        {/* Row 1 */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 flex items-center gap-1.5 min-w-0">
                            <span className="text-[12px] font-semibold text-muted-foreground w-4 shrink-0">
                              {idx + 1}
                            </span>
                            <span className="font-semibold text-sm truncate">
                              {comp.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`font-bold w-5 h-5 flex items-center justify-center rounded-full text-[10px] shadow-sm ${badgeClasses}`}
                            >
                              {badge}
                            </span>

                            <span className="font-bold text-sm text-foreground">
                              #{comp.averageRank}
                            </span>
                          </div>
                        </div>

                        {/* Row 2 */}
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1.5">
                          <span className="font-semibold text-foreground/80">
                            {comp.shareOfVoice}% SOV
                          </span>

                          <span className="tabular-nums">
                            G:{comp.good} A:{comp.average} O:{comp.outOfTop20}
                          </span>
                        </div>

                        {/* Progress */}
                        <div className="h-2 bg-muted rounded-full mt-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${barColor}`}
                            style={{ width: `${comp.shareOfVoice}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="flex items-center justify-center py-10 text-xs text-muted-foreground">
                Run a scan to see competitors
              </div>
            )}


          </div>


        </div>

        {/* ── Map ─────────────────────────────────────────────────────────── */}
        <div className="flex-1 relative min-w-0">
          <DynamicMap
            mapKey={mapKey}
            center={mapCenter}
            locations={locations}
            zoomLevel={zoomLevel}
            selectedLocation={selectedLocation}
            locationDetails={locationDetails}
            data={gridData || []}
          />

          {(loadingDetails || loadingGrid || !gridData) && (
            <div className="absolute inset-0 bg-background/30 flex items-center justify-center backdrop-blur-sm">
              <Card className="p-5 shadow-lg">
                <div className="flex items-center gap-3">
                  {loadingDetails || loadingGrid ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span className="font-medium text-sm">
                        {loadingDetails ? "Loading location details..." : "Generating grid points..."}
                      </span>
                    </>
                  ) : (
                    <span className="font-medium text-sm text-muted-foreground">
                      Enter a keyword and press{" "}
                      <span className="text-primary font-semibold">Start Rank Scan</span>{" "}
                      to see results
                    </span>
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}