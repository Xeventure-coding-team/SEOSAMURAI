"use client"

import { useState, useMemo, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Globe,
  Star,
  Copy,
  Clock,
  Users,
  Building2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Trash2,
  MapIcon,
  Phone,
  ImageIcon,
  AlertTriangle,
  Settings,
  ExternalLink,
} from "lucide-react"
import toast from "react-hot-toast"
import { usePageStore } from "@/store/usePageStore"
import NextLink from "next/link"
import Reviews from "./reviews"
import { useGMBStore } from "@/store/gmbStore"
import { AnimatedTabItem, AnimatedTabs } from "../design/AnimatedTabs"
import ErrorRender from "../Error"

interface GMBApiResponse {
  location: {
    data?: any
    hasPermission?: boolean
    locationData?: any
    reviews?: {
      reviews?: any[]
      averageRating?: number
      totalReviewCount?: number
      nextPageToken?: string
    }
    media?: {
      mediaItems?: any[]
      totalMediaItemCount?: number
    }
  }
}

const REVIEWS_PER_PAGE = 10
const MEDIA_PER_PAGE = 12

// ✅ Define allowed tab values
const validTabs = ["overview", "reviews", "media", "hours", "location-map", "remove"];

export default function LocationDashboard() {
  const params = useParams()
  const router = useRouter()
  const locationId = (params?.locationId as string) || "default-location"

  const [payload, setPayload] = useState<GMBApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reviewsPage, setReviewsPage] = useState(1)
  const [mediaPage, setMediaPage] = useState(1)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set())

  const searchParams = useSearchParams();
  const active = searchParams.get("active");

  // Derived data
  const location = useMemo(() => payload?.location?.locationData ?? null, [payload])
  const businessData = useMemo(() => payload?.location?.data ?? null, [payload])
  const reviews = useMemo(() => payload?.location?.reviews ?? { reviews: [], averageRating: 0, totalReviewCount: 0 }, [payload])
  const media = useMemo(() => payload?.location?.media ?? { mediaItems: [], totalMediaItemCount: 0 }, [payload])


  const accountId = useGMBStore((state) => state.accountId)
  const accessToken = useGMBStore((state) => state.accessToken)
  const gmbAccountId = useGMBStore((state) => state.accountId)
  const gmbAccountName = useGMBStore((state) => state.accountName)

  const [activeTab, setActiveTab] = useState('overview');


  const setPageName = usePageStore((state) => state.setPageName)


  // Listen to hash changes
  useEffect(() => {
    const hash = window.location.hash.slice(1); // Remove the #
    if (hash && validTabs.includes(hash)) {
      setActiveTab(hash);
    }
  }, []);


  useEffect(() => {
    async function fetchLocation() {
      try {
        setLoading(true)
        setError(null)

        if (!accessToken) {
          throw new Error("Access token not found. Please authenticate first.")
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL
        const url = `${apiUrl}/api/gmb/location?location_name=${encodeURIComponent(locationId)}&access_token=${encodeURIComponent(accessToken)}&gmb_account_id=${encodeURIComponent(accountId || "")}`

        console.log('url from locations detail..!', url)

        const res = await fetch(url, { cache: "no-store" })

        if (!res.ok) {
          const errorText = await res.text()
          throw new Error(`Failed to fetch location: ${res.status} ${res.statusText}. ${errorText}`)
        }

        const data: GMBApiResponse = await res.json()
        setPayload(data)

        // Update document title
        if (data.locationData?.name) {
          document.title = `${data.locationData.name} | Location Dashboard`
          setPageName(`${data.locationData.name}`)
        }
      } catch (err: any) {
        console.error("Error fetching location:", err)
        setError(err?.message || "Unknown error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchLocation()
  }, [locationId])


  const paginatedMedia = useMemo(() => {
    if (!media.mediaItems) return []
    const start = (mediaPage - 1) * MEDIA_PER_PAGE
    const end = start + MEDIA_PER_PAGE
    return media.mediaItems.slice(start, end)
  }, [media.mediaItems, mediaPage])

  const totalReviewPages = Math.ceil((reviews.reviews?.length || 0) / REVIEWS_PER_PAGE)
  const totalMediaPages = Math.ceil((media.mediaItems?.length || 0) / MEDIA_PER_PAGE)

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} copied to clipboard`)
    } catch (error) {
      toast.error("Failed to copy to clipboard")
    }
  }


  const handleImageError = (imageUrl: string) => {
    setImageErrors((prev) => new Set(prev).add(imageUrl))
    setLoadingImages((prev) => {
      const newSet = new Set(prev)
      newSet.delete(imageUrl)
      return newSet
    })
  }

  const getImageSrc = (url: string, fallback?: string) => {
    if (!url || imageErrors.has(url)) {
      return fallback || "/abstract-geometric-sculpture.png"
    }
    return url
  }

  const handleRemoveLocation = async () => {
    try {
      setRemoving(true)

      if (!accessToken) {
        throw new Error("Access token not found")
      }

      // Extract just the numeric ID if it's in the full format
      const locationIdToSend = locationId.startsWith('locations/')
        ? locationId.replace('locations/', '')
        : locationId;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL
      const url = `${apiUrl}/api/gmb/location/remove`

      const res = await fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          location_name: locationIdToSend, // Send just the numeric ID
          access_token: accessToken,
          gmb_account_id: accountId,
        }),
      })

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to remove location")
      }

      toast.success("Location removed successfully")
      setShowRemoveDialog(false)
      // Redirect or refresh after successful removal
      window.location.href = "/app/locations"
    } catch (error: any) {
      toast.error(error.message || "Failed to remove location")
    } finally {
      setRemoving(false)
    }
  }

  const handleImageLoad = (imageUrl: string) => {
    setLoadingImages((prev) => {
      const newSet = new Set(prev)
      newSet.delete(imageUrl)
      return newSet
    })
  }

  const handleImageLoadStart = (imageUrl: string) => {
    setLoadingImages((prev) => new Set([...prev, imageUrl]))
  }

  // Loading state
  if (loading) {
    return (
      <TooltipProvider>
        <div className="container mx-auto space-y-6">
          <div className="mx-auto space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <CardTitle>Loading location details...</CardTitle>
                </div>
                <CardDescription>Updating to the most recent business details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-8 w-2/3" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-1/3" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-32 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </TooltipProvider>
    )
  }

  // Error state
  if (error) {
    return (
      <ErrorRender error={"We couldn't load this content. You can retry or report the issue."} />
    )
  }

  // No data state
  if (!location || !businessData) {
    return (
      <TooltipProvider>
        <div className="container mx-auto space-y-6">
          <div className="mx-auto">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>No location data found</AlertTitle>
              <AlertDescription>
                The requested location could not be found or you don't have permission to access it.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </TooltipProvider>
    )
  }

  const name = location.name || businessData.displayName || "Unnamed Location"
  const category = businessData.categories?.primaryCategory?.displayName || "Business"
  const address =
    location.formatted_address || location.storefrontAddress?.addressLines?.join(", ") || "Address not available"
  const website = location.website || location.websiteUri
  const rating = location.rating || reviews.averageRating || 0
  const isOpen = location.opening_hours?.open_now ?? false
  const coordinates = location.geometry?.location
    ? [location.geometry.location.lat, location.geometry.location.lng]
    : null


  // ✅ Fallback to "overview" if not found
  const defaultTab = validTabs.includes(active ?? "") ? active! : "overview";


  // Handle dropdown navigation
  const handleNavigation = (tabId: string) => {
    setActiveTab(tabId);
    window.location.hash = tabId;
  };


  return (
    <TooltipProvider>
      <div className="container mx-auto space-y-6">
        <div className="mx-auto space-y-6">
          <Card className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-4 rounded-md border">
            <div>
              <h1 className="text-xl font-bold tracking-tight">{name}</h1>
            </div>
            <NextLink href={`/app/locations/${locationId}/manage`}>
              <Button className="w-fit cursor-pointer">
                <Settings className="w-4 h-4 mr-2" />
                Manage this location
              </Button>
            </NextLink>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Category */}
            <Card>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">Category</p>
                    <p className="text-sm font-medium truncate">{category}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rating */}
            <Card>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Star className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Rating</p>
                    <p className="text-sm font-medium">
                      {rating}/5
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reviews */}
            <Card>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Reviews</p>
                    <p className="text-sm font-medium">
                      {reviews.totalReviewCount || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status */}
            <Card>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="flex flex-col gap-1">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge
                      variant={isOpen ? "default" : "secondary"}
                      className="w-fit text-xs"
                    >
                      {isOpen ? "Open" : "Closed"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="pt-0">
            <AnimatedTabs
              items={[
                'overview',
                'reviews',
                'media',
                'hours',
                'location-map',
                'danger-zone'
              ]
              }
              defaultTab={activeTab}
              className="w-full"
              noPadding={true}
            >
              <AnimatedTabItem value="overview" label="Overview">

                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Business Info */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base font-semibold">
                          Business Information
                        </CardTitle>
                        <CardDescription className="text-sm">
                          Core details and contact information
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="pt-0 space-y-5">
                        {/* Address */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Address</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => copyToClipboard(address, "Address")}
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copy</TooltipContent>
                            </Tooltip>
                          </div>
                          <p className="text-sm font-medium">{address}</p>
                        </div>

                        {/* Phone */}
                        {location.primaryPhone && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Phone</span>
                              <div className="flex gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" asChild>
                                      <a href={`tel:${location.primaryPhone}`}>
                                        <Phone className="w-4 h-4" />
                                      </a>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Call</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() =>
                                        copyToClipboard(location.primaryPhone, "Phone")
                                      }
                                    >
                                      <Copy className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Copy</TooltipContent>
                                </Tooltip>
                              </div>
                            </div>
                            <p className="text-sm font-medium">{location.primaryPhone}</p>
                          </div>
                        )}

                        {/* Website */}
                        {website && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Website</span>
                              <Button variant="ghost" size="icon" asChild>
                                <a href={website} target="_blank" rel="noopener noreferrer">
                                  <Globe className="w-4 h-4" />
                                </a>
                              </Button>
                            </div>
                            <p className="text-sm font-medium break-all">{website}</p>
                          </div>
                        )}

                        {/* Place ID */}
                        {businessData.metadata?.placeId && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Place ID</span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      copyToClipboard(
                                        businessData.metadata.placeId,
                                        "Place ID"
                                      )
                                    }
                                  >
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Copy</TooltipContent>
                              </Tooltip>
                            </div>
                            <p className="text-xs font-mono bg-muted px-2 py-1 rounded break-all">
                              {businessData.metadata.placeId}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Categories */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base font-semibold">
                          Categories & Services
                        </CardTitle>
                        <CardDescription className="text-sm">
                          Business categories and services
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="pt-0 space-y-5">
                        {/* Primary */}
                        {businessData.categories?.primaryCategory ? (
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                              Primary Category
                            </p>
                            <Badge variant="default" className="text-sm">
                              {businessData.categories.primaryCategory.displayName}
                            </Badge>
                          </div>
                        ) : (
                          <div className="text-center py-6 text-muted-foreground">
                            <Building2 className="w-6 h-6 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No primary category</p>
                          </div>
                        )}

                        {/* Additional */}
                        {businessData.categories?.additionalCategories?.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                              Additional Categories
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {businessData.categories.additionalCategories
                                .slice(0, 10)
                                .map((category: any, index: number) => (
                                  <Badge
                                    key={index}
                                    variant="secondary"
                                    className="text-sm shrink-0"
                                  >
                                    {category.displayName}
                                  </Badge>
                                ))}

                              {businessData.categories.additionalCategories.length > 10 && (
                                <Badge
                                  variant="outline"
                                  className="text-sm shrink-0"
                                >
                                  +{businessData.categories.additionalCategories.length - 10}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-6 text-muted-foreground">
                            <p className="text-sm">No additional categories</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {businessData.profile?.description ? (
                    <Card className="mt-4">
                      <CardHeader>
                        <CardTitle>Description</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">{businessData.profile.description}</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="mt-4">
                      <CardHeader>
                        <CardTitle>Description</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-8 text-muted-foreground">
                          <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No business description available</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>


              </AnimatedTabItem>
              <AnimatedTabItem value="reviews">
                <div className="p-6">
                  <Reviews averageRating={rating} businessName={name} locationId={locationId} />
                </div>
              </AnimatedTabItem>
              <AnimatedTabItem value="media">
                <div className="p-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Media Gallery</CardTitle>
                          <CardDescription>{media.totalMediaItemCount || 0} photos</CardDescription>
                        </div>
                        {totalMediaPages > 1 && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setMediaPage(Math.max(1, mediaPage - 1))}
                              disabled={mediaPage === 1}
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <span className="text-sm text-muted-foreground">
                              Page {mediaPage} of {totalMediaPages}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setMediaPage(Math.min(totalMediaPages, mediaPage + 1))}
                              disabled={mediaPage === totalMediaPages}
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {paginatedMedia.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {paginatedMedia.map((item: any, index: number) => {
                            const googleUrl = item.googleUrl
                            const isImageLoading = loadingImages.has(googleUrl)
                            const hasImageError = imageErrors.has(googleUrl)

                            return (
                              <div
                                key={item.name || index}
                                className="aspect-square rounded-lg overflow-hidden bg-muted relative group"
                              >
                                {hasImageError ? (
                                  <div className="w-full h-full flex items-center justify-center bg-muted">
                                    <div className="text-center">
                                      <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                      <p className="text-xs text-muted-foreground">Image failed to load</p>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    {isImageLoading && (
                                      <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
                                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                      </div>
                                    )}
                                    <img
                                      src={getImageSrc(googleUrl) || "/placeholder.svg"}
                                      alt={`Media ${index + 1}`}
                                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                                      onLoadStart={() => handleImageLoadStart(googleUrl)}
                                      onLoad={() => handleImageLoad(googleUrl)}
                                      onError={() => handleImageError(googleUrl)}
                                    />
                                  </>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No media found</p>
                          <p className="text-xs mt-2">This location doesn't have any photos available</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </AnimatedTabItem>
              <AnimatedTabItem value="hours">
                <div className="p-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Business Hours</CardTitle>
                      <CardDescription>Weekly operating schedule</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div>
                        {location.opening_hours?.weekday_text?.length > 0 ? (
                          <div className="space-y-3">
                            {location.opening_hours.weekday_text.map((hours: string, index: number) => {
                              const [day, time] = hours.split(": ")
                              const isToday = new Date().getDay() === (index + 1) % 7
                              return (
                                <div
                                  key={index}
                                  className={`flex justify-between items-center p-3 rounded-lg border ${isToday ? "bg-primary/10 border border-primary/20" : "bg-muted/50"
                                    }`}
                                >
                                  <span className={`font-medium ${isToday ? "text-primary" : ""}`}>{day}</span>
                                  <span
                                    className={`text-sm ${isToday ? "text-primary font-medium" : "text-muted-foreground"}`}
                                  >
                                    {time || "Closed"}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>Business hours not found</p>
                            <p className="text-xs mt-2">Operating hours are not available for this location</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </AnimatedTabItem>
              <AnimatedTabItem value="location-map">
                <div className="p-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Location Map</CardTitle>
                      <CardDescription>View location on external map services</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {coordinates ? (
                        <div className="space-y-4">
                          <div className="h-96 rounded-lg border bg-muted flex items-center justify-center">
                            <div className="text-center space-y-4">
                              <MapIcon className="w-16 h-16 mx-auto text-muted-foreground" />
                              <div>
                                <p className="font-medium">{name}</p>
                                <p className="text-sm text-muted-foreground">{address}</p>
                                <p className="text-xs text-muted-foreground font-mono mt-2">
                                  {coordinates[0]}, {coordinates[1]}
                                </p>
                              </div>
                              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                                <Button variant="outline" size="sm" asChild>
                                  <a
                                    href={`https://www.google.com/maps?q=${coordinates[0]},${coordinates[1]}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Google Maps
                                  </a>
                                </Button>
                                <Button variant="outline" size="sm" asChild>
                                  <a
                                    href={`https://www.openstreetmap.org/?mlat=${coordinates[0]}&mlon=${coordinates[1]}&zoom=15`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    OpenStreetMap
                                  </a>
                                </Button>
                              </div>
                            </div>
                          </div>
                          <div className="p-4 bg-muted rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium mb-2">Coordinates</p>
                                <p className="text-sm text-muted-foreground font-mono">
                                  {coordinates[0]}, {coordinates[1]}
                                </p>
                              </div>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(`${coordinates[0]}, ${coordinates[1]}`, "Coordinates")}
                                  >
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Copy coordinates</TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <MapIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>Location coordinates not found</p>
                          <p className="text-xs mt-2">Unable to display map without valid coordinates</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </AnimatedTabItem>
              <AnimatedTabItem value="danger-zone">
                <div className="p-6">
                  <Card className="border-destructive/20">
                    <CardHeader>
                      <CardTitle className="text-destructive">Remove Location</CardTitle>
                      <CardDescription>
                        Permanently remove this location from the system database. This action cannot be undone.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Warning</AlertTitle>
                        <AlertDescription>
                          This will permanently delete the location and all associated data from your system. This action is
                          irreversible.
                        </AlertDescription>
                      </Alert>

                      <div className="space-y-3">
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-sm font-medium mb-2">Location to be removed:</p>
                          <p className="text-sm text-muted-foreground">{name}</p>
                          <p className="text-xs text-muted-foreground">{address}</p>
                        </div>

                        <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
                          <DialogTrigger asChild>
                            <Button variant="destructive" className="w-full cursor-pointer">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remove Location from System
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Confirm Location Removal</DialogTitle>
                              <DialogDescription>
                                Are you sure you want to remove "{name}" from the system? This action cannot be undone and
                                will permanently delete all associated data.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setShowRemoveDialog(false)} disabled={removing}>
                                Cancel
                              </Button>
                              <Button variant="destructive" onClick={handleRemoveLocation} disabled={removing} className="cursor-pointer">
                                {removing ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Removing...
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Remove Location
                                  </>
                                )}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </AnimatedTabItem>

            </AnimatedTabs>
          </Card>

        </div>
      </div>
    </TooltipProvider>
  )
}
