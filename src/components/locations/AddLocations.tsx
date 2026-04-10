"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Info, MapPin, Loader2 } from "lucide-react"
import PlacesAutoComplete from "./PlacesAutoComplete"
import { usePageStore } from "@/store/usePageStore"
import dynamic from "next/dynamic"

const MapComponent = dynamic(() => import("./MapComponent"), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-full">
            <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Loading map...</span>
            </div>
        </div>
    ),
})

const AddLocations: React.FC = () => {
    // ✅ SEPARATE STATE: Keep viewState independent from position
    const [viewState, setViewState] = useState({
        longitude: -0.09,
        latitude: 51.505,
        zoom: 15,
    })

    // ✅ Marker position (updated from search)
    const [position, setPosition] = useState<[number, number]>([51.505, -0.09])
    const [name, setName] = useState<string>("Default Location")
    const [showPopup, setShowPopup] = useState(false)
    const [isMapLoading, setIsMapLoading] = useState(true)
    const [mapError, setMapError] = useState<string | null>(null)
    const [isClient, setIsClient] = useState(false)
    const [mapKey, setMapKey] = useState(0)

    // ✅ Track previous position to detect actual changes
    const previousPositionRef = useRef<[number, number]>([51.505, -0.09])
    const positionUpdateTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

    const setPageName = usePageStore((state) => state.setPageName)

    useEffect(() => {
        setPageName("Add Location")
        setIsClient(true)
    }, [setPageName])

    // ✅ FIX: Only update viewState when position SIGNIFICANTLY changes
    // NOT on every position change - use debouncing and tolerance
    useEffect(() => {
        // Check if position actually changed
        const latDiff = Math.abs(position[0] - previousPositionRef.current[0])
        const lngDiff = Math.abs(position[1] - previousPositionRef.current[1])

        // Tolerance for no update needed
        const tolerance = 0.0001
        if (latDiff < tolerance && lngDiff < tolerance) {
            return // No significant change
        }

        // Only update after debounce to prevent excessive updates
        if (positionUpdateTimeoutRef.current) {
            clearTimeout(positionUpdateTimeoutRef.current)
        }

        positionUpdateTimeoutRef.current = setTimeout(() => {
            previousPositionRef.current = position

            // ✅ Update viewState smoothly without resetting zoom
            setViewState((prev) => ({
                longitude: position[1],
                latitude: position[0],
                zoom: prev.zoom, // ✅ KEEP current zoom - don't reset it
            }))
        }, 100) // Small debounce for position updates
    }, [position])

    const handleMapLoad = useCallback(() => {
        console.log("Map loaded successfully")
        setIsMapLoading(false)
        setMapError(null)
    }, [])

    const handleMapError = useCallback((error: any) => {
        console.error("Map error:", error)
        setMapError("Failed to load map. Please try again.")
        setIsMapLoading(false)
    }, [])

    const handleRetryMap = useCallback(() => {
        setMapError(null)
        setIsMapLoading(true)
        setMapKey((prev) => prev + 1)
    }, [])

    // ✅ Handle viewState changes from map (user zooming/panning)
    const handleViewStateChange = useCallback((newViewState: {
        latitude: number
        longitude: number
        zoom: number
    }) => {
        // ✅ Update viewState with user's zoom/pan
        setViewState(newViewState)
    }, [])

    // ✅ Cleanup on unmount
    useEffect(() => {
        return () => {
            if (positionUpdateTimeoutRef.current) {
                clearTimeout(positionUpdateTimeoutRef.current)
            }
        }
    }, [])

    if (!isClient) {
        return (
            <div className="p-6 space-y-6">
                <div className="space-y-2">
                    <h1 className="text-2xl font-semibold tracking-tight">Add New Location</h1>
                    <p className="text-muted-foreground">
                        Use the search box to find a business location and add it to your account.
                    </p>
                </div>
                <div className="flex items-center justify-center h-[400px]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6">
            <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight">Add New Location</h1>
                <p className="text-muted-foreground">
                    Use the search box to find a business location and add it to your account.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Card className="p-0 m-0 w-full">
                        <CardContent className="p-0">
                            <div className="h-[400px] lg:h-[500px] w-full relative">
                                {mapError && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded-lg z-10">
                                        <div className="text-center space-y-2">
                                            <p className="text-sm text-destructive">{mapError}</p>
                                            <button
                                                onClick={handleRetryMap}
                                                className="text-xs text-muted-foreground hover:text-foreground underline"
                                            >
                                                Retry loading map
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="h-full w-full rounded-lg overflow-hidden">
                                    <MapComponent
                                        key={mapKey}
                                        position={position}
                                        name={name}
                                        showPopup={showPopup}
                                        onMapLoad={handleMapLoad}
                                        onMapError={handleMapError}
                                        onMarkerClick={() => setShowPopup(true)}
                                        onPopupClose={() => setShowPopup(false)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-1">
                    <div>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Search Locations</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <PlacesAutoComplete setPosition={setPosition} setName={setName} />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AddLocations