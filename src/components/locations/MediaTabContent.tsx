"use client"

import { useRef, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Loader2,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { PlanGate } from "../PlanGate"
import { useFeature } from "@/lib/use-usage"
import { useRouter } from "next/navigation"

// ─── Types ────────────────────────────────────────────────────────────────────

type MediaCategory = "ADDITIONAL" | "COVER" | "PROFILE" | "LOGO"

interface UploadState {
  status: "idle" | "uploading" | "success" | "error"
  message: string
}

export interface MediaItem {
  name?: string
  googleUrl: string
  [key: string]: any
}

export interface MediaData {
  totalMediaItemCount?: number
}

export interface MediaTabContentProps {
  /** Raw media object from GMB API (used for total count) */
  media: MediaData
  /** Slice of media items for the current page */
  paginatedMedia: MediaItem[]
  /** Current page number (1-indexed) */
  mediaPage: number
  /** Total number of pages */
  totalMediaPages: number
  /** Set of googleUrls currently being loaded */
  loadingImages: Set<string>
  /** Set of googleUrls that failed to load */
  imageErrors: Set<string>
  /** GMB location name e.g. "accounts/123/locations/456" — required for upload */
  locationName: string
  /** Navigate to a specific page */
  setMediaPage: (page: number) => void
  /** Returns the proxied/signed src for a given googleUrl */
  getImageSrc: (googleUrl: string) => string | undefined
  /** Called when an image starts loading */
  handleImageLoadStart: (googleUrl: string) => void
  /** Called when an image finishes loading successfully */
  handleImageLoad: (googleUrl: string) => void
  /** Called when an image fails to load */
  handleImageError: (googleUrl: string) => void
  /** Called after a successful upload so the parent can refetch media */
  onUploadSuccess?: () => void

  accessToken?: string
}

// ─── Upload Dialog ────────────────────────────────────────────────────────────

function MediaUploadDialog({
  locationName,
  onUploadSuccess,
  accessToken
}: {
  locationName: string
  onUploadSuccess?: () => void
  accessToken: string
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [category, setCategory] = useState<MediaCategory>("ADDITIONAL")
  const [upload, setUpload] = useState<UploadState>({ status: "idle", message: "" })
  const [isDragging, setIsDragging] = useState(false)

  const router = useRouter();

  const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "video/mp4",
    "video/quicktime",
  ]

  function handleFile(file: File) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setUpload({ status: "error", message: "Unsupported type. Use JPEG, PNG, WebP, GIF, MP4, or MOV." })
      return
    }
    const isVideo = file.type.startsWith("video/")
    const maxSize = isVideo ? 75 * 1024 * 1024 : 5 * 1024 * 1024
    if (file.size > maxSize) {
      setUpload({
        status: "error",
        message: isVideo ? "Video must be under 75 MB." : "Image must be under 5 MB.",
      })
      return
    }
    setUpload({ status: "idle", message: "" })
    setSelectedFile(file)
    setPreviewUrl(!isVideo ? URL.createObjectURL(file) : null)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  async function handleUpload() {
    if (!selectedFile || !locationName) return
    setUpload({ status: "uploading", message: "" })

    const formData = new FormData()
    formData.append("file", selectedFile)
    formData.append("locationName", locationName)
    formData.append("category", category)
    formData.append("accessToken", accessToken)

    try {
      const res = await fetch("/api/gmb/media/upload", { method: "POST", body: formData })
      const data = await res.json()

      if (!res.ok) {
        setUpload({ status: "error", message: data.error || "Upload failed." })
        return
      }

      setUpload({ status: "success", message: "Photo uploaded successfully!" })
      onUploadSuccess?.()
      setTimeout(() => {
        setOpen(false)
        reset()
      }, 1800)
    } catch {
      setUpload({ status: "error", message: "Network error. Please try again." })
    }
  }

  function reset() {
    setSelectedFile(null)
    setPreviewUrl(null)
    setCategory("ADDITIONAL")
    setUpload({ status: "idle", message: "" })
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const canUploadMedia = useFeature("media-upload");

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger asChild>

        {canUploadMedia && <Button
          size="sm"
          className="gap-1.5"
          disabled={!canUploadMedia}
          onClick={canUploadMedia ? handleUpload : () => router.push("/settings/billing")}
        >
          <Upload className="w-3.5 h-3.5" />
          {canUploadMedia ? "Add Photo" : "Upgrade to Upload"}
        </Button>}


      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Media</DialogTitle>
          <DialogDescription>
            Add a photo or video to your Google My Business listing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Drop zone */}
          <div
            className={[
              "relative border-2 border-dashed rounded-xl transition-colors cursor-pointer",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/40",
              selectedFile ? "border-primary/40 bg-primary/5" : "",
            ].join(" ")}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_TYPES.join(",")}
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />

            {selectedFile ? (
              <div className="p-4 flex items-center gap-3">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="preview"
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB ·{" "}
                    {selectedFile.type.split("/")[1].toUpperCase()}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); reset() }}
                  className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="py-10 flex flex-col items-center gap-2 text-center px-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                  <Upload className="w-5 h-5 text-primary" />
                </div>
                <p className="text-sm font-medium">Drag & drop or click to browse</p>
                <p className="text-xs text-muted-foreground">
                  JPEG, PNG, WebP, GIF · max 5 MB
                  <br />
                  MP4, MOV · max 75 MB
                </p>
              </div>
            )}
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="media-category" className="text-sm">
              Photo Category
            </Label>
            <Select value={category} onValueChange={(v) => setCategory(v as MediaCategory)}>
              <SelectTrigger id="media-category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADDITIONAL">Additional (General)</SelectItem>
                <SelectItem value="COVER">Cover Photo</SelectItem>
                <SelectItem value="PROFILE">Profile Photo</SelectItem>
                <SelectItem value="LOGO">Logo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          {upload.status === "error" && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {upload.message}
            </div>
          )}
          {upload.status === "success" && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950/30 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              {upload.message}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => { setOpen(false); reset() }}
            disabled={upload.status === "uploading"}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || upload.status === "uploading" || upload.status === "success"}
            className="gap-1.5 min-w-24"
          >
            {upload.status === "uploading" ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…</>
            ) : upload.status === "success" ? (
              <><CheckCircle2 className="w-3.5 h-3.5" /> Done</>
            ) : (
              <><Upload className="w-3.5 h-3.5" /> Upload</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MediaTabContent({
  media,
  paginatedMedia,
  mediaPage,
  totalMediaPages,
  loadingImages,
  imageErrors,
  locationName,
  setMediaPage,
  getImageSrc,
  handleImageLoadStart,
  handleImageLoad,
  handleImageError,
  onUploadSuccess,
  accessToken
}: MediaTabContentProps) {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle>Media Gallery</CardTitle>
              <CardDescription>{media.totalMediaItemCount || 0} photos</CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <MediaUploadDialog locationName={locationName} onUploadSuccess={onUploadSuccess} accessToken={accessToken} />

              {totalMediaPages > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMediaPage(Math.max(1, mediaPage - 1))}
                    disabled={mediaPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
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
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {paginatedMedia.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {paginatedMedia.map((item, index) => {
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
              <p className="text-xs mt-2">Upload your first photo using the button above</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}