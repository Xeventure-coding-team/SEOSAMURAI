"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Loader2, QrCode, Trash2, Edit, Eye, Calendar, ExternalLink, Plus, Download, X, Pencil } from "lucide-react"
import axios from "axios"
import toast from "react-hot-toast"
import Link from "next/link"
import { downloadPosterAsPDF, SavedPoster } from "@/lib/download/poster-download"
import ReviewPosterDisplay from "./ReviewPosterDisplay"

interface EditFormData {
  businessName: string
  reviewUrl: string
  bgColor: string
  bgPattern: string
  keywords: string
}

export default function SharedGoogleReviewPosterList() {
  const [posters, setPosters] = useState<SavedPoster[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [posterToDelete, setPosterToDelete] = useState<string | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [previewPoster, setPreviewPoster] = useState<typeof posters[0] | null>(null)
  const [editFormData, setEditFormData] = useState<EditFormData>({
    businessName: "",
    reviewUrl: "",
    bgColor: "#10b981",
    bgPattern: "none",
    keywords: "",
  })

  useEffect(() => {
    fetchPosters()
  }, [])

  const fetchPosters = async () => {
    try {
      setLoading(true)
      const response = await axios.get("/api/review-poster")

      if (response.data.success) {
        setPosters(response.data.posters)
      }
    } catch (error: any) {
      toast.error("Failed to load saved posters", {
        duration: 3000,
        position: "top-right",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadClick = async (poster: SavedPoster) => {
    setDownloading(poster.id)

    try {
      await downloadPosterAsPDF(poster)

      toast.success("Poster downloaded successfully!", {
        duration: 2000,
        position: "top-right",
      })
    } catch (error) {
      console.error('Download error:', error)
      toast.error("Failed to download poster", {
        duration: 3000,
        position: "top-right",
      })
    } finally {
      setDownloading(null)
    }
  }

  const handleViewClick = (poster: SavedPoster) => {
    const params = new URLSearchParams({
      businessName: poster.businessName,
      reviewUrl: poster.reviewUrl,
      bgColor: poster.bgColor,
      bgPattern: poster.bgPattern || "none",
      keywords: poster.keywords.join(","),
    })
    window.open(`/app/shared-google-review-poster/view?${params.toString()}`, '_blank')
  }



  const handleDeleteClick = (posterId: string) => {
    setPosterToDelete(posterId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!posterToDelete) return

    try {
      setDeleting(posterToDelete)
      await axios.delete(`/api/review-poster?id=${posterToDelete}`)

      toast.success("Poster deleted successfully", {
        duration: 2000,
        position: "top-right",
      })

      setPosters(posters.filter(p => p.id !== posterToDelete))
      setDeleteDialogOpen(false)
      setPosterToDelete(null)
    } catch (error: any) {
      console.error("Error deleting poster:", error)
      toast.error("Failed to delete poster", {
        duration: 3000,
        position: "top-right",
      })
    } finally {
      setDeleting(null)
    }
  }

  const colorOptions = [
    { name: "Green", value: "#10b981" },
    { name: "Blue", value: "#3b82f6" },
    { name: "Purple", value: "#2563eb" },
    { name: "Orange", value: "#f59e0b" },
    { name: "Red", value: "#ef4444" },
  ]

  const patternOptions = [
    { name: "None", value: "none" },
    { name: "Dots", value: "dots" },
    { name: "Grid", value: "grid" },
    { name: "Diagonal", value: "diagonal" },
    { name: "Waves", value: "waves" },
    { name: "Circles", value: "circles" },
  ]

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span>Loading your posters...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const handlePreviewClick = (poster: typeof posters[0]) => {
    setPreviewPoster(poster)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Review Posters</h2>
          <p className="text-muted-foreground mt-1">Manage your Google review poster collection</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">
            {posters.length} {posters.length === 1 ? 'Poster' : 'Posters'}
          </Badge>
          <Button asChild size="lg" className="shrink-0">
            <Link href="/app/shared-google-review-poster/create">
              <Plus className="h-5 w-5" />
              Create New Poster
            </Link>
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {posters.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="text-center py-16">
            <div className="mb-4 inline-block p-6 bg-muted rounded-full">
              <QrCode className="h-16 w-16 text-muted-foreground opacity-40" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No posters yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              Create your first review poster to start collecting customer feedback and boosting your online presence
            </p>
            <Button asChild size="lg" className="shrink-0">
              <Link href="/app/shared-google-review-poster/create">
                <Plus className="h-4 w-4" />
                Create Your First Poster
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (

        /* Poster Cards Grid - Professional SaaS UI */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {posters.map((poster) => (
            <div
              key={poster.id}
              className="group bg-background border border-border rounded-lg transition-all duration-200 hover:shadow-md hover:border-border/60 flex flex-col"
            >
              {/* Content Area */}
              <div className="p-5 pb-4 flex-1 flex flex-col gap-4">
                {/* Header with color indicator */}
                <div className="flex gap-3 items-start">
                  <div
                    className="w-10 h-10 rounded-lg flex-shrink-0 border border-border/50"
                    style={{ backgroundColor: poster.bgColor }}
                  />
                  <div className="flex-1 min-w-0">

                    <h3 className="text-sm font-semibold text-foreground leading-tight">
                      {poster.businessName}
                    </h3>

                    <time className="text-xs text-muted-foreground mt-1 block">
                      {new Date(poster.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </time>
                  </div>
                </div>

                {/* Keywords as tags */}
                {poster.keywords && poster.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {poster.keywords.slice(0, 2).map((keyword, index) => (
                      <span
                        key={index}
                        className="text-xs px-2.5 py-1 rounded-md bg-muted text-muted-foreground font-medium"
                      >
                        {keyword}
                      </span>
                    ))}
                    {poster.keywords.length > 2 && (
                      <span className="text-xs px-2.5 py-1 text-muted-foreground font-medium">
                        +{poster.keywords.length - 2} more
                      </span>
                    )}
                  </div>
                )}

                {/* URL */}
                <div className="text-xs text-muted-foreground truncate font-mono">
                  {poster.reviewUrl}
                </div>
              </div>

              {/* Action Footer */}
              <div className="border-t border-border/50 px-5 py-3 flex gap-2">
                <button
                  onClick={() => handleDownloadClick(poster)}
                  disabled={downloading === poster.id}
                  className="flex-1 text-xs font-medium px-3 py-2 rounded-md text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                  title="Download"
                >
                  {downloading === poster.id ? '⋯' : 'Download'}
                </button>
                <button
                  onClick={() => handlePreviewClick(poster)}
                  className="flex-1 text-xs font-medium px-3 py-2 rounded-md text-foreground hover:bg-muted transition-colors"
                  title="Preview"
                >
                  Preview
                </button>
                <button
                  onClick={() => handleDeleteClick(poster.id)}
                  disabled={deleting === poster.id}
                  className="flex-1 text-xs font-medium px-3 py-2 rounded-md text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                >
                  {deleting === poster.id ? '⋯' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>

      )}


      {/* Preview Modal - Modern shadcn Dialog */}
      <Dialog open={!!previewPoster} onOpenChange={(open) => !open && setPreviewPoster(null)}>
        <DialogContent className="sm:max-w-[1000px] w-full p-0 gap-0 bg-background border-0 shadow-2xl rounded-2xl overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Poster Preview</DialogTitle>
            <DialogDescription>Preview of your review poster</DialogDescription>
          </DialogHeader>

          {/* Modern Close Button */}
          <button
            onClick={() => setPreviewPoster(null)}
            className="absolute right-4 top-4 z-50 rounded-full bg-black/60 backdrop-blur-sm p-2 text-white hover:bg-black/80 transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>

          {/* Poster Content */}
          {previewPoster && (
            <div className="overflow-auto max-h-[85vh]">
              <ReviewPosterDisplay
                businessName={previewPoster.businessName}
                reviewUrl={previewPoster.reviewUrl}
                bgColor={previewPoster.bgColor}
                bgPattern={previewPoster.bgPattern}
                keywords={previewPoster.keywords?.join(', ') || ''}
                fullWidth={false}
              />
            </div>
          )}

          {/* Modern Footer Actions - No Edit Button */}
          <div className="flex justify-between items-center gap-3 p-5 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 border-t">
            <div className="text-xs text-muted-foreground">
              {previewPoster && (
                <span className="flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Ready to download
                </span>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewPoster(null)}
                className="rounded-full px-5"
              >
                Close
              </Button>

              {previewPoster && (
                <Button
                  size="sm"
                  onClick={() => {
                    handleDownloadClick(previewPoster)
                    setPreviewPoster(null)
                  }}
                  disabled={downloading === previewPoster.id}
                  className="rounded-full px-6 gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {downloading === previewPoster.id ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your review poster.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}