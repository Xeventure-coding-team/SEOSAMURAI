"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MapPin, Loader2, AlertCircle, Lock } from "lucide-react"
import axios from "axios"
import toast from "react-hot-toast"
import { useGMBStore } from "@/store/gmbStore"
import { Skeleton } from "../ui/skeleton"
import { cn } from "@/lib/utils"

interface Location {
  name: string
  title: string
  location_id: string
  formattedAddress: string
  displayName?: string
  is_active?: boolean
  businessWebsite?: string | null
  metadata?: {
    placeId?: string
    mapsUri?: string
    newReviewUri?: string
    hasVoiceOfMerchant?: boolean
  }
  storefrontAddress?: {
    addressLines?: string[]
    locality?: string
    administrativeArea?: string
    postalCode?: string
    regionCode?: string
  }
}

interface LocationSelectProps {
  value?: string
  onLocationChange: (locationName: string, locationData: Location) => void
  showLabel?: boolean
  placeholder?: string
  className?: string
}

export default function LocationSelector({
  value,
  onLocationChange,
  showLabel = true,
  placeholder = "Choose a location",
  className = ""
}: LocationSelectProps) {
  const [locations, setLocations] = useState<Location[]>([])
  const [loadingLocations, setLoadingLocations] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const gmbAccountId = useGMBStore((state) => state.accountId)
  const accessToken = useGMBStore((state) => state.accessToken)

  const hasValidCredentials = gmbAccountId && accessToken

  useEffect(() => {
    if (hasValidCredentials) {
      fetchLocations()
    }
  }, [hasValidCredentials])

  const fetchLocations = async () => {
    if (!accessToken) {
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

      if (response.data.data?.accounts && response.data.data.accounts.length > 0) {
        setLocations(response.data.data.accounts)
      } else if (response.data.accounts && response.data.accounts.length > 0) {
        // Fallback for direct accounts array
        setLocations(response.data.accounts)
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || "Failed to load locations"
      setError(errorMessage)
      console.error("Failed to fetch locations:", err)
      toast.error("Unable to load business locations", {
        duration: 3000,
        position: "top-center",
      })
    } finally {
      setLoadingLocations(false)
    }
  }

  const getLocationDisplayName = (location: Location): string => {
    return location.displayName || location.title || location.name.split("/").pop() || "Unknown Location"
  }

  const handleValueChange = (locationName: string) => {
    const location = locations.find((loc) => loc.name === locationName)
    if (location) {
      onLocationChange(locationName, location)
    }
  }

  if (!hasValidCredentials) {
    return null
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {showLabel && (
        <label className="text-sm font-medium flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Select Business Location
        </label>
      )}

      <Select
        value={value}
        onValueChange={handleValueChange}
        disabled={loadingLocations || locations.length === 0 || !!error}
      >
        <SelectTrigger className="w-full location_selector">
          <SelectValue
            placeholder={
              loadingLocations
                ? "Loading locations..."
                : error
                  ? "Failed to load locations"
                  : locations.length === 0
                    ? "No locations available"
                    : placeholder
            }
          />
        </SelectTrigger>
 <SelectContent>
    {locations.map((location) => {
        const isLocked = location.is_active === false;
        
        return (
            <SelectItem 
                key={location.name} 
                value={location.name}
                disabled={isLocked}
                className={cn(
                    isLocked && "opacity-60 cursor-not-allowed"
                )}
            >
                <div className="flex flex-col gap-0.5 py-1 text-start">
                    <div className="flex items-center gap-2">
                        <span className={cn(
                            "font-medium truncate max-w-[300px]",
                            isLocked && "line-through text-muted-foreground/60"
                        )}>
                            {getLocationDisplayName(location)}
                        </span>
                        {isLocked && (
                            <Lock className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                        )}
                    </div>
                    {isLocked ? (
                        <span className="text-xs text-muted-foreground/60 truncate max-w-[300px]">
                            Upgrade to unlock
                        </span>
                    ) : location.formattedAddress && (
                        <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                            {location.formattedAddress}
                        </span>
                    )}
                </div>
            </SelectItem>
        );
    })}
</SelectContent>
      </Select>

      {loadingLocations && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-3 w-40" />
          </div>
          <div className="flex items-center gap-2 pl-5">
            <Skeleton className="h-2 w-full max-w-md" />
          </div>
        </div>
      )}

      {error && !loadingLocations && (
        <div className="inline-flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate max-w-md">{error}</span>
        </div>
      )}


    </div>
  )
}