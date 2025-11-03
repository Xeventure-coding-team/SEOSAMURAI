"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Star, Loader2, Reply, Send, Sparkles, AlertCircle, Edit, Trash2, MoreHorizontal, MapPin } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import toast from "react-hot-toast"
import { format } from "timeago.js";
import { Badge } from "../ui/badge"
import { useGMBStore } from "@/store/gmbStore"
import ErrorRender from "../Error"
import { Loader } from "../Loader/Loader"

interface TimeAgoProps {
  timestamp: string | Date;
}


const TimeAgo: React.FC<TimeAgoProps> = ({ timestamp }) => {
  const date = new Date(timestamp);
  return <span>{format(date)}</span>;
};

interface UnrepliedReview {
  reviewId: string
  comment?: string
  createTime: string
  updateTime: string
  starRating: string
  reviewer: {
    displayName?: string
    profilePhotoUrl?: string
  }
  reviewReply?: {
    comment: string
    updateTime: string
  }
}

interface Business {
  id: string
  location_id: string // Updated to match API response field name
  location_name: string // Updated to match API response field name
  businessName?: string
  website?: string
  categories?: string[]
  address?: string
  phone?: string
  lastRankUpdated?: string
  createdAt: string
  unrepliedReviews: UnrepliedReview[]
  unrepliedCount: number
  totalReviews: number
  hasReviewPermission: boolean
  reviewsError?: string | null
}

interface UnrepliedReviewsApiResponse {
  businesses: Business[]
  totalBusinesses: number // Updated to match new API response structure
}

interface UnrepliedReviewsProps {
  className?: string
  reviewsPerPage?: number
  showReplyButton?: boolean
}

interface ReplyEditState {
  reviewId: string
  originalText: string
  editedText: string
}

const REVIEWS_PER_PAGE = 10

export default function UnrepliedReviews({
  className = "",
  reviewsPerPage = REVIEWS_PER_PAGE,
  showReplyButton = true,
}: UnrepliedReviewsProps) {
  const [unrepliedData, setUnrepliedData] = useState<UnrepliedReviewsApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reviewsPage, setReviewsPage] = useState(1)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set())
  const [replyDialogOpen, setReplyDialogOpen] = useState<string | null>(null)
  const [generatingReply, setGeneratingReply] = useState(false)
  const [replyText, setReplyText] = useState("")
  const [postingReply, setPostingReply] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null)
  const [replyEditState, setReplyEditState] = useState<ReplyEditState | null>(null)
  const [aiGenerationProgress, setAiGenerationProgress] = useState<string>("")
  const [editingReply, setEditingReply] = useState(false)
  const [deletingReply, setDeletingReply] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null)
  const [currentLocationId, setCurrentLocationId] = useState<string | null>(null)
  const [showIncorrectInput, setShowIncorrectInput] = useState(false);
  const [incorrectReason, setIncorrectReason] = useState("");

  const accountId = useGMBStore((state) => state.accountId)
  const accessToken = useGMBStore((state) => state.accessToken)
  const token = useGMBStore((state) => state.accessToken)

  const fetchUnrepliedReviews = async () => {
    if (!accessToken || !accountId) {
      setError("Missing required parameters for fetching unreplied reviews")
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(
        `/api/unreplied-reviews?accessToken=${encodeURIComponent(accessToken)}&accountId=${encodeURIComponent(accountId)}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setUnrepliedData(data)
    } catch (error) {
      console.error("Error fetching unreplied reviews:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      setError(`Failed to fetch unreplied reviews: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUnrepliedReviews()
  }, [accessToken, accountId])

  const { groupedReviews, totalUnrepliedCount } = useMemo(() => {
    if (!unrepliedData || !unrepliedData.businesses) {
      return {
        groupedReviews: [],
        totalUnrepliedCount: 0,
      }
    }
    const grouped = unrepliedData.businesses
      .filter((business) => business.unrepliedReviews && business.unrepliedReviews.length > 0)
      .map((business) => {
        // Filter and sort reviews by createTime descending (latest first)
        const sortedReviews = business.unrepliedReviews
          .filter(
            (review) =>
              review &&
              typeof review === "object" &&
              review.reviewId &&
              typeof review.reviewId === "string",
          )
          .sort((a, b) => {
            const timeA = new Date(a.createTime).getTime()
            const timeB = new Date(b.createTime).getTime()
            return timeB - timeA // descending: newest first
          })

        return {
          locationName: business.location_name || "Unknown Location",
          locationId: business.location_id.replace("locations/", ""),
          storeName: business.businessName,
          businessName: business.location_name || "Unknown Business",
          reviews: sortedReviews,
          unrepliedCount: business.unrepliedCount,
          totalReviews: business.totalReviews,
        }
      })

    const totalCount = grouped.reduce((sum, group) => sum + group.reviews.length, 0)

    return {
      groupedReviews: grouped,
      totalUnrepliedCount: totalCount,
    }
  }, [unrepliedData])


  const formatDate = (dateString: string) => {
    if (!dateString || typeof dateString !== "string") {
      return "Date unavailable"
    }
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return dateString
      }
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(date)
    } catch {
      return dateString
    }
  }

  const ratingToNumber = (rating: string): number => {
    if (!rating || typeof rating !== "string") return 0
    const map: Record<string, number> = {
      ONE: 1,
      TWO: 2,
      THREE: 3,
      FOUR: 4,
      FIVE: 5,
    }
    return map[rating.toUpperCase()] ?? 0
  }

  const handleImageError = (imageUrl: string) => {
    if (!imageUrl) return
    setImageErrors((prev) => new Set(prev).add(imageUrl))
    setLoadingImages((prev) => {
      const newSet = new Set(prev)
      newSet.delete(imageUrl)
      return newSet
    })
  }

  const getImageSrc = (url: string, fallback?: string) => {
    if (!url || typeof url !== "string" || imageErrors.has(url)) {
      return fallback || "/diverse-profile-avatars.png"
    }
    return url
  }

  const handleImageLoad = (imageUrl: string) => {
    if (!imageUrl) return
    setLoadingImages((prev) => {
      const newSet = new Set(prev)
      newSet.delete(imageUrl)
      return newSet
    })
  }

  const handleImageLoadStart = (imageUrl: string) => {
    if (!imageUrl) return
    setLoadingImages((prev) => new Set([...prev, imageUrl]))
  }

  const generateAIReply = async (
    reviewText: string,
    reviewId?: string,
    guest?: string | undefined,
    businessName?: string,
    starRating?: string
  ) => {
    setGeneratingReply(true)

    const progressMessages = [
      "Analyzing review sentiment...",
      "Crafting personalized response...",
      "Optimizing tone and clarity...",
      "Finalizing your reply...",
    ]

    let messageIndex = 0
    const progressInterval = setInterval(() => {
      setAiGenerationProgress(progressMessages[messageIndex])
      messageIndex = (messageIndex + 1) % progressMessages.length
    }, 1000)

    try {
      const response = await fetch("/api/generate-reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reviewText: reviewText.trim(),
          businessName: businessName || "Business",
          guest: guest,
          rating: starRating,
          incorrect: incorrectReason ? incorrectReason : null
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      if (!data.reply || typeof data.reply !== "string") {
        throw new Error("Invalid response format from AI service")
      }

      setReplyText(data.reply)
      toast.success("AI reply generated successfully!")
    } catch (error) {
      console.error("Error generating reply:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      toast.error(`Failed to generate reply: ${errorMessage}`)
    } finally {
      clearInterval(progressInterval)
      setAiGenerationProgress("")
      setGeneratingReply(false)
    }
  }

  const handlePostReply = async (reviewId: string, locationId: string) => {
    if (!reviewId || typeof reviewId !== "string") {
      toast.error("Invalid review ID")
      return
    }

    if (!replyText.trim()) {
      toast.error("Please enter a reply message")
      return
    }

    setPostingReply(true)

    try {
      const response = await fetch("/api/gmb/add-reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountId: accountId,
          locationId: locationId,
          selectedId: reviewId,
          selectedText: replyText.trim(),
          accessToken: accessToken,
          incorrect: incorrectReason ? incorrectReason : null
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.status}`)
      }

      toast.success("Reply posted successfully!")
      setReplyDialogOpen(null)
      setReplyText("")
      fetchUnrepliedReviews()
    } catch (error) {
      console.error("Error posting reply:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      toast.error(`Failed to post reply: ${errorMessage}`)
    } finally {
      setPostingReply(false)
      setIncorrectReason("")
    }
  }

  const handleEditReply = async (reviewId: string, locationId: string) => {
    if (!replyEditState || !replyEditState.editedText.trim()) {
      toast.error("Please enter a reply message")
      return
    }

    setEditingReply(true)

    try {
      const response = await fetch("/api/gmb/add-reply", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountId: accountId,
          locationId: locationId,
          selectedId: reviewId,
          selectedText: replyEditState.editedText.trim(),
          accessToken: accessToken,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      toast.success("Reply updated successfully!")
      setEditDialogOpen(null)
      setReplyEditState(null)
      fetchUnrepliedReviews()
    } catch (error) {
      console.error("Error editing reply:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      toast.error(`Failed to update reply: ${errorMessage}`)
    } finally {
      setEditingReply(false)
    }
  }

  const handleDeleteReply = async (reviewId: string, locationId: string) => {
    setDeletingReply(true)

    try {
      const response = await fetch("/api/gmb/add-reply", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountId: accountId,
          locationId: locationId,
          selectedId: reviewId,
          accessToken: accessToken,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      toast.success("Reply deleted successfully!")
      setDeleteDialogOpen(null)
      fetchUnrepliedReviews()
    } catch (error) {
      console.error("Error deleting reply:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      toast.error(`Failed to delete reply: ${errorMessage}`)
    } finally {
      setDeletingReply(false)
    }
  }

  const openEditDialog = (reviewId: string, currentReplyText: string) => {
    setReplyEditState({
      reviewId,
      originalText: currentReplyText,
      editedText: currentReplyText,
    })
    setEditDialogOpen(reviewId)
  }

  const closeEditDialog = () => {
    setEditDialogOpen(null)
    setReplyEditState(null)
  }

  const openReplyDialog = (reviewId: string, locationId: string) => {
    if (!reviewId || typeof reviewId !== "string") return
    setReplyDialogOpen(reviewId)
    setCurrentLocationId(locationId)
    setReplyText("")
  }

  const closeReplyDialog = () => {
    setReplyDialogOpen(null)
    setCurrentLocationId(null)
    setReplyText("")
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Unreplied Reviews</CardTitle>
          <CardDescription>Loading unreplied reviews...</CardDescription>
        </CardHeader>
        <CardContent>
          <Loader text="Loading unreplied reviews..." />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <ErrorRender error={"We couldn't load this content. You can retry or report the issue."} />
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Unreplied Reviews</CardTitle>
            <CardDescription>
              {totalUnrepliedCount} unreplied reviews across {groupedReviews.length} locations
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {groupedReviews.length > 0 ? (
          <div className="space-y-4">
            {groupedReviews.map((locationGroup) => (
              <div key={locationGroup.locationId} className="space-y-4">

                <div className="space-y-4">
                  {locationGroup.reviews.map((review) => {
                    if (!review || typeof review !== "object" || !review.reviewId) {
                      return null
                    }

                    const profilePhotoUrl = review.reviewer?.profilePhotoUrl
                    const isImageLoading = profilePhotoUrl ? loadingImages.has(profilePhotoUrl) : false
                    const hasReply =
                      review.reviewReply &&
                      typeof review.reviewReply === "object" &&
                      review.reviewReply.comment &&
                      typeof review.reviewReply.comment === "string"

                    return (
                      <div key={review.reviewId} className="space-y-3">
                        <div className="flex gap-4 p-4 rounded-lg border">
                          <div className="relative">
                            <Avatar className="w-10 h-10">
                              {profilePhotoUrl && !imageErrors.has(profilePhotoUrl) && (
                                <AvatarImage
                                  src={getImageSrc(profilePhotoUrl) || "/placeholder.svg"}
                                  onLoadStart={() => handleImageLoadStart(profilePhotoUrl)}
                                  onLoad={() => handleImageLoad(profilePhotoUrl)}
                                  onError={() => handleImageError(profilePhotoUrl)}
                                />
                              )}
                              <AvatarFallback>
                                {review.reviewer?.displayName?.charAt(0)?.toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                            {isImageLoading && (
                              <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-full">
                                <Loader2 className="w-4 h-4 animate-spin" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-sm">{review.reviewer?.displayName || "Anonymous"}</p>
                              <div className="flex items-center gap-2">
                                <div className="flex">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`w-4 h-4 ${i < ratingToNumber(review.starRating)
                                        ? "text-yellow-400 fill-current"
                                        : "text-gray-300"
                                        }`}
                                    />
                                  ))}
                                </div>

                                <span className="text-xs text-muted-foreground">
                                  {formatDate(review.createTime || review.updateTime)}
                                </span>
                              </div>
                            </div>
                            {review.comment && typeof review.comment === "string" ? (
                              <p className="text-sm text-muted-foreground">{review.comment}</p>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">No review text provided</p>
                            )}

                            <div className="flex gap-2 items-center">

                              {showReplyButton && !hasReply && (
                                <div className="pt-2">
                                  <Dialog
                                    open={replyDialogOpen === review.reviewId}
                                    onOpenChange={(open) =>
                                      open
                                        ? openReplyDialog(review.reviewId, locationGroup.locationId)
                                        : closeReplyDialog()
                                    }
                                  >
                                    <DialogTrigger asChild>
                                      <Button variant="outline" size="sm">
                                        <Reply className="w-4 h-4 mr-2" />
                                        Reply
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[525px]">
                                      <DialogHeader>
                                        <DialogTitle>Reply to Review</DialogTitle>
                                        <DialogDescription>
                                          Responding to {review.reviewer?.displayName || "Anonymous"}'s review at{" "}
                                          {locationGroup.storeName ? locationGroup.storeName : locationGroup.businessName}
                                        </DialogDescription>
                                      </DialogHeader>

                                      <div className="space-y-4">
                                        <div className="p-3 bg-muted rounded-lg">
                                          <div className="flex items-center gap-2 mb-2">
                                            <div className="flex">
                                              {Array.from({ length: 5 }).map((_, i) => (
                                                <Star
                                                  key={i}
                                                  className={`w-3 h-3 ${i < ratingToNumber(review.starRating)
                                                    ? "text-yellow-400 fill-current"
                                                    : "text-gray-300"
                                                    }`}
                                                />
                                              ))}
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                              {review.reviewer?.displayName || "Anonymous"}
                                            </span>
                                          </div>
                                          <p className="text-sm">{review.comment || "No review text provided"}</p>
                                        </div>

                                        <div className="space-y-2">
                                          <div className="mt-3 border-t pt-3">
                                            <p className="text-xs text-muted-foreground mb-2">
                                              Do you think this review is incorrect?
                                            </p>

                                            {!showIncorrectInput ? (
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setShowIncorrectInput(true)}
                                              >
                                                Yes
                                              </Button>
                                            ) : (
                                              <>
                                              <Textarea
                                                placeholder="Please explain why you think this review is incorrect..."
                                                value={incorrectReason}
                                                onChange={(e) => setIncorrectReason(e.target.value)}
                                                rows={3}
                                              />
                                              <div className="text-right">
                                                <Button
                                                variant="destructive"
                                                size="sm"
                                                className="mt-2"
                                                onClick={() => setShowIncorrectInput(false)}
                                              >
                                                Cancel
                                              </Button>
                                              </div>
                                              </>
                                            )}
                                          </div>

                                          <div className="flex items-center justify-between">
                                            <label className="text-sm font-medium">Your Reply</label>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() =>
                                                generateAIReply(
                                                  review.comment || "",
                                                  review.reviewId,
                                                  review.reviewer?.displayName || "",
                                                  locationGroup.storeName ? locationGroup.storeName : locationGroup.businessName,
                                                  review.starRating
                                                )
                                              }
                                            >
                                              {generatingReply ? (
                                                <>
                                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                  Generating...
                                                </>
                                              ) : (
                                                <>
                                                  <Sparkles className="w-4 h-4 mr-2" />
                                                  Generate Reply
                                                </>
                                              )}
                                            </Button>
                                          </div>

                                          {generatingReply && aiGenerationProgress && (
                                            <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                                              <div className="flex space-x-1">
                                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                                              </div>
                                              <span className="text-sm text-blue-600 animate-pulse">
                                                {aiGenerationProgress}
                                              </span>
                                            </div>
                                          )}

                                          <Textarea
                                            placeholder="Write your reply here..."
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            rows={4}
                                          />
                                        </div>
                                      </div>

                                      <DialogFooter>
                                        <Button variant="outline" onClick={closeReplyDialog}>
                                          Cancel
                                        </Button>
                                        <Button
                                          onClick={() =>
                                            locationGroup.locationId && handlePostReply(review.reviewId, locationGroup.locationId)
                                          }
                                          disabled={postingReply || !replyText.trim()}
                                        >
                                          {postingReply ? (
                                            <>
                                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                              Posting...
                                            </>
                                          ) : (
                                            <>
                                              <Send className="w-4 h-4 mr-2" />
                                              Post Reply
                                            </>
                                          )}
                                        </Button>
                                      </DialogFooter>
                                    </DialogContent>
                                  </Dialog>
                                </div>
                              )}

                              <Badge className="mt-2">
                                {locationGroup.storeName ? locationGroup.storeName : locationGroup.businessName}
                              </Badge>

                              <Badge className="mt-2">
                                <TimeAgo timestamp={review.createTime} />
                              </Badge>

                            </div>
                          </div>
                        </div>

                        {hasReply && (
                          <div className="ml-14 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border-l-4 border-blue-500">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Reply className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-600">
                                  {locationGroup.storeName ? locationGroup.storeName : locationGroup.businessName} Reply
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(review.reviewReply!.updateTime)}
                                </span>
                              </div>

                              <DropdownMenu
                                open={dropdownOpen === review.reviewId}
                                onOpenChange={(open) => setDropdownOpen(open ? review.reviewId : null)}
                              >
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setDropdownOpen(null)
                                      openEditDialog(review.reviewId, review.reviewReply!.comment)
                                      setCurrentLocationId(locationGroup.locationId)
                                    }}
                                    disabled={editingReply || deletingReply}
                                  >
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit Reply
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setDropdownOpen(null)
                                      setDeleteDialogOpen(review.reviewId)
                                      setCurrentLocationId(locationGroup.locationId)
                                    }}
                                    disabled={editingReply || deletingReply}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Reply
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            <div className="relative">
                              <p className="text-sm">{review.reviewReply!.comment}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No unreplied reviews found</p>
            <p className="text-xs mt-2">All reviews have been replied to or no reviews exist</p>
          </div>
        )}

        <Dialog open={editDialogOpen !== null} onOpenChange={(open) => !open && closeEditDialog()}>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Edit Reply</DialogTitle>
              <DialogDescription>Update your reply to this review</DialogDescription>
            </DialogHeader>

            {replyEditState && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Your Reply</label>
                  <Textarea
                    placeholder="Write your reply here..."
                    value={replyEditState.editedText}
                    onChange={(e) =>
                      setReplyEditState((prev) => (prev ? { ...prev, editedText: e.target.value } : null))
                    }
                    rows={4}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={closeEditDialog}>
                Cancel
              </Button>
              <Button
                onClick={() =>
                  editDialogOpen && currentLocationId && handleEditReply(editDialogOpen, currentLocationId)
                }
                disabled={!replyEditState?.editedText.trim() || editingReply}
              >
                {editingReply ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4 mr-2" />
                    Update Reply
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteDialogOpen !== null} onOpenChange={(open) => !open && setDeleteDialogOpen(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Reply</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this reply? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  deleteDialogOpen && currentLocationId && handleDeleteReply(deleteDialogOpen, currentLocationId)
                }
                disabled={deletingReply}
                className="bg-red-600 hover:bg-red-700"
              >
                {deletingReply ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Reply
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
