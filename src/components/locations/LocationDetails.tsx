"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { notFound, useParams, useRouter, useSearchParams } from "next/navigation"
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
  CheckCircle,
  AlertOctagon,
  TrendingUp,
  Zap,
  Shield,
  Eye,
  FileText,
  Tag,
  Hash,
  MapPin,
  Info,
  CalendarOff,
  Timer,
  MessageSquare,
} from "lucide-react"
import toast from "react-hot-toast"
import { usePageStore } from "@/store/usePageStore"
import NextLink from "next/link"
import Reviews from "./reviews"
import { useGMBStore } from "@/store/gmbStore"
import { AnimatedTabItem, AnimatedTabs } from "../design/AnimatedTabs"
import ErrorRender from "../Error"
import { MediaTabContent } from "./MediaTabContent"
import { cn } from "@/lib/utils"
import { PlanGate } from "../PlanGate"
import { LocationLocked } from "./LocationLocked"
import BillingsPage from "../billing/BillingsPage"

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
const validTabs = ["overview", "reviews", "media", "hours", "location-map", "health", "remove"];

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
  const [activeState, setActiveState] = useState<boolean>(false);
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


  const fetchLocation = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      if (!accessToken) {
        throw new Error("Access token not found. Please authenticate first.")
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL
      const url = `${apiUrl}/api/gmb/location?location_name=${encodeURIComponent(locationId)}&access_token=${encodeURIComponent(accessToken)}&gmb_account_id=${encodeURIComponent(accountId || "")}`

      const res = await fetch(url, { cache: "no-store" })

      if (res.status === 404) {
        notFound() // triggers Next.js not-found.tsx
        return
      }

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`Failed to fetch location: ${res.status} ${res.statusText}. ${errorText}`)
      }

      const data: GMBApiResponse = await res.json()

      const isActive = data?.location?.data?.is_active ?? false;
      setActiveState(isActive);

      setPayload(data)

      if (data) {
        const businessName = data?.location?.locationData?.name;
        const pageName = businessName ? `${businessName}` : 'Location Dashboard';
        document.title = pageName !== 'Location Dashboard'
          ? `${pageName} | Rankerly`
          : 'Location Dashboard | Rankerly';
        setPageName(pageName);
      }

    } catch (err: any) {
      console.error("Error fetching location:", err)
    } finally {
      setLoading(false)
    }
  }, [locationId, accessToken, accountId])


  useEffect(() => {
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
          location_name: locationIdToSend,
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

  const getLocationData = (payload: any) => payload?.location?.locationData || {}

  // Calculate completion score and health metrics
  const completionScore = useMemo(() => {
    const locationData = payload?.location?.locationData || {}
    const location = payload?.location || {}
    const mediaCount = payload?.location?.media?.totalMediaItemCount || 0
    const reviewCount = payload?.location?.reviews?.totalReviewCount || 0

    const checks = [
      !!locationData.name,
      !!location?.data?.phoneNumbers?.primaryPhone,
      !!locationData.website,
      !!locationData.formatted_address,
      mediaCount > 0,
      reviewCount > 0,
      !!locationData.opening_hours,
      !!location.data?.categories?.primaryCategory
    ]
    return (checks.filter(Boolean).length / checks.length) * 100
  }, [payload])

  const completionItems = useMemo(() => {
    const locationData = payload?.location?.locationData || {}
    const location = payload?.location || {}
    const mediaCount = payload?.location?.media?.totalMediaItemCount || 0
    const reviewCount = payload?.location?.reviews?.totalReviewCount || 0

    return [
      {
        label: 'Business Description',
        value: locationData.name ? '✓ Added' : '✗ Missing',
        completed: !!locationData.name
      },
      {
        label: 'Contact Phone',
        value: location?.data?.phoneNumbers?.primaryPhone ? '✓ Added' : '✗ Missing',
        completed: !!location?.data?.phoneNumbers?.primaryPhone
      },
      {
        label: 'Website',
        value: locationData.website ? '✓ Added' : '✗ Missing',
        completed: !!locationData.website
      },
      {
        label: 'Photos & Media',
        value: mediaCount > 0 ? `${mediaCount}` : '0',
        completed: mediaCount > 0
      },
      {
        label: 'Customer Reviews',
        value: reviewCount > 0 ? `${reviewCount}` : '0',
        completed: reviewCount > 0
      },
      {
        label: 'Address',
        value: locationData.formatted_address ? '✓ Added' : '✗ Missing',
        completed: !!locationData.formatted_address
      },
      {
        label: 'Category',
        value: location.data?.categories?.primaryCategory ? location.data?.categories?.primaryCategory?.displayName : 'Not set',
        completed: location.data?.categories?.primaryCategory
      },
      {
        label: 'Business Hours',
        value: locationData.opening_hours ? '✓ Set' : '✗ Not set',
        completed: !!locationData.opening_hours
      },
    ]
  }, [payload])

  const riskFactors = useMemo(() => {
    const risks = []
    const locationData = payload?.location?.locationData || {}
    const mediaCount = payload?.location?.media?.totalMediaItemCount || 0
    const reviewCount = payload?.location?.reviews?.totalReviewCount || 0
    const rating = payload?.location?.reviews?.averageRating || 0

    if (!locationData.name) {
      risks.push({
        level: 'critical',
        issue: 'Missing Business Name',
        impact: 'Your business name is crucial. Ensure it is complete and accurate.'
      })
    }

    if (!locationData.website) {
      risks.push({
        level: 'warning',
        issue: 'No Website Listed',
        impact: 'Customers cannot easily find more information. Add your website URL.'
      })
    }

    if (!locationData.formatted_address) {
      risks.push({
        level: 'critical',
        issue: 'Incomplete Address',
        impact: 'Complete and accurate address information is essential for search visibility.'
      })
    }

    if (mediaCount === 0) {
      risks.push({
        level: 'warning',
        issue: 'No Photos or Videos',
        impact: 'Missing photos significantly reduces visibility. Add at least 5-10 high-quality images.'
      })
    } else if (mediaCount < 5) {
      risks.push({
        level: 'info',
        issue: 'Limited Media Content',
        impact: `Only ${mediaCount} photos. Consider adding more to improve visibility.`
      })
    }

    if (rating < 3.5 && reviewCount > 0) {
      risks.push({
        level: 'critical',
        issue: 'Low Rating Score',
        impact: `Your ${rating}/5 rating may affect search visibility. Focus on improving customer satisfaction.`
      })
    }

    return risks
  }, [payload])

  const scoreMetrics = useMemo(() => {
    const rating = payload?.location?.reviews?.averageRating || 0
    const mediaCount = payload?.location?.media?.totalMediaItemCount || 0
    const reviewCount = payload?.location?.reviews?.totalReviewCount || 0

    return [
      {
        label: 'Rating Score',
        value: `${rating.toFixed(1)}/5`,
        status: rating >= 4 ? 'excellent' : rating >= 3 ? 'good' : 'needs improvement',
        percentage: (rating / 5) * 100
      },
      {
        label: 'Review Count',
        value: reviewCount,
        status: reviewCount >= 20 ? 'excellent' : reviewCount >= 10 ? 'good' : 'needs improvement',
        percentage: Math.min((reviewCount / 20) * 100, 100)
      },
      {
        label: 'Media Assets',
        value: mediaCount,
        status: mediaCount >= 10 ? 'excellent' : mediaCount >= 5 ? 'good' : 'needs improvement',
        percentage: Math.min((mediaCount / 10) * 100, 100)
      },
      {
        label: 'Profile Health',
        value: `${Math.round(completionScore)}%`,
        status: completionScore >= 80 ? 'excellent' : completionScore >= 60 ? 'good' : 'needs improvement',
        percentage: completionScore
      },
    ]
  }, [payload, completionScore])

  const impactFactors = useMemo(() => {
    const locationData = payload?.location?.locationData || {}
    const hasPhotos = (payload?.location?.media?.totalMediaItemCount || 0) > 0
    const hasReviews = (payload?.location?.reviews?.totalReviewCount || 0) > 0
    const rating = payload?.location?.reviews?.averageRating || 0
    const hasWebsite = !!locationData.website
    const hasHours = !!locationData.opening_hours

    return [
      {
        factor: 'Complete Business Information',
        description: 'Fully completed profiles rank higher in search results',
        impact: 'high'
      },
      {
        factor: 'High-Quality Photos',
        description: 'Locations with photos get 42% more map view requests',
        impact: hasPhotos ? 'low' : 'high'
      },
      {
        factor: 'Positive Reviews',
        description: 'Strong ratings and recent reviews boost visibility',
        impact: rating >= 4 && hasReviews ? 'low' : 'low'
      },
      {
        factor: 'Business Hours Updates',
        description: 'Accurate hours reduce customer confusion and improve trust',
        impact: hasHours ? 'low' : 'medium'
      },
      {
        factor: 'Website Integration',
        description: 'Linked website improves credibility and click-through rates',
        impact: hasWebsite ? 'medium' : 'medium'
      },
    ]
  }, [payload])

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


  const locationName = `${gmbAccountName}/locations/${locationId}`

  return (
    <TooltipProvider>
      {activeState === false ? <LocationLocked /> : <>

        <div className="min-h-screen p-6 lg:p-8">
          <div className="mx-auto space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
                    {name}
                  </h1>

                </div>
                <div className="flex items-center gap-3 mt-2">
                  {isOpen !== undefined && (
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${isOpen ? 'bg-emerald-500' : 'bg-red-500'} inline-block flex-shrink-0`} />
                      <span className={`text-base font-semibold ${isOpen ? 'text-emerald-600' : 'text-red-600'}`}>
                        {isOpen ? 'Open' : 'Closed'}
                      </span>
                    </div>
                  )}
                  {isOpen !== undefined && (
                    <span className="text-muted-foreground text-sm">·</span>
                  )}
                  <span className="text-base text-muted-foreground font-medium">
                    {category}
                  </span>
                </div>

              </div>
              <NextLink href={`/app/locations/${locationId}/manage`}>
                <Button className="w-fit cursor-pointer h-11 px-6" variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  Manage Location
                </Button>
              </NextLink>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

              {/* Rating */}
              <Card className="border-2 border-slate-200 dark:border-slate-700">
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500" />
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Rating</p>
                  </div>
                  <p className="text-3xl font-bold leading-none mt-3 tabular-nums">{rating.toFixed(1)}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <div className="flex text-amber-400 text-base leading-none">
                      {'★'.repeat(Math.floor(rating))}{'☆'.repeat(5 - Math.floor(rating))}
                    </div>
                    <span className="text-sm text-muted-foreground">{location?.reviews?.length || 0} reviews</span>
                  </div>
                </CardContent>
              </Card>

              {/* Reviews */}
              <Card className="border-2 border-slate-200 dark:border-slate-700">
                <CardContent>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Reviews</p>
                  </div>
                  <p className="text-3xl font-bold leading-none mt-3 tabular-nums">{location?.reviews?.length || 0}</p>
                  <p className="text-sm text-muted-foreground mt-3">Total responses</p>
                </CardContent>
              </Card>

              {/* Status */}
              <Card
                className={`border-2 ${isOpen
                    ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10"
                    : "border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10"
                  }`}
              >
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Clock className={`w-4 h-4 ${isOpen ? "text-emerald-600" : "text-red-500"}`} />
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Status</p>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className={`text-2xl font-bold leading-none ${isOpen ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {isOpen ? 'Open' : 'Closed'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3 leading-snug">
                    {location?.opening_hours?.weekday_text?.[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1] ?? 'Hours unavailable'}
                  </p>
                </CardContent>
              </Card>

              {/* Phone */}
              <Card className="border-2 border-slate-200 dark:border-slate-700">
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-violet-500" />
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Phone</p>
                  </div>
                  <p className="text-xl font-bold leading-none mt-3 tabular-nums break-all">
                    {businessData?.phoneNumbers?.primaryPhone || '—'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-3">
                    {businessData?.phoneNumbers?.additionalPhones?.[0] ?? 'Primary contact'}
                  </p>
                </CardContent>
              </Card>

            </div>

            <AnimatedTabs
              syncHash
              items={[
                'overview',
                'reviews',
                'media',
                'hours',
                'location-map',
                'health',
                'danger-zone'
              ]
              }
              defaultTab={activeTab}
              className="w-full"
              noPadding={true}
            >
              <AnimatedTabItem value="overview" label="Overview">

                <div className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Business Info */}
                    <Card className="bg-white/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                      <CardHeader>
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          Business Information
                        </CardTitle>
                        <CardDescription className="text-sm">
                          Core details and contact information
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="pt-0 space-y-1">
                        {/* Address */}
                        <div className="group flex items-start gap-3 rounded-md -mx-2 px-2 py-2.5 transition-colors hover:bg-slate-100/70 dark:hover:bg-slate-700/40">
                          <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground">Address</p>
                            <p className="text-sm font-medium leading-snug">{address}</p>
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                onClick={() => copyToClipboard(address, "Address")}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copy address</TooltipContent>
                          </Tooltip>
                        </div>

                        {/* Phone */}
                        {location.primaryPhone && (
                          <div className="group flex items-start gap-3 rounded-md -mx-2 px-2 py-2.5 transition-colors hover:bg-slate-100/70 dark:hover:bg-slate-700/40">
                            <Phone className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground">Phone</p>
                              <p className="text-sm font-medium">{location.primaryPhone}</p>
                            </div>
                            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
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
                                    onClick={() => copyToClipboard(location.primaryPhone, "Phone")}
                                  >
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Copy</TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        )}

                        {/* Website */}
                        {website && (
                          <div className="group flex items-start gap-3 rounded-md -mx-2 px-2 py-2.5 transition-colors hover:bg-slate-100/70 dark:hover:bg-slate-700/40">
                            <Globe className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground">Website</p>
                              <p className="text-sm font-medium break-all">{website}</p>
                            </div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  asChild
                                  className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                >
                                  <a href={website} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Open website</TooltipContent>
                            </Tooltip>
                          </div>
                        )}

                        {/* Place ID */}
                        {businessData.metadata?.placeId && (
                          <div className="group flex items-start gap-3 rounded-md -mx-2 px-2 py-2.5 transition-colors hover:bg-slate-100/70 dark:hover:bg-slate-700/40">
                            <Hash className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground">Place ID</p>
                              <p className="text-xs font-mono bg-muted px-2 py-1 rounded mt-1 inline-block break-all">
                                {businessData.metadata.placeId}
                              </p>
                            </div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                  onClick={() =>
                                    copyToClipboard(businessData.metadata.placeId, "Place ID")
                                  }
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copy</TooltipContent>
                            </Tooltip>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Categories */}
                    <Card className="bg-white/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                      <CardHeader>
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <Tag className="w-4 h-4 text-muted-foreground" />
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
                            <p className="text-xs text-muted-foreground">Primary category</p>
                            <Badge variant="default" className="text-sm">
                              {businessData.categories.primaryCategory.displayName}
                            </Badge>
                          </div>
                        ) : (
                          <div className="text-center py-6 text-muted-foreground border border-dashed rounded-md">
                            <Building2 className="w-6 h-6 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No primary category set</p>
                          </div>
                        )}

                        {/* Additional */}
                        {businessData.categories?.additionalCategories?.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">
                              Additional categories ({businessData.categories.additionalCategories.length})
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {businessData.categories.additionalCategories
                                .slice(0, 10)
                                .map((category, index) => (
                                  <Badge key={index} variant="secondary" className="text-sm shrink-0">
                                    {category.displayName}
                                  </Badge>
                                ))}

                              {businessData.categories.additionalCategories.length > 10 && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="outline" className="text-sm shrink-0 cursor-default">
                                      +{businessData.categories.additionalCategories.length - 10} more
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {businessData.categories.additionalCategories
                                      .slice(10)
                                      .map((c) => c.displayName)
                                      .join(", ")}
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-6 text-muted-foreground border border-dashed rounded-md">
                            <Tag className="w-6 h-6 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No additional categories</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Description */}
                  <Card className="bg-white/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        Description
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {businessData.profile?.description ? (
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                          {businessData.profile.description}
                        </p>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground border border-dashed rounded-md">
                          <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-50" />
                          <p className="text-sm font-medium">No business description available</p>
                          <p className="text-xs mt-1">Add one in Google Business Profile to improve search visibility</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

              </AnimatedTabItem>
              <AnimatedTabItem value="reviews">
                <div>
                  <Reviews businessName={name} locationId={locationId} />
                </div>
              </AnimatedTabItem>
              <AnimatedTabItem value="media">
                <MediaTabContent
                  media={media}
                  paginatedMedia={paginatedMedia}
                  mediaPage={mediaPage}
                  totalMediaPages={totalMediaPages}
                  loadingImages={loadingImages}
                  imageErrors={imageErrors}
                  locationName={`${gmbAccountName}/locations/${locationId}`}
                  setMediaPage={setMediaPage}
                  getImageSrc={getImageSrc}
                  handleImageLoadStart={handleImageLoadStart}
                  handleImageLoad={handleImageLoad}
                  handleImageError={handleImageError}
                  onUploadSuccess={fetchLocation}
                  accessToken={accessToken}
                />
              </AnimatedTabItem>

              <AnimatedTabItem value="hours">
                <div>
                  <Card className="bg-white/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <Clock className="w-5 h-5 text-muted-foreground" />
                            Business Hours
                          </CardTitle>
                          <CardDescription className="text-sm mt-1">
                            Weekly operating schedule
                          </CardDescription>
                        </div>

                        {location.opening_hours?.open_now !== undefined && (
                          <Badge
                            variant="outline"
                            className={`text-sm px-3 py-1 border-2 ${location.opening_hours.open_now
                              ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "border-red-400 bg-red-50 text-red-700 dark:border-red-600 dark:bg-red-900/30 dark:text-red-400"
                              }`}
                          >
                            <span
                              className={`mr-2 inline-block w-2 h-2 rounded-full ${location.opening_hours.open_now ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                                }`}
                            />
                            {location.opening_hours.open_now ? "Open now" : "Closed now"}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent>
                      {(() => {
                        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
                        const fullDayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

                        /* ---- Build a normalized periods[] from whichever data exists ---- */
                        let periods = location.opening_hours?.periods

                        if (!periods?.length && location.opening_hours?.weekday_text?.length > 0) {
                          const parseClock = (str) => {
                            const m = str.trim().match(/(\d{1,2}):(\d{2})\s*([AP]M)/i)
                            if (!m) return null
                            let h = parseInt(m[1], 10) % 12
                            if (m[3].toUpperCase() === "PM") h += 12
                            return `${String(h).padStart(2, "0")}${m[2]}`
                          }

                          periods = []
                          location.opening_hours.weekday_text.forEach((entry, idx) => {
                            const [, hoursStr] = entry.split(/:\s(.+)/).length > 1 ? entry.split(/:\s(.+)/) : [null, null]
                            const dayNum = (idx + 1) % 7
                            if (!hoursStr || /closed/i.test(hoursStr)) return
                            const [openStr, closeStr] = hoursStr.split(/–|-/).map((s) => s.trim())
                            const openTime = parseClock(openStr)
                            const closeTime = parseClock(closeStr)
                            if (openTime && closeTime) {
                              periods.push({ open: { day: dayNum, time: openTime }, close: { day: dayNum, time: closeTime } })
                            }
                          })
                        }

                        if (!periods?.length) {
                          return (
                            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                              <Clock className="w-14 h-14 mx-auto mb-4 opacity-50" />
                              <p className="text-base font-medium">Business hours not found</p>
                              <p className="text-sm mt-2">Operating hours are not available for this location</p>
                            </div>
                          )
                        }

                        /* ---- Build grid + stats from periods ---- */
                        const minsFromTime = (t) => parseInt(t.slice(0, 2), 10) * 60 + parseInt(t.slice(2), 10)
                        const grid = Array.from({ length: 7 }, () => Array(24).fill(false))
                        const perDayMinutes = Array(7).fill(0)

                        periods.forEach((p) => {
                          if (!p.open) return
                          if (!p.close) {
                            grid[p.open.day].fill(true)
                            perDayMinutes[p.open.day] = 24 * 60
                            return
                          }
                          const openMin = minsFromTime(p.open.time)
                          const closeMin = minsFromTime(p.close.time)
                          const hour = Math.floor(openMin / 60)

                          if (p.close.day === p.open.day) {
                            for (let h = hour; h < Math.ceil(closeMin / 60) && h < 24; h++) grid[p.open.day][h] = true
                            perDayMinutes[p.open.day] += closeMin - openMin
                          } else {
                            for (let h = hour; h < 24; h++) grid[p.open.day][h] = true
                            perDayMinutes[p.open.day] += 24 * 60 - openMin
                            for (let h = 0; h < Math.ceil(closeMin / 60); h++) grid[p.close.day][h] = true
                            perDayMinutes[p.close.day] += closeMin
                          }
                        })

                        const openDays = perDayMinutes.filter((m) => m > 0).length
                        const totalHours = Math.round((perDayMinutes.reduce((a, b) => a + b, 0) / 60) * 10) / 10
                        const closedDayNames = fullDayNames.filter((_, i) => perDayMinutes[i] === 0)
                        const now = new Date()
                        const todayIdx = now.getDay()
                        const currentHour = now.getHours()
                        const currentMinuteFraction = now.getMinutes() / 60

                        /* ---- Next transition countdown ---- */
                        let countdownLabel = null
                        {
                          const flatNow = todayIdx * 24 + currentHour
                          const isOpenNow = grid[todayIdx][currentHour]
                          for (let step = 0; step <= 24 * 7; step++) {
                            const flat = flatNow + step
                            const day = Math.floor(flat / 24) % 7
                            const hr = flat % 24
                            const stillSame = grid[day][hr] === isOpenNow
                            if (!stillSame) {
                              const totalMinutesAway = step * 60 - now.getMinutes()
                              const h = Math.floor(totalMinutesAway / 60)
                              const m = totalMinutesAway % 60
                              const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`
                              countdownLabel = isOpenNow ? `Closes in ${timeStr}` : `Opens in ${timeStr}`
                              break
                            }
                          }
                        }

                        return (
                          <div className="space-y-6">
                            {/* Countdown line */}
                            {countdownLabel && (
                              <div className="flex items-center gap-2 text-sm font-medium text-primary -mt-1">
                                <Timer className="w-4 h-4" />
                                {countdownLabel}
                              </div>
                            )}

                            {/* Quick stats row */}
                            <div className="grid grid-cols-3 gap-3">
                              <div className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-4">
                                <p className="text-sm text-muted-foreground font-medium">Open per week</p>
                                <p className="text-2xl font-bold mt-1 tabular-nums">{totalHours}h</p>
                              </div>
                              <div className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-4">
                                <p className="text-sm text-muted-foreground font-medium">Days open</p>
                                <p className="text-2xl font-bold mt-1 tabular-nums">{openDays}/7</p>
                              </div>
                              <div
                                className={`rounded-xl border-2 p-4 ${location.opening_hours?.open_now
                                  ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20"
                                  : "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20"
                                  }`}
                              >
                                <p className="text-sm text-muted-foreground font-medium">Status</p>
                                <p
                                  className={`text-base font-bold mt-1 ${location.opening_hours?.open_now
                                    ? "text-emerald-700 dark:text-emerald-400"
                                    : "text-red-700 dark:text-red-400"
                                    }`}
                                >
                                  {location.opening_hours?.open_now ? "Open now" : "Closed now"}
                                </p>
                              </div>
                            </div>

                            {/* Hourly strip */}
                            <div className="rounded-xl border-2 border-slate-200 dark:border-slate-700 p-5">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-semibold">Hourly schedule</h4>
                                <p className="text-xs text-muted-foreground">Hover any block for details</p>
                              </div>

                              <div className="flex justify-between text-xs font-medium text-muted-foreground px-[42px] mb-2">
                                <span>12 AM</span>
                                <span>6 AM</span>
                                <span>12 PM</span>
                                <span>6 PM</span>
                                <span>12 AM</span>
                              </div>

                              <div className="space-y-1.5">
                                {dayNames.map((day, dayIdx) => (
                                  <div key={day} className="flex items-center gap-2.5">
                                    <div className="flex items-center gap-1.5 w-9 shrink-0">
                                      {dayIdx === todayIdx && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                                      <span
                                        className={`text-sm font-semibold ${dayIdx === todayIdx ? "text-primary" : "text-muted-foreground"
                                          }`}
                                      >
                                        {day}
                                      </span>
                                    </div>
                                    <div className="relative flex flex-1 gap-[3px]">
                                      {grid[dayIdx].map((isOpen, hour) => (
                                        <Tooltip key={hour}>
                                          <TooltipTrigger asChild>
                                            <div
                                              className={`h-6 flex-1 rounded-[3px] transition-colors border ${isOpen
                                                ? dayIdx === todayIdx
                                                  ? "bg-primary border-primary"
                                                  : "bg-primary/40 border-primary/40 hover:bg-primary/60"
                                                : "bg-slate-100 dark:bg-slate-700/40 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                                                }`}
                                            />
                                          </TooltipTrigger>
                                          <TooltipContent className="text-sm font-medium">
                                            {fullDayNames[dayIdx]} {hour}:00 — {isOpen ? "Open" : "Closed"}
                                          </TooltipContent>
                                        </Tooltip>
                                      ))}

                                      {dayIdx === todayIdx && (
                                        <div
                                          className="absolute top-[-3px] bottom-[-3px] w-[3px] bg-amber-500 rounded-full pointer-events-none shadow-sm"
                                          style={{ left: `${((currentHour + currentMinuteFraction) / 24) * 100}%` }}
                                        />
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <div className="flex items-center gap-5 mt-4 pt-4 border-t-2 border-slate-200 dark:border-slate-700 text-sm text-muted-foreground">
                                <span className="flex items-center gap-2">
                                  <span className="w-3.5 h-3.5 rounded-[3px] bg-primary" />
                                  Open now
                                </span>
                                <span className="flex items-center gap-2">
                                  <span className="w-3.5 h-3.5 rounded-[3px] bg-primary/40" />
                                  Open
                                </span>
                                <span className="flex items-center gap-2">
                                  <span className="w-3.5 h-3.5 rounded-[3px] bg-slate-200 dark:bg-slate-700" />
                                  Closed
                                </span>
                                <span className="flex items-center gap-2">
                                  <span className="w-1.5 h-3.5 rounded-full bg-amber-500" />
                                  Current time
                                </span>
                              </div>
                            </div>

                            {/* Closed days callout */}
                            {closedDayNames.length > 0 && (
                              <div className="flex items-center gap-3 text-sm rounded-xl border-2 border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400 px-4 py-3">
                                <CalendarOff className="w-5 h-5 shrink-0" />
                                <span className="font-medium">
                                  Closed {closedDayNames.length} day{closedDayNames.length > 1 ? "s" : ""} a week:{" "}
                                  {closedDayNames.join(", ")}
                                </span>
                              </div>
                            )}

                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                              <Info className="w-4 h-4" />
                              Hours shown reflect standard schedule and may vary on holidays
                            </p>
                          </div>
                        )
                      })()}
                    </CardContent>
                  </Card>
                </div>
              </AnimatedTabItem>

              <AnimatedTabItem value="location-map">
                <div>
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
              <AnimatedTabItem value="health">
                <PlanGate mode={{ type: "feature", feature: "health" }} featureName="Health">
                  <div className="space-y-6">
                    {/* Completion Score */}
                    <Card className="bg-white/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                      <CardHeader>
                        <CardTitle>Profile Completion Score</CardTitle>
                        <CardDescription>How complete and optimized your location profile is</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Overall Completion</span>
                            <span className="text-2xl font-bold text-emerald-600">{Math.round(completionScore)}%</span>
                          </div>
                          <div className="h-3 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500"
                              style={{ width: `${completionScore}%` }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4">
                          {completionItems.map((item) => (
                            <div key={item.label} className="flex items-start gap-3 p-3 rounded-lg border bg-slate-50 dark:bg-slate-900/30">
                              {item.completed ? (
                                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                              )}
                              <div className="flex-1">
                                <p className="text-sm font-medium">{item.label}</p>
                                <p className="text-xs text-muted-foreground">{item.value}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Risk Analysis */}
                    <Card className="bg-white/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Shield className="w-5 h-5" />
                          Risk Analysis
                        </CardTitle>
                        <CardDescription>Potential issues affecting visibility and engagement</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {riskFactors.length > 0 ? (
                          riskFactors.map((risk, idx) => (
                            <div key={idx} className={cn(
                              "flex items-start gap-3 p-3 rounded-lg border",
                              risk.level === 'critical' ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800' :
                                risk.level === 'warning' ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800' :
                                  'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                            )}>
                              {risk.level === 'critical' && <AlertOctagon className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />}
                              {risk.level === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />}
                              {risk.level === 'info' && <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />}
                              <div className="flex-1">
                                <p className="text-sm font-medium">{risk.issue}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{risk.impact}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-6 text-muted-foreground">
                            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-600" />
                            <p className="text-sm">No critical risks detected</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Scores Check */}
                    <Card className="bg-white/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="w-5 h-5" />
                          Performance Scores
                        </CardTitle>
                        <CardDescription>Key metrics for your location profile</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {scoreMetrics.map((metric) => (
                            <div key={metric.label} className="p-4 rounded-lg bg-slate-50  dark:bg-slate-900/30 border">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{metric.label}</p>
                                  <p className="text-2xl font-bold mt-1">{metric.value}</p>
                                </div>
                                <span className={cn(
                                  "text-xs font-medium px-2 py-1 rounded",
                                  metric.status === 'excellent' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' :
                                    metric.status === 'good' ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' :
                                      'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                                )}>
                                  {metric.status.charAt(0).toUpperCase() + metric.status.slice(1)}
                                </span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all duration-300",
                                    metric.status === 'excellent' ? 'bg-emerald-500' :
                                      metric.status === 'good' ? 'bg-blue-500' :
                                        'bg-amber-500'
                                  )}
                                  style={{ width: `${metric.percentage}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Impact Check */}
                    <Card className="bg-white/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Eye className="w-5 h-5" />
                          Visibility Impact
                        </CardTitle>
                        <CardDescription>How your profile impacts search visibility</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {impactFactors.map((factor, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                            <Zap className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{factor.factor}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{factor.description}</p>
                            </div>
                            <span className={cn(
                              "text-xs font-medium px-2 py-1 rounded whitespace-nowrap ml-2",
                              factor.impact === 'high' ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300' :
                                factor.impact === 'medium' ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300' :
                                  'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300'
                            )}>
                              {factor.impact.charAt(0).toUpperCase() + factor.impact.slice(1)}
                            </span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                </PlanGate>
              </AnimatedTabItem>
              <AnimatedTabItem value="danger-zone">
                <div>
                  <Card className="bg-white/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 border-destructive/20">
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

          </div>
        </div>
      </>}


    </TooltipProvider>
  )
}
