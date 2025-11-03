"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import toast from "react-hot-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, AlertCircle, RefreshCw, Building2, ArrowRight, Loader2, CheckCircle } from "lucide-react"
import { ScrollArea } from "../ui/scroll-area"
import { CalendarEvent, Mode } from "../calendar/calendar-types"
import Calendar from "../calendar/calendar"
import { useGMBStore } from "@/store/gmbStore"
import { Loader } from "../Loader/Loader"

interface Location {
    name: string
    title: string
    location_id: string
    formattedAddress: string
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

export default function SelectLocation() {
    const [locations, setLocations] = useState<Location[]>([])
    const [selectedLocation, setSelectedLocation] = useState<string>("")
    const [locationDetails, setLocationDetails] = useState<LocationDetails | null>(null)
    const [loadingLocations, setLoadingLocations] = useState(true)
    const [loadingDetails, setLoadingDetails] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [retryCount, setRetryCount] = useState(0)
    const [events, setEvents] = useState<CalendarEvent[]>([])
    const [mode, setMode] = useState<Mode>('month')
    const [date, setDate] = useState<Date>(new Date())

    const gmbAccountId = useGMBStore((state) => state.accountId)
    const accessToken = useGMBStore((state) => state.accessToken)

    const hasValidCredentials = gmbAccountId && accessToken

    useEffect(() => {
        if (hasValidCredentials) {
            fetchLocations()
        } else {
            toast.error("Please authenticate with Google My Business first", {
                duration: 4000,
                position: "top-center",
            })
            setLoadingLocations(false)
        }
    }, [hasValidCredentials])

    const fetchLocations = async () => {
        if (!accessToken) {
            toast.error("Access token missing. Please re-authenticate.", {
                duration: 4000,
                position: "top-center",
            })
            setLoadingLocations(false)
            return
        }

        try {
            setLoadingLocations(true)
            setError(null)

            const response = await axios.get(`/api/gmb/locations?accessToken=${accessToken}`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            })

            if (response.data.accounts && response.data.accounts.length > 0) {
                setLocations(response.data.accounts)
            } else {
                toast.error("No business locations found. Check your GMB account.", {
                    duration: 5000,
                    position: "top-center",
                })
            }
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || err.message || "Failed to fetch locations"

            if (err.response?.status === 401) {
                toast.error("Authentication expired. Please re-authenticate.", {
                    duration: 5000,
                    position: "top-center",
                })
            } else if (err.response?.status === 403) {
                toast.error("Access denied. Check your GMB permissions.", {
                    duration: 5000,
                    position: "top-center",
                })
            } else {
                toast.error(`Unable to load locations: ${errorMessage}`, {
                    duration: 5000,
                    position: "top-center",
                })
            }
            setError(errorMessage)
        } finally {
            setLoadingLocations(false)
        }
    }

    const fetchLocationDetails = async (locationName: string) => {
        if (!accessToken || !gmbAccountId) {
            toast.error("Missing credentials. Please re-authenticate.", {
                duration: 4000,
                position: "top-center",
            })
            return
        }

        try {
            setLoadingDetails(true)
            setError(null)

            const actualLocationId = locationName.startsWith("locations/") ? locationName.split("/")[1] : locationName

            const apiUrl = process.env.NEXT_PUBLIC_API_URL
            const url = `${apiUrl}/api/gmb/location?location_name=${encodeURIComponent(actualLocationId)}&access_token=${encodeURIComponent(accessToken)}&gmb_account_id=${encodeURIComponent(gmbAccountId)}&with_posts=true`

            const response = await axios.get(url)

            if (response.data) {
                setLocationDetails(response.data.location)
                const location = locations.find((loc) => loc.name === locationName)
                const displayName = location ? getLocationDisplayName(location) : "Location"
                
                if(response.data.scheduledPosts) {
                     setEvents(response.data.scheduledPosts)
                }
                toast.success(`${displayName} selected and ready for posting!`, {
                    duration: 3000,
                    position: "top-center",
                })
            } else {
                toast.error("No details found for this location.", {
                    duration: 4000,
                    position: "top-center",
                })
            }
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || err.message || "Failed to fetch location details"
            toast.error(`Unable to load location details: ${errorMessage}`, {
                duration: 5000,
                position: "top-center",
            })
            setError(errorMessage)
        } finally {
            setLoadingDetails(false)
        }
    }

    const handleLocationSelect = (locationName: string) => {
        setSelectedLocation(locationName)
        setLocationDetails(null)
        fetchLocationDetails(locationName)
    }

    const getLocationDisplayName = (location: Location): string => {
        return location.title || location.name.split("/").pop() || "Unknown Location"
    }

    const handleRetry = () => {
        setRetryCount((prev) => prev + 1)
        setError(null)
        toast.loading("Retrying to fetch locations...", {
            duration: 2000,
            position: "top-center",
        })
        fetchLocations()
    }

    if (loadingLocations) {
        return (
            <div className="container mx-auto space-y-6">
                <Card className="border border-border">
                    <CardContent className="flex flex-col items-center justify-center py-20">
                        <div className="flex items-center gap-3 mb-4">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <div className="text-lg font-medium">Loading your business locations</div>
                        </div>
                        <p className="text-muted-foreground text-center max-w-md text-sm">
                            Connecting to your Google My Business account and fetching available locations...
                        </p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="container mx-auto space-y-6">
            {error && (
                <Card className="border-destructive/50 bg-destructive/5">
                    <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="h-5 w-5 text-destructive" />
                            <span className="text-destructive font-medium">Connection failed</span>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleRetry}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Try Again
                        </Button>
                    </CardContent>
                </Card>
            )}

            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight">
                        Schedule Posts for Your Business Location
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl">
                        Select a location to start scheduling and managing your posts
                    </p>

                </div>
            </div>


            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                    <MapPin className="h-5 w-5 text-primary" />
                    <span className="font-medium">Available Locations ({locations.length})</span>
                </div>

                <ScrollArea className="h-[400px] sm:h-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {locations.length === 0 ? (
                            <Card className="border-dashed">
                                <CardContent className="flex items-center justify-center py-12">
                                    <div className="text-center space-y-2">
                                        <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
                                        <p className="text-muted-foreground">No locations found</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            locations.map((location) => (
                                <Card
                                    key={location.name}
                                    className={`cursor-pointer transition-all hover:shadow-md border ${selectedLocation === location.name
                                        ? "border-primary bg-primary/5 shadow-sm"
                                        : "border-border hover:border-primary/50"
                                        }`}
                                    onClick={() => handleLocationSelect(location.name)}
                                >
                                    <CardContent className="">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className={`p-3 rounded-lg ${selectedLocation === location.name ? "bg-primary text-primary-foreground" : "bg-muted"
                                                        }`}
                                                >
                                                    <Building2 className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-base">{getLocationDisplayName(location)}</div>
                                                    {location.storefrontAddress && (
                                                        <div className="text-sm text-muted-foreground mt-1">
                                                            {location.formattedAddress}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {selectedLocation === location.name && <CheckCircle className="h-5 w-5 text-primary" />}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </div>

            {loadingDetails && (
                <Card>
                    <CardContent className="flex items-center justify-center py-12">
                        <Loader text="Preparing your workspace..." />
                    </CardContent>
                </Card>
            )}

            {locationDetails && selectedLocation && (
                <>
                    <Calendar
                        accountId={gmbAccountId}
                        locationId={selectedLocation}
                        businessName={locationDetails.locationData?.name}
                        selectedLocation={selectedLocation ?? null}
                        events={events}
                        setEvents={setEvents}
                        mode={mode}
                        setMode={setMode}
                        date={date}
                        setDate={setDate}
                    />
                </>
            )}

            {!selectedLocation && !loadingDetails && !error && locations.length > 0 && (
                <Card className="border-dashed">
                    <CardContent className="py-16">
                        <div className="text-center space-y-4">
                            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto">
                                <ArrowRight className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-semibold">Select a location to get started</h3>
                                <p className="text-muted-foreground max-w-md mx-auto">
                                    Choose your business location from the options above to begin creating and publishing posts.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
