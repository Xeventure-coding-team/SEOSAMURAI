"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import toast from "react-hot-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, AlertCircle, RefreshCw, Building2, ArrowRight, Loader2, CheckCircle, Lock } from "lucide-react"
import { ScrollArea } from "../ui/scroll-area"
import { CalendarEvent, Mode } from "../calendar/calendar-types"
import Calendar from "../calendar/calendar"
import { useGMBStore } from "@/store/gmbStore"
import { Loader } from "../Loader/Loader"
import { useCalendarContext } from "../calendar/calendar-context"
import { useCalendarStore } from '@/store/calendarStore'
import { UsageBadge } from "../usage-badge"
import { Skeleton } from "../ui/skeleton"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface Location {
    id: string
    name: string
    title: string
    location_id: string
    formattedAddress: string
    is_active?: boolean
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
    const [mode, setMode] = useState<Mode>('month')
    const [date, setDate] = useState<Date>(new Date())

    const gmbAccountId = useGMBStore((state) => state.accountId)
    const accessToken = useGMBStore((state) => state.accessToken)
    const [shouldOpenDialog, setShouldOpenDialog] = useState(false)
    const [openDialog, setOpenDialog] = useState(false)

    const { events, setEvents, addEvent } = useCalendarStore()

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



            const apiUrl = process.env.NEXT_PUBLIC_API_URL
            const url = `${apiUrl}/api/gmb/location?location_name=${encodeURIComponent(locationName)}&access_token=${encodeURIComponent(accessToken)}&gmb_account_id=${encodeURIComponent(gmbAccountId)}&with_posts=true`

            const response = await axios.get(url)

            if (response.data) {
                console.log("📥 Received location details:", response.data)
                setLocationDetails(response.data.location)
                const location = locations.find((loc) => loc.name === locationName)
                const displayName = location ? getLocationDisplayName(location) : "Location"

                // Update events state - THIS IS IMPORTANT
                if (response.data.scheduledPosts) {
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

    const handlePostCreated = async () => {
        setOpenDialog(false)
        if (selectedLocation) {
            await fetchLocationDetails(selectedLocation)
        }
    }

    const handleLocationSelect = (locationName: string) => {
        setSelectedLocation(locationName)
        setLocationDetails(null)
        setOpenDialog(true)
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
            <Card>
                <CardContent className="space-y-4 py-8">
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-5/6" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="container mx-auto space-y-6">

            {error && (
                <div className="flex items-center justify-between gap-3 p-3 rounded-md border border-destructive/40 bg-destructive/5">

                    <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <span>Failed to load locations</span>
                    </div>

                    <button
                        onClick={handleRetry}
                        className="flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Retry
                    </button>

                </div>
            )}

            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">

                <div className="space-y-3">
                    <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 border-1 border-blue-600 text-xs font-medium px-3 py-1.5 rounded-full">
                        <MapPin className="h-3.5 w-3.5" />
                        Business scheduling
                    </div>

                    <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight">
                        Schedule posts for
                        your business locations
                    </h1>

                    <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
                        Pick a location to start publishing and managing posts — all in one place.
                    </p>
                </div>

                <div>
                    <div>
                        <UsageBadge metric="scheduledPostsUsed" label="Schedule Posts" showBar={true} />
                    </div>
                </div>
            </div>

            <div className="space-y-4">

<div className="flex items-center justify-between mb-5">
  <div className="flex items-center gap-3">
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border">
      <MapPin className="h-5 w-5 text-primary" />
    </div>

    <div>
      <h3 className="text-lg font-semibold leading-none">
        Available Locations
      </h3>
      <p className="text-sm text-muted-foreground mt-1">
        {locations.length} locations ready for scheduling
      </p>
    </div>
  </div>
</div>

                <ScrollArea className="sm:h-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                        {locations.length === 0 ? (
                            <Card className="border-dashed col-span-full">
                                <CardContent className="flex items-center justify-center py-12">
                                    <div className="text-center space-y-2">
                                        <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
                                        <p className="text-sm text-muted-foreground">No locations found</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            locations.map((location) => {
                                const isSelected = selectedLocation === location.id
                                const isLocked = location.is_active === false

                                return (
                                    <div
                                        key={location.id}
                                        onClick={() => !isLocked && handleLocationSelect(location.id)}
                                        className={cn(
                                            "flex items-center gap-3 rounded-lg border px-3.5 py-3 transition-colors",
                                            isLocked
                                                ? "cursor-not-allowed border-border/50 bg-muted/20"
                                                : isSelected
                                                    ? "cursor-pointer border-primary bg-primary/5"
                                                    : "cursor-pointer border-border hover:bg-muted/40"
                                        )}
                                    >
                                        {/* Icon */}
                                        <div className={cn(
                                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                                            isLocked
                                                ? "bg-muted"
                                                : isSelected
                                                    ? "bg-primary/10"
                                                    : "bg-muted"
                                        )}>
                                            {isLocked
                                                ? <Lock className="h-3.5 w-3.5 text-muted-foreground/50" />
                                                : <Building2 className={cn(
                                                    "h-3.5 w-3.5",
                                                    isSelected ? "text-primary" : "text-muted-foreground"
                                                )} />
                                            }
                                        </div>

                                        {/* Text */}
                                        <div className="flex-1 min-w-0">
                                            <p className={cn(
                                                "text-sm font-medium truncate leading-none",
                                                isLocked ? "text-muted-foreground/60" : ""
                                            )}>
                                                {getLocationDisplayName(location)}
                                            </p>
                                            {isLocked ? (
                                                <Link
                                                    href="/app/settings/billing"
                                                    onClick={e => e.stopPropagation()}
                                                    className="text-xs text-muted-foreground hover:text-primary transition-colors mt-0.5 inline-block"
                                                >
                                                    Upgrade to unlock
                                                </Link>
                                            ) : location.storefrontAddress ? (
                                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                                    {location.formattedAddress}
                                                </p>
                                            ) : null}
                                        </div>

                                        {/* Right indicator */}
                                        {!isLocked && isSelected && (
                                            <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </div>
                </ScrollArea>


            </div>

            {loadingDetails && (
                <Card>
                    <CardContent className="space-y-4 py-8">
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-48" />
                            <Skeleton className="h-4 w-64" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-5/6" />
                        </div>
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
                        onPostCreated={handlePostCreated}
                        openDialog={openDialog}
                        setOpenDialog={setOpenDialog}
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