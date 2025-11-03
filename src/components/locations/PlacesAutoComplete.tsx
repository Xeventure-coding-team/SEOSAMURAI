"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { ScrollArea } from "@/components/ui/scroll-area"
import debounce from "lodash/debounce"
import toast from "react-hot-toast"
import {
  Globe,
  MapPin,
  Star,
  ExternalLink,
  Search,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  Clock,
  Camera,
} from "lucide-react"
import axios from "axios"
import { PlaceDetails, usePlaceStore } from "@/store/placeStore"
import { useGMBStore } from "@/store/gmbStore"

interface SearchResult {
  business_status: string
  formatted_address: string
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
  icon: string
  icon_background_color: string
  name: string
  opening_hours?: {
    open_now: boolean
  }
  photos?: Array<{
    height: number
    width: number
    photo_reference: string
  }>
  place_id: string
  rating?: number
  types: string[]
  user_ratings_total?: number
  price_level?: number
  formatted_phone_number?: string
  website?: string
}

interface PlacesAutoCompleteProps {
  setPosition: (coords: [number, number]) => void
  setName: (name: string | null) => void
}

export default function PlacesAutoComplete({ setPosition, setName }: PlacesAutoCompleteProps) {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [inputValue, setInputValue] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [placeId, setPlaceId] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [loadingPermission, setLoadingPermission] = useState(false)
  const [showResults, setShowResults] = useState(false)

  const accountId = useGMBStore((state) => state.accountId)
  const accessToken = useGMBStore((state) => state.accessToken)
  const gmbAccountId = useGMBStore((state) => state.accountId)
  const gmbAccountName = useGMBStore((state) => state.accountName)

  const { data: selectedPlaceDetails, setPlace, clearPlace, loading, setLoading } = usePlaceStore()
  const router = useRouter()

  const debouncedSearch = useCallback(
    debounce(async (searchText: string) => {
      if (!searchText.trim()) {
        setSearchResults([])
        setShowResults(false)
        return
      }


      if (!accessToken) {
        toast.error("Authentication required")
        return
      }

      setLoadingSearch(true)
      setShowResults(true)
      try {
        const response = await axios.post(
          `/api/gmb/search-location`,
          { input: searchText.trim(), newAccessToken: accessToken },
          {
            headers: {
              Authorization: `${accessToken}`,
              "Content-Type": "application/json",
            },
            timeout: 10000,
          },
        )

        if (response.data.status === "OK" && response.data.results) {
          setSearchResults(response.data.results)
        } else {
          setSearchResults([])
        }
      } catch (error) {
        console.error("Search error:", error)
        setSearchResults([])
        if (axios.isAxiosError(error)) {
          if (error.code === "ECONNABORTED") {
            toast.error("Search timeout - please try again")
          } else if (error.response?.status === 401) {
            toast.error("Authentication expired - please login again")
          } else {
            toast.error("Failed to search locations")
          }
        } else {
          toast.error("Network error occurred")
        }
      } finally {
        setLoadingSearch(false)
      }
    }, 500),
    [],
  )

  const handleSelect = async (result: SearchResult) => {
    setLoading(true)
    try {
      const lat = result.geometry?.location?.lat
      const lng = result.geometry?.location?.lng

      if (typeof lat !== "number" || typeof lng !== "number") {
        throw new Error("Invalid coordinates")
      }

      setPosition([lat, lng])
      setPlaceId(result.place_id)
      setName(result.name || "Unknown Location")

      const placeData: PlaceDetails = {
        name: result.name || "N/A",
        formatted_address: result.formatted_address || "N/A",
        place_id: result.place_id || "N/A",
        formatted_phone_number: result.formatted_phone_number || "N/A",
        website: result.website || "N/A",
        rating: result.rating || "N/A",
      }

      setPlace(placeData)
      setInputValue(result.name || "")
      setSearchResults([])
      setShowResults(false)
      toast.success("Location selected successfully")
    } catch (error) {
      console.error("Selection error:", error)
      toast.error("Failed to select location")
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setPosition([51.505, -0.09]);
    setInputValue("")
    setSearchResults([])
    setShowResults(false)
    setPlaceId(null)
    setHasPermission(null)
    setMessage(null)
    clearPlace()
    setName("Default Location")
    toast.success("Search cleared")
  }

  const checkPermission = async () => {
    if (!placeId || !selectedPlaceDetails) {
      toast.error("Please select a location first")
      return
    }

    setLoadingPermission(true)
    try {

      if (!accessToken || !gmbAccountId) {
        toast.error("Missing authentication credentials")
        return
      }

      const response = await axios.post(
        "/api/gmb/checkPermission",
        {
          placeId,
          gmbAccountId,
          accessToken,
          gmbAccountName,
        },
        {
          headers: {
            Authorization: `${accessToken}`,
            "Content-Type": "application/json",
          },
          timeout: 15000,
        },
      )

      if (response.status === 200) {
        const data = response.data
        if (data?.exist) {
          toast(data?.message || "Location already exists")
          setHasPermission(null)
        } else if (data.hasPermission) {
          setHasPermission(true)
          toast.success("Location added successfully!")
          setTimeout(() => router.push("/app/locations"), 1500)
        } else {
          const errorMsg = "You cannot manage this location. Please contact your administrator if you believe this is an error.";
          setMessage(errorMsg)
          setHasPermission(false)
          toast.error(errorMsg)
        }
      }
    } catch (error) {
      console.error("Permission check error:", error)
      if (axios.isAxiosError(error)) {
        if (error.code === "ECONNABORTED") {
          toast.error("Request timeout - please try again")
        } else if (error.response?.status === 401) {
          toast.error("Authentication expired")
        } else {
          toast.error("Failed to verify permissions")
        }
      } else {
        toast.error("Network error occurred")
      }
      setHasPermission(false)
    } finally {
      setLoadingPermission(false)
    }
  }

  const getBusinessType = (types: string[]) => {
    const typeMap: { [key: string]: string } = {
      restaurant: "Restaurant",
      food: "Food & Dining",
      store: "Store",
      establishment: "Business",
      point_of_interest: "Point of Interest",
      lodging: "Hotel",
      hospital: "Healthcare",
      school: "Education",
      bank: "Financial",
      gas_station: "Gas Station",
    }

    for (const type of types) {
      if (typeMap[type]) return typeMap[type]
    }
    return "Business"
  }

  const getPriceLevel = (level?: number) => {
    if (!level) return null
    return "$".repeat(level)
  }

  useEffect(() => {
    return () => {
      debouncedSearch.cancel()
    }
  }, [debouncedSearch])

  return (
    <div className="space-y-4">
      {hasPermission === false && message && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for places..."
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value)
              debouncedSearch(e.target.value)
            }}
            className="pl-10 pr-10"
          />
          {loadingSearch && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {inputValue && !loadingSearch && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {showResults && (
          <div className="space-y-3">
            {loadingSearch && (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Searching locations...</p>
              </div>
            )}

            {!loadingSearch && searchResults.length === 0 && inputValue && (
              <div className="text-center py-8">
                <Search className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No locations found for "{inputValue}"</p>
              </div>
            )}

            {!loadingSearch && searchResults.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Search Results</h3>
                  <Badge variant="secondary">{searchResults.length} found</Badge>
                </div>

                <div className="space-y-2">
                  <ScrollArea className={`${searchResults.length > 2 ? "h-[400px]" : "h-[200px]"}`}>
                    {searchResults.map((result, idx) => (
                      <Card
                        key={`${result.place_id}-${idx}`}
                        className="cursor-pointer hover:shadow-md transition-shadow mt-2"
                        onClick={() => handleSelect(result)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-10 h-10 bg-muted rounded-md flex items-center justify-center">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h4 className="font-medium text-sm leading-tight">{result.name}</h4>
                                {result.rating && (
                                  <div className="flex items-center gap-1 text-xs">
                                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                    <span>{result.rating}</span>
                                  </div>
                                )}
                              </div>

                              <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                                {result.formatted_address}
                              </p>

                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                  {getBusinessType(result.types)}
                                </Badge>

                                {result.business_status === "OPERATIONAL" && (
                                  <Badge variant="outline" className="text-xs text-green-600">
                                    Open
                                  </Badge>
                                )}

                                {result.opening_hours?.open_now !== undefined && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    <span>{result.opening_hours.open_now ? "Open now" : "Closed"}</span>
                                  </div>
                                )}

                                {result.photos && result.photos.length > 0 && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Camera className="h-3 w-3" />
                                    <span>{result.photos.length}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </ScrollArea>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      ) : (
        selectedPlaceDetails && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-medium">Selected Location</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Business Name</div>
                  <div className="font-medium">{selectedPlaceDetails.name}</div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground mb-1">Address</div>
                  <div className="text-sm">{selectedPlaceDetails.formatted_address}</div>
                </div>

                {selectedPlaceDetails.formatted_phone_number !== "N/A" && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Phone</div>
                    <div className="text-sm">{selectedPlaceDetails.formatted_phone_number}</div>
                  </div>
                )}

                {selectedPlaceDetails.rating !== "N/A" && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Rating</div>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm">{selectedPlaceDetails.rating}</span>
                    </div>
                  </div>
                )}

                {selectedPlaceDetails.website !== "N/A" && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Website</div>
                    <a
                      href={selectedPlaceDetails.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Visit Website
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>

              <Button onClick={checkPermission} disabled={loadingPermission} className="w-full cursor-pointer">
                {loadingPermission ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Verifying...
                  </>
                ) : hasPermission === true ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Added Successfully!
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4 mr-2" />
                    Add Location
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )
      )}
    </div>
  )
}
