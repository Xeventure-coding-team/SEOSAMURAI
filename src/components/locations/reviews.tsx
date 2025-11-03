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
import {
  Star,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Reply,
  Send,
  Sparkles,
  AlertCircle,
  Edit,
  Trash2,
  MoreHorizontal,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import toast from "react-hot-toast"
import { useGMBStore } from "@/store/gmbStore"
import { Loader } from "../Loader/Loader"

interface Review {
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

interface GoogleReviewsResponse {
  reviews: Review[]
  averageRating: number
  totalReviewCount: number
  nextPageToken?: string
}

interface ReviewsProps {
  reviews?: Review[] | GoogleReviewsResponse | null | undefined
  totalReviewCount?: number
  className?: string
  reviewsPerPage?: number
  showReplyButton?: boolean
  businessName?: string
  locationId: number | string
}

interface ReplyEditState {
  reviewId: string
  originalText: string
  editedText: string
}

const REVIEWS_PER_PAGE = 10

export default function Reviews({
  totalReviewCount,
  className = "",
  reviewsPerPage = REVIEWS_PER_PAGE,
  showReplyButton = true,
  businessName = "Business",
  locationId
}: ReviewsProps) {
  const [reviews, setReviews] = useState<GoogleReviewsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reviewsPage, setReviewsPage] = useState(1)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set())
  const [replyDialogOpen, setReplyDialogOpen] = useState<string | null>(null)
  const [generatingReply, setGeneratingReply] = useState(false)
  const [replyText, setReplyText] = useState("")
  const [postingReply, setPostingReply] = useState(false)
  const [averageRating, setAverageRating] = useState(0)
  const [editDialogOpen, setEditDialogOpen] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null)
  const [replyEditState, setReplyEditState] = useState<ReplyEditState | null>(null)
  const [aiGenerationProgress, setAiGenerationProgress] = useState<string>("")
  const [editingReply, setEditingReply] = useState(false)
  const [deletingReply, setDeletingReply] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null)

  const accountId = useGMBStore((state) => state.accountId)
  const accessToken = useGMBStore((state) => state.accessToken)

  const [showIncorrectInput, setShowIncorrectInput] = useState(false);
  const [incorrectReason, setIncorrectReason] = useState("");

  const fetchReviews = async () => {
    if (!locationId || !accessToken || !accountId) {
      setError("Missing required parameters for fetching reviews")
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        location_id: locationId.toString(),
        access_token: accessToken,
        gmb_account_id: accountId,
      })

      const response = await fetch(`/api/gmb/reviews?${params}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setAverageRating(data?.reviews?.averageRating)
      setReviews(data?.reviews?.reviews)
    } catch (error) {
      console.error("Error fetching reviews:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      setError(`Failed to fetch reviews: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReviews()
  }, [locationId, accessToken, accountId])



  const { reviewsArray, extractedAverageRating, extractedTotalCount } = useMemo(() => {
    if (!reviews) {
      return {
        reviewsArray: [],
        extractedAverageRating: averageRating || 0,
        extractedTotalCount: totalReviewCount || 0,
      }
    }

    // Check if it's Google Reviews API response format
    if (typeof reviews === "object" && !Array.isArray(reviews) && "reviews" in reviews) {
      const googleResponse = reviews as GoogleReviewsResponse
      return {
        reviewsArray: Array.isArray(googleResponse.reviews) ? googleResponse.reviews : [],
        extractedAverageRating: averageRating || googleResponse.averageRating || 0,
        extractedTotalCount: totalReviewCount || googleResponse.totalReviewCount || 0,
      }
    }

    // Handle direct array format
    if (Array.isArray(reviews)) {
      return {
        reviewsArray: reviews,
        extractedAverageRating: averageRating || 0,
        extractedTotalCount: totalReviewCount || reviews.length,
      }
    }

    // Fallback for invalid format
    return {
      reviewsArray: [],
      extractedAverageRating: averageRating || 0,
      extractedTotalCount: totalReviewCount || 0,
    }
  }, [reviews, averageRating, totalReviewCount])

  const validReviews = reviewsArray.filter(
    (review) => review && typeof review === "object" && review.reviewId && typeof review.reviewId === "string",
  )

  const hasValidReviews = validReviews.length > 0
  const safeReviewsPerPage = Math.max(1, reviewsPerPage)
  const safeTotalReviewCount = Math.max(0, extractedTotalCount)
  const safeAverageRating = Math.max(0, Math.min(5, extractedAverageRating))

  const paginatedReviews = hasValidReviews
    ? validReviews.slice((reviewsPage - 1) * safeReviewsPerPage, reviewsPage * safeReviewsPerPage)
    : []

  const totalPages = hasValidReviews ? Math.ceil(validReviews.length / safeReviewsPerPage) : 0

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

  const generateAIReply = async (reviewText: string, reviewId?: string, guest?: string | undefined, starRating?: string) => {
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
          businessName: businessName,
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
      setIncorrectReason("")
    }
  }

  const handlePostReply = async (reviewId: string) => {
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
      fetchReviews()
    } catch (error) {
      console.error("Error posting reply:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      toast.error(`Failed to post reply: ${errorMessage}`)
    } finally {
      setPostingReply(false)
    }
  }

  const handleEditReply = async (reviewId: string) => {
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
          accessToken: accessToken
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      toast.success("Reply updated successfully!")
      setEditDialogOpen(null)
      setReplyEditState(null)
      fetchReviews()
    } catch (error) {
      console.error("Error editing reply:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      toast.error(`Failed to update reply: ${errorMessage}`)
    } finally {
      setEditingReply(false)
    }
  }

  const handleDeleteReply = async (reviewId: string) => {
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
          accessToken: accessToken
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      toast.success("Reply deleted successfully!")
      setDeleteDialogOpen(null)
      fetchReviews()
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

  const openReplyDialog = (reviewId: string) => {
    if (!reviewId || typeof reviewId !== "string") return
    setReplyDialogOpen(reviewId)
    setReplyText("")
  }

  const closeReplyDialog = () => {
    setReplyDialogOpen(null)
    setReplyText("")
  }

  if (!reviews || loading) {
    return (
      <Loader text="Retrieving information..." />
    )
  }

  if (!Array.isArray(reviews) && (typeof reviews !== "object" || !("reviews" in reviews))) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Customer Reviews</CardTitle>
          <CardDescription>Error loading reviews</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="w-8 h-8 mx-auto mb-4 text-red-500" />
            <p>Invalid reviews data format</p>
            <p className="text-xs mt-2">Expected Google Reviews API response or reviews array</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Customer Reviews</CardTitle>
            <CardDescription>
              {safeTotalReviewCount} reviews • Average {safeAverageRating.toFixed(1)}/5
            </CardDescription>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReviewsPage(Math.max(1, reviewsPage - 1))}
                disabled={reviewsPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {reviewsPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReviewsPage(Math.min(totalPages, reviewsPage + 1))}
                disabled={reviewsPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {paginatedReviews.length > 0 ? (
          <div className="space-y-4">
            {paginatedReviews.map((review) => {
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
                        <AvatarFallback>{review.reviewer?.displayName?.charAt(0)?.toUpperCase() || "?"}</AvatarFallback>
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

                      {showReplyButton && !hasReply && (
                        <div className="pt-2">
                          <Dialog
                            open={replyDialogOpen === review.reviewId}
                            onOpenChange={(open) => (open ? openReplyDialog(review.reviewId) : closeReplyDialog())}
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
                                  Responding to {review.reviewer?.displayName || "Anonymous"}'s review
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
                                      <Textarea
                                        placeholder="Please explain why you think this review is incorrect..."
                                        value={incorrectReason}
                                        onChange={(e) => setIncorrectReason(e.target.value)}
                                        rows={3}
                                      />
                                    )}
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium">Your Reply</label>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => generateAIReply(review.comment || "", review.reviewId, review.reviewer?.displayName || '', review.starRating)}
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
                                  onClick={() => handlePostReply(review.reviewId)}
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
                    </div>
                  </div>

                  {hasReply && (
                    <div className="ml-14 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border-l-4 border-blue-500">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Reply className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-600">{businessName} Reply</span>
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
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No reviews found</p>
            <p className="text-xs mt-2">This location hasn't received any reviews yet</p>
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
                onClick={() => editDialogOpen && handleEditReply(editDialogOpen)}
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
                onClick={() => deleteDialogOpen && handleDeleteReply(deleteDialogOpen)}
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
