"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import dynamic from "next/dynamic"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  MapPin,
  AlertCircle,
  RefreshCw,
  Building2,
  Loader2,
  CheckCircle,
  Search,
  Info,
  X,
  Grid3X3,
  Zap,
  Menu,
  RotateCcw,
} from "lucide-react"
import { useGMBStore } from "@/store/gmbStore"
import { cn } from "@/lib/utils"

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

interface Location {
  name: string
  title: string
  location_id: string
  last_rank_updated: string
  profile?: {
    description?: string
  }
  websiteUri?: string
  categories?: {
    primaryCategory?: {
      displayName: string
    }
    additionalCategories?: Array<{
      displayName: string
    }>
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
    profile?: {
      description?: string
    }
    categories?: {
      primaryCategory?: {
        displayName: string
      }
      additionalCategories?: Array<{
        displayName: string
      }>
    }
    metadata?: {
      placeId?: string
    }
  }
  locationData?: {
    name: string
    rating?: number
    formatted_address?: string
    geometry?: {
      location: {
        lat: number
        lng: number
      }
    }
    opening_hours?: {
      weekday_text: string[]
    }
    website?: string
    reviews?: Array<{
      author_name: string
      rating: number
      text: string
      time: number
    }>
  }
  reviews?: {
    reviews?: Array<{
      reviewer?: {
        displayName: string
      }
      starRating: string
      comment: string
      createTime: string
    }>
    totalReviewCount?: number
    averageRating?: number
  }
  media?: {
    mediaItems?: Array<{
      mediaFormat: string
      googleUrl: string
      name: string
    }>
  }
}

export interface GridRankResponse {
  success: boolean
  data: GridRankData
}

export interface GridRankData {
  businessName: string
  center: LatLng
  distance: string // e.g. "1 Mile"
  gridSize: string // e.g. "9 (3X3)"
  keyword: string
  metadata: Metadata
  rankings: Ranking[]
  summary: Summary
  totalGridPoints: number
}

export interface LatLng {
  lat: number
  lng: number
}

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
  detectedBusinessName?: string // sometimes may not exist
  matchDetails?: string // sometimes missing
  results?: SearchResult[] // sometimes empty
}

export interface GridPoint extends LatLng {
  index: number
}

export interface SearchResult {
  id: string
  displayName: {
    text: string
    languageCode: string
  }
  formattedAddress?: string
  rating?: number
  userRatingCount?: number
  categories?: Array<{ displayName: { text: string; languageCode: string } }>
  location?: LatLng
  primaryType?: string
  primaryTypeDisplayName?: { text: string; languageCode: string }
  // add more optional fields here if API returns them
}

export interface Summary {
  averageRank: number
  bestRank: number
  worstRank: number
  visibilityPercentage: number
  topRankings: number
  // sometimes there may be extra summary fields, add them as optional:
  [key: string]: number | undefined
}

interface LocationApiResponse {
  location: LocationDetails
  scheduledPosts: any[]
}

export default function GMBLocationMapInterface() {
  const [locations, setLocations] = useState<Location[]>([])
  const [selectedLocation, setSelectedLocation] = useState<string>("")
  const [locationDetails, setLocationDetails] = useState<LocationDetails | null>(null)
  const [loadingLocations, setLoadingLocations] = useState(true)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mapKey, setMapKey] = useState(0)
  const [retryCount, setRetryCount] = useState(0)

  // UI state
  const [keywords, setKeywords] = useState("")
  const [keywordsList, setKeywordsList] = useState<string[]>([])
  const [gridSize, setGridSize] = useState("9 (3X3)")
  const [distance, setDistance] = useState("1 Mile")
  const [zoomLevel, setZoomLevel] = useState("Default Zoom Level")
  const [scanPriority, setScanPriority] = useState("Default")

  // Grid data state
  const [gridData, setGridData] = useState<GridRankData | null>(null)
  const [loadingGrid, setLoadingGrid] = useState(false)

  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const mapCenter: [number, number] = useMemo(() => {
    if (locationDetails?.locationData?.geometry?.location) {
      const { lat, lng } = locationDetails?.locationData.geometry.location
      return [lat, lng]
    }
    return [11.6854, 76.1319] // Default center
  }, [locationDetails])

  const gmbAccountId = useGMBStore((state) => state.accountId)
  const accessToken = useGMBStore((state) => state.accessToken)

  const hasValidCredentials = gmbAccountId && accessToken

  const isSubmitDisabled = useMemo(() => {
    const hasLocation = selectedLocation && selectedLocation.trim() !== ""
    const hasKeywords = keywordsList.length > 0
    const notLoading = !loadingGrid && !loadingDetails && !loadingLocations

    return !hasLocation || !hasKeywords || !notLoading
  }, [selectedLocation, keywordsList, loadingGrid, loadingDetails, loadingLocations])

  const fetchLocations = async () => {
    if (!accessToken) {
      setError("Access token missing. Please re-authenticate.")
      setLoadingLocations(false)
      return
    }

    try {
      setLoadingLocations(true)
      setError(null)

      const response = await fetch(`/api/gmb/locations?accessToken=${accessToken}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.accounts && data.accounts.length > 0) {
        setLocations(data.accounts)
      } else {
        setError("No business locations found. Check your GMB account.")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch locations"
      setError(errorMessage)
    } finally {
      setLoadingLocations(false)
    }
  }

  const fetchLocationDetails = async (locationName: string) => {
    if (!accessToken || !gmbAccountId) {
      setError("Missing credentials. Please re-authenticate.")
      return
    }

    try {
      setLoadingDetails(true)
      setError(null)

      const actualLocationId = locationName.startsWith("locations/") ? locationName.split("/")[1] : locationName
      const apiUrl = process.env.NEXT_PUBLIC_API_URL
      const url = `${apiUrl}/api/gmb/location?location_name=${encodeURIComponent(actualLocationId)}&access_token=${encodeURIComponent(accessToken)}&gmb_account_id=${encodeURIComponent(gmbAccountId)}`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data: LocationApiResponse = await response.json()

      if (data?.location) {
        setLocationDetails(data?.location)
      } else {
        setError("No details found for this location.")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch location details"
      setError(errorMessage)
    } finally {
      setLoadingDetails(false)
    }
  }

  const fetchGridData = async (
    selectedLocation: string,
    gridSize: string,
    distance: string,
    businessName: string | undefined,
    businessPlaceId: string | undefined,
  ) => {
    try {
      setLoadingGrid(true)

      const location = locations.find((l) => l.name === selectedLocation)
      if (!location || !locationDetails?.locationData?.geometry?.location) {
        throw new Error("Location coordinates not available")
      }

      const { lat, lng } = locationDetails.locationData.geometry.location

      const response = await fetch("/api/grid/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          center: { lat, lng },
          gridSize,
          distance,
          keywordsList,
          businessName,
          businessPlaceId,
          location_name: selectedLocation,
          newAccessToken: accessToken,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch grid data: ${response.statusText}`)
      }

      const data: GridRankData = await response.json()
      setGridData(data)
      setMapKey(mapKey + 1)
    } catch (error) {
      console.error("Error fetching grid data:", error)
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

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1)
    setError(null)
    fetchLocations()
  }

  const handleKeywordsKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && keywords.trim()) {
      e.preventDefault()
      const trimmedKeyword = keywords.trim()
      if (!keywordsList.includes(trimmedKeyword)) {
        setKeywordsList([...keywordsList, trimmedKeyword])
      }
      setKeywords("")
    }
  }

  const removeKeyword = (keywordToRemove: string) => {
    const updatedKeywords = keywordsList.filter((k) => k !== keywordToRemove)
    setKeywordsList(updatedKeywords)
  }

  const handleStartScan = () => {
    if (!selectedLocation) {
      setError("Please select a business location first")
      return
    }
    if (keywordsList.length === 0) {
      setError("Please add at least one keyword")
      return
    }
    const location = locations.find((l) => l.name === selectedLocation)
    const businessName = location?.name
    const businessPlaceId = location?.location_id

    // Generate grid data if not already generated
    if (!gridData) {
      fetchGridData(selectedLocation, gridSize, distance, businessName, businessPlaceId)
    }
  }

  useEffect(() => {
    if (hasValidCredentials) {
      fetchLocations()
    } else {
      setError("Please authenticate with Google My Business first")
      setLoadingLocations(false)
    }
  }, [hasValidCredentials])

  // Helper functions
  const getLocationDisplayName = (location: Location): string => {
    return location.title || location.name.split("/").pop() || "Unknown Location"
  }

  const getLocationAddress = (location: Location): string => {
    if (location.storefrontAddress) {
      const { addressLines, locality, administrativeArea } = location.storefrontAddress
      const parts = [...(addressLines || []), locality, administrativeArea].filter(Boolean)
      return parts.join(", ")
    }
    return "Address not available"
  }

  if (loadingLocations) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="p-8">
          <div className="flex items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div>
              <div className="text-lg font-semibold">Loading your business locations...</div>
              <div className="text-sm text-muted-foreground mt-1">This may take a few moments</div>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-background relative">
        <Button
          variant="outline"
          size="sm"
          className="fixed top-4 left-4 z-50 lg:hidden bg-transparent"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <Menu className="h-4 w-4" />
        </Button>

        {isSidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
        )}

        <div
          className={`
          w-96 bg-card border-r border-border flex flex-col shadow-sm
          fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
          transform transition-transform duration-300 ease-in-out lg:transform-none
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
        >
          <div className="p-4 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Local Rank Tracker</h1>
                <p className="text-sm text-muted-foreground">Track your business location rankings</p>
              </div>
              <Button variant="ghost" size="sm" className="ml-auto lg:hidden" onClick={() => setIsSidebarOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Error Alert */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>{error}</span>
                    <Button variant="ghost" size="sm" onClick={() => setError(null)} className="h-auto p-1">
                      <X className="h-4 w-4" />
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Business Location */}
              <div className="space-y-3">
                <Label htmlFor="business" className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Business Location
                </Label>
                <Select value={selectedLocation} onValueChange={handleLocationSelect}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a business location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.name} value={location.name}>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{getLocationDisplayName(location)}</span>
                          <span className="text-xs text-muted-foreground truncate max-w-[250px]">
                            {getLocationAddress(location)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Status indicators */}
                {selectedLocation && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>Location selected</span>
                    {loadingDetails && <Loader2 className="h-4 w-4 animate-spin" />}
                  </div>
                )}

                {locations.length === 0 && !loadingLocations && (
                  <div className="flex items-center gap-2 text-sm text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>No locations found</span>
                    <Button variant="ghost" size="sm" onClick={handleRetry} className="text-primary p-0 h-auto">
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Retry
                    </Button>
                  </div>
                )}
              </div>

              {/* Keywords */}
              <div className="space-y-3">
                <Label htmlFor="keywords" className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Keyword
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Enter a single keyword for the scan</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  id="keywords"
                  placeholder="Enter keyword"
                  value={keywords}
                  onChange={(e) => {
                    const value = e.target.value;
                    setKeywords(value);
                    // Update the keywords array with single item
                    if (value.trim()) {
                      setKeywordsList([value.trim()]);
                    } else {
                      setKeywordsList([]);
                    }
                  }}
                  className="w-full"
                />
              </div>

              {/* Grid Size */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Grid3X3 className="h-4 w-4" />
                    Grid Size / Locations
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Number of search points around your location</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  {gridData && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary text-xs h-auto p-1"
                      onClick={() => {
                        setGridData(null)
                      }}
                    >
                      Reset Grid
                    </Button>
                  )}
                </div>
                <Select value={gridSize} onValueChange={setGridSize}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="9 (3X3)">9 Points (3×3 Grid)</SelectItem>
                    <SelectItem value="25 (5X5)">25 Points (5×5 Grid)</SelectItem>
                    <SelectItem value="49 (7X7)">49 Points (7×7 Grid)</SelectItem>
                    <SelectItem value="81 (9X9)">81 Points (9×9 Grid)</SelectItem>
                  </SelectContent>
                </Select>

                {/* Grid status */}
                {loadingGrid && (
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Generating grid points...</span>
                  </div>
                )}
                {gridData && (
                  <div className="text-sm text-green-600 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    <span>{gridData.totalGridPoints} grid points generated</span>
                  </div>
                )}
              </div>

              {/* Distance */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                  Distance from Center
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>How far apart the grid points should be</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Select value={distance} onValueChange={setDistance}>
                  <SelectTrigger className="w-full">
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

              {/* Zoom Level */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                  Zoom Level
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Map zoom level for search results</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Select value={zoomLevel} onValueChange={setZoomLevel}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Default Zoom Level">Default Zoom</SelectItem>
                    <SelectItem value="Close Zoom">Close Zoom</SelectItem>
                    <SelectItem value="Medium Zoom">Medium Zoom</SelectItem>
                    <SelectItem value="Far Zoom">Far Zoom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Scan Priority */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Scan Priority
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Processing priority for your scan</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Select value={scanPriority} onValueChange={setScanPriority}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Default">Default Priority</SelectItem>
                    <SelectItem value="High Priority">High Priority</SelectItem>
                    <SelectItem value="Low Priority">Low Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Fixed bottom section */}
          <div className="p-6 border-t border-border bg-card">
            <Button
              onClick={gridData ? () => setGridData(null) : handleStartScan}
              className={cn(
                "w-full text-white py-3 text-base font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                gridData
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-green-600 hover:bg-green-700"
              )}
              disabled={isSubmitDisabled && !gridData}
            >
              {gridData ? (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset Grid
                </>
              ) : loadingGrid ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Grid...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Start Rank Scan
                </>
              )}
            </Button>
            {isSubmitDisabled && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {!selectedLocation ? "Select a location" : keywordsList.length === 0 ? "Add keywords" : "Loading..."}
              </p>
            )}
          </div>
        </div>

        <div className="flex-1 relative lg:ml-0">
          <DynamicMap
            mapKey={mapKey}
            center={mapCenter}
            locations={locations}
            zoomLevel={zoomLevel}
            selectedLocation={selectedLocation}
            locationDetails={locationDetails}
            data={gridData?.data || []}
          />

          {/* Loading overlay */}
          {(loadingDetails || loadingGrid) && (
            <div className="absolute inset-0 bg-background/20 flex items-center justify-center backdrop-blur-sm">
              <Card className="p-6">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="font-medium">
                    {loadingDetails ? "Loading location details..." : "Generating grid points..."}
                  </span>
                </div>
              </Card>
            </div>
          )}


          {/* Loading / Empty State Overlay */}
          {(loadingDetails || loadingGrid || !gridData) && (
            <div className="absolute inset-0 bg-background/20 flex items-center justify-center backdrop-blur-sm">
              <Card className="p-6">
                <div className="flex items-center gap-3">
                  {loadingDetails || loadingGrid ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span className="font-medium">
                        {loadingDetails
                          ? "Loading location details..."
                          : "Generating grid points..."}
                      </span>
                    </>
                  ) : (
                    <span className="font-medium text-muted-foreground">
                      Add keywords and press <span className="text-primary">Generate</span> to see results
                    </span>
                  )}
                </div>
              </Card>
            </div>
          )}


        </div>
      </div>
    </TooltipProvider>
  )
}
