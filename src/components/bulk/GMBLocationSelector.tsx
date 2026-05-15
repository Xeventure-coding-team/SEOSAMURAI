"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import toast from "react-hot-toast"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, AlertCircle, RefreshCw, Building2, ArrowRight, Loader2, CheckCircle, Lock } from "lucide-react"
import { GmbBulkPostForm } from "./GMBBulkPostForm"
import { ScrollArea } from "../ui/scroll-area"
import { useGMBStore } from "@/store/gmbStore"
import { Loader } from "../Loader/Loader"
import { UsageBadge } from "../usage-badge"
import { Skeleton } from "../ui/skeleton"
import { useUser } from "@stackframe/stack"
import { useUsage } from "@/lib/use-usage"
import { cn } from "@/lib/utils"
import Link from "next/link"


interface Location {
    id: string
    name: string
    title: string
    location_id: string
    is_active?: boolean
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

        phoneNumbers?: {
            primaryPhone?: null | string
        }

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

export default function GMBLocationSelector() {
    const [locations, setLocations] = useState<Location[]>([])
    const [selectedLocation, setSelectedLocation] = useState<string>("")
    const [locationDetails, setLocationDetails] = useState<LocationDetails | null>(null)
    const [loadingLocations, setLoadingLocations] = useState(true)
    const [isAuthLoading, setIsAuthLoading] = useState(true)
    const [loadingDetails, setLoadingDetails] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [usage, setUsage] = useState<string | null>(null)
    const [retryCount, setRetryCount] = useState(0)
    const user = useUser({ or: "redirect" });
    const { data, isLoading } = useUsage();


    const gmbAccountId = useGMBStore((state) => state.accountId)
    const accessToken = useGMBStore((state) => state.accessToken)

    const hasValidCredentials = gmbAccountId && accessToken



    useEffect(() => {
        if (!gmbAccountId || !accessToken) return;
        fetchLocations();
    }, [gmbAccountId, accessToken]);


    const fetchLocations = async () => {
        try {
            setLoadingLocations(true);
            setError(null);

            if (!hasValidCredentials || !accessToken) {
                toast.error("Please authenticate with Google My Business first", {
                    duration: 4000,
                    position: "top-center",
                });
                setLoadingLocations(false); // ← was missing, caused infinite loading
                return;
            }
            const response = await axios.get(`/api/gmb/locations?accessToken=${accessToken}`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            if (response.data.accounts && response.data.accounts.length > 0) {
                setLocations(response.data.accounts);
            } else {
                toast.error("No business locations found. Check your GMB account.", {
                    duration: 5000,
                    position: "top-center",
                });
            }
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || err.message || "Failed to fetch locations";

            if (err.response?.status === 401) {
                toast.error("Authentication expired. Please re-authenticate.", { duration: 5000, position: "top-center" });
            } else if (err.response?.status === 403) {
                toast.error("Access denied. Check your GMB permissions.", { duration: 5000, position: "top-center" });
            } else {
                toast.error(`Unable to load locations: ${errorMessage}`, { duration: 5000, position: "top-center" });
            }
            setError(errorMessage);
        } finally {
            setLoadingLocations(false);
        }
    };

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
            const url = `${apiUrl}/api/gmb/location?location_name=${encodeURIComponent(actualLocationId)}&access_token=${encodeURIComponent(accessToken)}&gmb_account_id=${encodeURIComponent(gmbAccountId)}`

            const response = await axios.get(url)

            if (response.data) {
                setLocationDetails(response.data.location)
                const location = locations.find((loc) => loc.name === locationName)
                const displayName = location ? getLocationDisplayName(location) : "Location"
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


    if (loadingLocations || isLoading) {
        return (
            <Card>
                <CardContent className="p-6 space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/6" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/6" />
                </CardContent>
            </Card>
        );
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
                    <h1 className="text-4xl font-bold tracking-tight">Choose Your Business Location</h1>
                    <p className="text-lg text-muted-foreground max-w-2xl">
                        Select a location to start creating and managing your posts
                    </p>
                </div>
                <div>
                    <UsageBadge metric="postsUsed" label="Bulk Posting" showBar={true} />
                </div>
            </div>


            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                    <MapPin className="h-5 w-5 text-primary" />
                    <span className="font-medium">Available Locations ({locations.length})</span>
                </div>

                <ScrollArea className="h-[400px] sm:h-auto">
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
                                        key={location.name}
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
                    <CardContent className="p-6 space-y-3">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-4 w-4/6" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/6" />
                    </CardContent>
                </Card>
            )}

            {locationDetails && selectedLocation && (
                <GmbBulkPostForm
                    postUsed={data.limits.postsUsed}
                    accountId={gmbAccountId || ""}
                    locationId={selectedLocation}
                    accessToken={accessToken || ""}
                    enableBulkPosting={true}
                    businessName={(() => {
                        const location = locations.find((loc) => loc.name === selectedLocation)
                        return location ? getLocationDisplayName(location) : "Selected Location"
                    })()}
                    phoneNumber={
                        locationDetails?.data?.phoneNumbers?.primaryPhone
                            ? locationDetails.data.phoneNumbers.primaryPhone.replace(/[^\d+]/g, "")
                            : null
                    }
                />
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
