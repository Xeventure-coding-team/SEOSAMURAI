import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useGMBStore } from './gmbStore'

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

interface ScheduledPost {
    // Define your scheduled post structure
    [key: string]: any
}

interface LocationStore {
    // State
    selectedLocation: string | null
    locationDetails: LocationDetails | null
    locations: Location[]
    events: ScheduledPost[]
    loadingDetails: boolean
    error: string | null
    accessToken: string | null
    gmbAccountId: string | null
    
    // Actions
    setSelectedLocation: (locationName: string) => void
    setLocationDetails: (details: LocationDetails | null) => void
    setLocations: (locations: Location[]) => void
    setEvents: (events: ScheduledPost[]) => void
    setLoadingDetails: (loading: boolean) => void
    setError: (error: string | null) => void
    setCredentials: (accessToken: string, gmbAccountId: string) => void
    fetchLocationDetails: (locationName: string) => Promise<void>
    handleLocationSelect: (locationName: string) => void
    refreshCurrentLocation: () => Promise<void>
    clearLocationData: () => void
    getLocationDisplayName: (location: Location) => string
}

const getLocationDisplayName = (location: any) => {
    return location.displayName || 
           location.title || 
           location.name?.split('/').pop() || 
           location.storefrontAddress?.addressLines?.[0] || 
           "Location"
}

const useLocationStore = create<LocationStore>()(
    devtools(
        (set, get) => ({
            // Initial state
            selectedLocation: null,
            locationDetails: null,
            locations: [],
            events: [],
            loadingDetails: false,
            error: null,
            accessToken: null,
            gmbAccountId: null,

            // Actions
            setSelectedLocation: (locationName) => 
                set({ selectedLocation: locationName }, false, 'setSelectedLocation'),

            setLocationDetails: (details) => 
                set({ locationDetails: details }, false, 'setLocationDetails'),

            setLocations: (locations) => 
                set({ locations }, false, 'setLocations'),

            setEvents: (events) => 
                set({ events }, false, 'setEvents'),

            setLoadingDetails: (loading) => 
                set({ loadingDetails: loading }, false, 'setLoadingDetails'),

            setError: (error) => 
                set({ error }, false, 'setError'),

            setCredentials: (accessToken, gmbAccountId) => 
                set({ accessToken, gmbAccountId }, false, 'setCredentials'),

            getLocationDisplayName: (location) => {
                // Implement your display name logic here
                return location.name || 'Unknown Location'
            },

            fetchLocationDetails: async (locationName: string) => {
                  const accountId = useGMBStore((state) => state.accountId)
                  const accessToken = useGMBStore((state) => state.accessToken)
                  const gmbAccountId = useGMBStore((state) => state.accountId)
                  const gmbAccountName = useGMBStore((state) => state.accountName)
                
                if (!accessToken || !gmbAccountId) {
                    toast.error("Missing credentials. Please re-authenticate.", {
                        duration: 4000,
                        position: "top-center",
                    })
                    return
                }

                try {
                    set({ loadingDetails: true, error: null }, false, 'fetchLocationDetails:start')

                    const actualLocationId = locationName.startsWith("locations/") 
                        ? locationName.split("/")[1] 
                        : locationName

                    const apiUrl = process.env.NEXT_PUBLIC_API_URL
                    const url = `${apiUrl}/api/gmb/location?location_name=${encodeURIComponent(actualLocationId)}&access_token=${encodeURIComponent(accessToken)}&gmb_account_id=${encodeURIComponent(gmbAccountId)}&with_posts=true`

                    const response = await axios.get(url)

                    if (response.data) {
                        set({ 
                            locationDetails: response.data.location 
                        }, false, 'fetchLocationDetails:success')

                        const location = locations.find((loc) => loc.name === locationName)
                        const displayName = location ? getLocationDisplayName(location) : "Location"
                        
                        if (response.data.scheduledPosts) {
                            set({ events: response.data.scheduledPosts }, false, 'fetchLocationDetails:setEvents')
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
                    
                    set({ error: errorMessage }, false, 'fetchLocationDetails:error')
                    
                    toast.error(`Unable to load location details: ${errorMessage}`, {
                        duration: 5000,
                        position: "top-center",
                    })
                } finally {
                    set({ loadingDetails: false }, false, 'fetchLocationDetails:end')
                }
            },

            handleLocationSelect: (locationName: string) => {
                set({ 
                    selectedLocation: locationName, 
                    locationDetails: null 
                }, false, 'handleLocationSelect')
                
                get().fetchLocationDetails(locationName)
            },

            refreshCurrentLocation: async () => {
                const { selectedLocation } = get()
                if (selectedLocation) {
                    await get().fetchLocationDetails(selectedLocation)
                }
            },

            clearLocationData: () => {
                set({
                    selectedLocation: null,
                    locationDetails: null,
                    events: [],
                    error: null
                }, false, 'clearLocationData')
            }
        }),
        {
            name: 'location-store', // Store name for devtools
        }
    )
)

export default useLocationStore

// Optimized selectors to prevent infinite loops
export const useLocationDetails = () => useLocationStore((state) => state.locationDetails)
export const useLocationLoading = () => useLocationStore((state) => state.loadingDetails)
export const useLocationError = () => useLocationStore((state) => state.error)
export const useLocationEvents = () => useLocationStore((state) => state.events)

// Cached actions selector to prevent recreation on every render
const actionsSelector = (state: LocationStore) => ({
    fetchLocationDetails: state.fetchLocationDetails,
    refreshLocationDetails: state.refreshLocationDetails,
    setCredentials: state.setCredentials,
    clearLocationData: state.clearLocationData,
})

export const useLocationActions = () => {
  const fetchLocationDetails = useLocationStore(state => state.fetchLocationDetails)
  const refreshLocationDetails = useLocationStore(state => state.refreshCurrentLocation)
  const setCredentials = useLocationStore(state => state.setCredentials)
  const clearLocationData = useLocationStore(state => state.clearLocationData)

  return { fetchLocationDetails, refreshLocationDetails, setCredentials, clearLocationData }
}
