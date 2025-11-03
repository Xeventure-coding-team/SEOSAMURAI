"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import axios from "axios"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Loader2,
  AlertCircle,
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
  ImageIcon,
  Clock,
} from "lucide-react"
import { format, parseISO } from "date-fns"
import useStore from "@/store/CounterField"

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

interface GMBPostsManagerProps {
  accessToken: string
  account: string
  location: string
  isManageModalOpen: boolean
  onManageModalClose: () => void
  onCreatePostClick: () => void
  onEditPostClick?: (post: GMBPost) => void
}

const PostImage = ({ src, alt, className }: { src?: string; alt: string; className?: string }) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="text-xs text-gray-500">Loading...</span>
          </div>
        </div>
      )}
      {error ? (
        <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex flex-col items-center justify-center">
          <ImageIcon className="h-8 w-8 text-gray-400 mb-2" />
          <span className="text-xs text-gray-500">Image unavailable</span>
        </div>
      ) : (
        <img
          src={src || "/placeholder.svg?height=300&width=300&query=social media post"}
          alt={alt}
          className={`w-full h-full object-cover transition-all duration-300 ${loading ? "opacity-0 scale-105" : "opacity-100 scale-100"} hover:scale-105`}
          onLoad={() => setLoading(false)}
          onError={() => {
            setError(true)
            setLoading(false)
          }}
        />
      )}
    </div>
  )
}

const PostSkeleton = () => (
  <Card className="overflow-hidden">
    <div className="aspect-square">
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
)

export function GMBPostsManager({
  accessToken,
  account,
  location,
  isManageModalOpen,
  onManageModalClose,
  onCreatePostClick,
  onEditPostClick,
}: GMBPostsManagerProps) {
  const [posts, setPosts] = useState<GMBPost[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageToken, setPageToken] = useState<string | undefined>()
  const [totalSize, setTotalSize] = useState<number>(0)
  const [pageSize] = useState(10)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [selectedPost, setSelectedPost] = useState<GMBPost | null>(null)
  const [isPostDetailOpen, setIsPostDetailOpen] = useState(false)
  const [deleteConfirmPost, setDeleteConfirmPost] = useState<GMBPost | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { key, increaseKey } = useStore()


  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL, [])

  const fetchPosts = useCallback(
    async (token?: string, reset = false) => {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams({
          accessToken,
          account,
          location,
          pageSize: pageSize.toString(),
        })

        if (token) {
          params.append("pageToken", token)
        }

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
        setError(err.message || "Failed to fetch posts")
      } finally {
        setLoading(false)
      }
    },
    [accessToken, account, location, pageSize, apiUrl],
  )

  const refreshPosts = useCallback(async () => {
    setRefreshing(true)
    try {
      await fetchPosts(undefined, true)
      setCurrentPage(1)
    } finally {
      setRefreshing(false)
    }
  }, [fetchPosts, key])

  useEffect(() => {
    if (isManageModalOpen && accessToken && account && location) {
      fetchPosts(undefined, true)
      setCurrentPage(1)
    }
  }, [isManageModalOpen, accessToken, account, location]) // Removed fetchPosts from dependencies

  const handleEditPost = useCallback(
    (post: GMBPost) => {
      if (onEditPostClick) {
        onEditPostClick(post)
        onManageModalClose() // Close the manage modal when editing
      } else {
        setError("Edit functionality not available")
      }
    },
    [onEditPostClick, onManageModalClose],
  )

  const handleDeletePost = useCallback(
    async (post: GMBPost) => {
      if (!post.name) {
        setError("Cannot delete post: Invalid post data")
        return
      }

      setIsDeleting(true)
      setError(null)

      try {
        const response = await axios.delete(`${apiUrl}/api/gmb/posts/${encodeURIComponent(post.name)}`, {
          params: { accessToken, account, location },
        })

        if (response.data.success) {
          setPosts((prev) => prev.filter((p) => p.name !== post.name))
          setTotalSize((prev) => Math.max(0, prev - 1))
          setDeleteConfirmPost(null)
        } else {
          throw new Error(response.data.message || "Failed to delete post")
        }
      } catch (err: any) {
        setError(err.message || "Failed to delete post")
      } finally {
        setIsDeleting(false)
      }
    },
    [apiUrl, accessToken, account, location],
  )

  const handleNextPage = useCallback(() => {
    if (hasNextPage && pageToken) {
      fetchPosts(pageToken)
      setCurrentPage((prev) => prev + 1)
    }
  }, [hasNextPage, pageToken, fetchPosts])

  const handlePrevPage = useCallback(() => {
    if (currentPage > 1) {
      refreshPosts()
    }
  }, [currentPage, refreshPosts])

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



  const DeleteConfirmModal = () => (
    <Dialog open={!!deleteConfirmPost} onOpenChange={() => setDeleteConfirmPost(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Post</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this post? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteConfirmPost(null)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => deleteConfirmPost && handleDeletePost(deleteConfirmPost)}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  return (
    <>
      <Dialog open={isManageModalOpen} onOpenChange={onManageModalClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Manage GMB Posts
              <Button variant="ghost" size="sm" onClick={refreshPosts} disabled={refreshing} className="ml-auto">
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
            </DialogTitle>
            <DialogDescription>
              View and manage your Google My Business posts
              {totalSize > 0 && ` (${totalSize} total posts)`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>Something went wrong on our end. Please refresh or try again later.</AlertDescription>
              </Alert>
            )}

            {loading && posts.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <PostSkeleton key={i} />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No posts found</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">This location doesn't have any GMB posts yet.</p>
                <Button onClick={onCreatePostClick} className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Create Your First Post
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {posts.map((post, index) => (
                    <Card
                      key={`${post.name}-${index}`}
                      className="overflow-hidden hover:shadow-lg transition-all duration-300 group border-0 shadow-md"
                    >
                      <div className="relative aspect-square bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900">
                        {post.media && post.media.length > 0 ? (
                          <div className="relative w-full h-full">
                            <PostImage
                              src={post.media[0].sourceUrl}
                              alt={`${getPostType(post)} post`}
                              className="w-full h-full"
                            />
                            {post.media.length > 1 && (
                              <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                                +{post.media.length - 1}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-white/80 dark:bg-gray-800/80 flex items-center justify-center mb-3">
                              {post.event ? (
                                <Calendar className="h-8 w-8 text-blue-500" />
                              ) : post.offer ? (
                                <Sparkles className="h-8 w-8 text-green-500" />
                              ) : (
                                <MessageCircle className="h-8 w-8 text-gray-500" />
                              )}
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                              {post.event?.title || getPostType(post)}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{post.summary}</p>
                          </div>
                        )}

                        <div className="absolute top-2 left-2 flex gap-1">
                          <Badge className={getPostTypeColor(post)} variant="secondary">
                            {getPostType(post)}
                          </Badge>
                          <Badge className={getStateColor(post.state)} variant="secondary">
                            {post.state}
                          </Badge>
                        </div>

                        <div className="absolute top-2 right-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleViewPost(post)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditPost(post)}>
                                <Edit3 className="h-4 w-4 mr-2" />
                                Edit Post
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600 dark:text-red-400"
                                onClick={() => setDeleteConfirmPost(post)}
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
                          <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-3 leading-relaxed">
                            {post.summary}
                          </p>

                          {post.event && (
                            <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                              <Calendar className="h-4 w-4" />
                              <span className="font-medium">{post.event.title}</span>
                            </div>
                          )}

                          {post.offer && post.offer.couponCode && (
                            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                              <Sparkles className="h-4 w-4" />
                              <span className="font-medium">Code: {post.offer.couponCode}</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-4">
                              {post.insights && (
                                <>
                                  <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                                    <Eye className="h-4 w-4" />
                                    <span className="text-sm font-medium">{post.insights.viewCount}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                                    <MessageCircle className="h-4 w-4" />
                                    <span className="text-sm font-medium">{post.insights.clickCount}</span>
                                  </div>
                                </>
                              )}
                            </div>

                            <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
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
                  <div className="flex items-center justify-between pt-6 border-t">
                    <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage === 1}>
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Previous
                    </Button>

                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Page {currentPage} {totalSize > 0 && `of ~${Math.ceil(totalSize / pageSize)}`}
                    </span>

                    <Button variant="outline" size="sm" onClick={handleNextPage} disabled={!hasNextPage || loading}>
                      {loading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <>
                          Next
                          <ChevronRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={onManageModalClose}>
              Close
            </Button>
            <Button onClick={onCreatePostClick} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Create New Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <DeleteConfirmModal />
    </>
  )
}
