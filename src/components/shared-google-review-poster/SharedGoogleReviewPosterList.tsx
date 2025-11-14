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
import { Loader2, QrCode, Trash2, Edit, Eye, Calendar, ExternalLink, Plus } from "lucide-react"
import axios from "axios"
import toast from "react-hot-toast"
import Link from "next/link"

interface SavedPoster {
  id: string
  businessName: string
  reviewUrl: string
  bgColor: string
  bgPattern: string
  keywords: string[]
  placeId: string | null
  createdAt: string
  updatedAt: string
}

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [posterToDelete, setPosterToDelete] = useState<string | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
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

  const handleEditClick = (poster: SavedPoster) => {
    setEditing(poster.id)
    setEditFormData({
      businessName: poster.businessName,
      reviewUrl: poster.reviewUrl,
      bgColor: poster.bgColor,
      bgPattern: poster.bgPattern || "none",
      keywords: poster.keywords.join(", "),
    })
    setEditDialogOpen(true)
  }

  const handleEditSave = async () => {
    if (!editing) return

    if (!editFormData.businessName || !editFormData.reviewUrl) {
      toast.error("Business name and review URL are required", {
        duration: 3000,
        position: "top-right",
      })
      return
    }

    try {
      const response = await axios.put(`/api/review-poster?id=${editing}`, {
        businessName: editFormData.businessName,
        reviewUrl: editFormData.reviewUrl,
        bgColor: editFormData.bgColor,
        bgPattern: editFormData.bgPattern,
        keywords: editFormData.keywords,
      })

      if (response.data.success) {
        toast.success("Poster updated successfully", {
          duration: 2000,
          position: "top-right",
        })
        
        setPosters(posters.map(p => 
          p.id === editing ? { ...p, ...response.data.poster } : p
        ))
        
        setEditDialogOpen(false)
        setEditing(null)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to update poster", {
        duration: 3000,
        position: "top-right",
      })
    }
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
    { name: "Purple", value: "#8b5cf6" },
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Review Posters</h2>
          <p className="text-muted-foreground mt-1">Manage your Google review poster collection</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-sm px-3 py-1">
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
        /* Poster Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posters.map((poster) => (
            <Card key={poster.id} className="hover:shadow-lg transition-all duration-200 group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg font-semibold truncate mb-1 capitalize">
                      {poster.businessName}
                    </CardTitle>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(poster.createdAt).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}</span>
                    </div>
                  </div>
                  <div 
                    className="w-10 h-10 rounded-lg flex-shrink-0 shadow-sm ring-1 ring-black/5" 
                    style={{ backgroundColor: poster.bgColor }}
                  />
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Keywords */}
                {poster.keywords && poster.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {poster.keywords.slice(0, 3).map((keyword, index) => (
                      <Badge key={index} variant="secondary" className="text-xs font-normal">
                        {keyword}
                      </Badge>
                    ))}
                    {poster.keywords.length > 3 && (
                      <Badge variant="outline" className="text-xs font-normal">
                        +{poster.keywords.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Review URL Preview */}
                <div className="flex items-start gap-2 p-2.5 bg-muted/50 rounded-md">
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-muted-foreground truncate flex-1">
                    {poster.reviewUrl}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link href={`/review/${poster.id}`} target="_blank" rel="noopener noreferrer">
                      <Eye className="h-3.5 w-3.5 mr-1.5" />
                      View
                    </Link>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleEditClick(poster)}
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={deleting === poster.id}
                    onClick={() => handleDeleteClick(poster.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    {deleting === poster.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Review Poster</DialogTitle>
            <DialogDescription>
              Update your review poster details below
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Business Name</label>
              <Input
                value={editFormData.businessName}
                onChange={(e) => setEditFormData({ ...editFormData, businessName: e.target.value })}
                placeholder="e.g. GloPar Travels"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Google Review Link</label>
              <Input
                type="url"
                value={editFormData.reviewUrl}
                onChange={(e) => setEditFormData({ ...editFormData, reviewUrl: e.target.value })}
                placeholder="https://g.page/r/your-business/review"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Background Color</label>
              <div className="flex gap-2 mb-3">
                <Input
                  type="color"
                  value={editFormData.bgColor}
                  onChange={(e) => setEditFormData({ ...editFormData, bgColor: e.target.value })}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <span className="text-sm text-muted-foreground pt-2">{editFormData.bgColor}</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setEditFormData({ ...editFormData, bgColor: color.value })}
                    className={`w-full h-10 rounded-md border-2 transition-colors ${
                      editFormData.bgColor === color.value ? 'border-primary' : 'border-border hover:border-primary'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Pattern Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Background Pattern</label>
              <div className="grid grid-cols-3 gap-2">
                {patternOptions.map((pattern) => (
                  <button
                    key={pattern.value}
                    onClick={() => setEditFormData({ ...editFormData, bgPattern: pattern.value })}
                    className={`px-3 py-2 rounded-md border-2 text-sm font-medium transition-colors ${
                      editFormData.bgPattern === pattern.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary"
                    }`}
                  >
                    {pattern.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Keywords / Review Hints</label>
              <Textarea
                value={editFormData.keywords}
                onChange={(e) => setEditFormData({ ...editFormData, keywords: e.target.value })}
                placeholder="great service, friendly staff, quick delivery..."
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">Separate keywords with commas</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSave}>
              Save Changes
            </Button>
          </DialogFooter>
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