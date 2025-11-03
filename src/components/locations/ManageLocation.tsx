"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useParams, useSearchParams } from "next/navigation"
import axios from "axios"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Loader2,
  AlertCircle,
  Plus,
  MoreHorizontal,
  Calendar,
  Eye,
  MessageCircle,
  Edit3,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Clock,
  TrendingUp,
  Users,
  Heart,
  ImageOff,
} from "lucide-react"
import { format, parseISO } from "date-fns"
import { usePageStore } from "@/store/usePageStore"
import { GmbEditPostForm } from "./gmb-edit-post-form"
import toast from "react-hot-toast"
import { GmbPostForm } from "../posts/gmb-post-form"
import { useGmbPosts } from "@/hooks/useGmbPosts"
import Reviews from "./reviews"
import { useGMBStore } from "@/store/gmbStore"
import { AnimatedTabItem, AnimatedTabs } from "../design/AnimatedTabs"
import CompetitorsPage from "../competitor/CompetitorsPage"
import GMBKeywordTracker from "../serp/GMBKeywordTracker"
import { LoadingSpinner } from "../Loader/Loader"
import GMBInsights from "./GMBInsights"
import TaskManager from "./TaskManager"

interface GMBApiResponse {
  location?: any,
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

interface GMBPost {
  name: string
  languageCode: string
  summary: string
  state: "LIVE" | "REJECTED" | "PENDING"
  createTime: string
  updateTime: string
  event?: {
    title: string
    schedule?: {
      startDate: { year: number; month: number; day: number }
      endDate: { year: number; month: number; day: number }
    }
  }
  offer?: {
    couponCode: string
    redeemOnlineUrl: string
  }
  media?: Array<{
    mediaFormat: "PHOTO" | "VIDEO"
    sourceUrl: string
    googleUrl: string
  }>
  callToAction?: {
    actionType: "BOOK" | "ORDER" | "SHOP" | "LEARN_MORE" | "SIGN_UP" | "CALL"
    url?: string
  }
  insights?: {
    viewCount: number
    clickCount: number
  }
}

interface PostsResponse {
  success: boolean
  data: {
    localPosts: GMBPost[]
    nextPageToken?: string
    totalSize?: number
  }
  pagination: {
    nextPageToken?: string
    totalSize?: number
  }
  message?: string
  error?: string
}

export default function ManageLocation() {
  const params = useParams()
  const locationId = (params?.locationId as string) || "default-location"

  const [payload, setPayload] = useState<GMBApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)

  const [posts, setPosts] = useState<GMBPost[]>([])
  const [postsLoading, setPostsLoading] = useState(false)
  const [postsInitialLoad, setPostsInitialLoad] = useState(true)
  const [postsError, setPostsError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageToken, setPageToken] = useState<string | undefined>()
  const [totalSize, setTotalSize] = useState<number>(0)
  const [pageSize] = useState(10)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [selectedPost, setSelectedPost] = useState<GMBPost | null>(null)
  const [isPostDetailOpen, setIsPostDetailOpen] = useState(false)
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false)
  const [isEditPostModalOpen, setIsEditPostModalOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<GMBPost | null>(null)
  const [deleteConfirmPost, setDeleteConfirmPost] = useState<GMBPost | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const location = useMemo(() => payload?.locationData ?? null, [payload])
  const businessData = useMemo(() => payload?.data ?? null, [payload])
  const reviews = useMemo(() => payload?.reviews ?? { reviews: [], averageRating: 0, totalReviewCount: 0 }, [payload])
  const searchParams = useSearchParams();

  const accountId = useGMBStore((state) => state.accountId)
  const accessToken = useGMBStore((state) => state.accessToken)
  const gmbAccountId = useGMBStore((state) => state.accountId)
  const gmbAccountName = useGMBStore((state) => state.accountName)


  const setPageName = usePageStore((state) => state.setPageName)
  const pageName = usePageStore((state) => state.pageName)
  const { deletePost } = useGmbPosts()

  const [imageLoadingStates, setImageLoadingStates] = useState<Record<string, boolean>>({})
  const [imageErrorStates, setImageErrorStates] = useState<Record<string, boolean>>({})
  const [imageLoadingQueue, setImageLoadingQueue] = useState<string[]>([])
  const [currentlyLoadingImages, setCurrentlyLoadingImages] = useState<Set<string>>(new Set())

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

        const res = await fetch(url, { cache: "no-store" })

        if (!res.ok) {
          const errorText = await res.text()
          throw new Error(`Failed to fetch location: ${res.status} ${res.statusText}. ${errorText}`)
        }

        const data: GMBApiResponse = await res.json()
        setPayload(data)

        if (data?.location.locationData?.name) {
          document.title = `${data?.location?.locationData.name} | Location Dashboard`
          setPageName(`${data?.location?.locationData.name}`)
          setLoading(false);
        }
      } catch (err: any) {
        console.error("Error fetching location:", err)
        setError(err?.message || "Unknown error occurred")
      }
    }

    fetchLocation()
  }, [locationId])


  useEffect(() => {
    return () => {
      document.body.style.pointerEvents = ""
    }
  }, [])

  const fetchPosts = useCallback(
    async (token?: string, reset = false) => {
      if (!accessToken || !accountId || !locationId) return

      try {
        setPostsLoading(true)
        setPostsError(null)

        const params = new URLSearchParams({
          accessToken,
          account: accountId,
          location: locationId,
          pageSize: pageSize.toString(),
        })

        if (token) {
          params.append("pageToken", token)
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL
        const response = await axios.get<PostsResponse>(`${apiUrl}/api/gmb/posts?${params}`)

        if (!response.data.success) {
          throw new Error(response.data.message || "Failed to fetch posts")
        }

        const newPosts = response.data.data.localPosts || []

        if (reset) {
          setPosts(newPosts)
        } else {
          setPosts((prev) => [...prev, ...newPosts])
        }

        setPageToken(response.data.pagination.nextPageToken)
        setTotalSize(response.data.pagination.totalSize || 0)
        setHasNextPage(!!response.data.pagination.nextPageToken)
      } catch (err: any) {
        console.error("Error fetching posts:", err)
        setPostsError(err.message || "Failed to fetch posts")
      } finally {
        setPostsLoading(false)
        setPostsInitialLoad(false)
      }
    },
    [accessToken, accountId, locationId, pageSize],
  )

  const refreshPosts = useCallback(() => {
    fetchPosts(undefined, true)
    setCurrentPage(1)
  }, [fetchPosts])

  const handlePrevPage = useCallback(() => {
    if (pageToken && currentPage > 1) {
      fetchPosts(pageToken, true)
      setCurrentPage((prev) => prev - 1)
    }
  }, [fetchPosts, pageToken, currentPage])

  const handleNextPage = useCallback(() => {
    if (hasNextPage && !postsLoading) {
      fetchPosts(pageToken)
      setCurrentPage((prev) => prev + 1)
    }
  }, [fetchPosts, hasNextPage, postsLoading, pageToken])

  useEffect(() => {
    if (accessToken && accountId && locationId && !loading) {
      fetchPosts(undefined, true)
      setCurrentPage(1)
    }
  }, [accessToken, accountId, locationId, loading])

  const processImageQueue = useCallback(() => {
    const maxConcurrent = 3 // Limit concurrent image loads
    const currentLoading = currentlyLoadingImages.size

    if (currentLoading < maxConcurrent && imageLoadingQueue.length > 0) {
      const nextImage = imageLoadingQueue[0]
      setImageLoadingQueue((prev) => prev.slice(1))
      setCurrentlyLoadingImages((prev) => new Set([...prev, nextImage]))
    }
  }, [imageLoadingQueue, currentlyLoadingImages])

  useEffect(() => {
    processImageQueue()
  }, [processImageQueue])

  const handleCreatePostClick = useCallback(() => {
    setIsCreatePostModalOpen(true)
  }, [])

  const handleEditPostClick = useCallback((post: GMBPost) => {
    setEditingPost(post)
    setIsEditPostModalOpen(true)
  }, [])

  const handleDeletePostClick = useCallback((post: GMBPost) => {
    setDeleteConfirmPost(post)
    setIsDeleteDialogOpen(true) // Explicitly control dialog open state
  }, [])

  const handleDeletePost = useCallback(
    async (post: GMBPost) => {
      if (!post.name || !accessToken || !accountId || !locationId) {
        toast.error("Cannot delete post: Missing required data")
        return
      }

      setIsDeleting(true)

      try {
        const result = await deletePost(accessToken, accountId, locationId, post.name)

        if (result.success) {
          setPosts((prev) => prev.filter((p) => p.name !== post.name))
          setTotalSize((prev) => Math.max(0, prev - 1))
          setIsDeleteDialogOpen(false)
          setDeleteConfirmPost(null)
          toast.success("Post deleted successfully!")
        } else {
          throw new Error(result.message || "Failed to delete post")
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to delete post")
      } finally {
        setIsDeleting(false)
      }
    },
    [accessToken, accountId, locationId, deletePost], // Added deletePost to dependencies
  )

  const handleCloseDeleteDialog = useCallback(() => {
    if (!isDeleting) {
      setIsDeleteDialogOpen(false)
      setDeleteConfirmPost(null)
      // Force cleanup of body pointer-events
      document.body.style.pointerEvents = ""
    }
  }, [isDeleting])

  useEffect(() => {
    const handleDocumentClick = () => {
      // Ensure pointer events are restored after any dropdown closes
      setTimeout(() => {
        document.body.style.pointerEvents = ""
      }, 100)
    }

    document.addEventListener("click", handleDocumentClick)
    return () => {
      document.removeEventListener("click", handleDocumentClick)
      document.body.style.pointerEvents = ""
    }
  }, [])

  const handlePostCreated = useCallback(() => {
    refreshPosts()
  }, [refreshPosts])

  const handlePostUpdated = useCallback(() => {
    refreshPosts()
    setIsEditPostModalOpen(false)
    setEditingPost(null)
  }, [refreshPosts])

  const handleImageLoad = useCallback(
    (postName: string) => {
      setImageLoadingStates((prev) => ({ ...prev, [postName]: false }))
      setCurrentlyLoadingImages((prev) => {
        const newSet = new Set(prev)
        newSet.delete(postName)
        return newSet
      })
      setTimeout(processImageQueue, 100) // Small delay to prevent rapid requests
    },
    [processImageQueue],
  )

  const handleImageError = useCallback(
    (postName: string) => {
      setImageLoadingStates((prev) => ({ ...prev, [postName]: false }))
      setImageErrorStates((prev) => ({ ...prev, [postName]: true }))
      setCurrentlyLoadingImages((prev) => {
        const newSet = new Set(prev)
        newSet.delete(postName)
        return newSet
      })
      setTimeout(processImageQueue, 500) // Longer delay on error to prevent rate limiting
    },
    [processImageQueue],
  )

  const handleImageLoadStart = useCallback(
    (postName: string) => {
      if (!currentlyLoadingImages.has(postName) && !imageLoadingQueue.includes(postName)) {
        if (currentlyLoadingImages.size < 3) {
          setImageLoadingStates((prev) => ({ ...prev, [postName]: true }))
          setImageErrorStates((prev) => ({ ...prev, [postName]: false }))
          setCurrentlyLoadingImages((prev) => new Set([...prev, postName]))
        } else {
          setImageLoadingQueue((prev) => [...prev, postName])
        }
      }
    },
    [currentlyLoadingImages, imageLoadingQueue],
  )

  const getPostTypeColor = (post: GMBPost) => {
    if (post.event) return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
    if (post.offer) return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
    return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
  }

  const getPostType = (post: GMBPost) => {
    if (post.event) return "Event"
    if (post.offer) return "Offer"
    return "Standard"
  }

  const getStateColor = (state: string) => {
    switch (state) {
      case "LIVE":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
      case "REJECTED":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "MMM dd, yyyy")
    } catch {
      return "Invalid date"
    }
  }

  const handleViewPost = useCallback((post: GMBPost) => {
    setSelectedPost(post)
    setIsPostDetailOpen(true)
  }, [])


  // ✅ Define valid tab keys
  const validTabs = [
    "tasks",
    "statistics",
    "competitors",
    "position_map",
    "posts",
    "reviews",
  ];


  if (
    !payload?.location ||
    !payload?.location?.data?.metadata?.placeId ||
    !pageName ||
    !payload?.location?.locationData?.name
  ) {
    return (
      <div className="mt-4">
        <LoadingSpinner />
      </div>
    );
  }
  const items = [
    'tasks',
    'keywords',
    'analytics',
    'competitor-insights',
    'social-posts',
    'customer-reviews'
  ];

  let active = searchParams.get("active");

  // handle aliases
  if (active === "reviews") {
    active = "customer-reviews";
  } else if (active === "posts") {
    active = "social-posts";
  }

  const defaultTab = items.includes(active) ? active : "tasks";

  return (
    <TooltipProvider>
      <div>
        <div>
          {payload?.location?.locationData === null || undefined ? <LoadingSpinner /> : <AnimatedTabs items={items} defaultTab={defaultTab}>
            <AnimatedTabItem value="tasks">

              {payload ? <TaskManager
                locationId={locationId}
                placeId={payload.location?.data?.metadata?.placeId}
                gmbAccountId={gmbAccountId}
                accessToken={accessToken}
                description={payload.location?.data?.description || ''}
                businessName={payload?.location?.locationData?.name || ''}
                primaryCategory={payload.location?.data?.categories?.primaryCategory?.displayName || ''}
                additionalCategories={payload.location?.data?.categories?.additionalCategories?.map(cat => cat.displayName) || []}
                address={payload.location?.data?.location || ''}
                services={payload.location?.data?.categories || {}}
              /> : <div className="mt-4">
                <LoadingSpinner />
              </div>}

            </AnimatedTabItem>
            <AnimatedTabItem value="keywords">
              <GMBKeywordTracker keywordLocation={payload?.location?.location} coordinates={payload?.location?.locationData?.geometry?.location} location={payload?.location?.locationData?.formatted_address} businessName={pageName} locationId={locationId} />
            </AnimatedTabItem>
            <AnimatedTabItem value="analytics">
              <GMBInsights accessToken={accessToken} locationId={locationId} />
            </AnimatedTabItem>
            <AnimatedTabItem value="competitor-insights">
              <CompetitorsPage locationId={locationId} coordinates={payload?.location?.locationData?.geometry?.location} businessType={payload?.location?.data?.categories?.primaryCategory?.displayName} />
            </AnimatedTabItem>
            <AnimatedTabItem value="social-posts">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">GMB Posts</h2>
                  <p className="text-muted-foreground">
                    Create and manage your Google My Business posts to engage with customers
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={refreshPosts}
                    disabled={postsLoading}
                    className="gap-2 bg-transparent"
                  >
                    <RefreshCw className={`h-4 w-4 ${postsLoading ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                  <Button onClick={handleCreatePostClick} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Post
                  </Button>
                </div>
              </div>

              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    Your Posts
                    {totalSize > 0 && <Badge variant="secondary">{totalSize}</Badge>}
                  </CardTitle>
                  <CardDescription>All your Google My Business posts in one place</CardDescription>
                </CardHeader>
                <CardContent>
                  {postsError && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{postsError}</AlertDescription>
                    </Alert>
                  )}

                  {(postsLoading && posts.length === 0) || postsInitialLoad ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <Card key={i} className="overflow-hidden p-0">
                          <div className="aspect-[4/3]">
                            <Skeleton className="w-full h-full" />
                          </div>
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <Skeleton className="h-5 w-16" />
                                <Skeleton className="h-5 w-12" />
                              </div>
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-3/4" />
                              <div className="flex items-center justify-between">
                                <div className="flex gap-3">
                                  <Skeleton className="h-4 w-12" />
                                  <Skeleton className="h-4 w-12" />
                                </div>
                                <Skeleton className="h-8 w-8 rounded" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : posts.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-xl font-semibold mb-2">No posts found</h3>
                      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                        This location doesn't have any GMB posts yet. Create your first post to start engaging with
                        customers.
                      </p>
                      <Button onClick={handleCreatePostClick} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Create Your First Post
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {posts.map((post, index) => (
                          <Card key={`${post.name}-${index}`} className="overflow-hidden p-0">
                            <div className="relative aspect-[4/3]">
                              {post.media && post.media.length > 0 ? (
                                <div className="relative w-full h-full">
                                  {imageLoadingStates[post.name] && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-muted">
                                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                    </div>
                                  )}
                                  {imageErrorStates[post.name] ? (
                                    <div
                                      className="w-full h-full flex flex-col items-center justify-center bg-muted"
                                      style={{ height: "280px" }}
                                    >
                                      <ImageOff className="h-12 w-12 text-muted-foreground mb-2" />
                                      <span className="text-sm text-muted-foreground">No image available</span>
                                    </div>
                                  ) : (
                                    <img
                                      src={post.media[0].googleUrl ?
                                        `https://images.weserv.nl/?url=${encodeURIComponent(post.media[0].googleUrl)}` :
                                        "/placeholder.svg"
                                      }
                                      alt={`${getPostType(post)} post`}
                                      style={{ height: "280px" }}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                      referrerPolicy="no-referrer"
                                      crossOrigin="anonymous"
                                      onLoad={() => handleImageLoad(post.name)}
                                      onError={() => handleImageError(post.name)}
                                      onLoadStart={() => handleImageLoadStart(post.name)}
                                    />
                                  )}
                                  {post.media.length > 1 && (
                                    <Badge className="absolute top-2 right-2" variant="secondary">
                                      +{post.media.length - 1} more
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-muted">
                                  <div className="w-16 h-16 rounded-full bg-background shadow-sm flex items-center justify-center mb-4">
                                    {post.event ? (
                                      <Calendar className="h-8 w-8 text-muted-foreground" />
                                    ) : post.offer ? (
                                      <Sparkles className="h-8 w-8 text-muted-foreground" />
                                    ) : (
                                      <MessageCircle className="h-8 w-8 text-muted-foreground" />
                                    )}
                                  </div>
                                  <h3 className="font-semibold mb-2 text-center">
                                    {post.event?.title || getPostType(post)}
                                  </h3>
                                  <p className="text-sm text-muted-foreground line-clamp-2 text-center px-4">
                                    {post.summary}
                                  </p>
                                </div>
                              )}

                              <div className="absolute top-2 left-2 flex gap-2">
                                <Badge className={getPostTypeColor(post)} variant="secondary">
                                  {getPostType(post)}
                                </Badge>
                                <Badge className={getStateColor(post.state)} variant="secondary">
                                  {post.state}
                                </Badge>
                              </div>

                              <div className="absolute top-2 right-2">
                                <DropdownMenu
                                  onOpenChange={(open) => {
                                    if (!open) {
                                      setTimeout(() => {
                                        document.body.style.pointerEvents = ""
                                      }, 50)
                                    }
                                  }}
                                >
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="bg-background/80 backdrop-blur-sm">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => handleEditPostClick(post)}>
                                      <Edit3 className="h-4 w-4 mr-2" />
                                      Edit Post
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => handleDeletePostClick(post)}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete Post
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>

                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <p className="text-sm line-clamp-3">{post.summary}</p>

                                {post.event && (
                                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                                    <Calendar className="h-4 w-4" />
                                    <span className="text-sm font-medium">{post.event.title}</span>
                                  </div>
                                )}

                                {post.offer && post.offer.couponCode && (
                                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                                    <Sparkles className="h-4 w-4" />
                                    <span className="text-sm font-medium">Code: {post.offer.couponCode}</span>
                                  </div>
                                )}

                                <div className="flex items-center justify-between pt-2 border-t">
                                  <div className="flex items-center gap-4">
                                    {post.insights && (
                                      <>
                                        <div className="flex items-center gap-1 text-muted-foreground">
                                          <Eye className="h-4 w-4" />
                                          <span className="text-sm">{post.insights.viewCount.toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-muted-foreground">
                                          <Heart className="h-4 w-4" />
                                          <span className="text-sm">{post.insights.clickCount.toLocaleString()}</span>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    <span>{formatDate(post.createTime)}</span>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      {(hasNextPage || currentPage > 1) && (
                        <div className="flex items-center justify-between pt-4 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePrevPage}
                            disabled={currentPage === 1}
                            className="gap-2 bg-transparent"
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                          </Button>

                          <span className="text-sm text-muted-foreground">
                            Page {currentPage} {totalSize > 0 && `of ~${Math.ceil(totalSize / pageSize)}`}
                          </span>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleNextPage}
                            disabled={!hasNextPage || postsLoading}
                            className="gap-2 bg-transparent"
                          >
                            {postsLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                Next
                                <ChevronRight className="h-4 w-4" />
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                </CardContent>
              </Card>
            </AnimatedTabItem>
            <AnimatedTabItem value="customer-reviews">
              <Reviews businessName={pageName} locationId={locationId} />
            </AnimatedTabItem>
          </AnimatedTabs>}

        </div>
      </div>

      <GmbPostForm
        isOpen={isCreatePostModalOpen}
        onClose={() => setIsCreatePostModalOpen(false)}
        accessToken={accessToken}
        locationId={locationId}
        accountId={accountId}
        businessName={pageName}
        onPostCreated={handlePostCreated}
      />

      {editingPost && (
        <GmbEditPostForm
          isOpen={isEditPostModalOpen}
          onClose={() => {
            setIsEditPostModalOpen(false)
            setEditingPost(null)
          }}
          accessToken={accessToken}
          locationId={locationId}
          accountId={accountId}
          businessName={pageName}
          onPostUpdated={handlePostUpdated}
          editPost={editingPost}
        />
      )}

      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            handleCloseDeleteDialog()
          }
        }}
        modal={true}
      >
        <DialogContent
          className="sm:max-w-md"
          onPointerDownOutside={(e) => {
            if (isDeleting) {
              e.preventDefault()
            }
          }}
          onEscapeKeyDown={(e) => {
            if (isDeleting) {
              e.preventDefault()
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this post? This action cannot be undone and will permanently remove the
              post from your Google My Business listing.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleCloseDeleteDialog}
              disabled={isDeleting}
              className="w-full sm:w-auto bg-transparent"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmPost && handleDeletePost(deleteConfirmPost)}
              disabled={isDeleting}
              className="w-full sm:w-auto"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Post
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
