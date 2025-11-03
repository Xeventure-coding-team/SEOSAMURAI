"use client"

import React from "react"
import { useState, useRef, useCallback, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Upload,
  X,
  Loader2,
  Send,
  Phone,
  ExternalLink,
  Calendar,
  ShoppingBag,
  BookOpen,
  UserPlus,
  Sparkles,
  Edit3,
  Eye,
  Wand2,
  Clock,
  FileText,
  CalendarCheck,
  ImageOff,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import toast from "react-hot-toast"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useGmbPosts } from "@/hooks/useGmbPosts"
import { ScrollArea } from "../ui/scroll-area"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"

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

interface GmbEditPostFormProps {
  isOpen: boolean
  onClose: () => void
  accountId?: string | null
  locationId?: string | null
  accessToken?: string | null
  onPostUpdated?: (post: any) => void
  businessName: string
  editPost?: GMBPost | null
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]

const postSchema = z.object({
  postContent: z
    .string()
    .min(1, "Post content is required")
    .max(1500, "Post content must be less than 1500 characters"),
  actionButton: z.string().optional(),
  actionLink: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  callPhone: z
    .string()
    .regex(/^[+]?[1-9][\d]{0,15}$/, "Please enter a valid phone number")
    .optional()
    .or(z.literal("")),
  image_url: z.string().url("Please enter a valid image URL").optional().or(z.literal("")),
})

type PostFormData = z.infer<typeof postSchema>

const actionButtonOptions = [
  { value: "BOOK", label: "Book", icon: Calendar },
  { value: "ORDER", label: "Order", icon: ShoppingBag },
  { value: "SHOP", label: "Shop", icon: ShoppingBag },
  { value: "LEARN_MORE", label: "Learn More", icon: BookOpen },
  { value: "SIGN_UP", label: "Sign Up", icon: UserPlus },
  { value: "CALL", label: "Call", icon: Phone },
]

export function GmbEditPostForm({
  isOpen,
  onClose,
  accountId,
  locationId,
  accessToken,
  onPostUpdated,
  businessName,
  editPost,
}: GmbEditPostFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [imagePrompt, setImagePrompt] = useState("")
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      postContent: "",
      actionButton: "NO_ACTION",
      actionLink: "",
      callPhone: "",
      image_url: "",
    },
  })

  useEffect(() => {
    if (editPost) {
      form.reset({
        postContent: editPost.summary || "",
        actionButton: editPost.callToAction?.actionType.toUpperCase() || "NO_ACTION",
        actionLink: editPost.callToAction?.url || "",
        callPhone: editPost.callToAction?.actionType.toUpperCase() === "CALL" ? editPost.callToAction?.url || "" : "",
        image_url: editPost.media?.[0]?.googleUrl || "",
      })


      // Set preview URL if there's existing media
      if (editPost.media?.[0]?.googleUrl) {
        setPreviewUrl(editPost.media[0].googleUrl)
      }
    }
  }, [editPost, form])

  const displayImageUrl = previewUrl || form.watch("image_url")
  const watchedImageUrl = form.watch("image_url")
  const { updatePost, loading } = useGmbPosts()

  const generateImageFromContent = async () => {
    const postContent = form.getValues("postContent")
    if (!postContent.trim()) {
      toast.error("Please enter post content first")
      return
    }

    setIsGeneratingImage(true)
    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occasion: `${postContent}`,
        }),
      })

      const result = await response.json()

      if (result.success) {
        form.setValue("image_url", result.imageUrl)
        toast.success("Image generated from content!")
      } else {
        toast.error(result.message || "Failed to generate image")
      }
    } catch (error) {
      toast.error("Failed to generate image")
      console.error("Image generation error:", error)
    } finally {
      setIsGeneratingImage(false)
    }
  }

  const enhanceContent = async () => {
    const postContent = form.getValues("postContent")
    if (!postContent.trim()) {
      toast.error("Please enter post content first")
      return
    }

    setIsEnhancing(true)
    try {
      const response = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occasion: `${postContent}`,
        }),
      })

      const result = await response.json()

      if (result.success) {
        form.setValue("postContent", result.content)
        toast.success("Text enhanced")
      } else {
        toast.error(result.message || "Failed to enhance text")
      }
    } catch (error) {
      toast.error("Failed to enhance text")
      console.error("Image generation error:", error)
    } finally {
      setIsEnhancing(false)
    }
  }

  const generateImage = async () => {
    if (!imagePrompt.trim()) {
      toast.error("Please enter a prompt for image generation")
      return
    }

    setIsGeneratingImage(true)
    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ occasion: imagePrompt }),
      })

      const result = await response.json()

      if (result.success) {
        form.setValue("image_url", result.imageUrl)
        setImagePrompt("")
        toast.success("Image generated successfully!")
      } else {
        toast.error(result.message || "Failed to generate image")
      }
    } catch (error) {
      toast.error("Failed to generate image")
      console.error("Image generation error:", error)
    } finally {
      setIsGeneratingImage(false)
    }
  }

  const handleFileSelect = useCallback(
    (file: File) => {
      // Validate file type
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast.error("Please select a valid image file (JPEG, PNG, WebP)")
        return
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error("File size must be less than 10MB")
        return
      }

      setSelectedFile(file)

      // Create preview URL
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)

      // Clear image URL field when file is selected
      form.setValue("image_url", "")

      toast.success("Image selected successfully")
    },
    [form],
  )

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0])
      }
    },
    [handleFileSelect],
  )

  const removeFile = useCallback(() => {
    setSelectedFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [previewUrl])

  const onSubmit = async (data: PostFormData) => {
    if (!accountId || !locationId || !accessToken || !editPost) {
      toast.error("Missing account credentials or post data")
      return
    }

    setIsUpdating(true)
    try {
      const payload: any = {
        summary: data.postContent,
      }

      // Handle call to action
      if (data.actionButton && data.actionButton !== "NO_ACTION") {
        payload.callToAction = {
          actionType: data.actionButton,
          url: data.actionButton === "CALL" ? data.callPhone : data.actionLink
        }
      } else {
        // Set to null to remove call to action
        payload.callToAction = null
      }

      // Handle image URL if provided
      if (data.image_url) {
        payload.image_url = data.image_url
      }

      // If there's a file upload, use FormData
      if (selectedFile) {
        const formData = new FormData()

        // Add the file
        formData.append("file", selectedFile)

        // Add other data as JSON strings (since your backend parses them)
        formData.append("summary", payload.summary)

        if (payload.callToAction) {
          formData.append("callToAction", JSON.stringify(payload.callToAction))
        } else {
          formData.append("callToAction", "null")
        }

        // Make the request with FormData
        const url = `/api/gmb/posts?accessToken=${encodeURIComponent(accessToken)}&account=${encodeURIComponent(accountId)}&location=${encodeURIComponent(locationId)}&postName=${encodeURIComponent(editPost.name)}`

        const response = await fetch(url, {
          method: 'PATCH',
          body: formData
        })

        const result = await response.json()

        if (result.success) {
          toast.success("Post updated successfully!")
          form.reset()
          removeFile()
          onPostUpdated?.(result.data)
          onClose()
        } else {
          toast.error(result.message || "Failed to update post")
        }
      } else {
        // No file upload, use regular JSON payload
        const response = await updatePost(
          accessToken,
          accountId,
          locationId,
          editPost.name,
          payload // Pass the correctly formatted payload
        )

        const result = await response

        if (result && result.success) {
          toast.success("Post updated successfully!")
          form.reset()
          removeFile()
          onPostUpdated?.(result.data)
          onClose()
        } else {
          toast.error(result?.message || "Failed to update post")
        }
      }
    } catch (error) {
      toast.error("An error occurred while updating the post")
      console.error("Post update error:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const watchedActionButton = form.watch("actionButton")
  const characterCount = form.watch("postContent")?.length || 0
  const watchedPostContent = form.watch("postContent")

  const getActionButtonInfo = (actionType: string) => {
    const option = actionButtonOptions.find((opt) => opt.value === actionType)
    return option || { label: "No Action", icon: Send }
  }

  const handleClose = () => {
    if (!isUpdating) {
      onClose()
      // Reset form when closing
      form.reset()
      removeFile()
    }
  }

  const handleEnhanceContent = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    await enhanceContent()
  }


  return (

    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="custom-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Edit GMB Post
          </DialogTitle>
          <DialogDescription>Update your existing Google Business Profile post with new details or changes.</DialogDescription>
        </DialogHeader>
        <div className="w-full mx-auto">
          <ScrollArea className="h-[90vh]">

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Post Preview Panel */}
              <Card className="lg:sticky lg:top-4 h-fit lg:col-span-3">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Post Preview
                  </CardTitle>
                  <CardDescription>See how your updated post will appear</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-white border rounded-lg p-4 shadow-sm">
                    {/* Business Header Mockup */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {businessName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{businessName}</h3>
                        <p className="text-sm text-gray-500">Updated post</p>
                      </div>
                    </div>

                    {/* Post Content */}
                    <div className="space-y-3">
                      {watchedPostContent ? (
                        <p className="text-gray-900 whitespace-pre-wrap line-clamp-6">{watchedPostContent}</p>
                      ) : (
                        <p className="text-gray-400 italic">Your updated post content will appear here...</p>
                      )}

                      {(watchedImageUrl || previewUrl) && (
                        <div className="rounded-lg overflow-hidden">
                          <img
                            src={displayImageUrl ?
                              `https://images.weserv.nl/?url=${encodeURIComponent(displayImageUrl)}` :
                              "/placeholder.svg"
                            }
                            alt="Post image"
                            className="w-full h-48 object-cover"
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                            onError={(e) => {
                              e.currentTarget.style.display = "none"
                              const fallback = e.currentTarget.nextElementSibling as HTMLElement
                              if (fallback) fallback.style.display = "flex"
                            }}
                          />
                          {/* Fallback div (hidden until error) */}
                          <div
                            className="w-full h-48 hidden flex-col items-center justify-center bg-muted"
                          >
                            <ImageOff className="h-12 w-12 text-muted-foreground mb-2" />
                            <span className="text-sm text-muted-foreground">No image available</span>
                          </div>
                        </div>
                      )}


                      {/* Action Button Preview */}
                      {watchedActionButton && watchedActionButton !== "NO_ACTION" && (
                        <div className="pt-2">
                          <div className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium">
                            {React.createElement(getActionButtonInfo(watchedActionButton).icon, { className: "h-4 w-4" })}
                            {getActionButtonInfo(watchedActionButton).label}
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                </CardContent>
              </Card>


              {/* Form Panel */}
              <Card className="lg:sticky lg:top-4 h-fit lg:col-span-9">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Edit3 className="h-5 w-5" />
                    Edit GMB Post
                  </CardTitle>
                  <CardDescription>Update your Google My Business post content and settings</CardDescription>
                </CardHeader>

                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      {/* Post Content */}
                      <FormField
                        control={form.control}
                        name="postContent"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center justify-between">
                              <span>Post Content</span>
                              <div className="flex items-center gap-2">
                                <Badge variant={characterCount > 1200 ? "destructive" : "secondary"}>
                                  {characterCount}/1500
                                </Badge>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={handleEnhanceContent}
                                      disabled={isEnhancing || !field.value?.trim()}
                                    >
                                      {isEnhancing ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Wand2 className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Enhance Description</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Write your post content here..."
                                className="min-h-[120px] resize-none"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Update your post content. Use the magic wand to generate an image from your content!
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Media Section - Same as create form */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium">Media</h3>
                          <Badge variant="outline">Optional</Badge>
                        </div>

                        <FormField
                          control={form.control}
                          name="image_url"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Image (Optional)</FormLabel>
                              <FormControl>
                                <div className="space-y-4">
                                  <Tabs defaultValue="upload" className="w-full">
                                    <TabsList className="grid w-full grid-cols-3">
                                      <TabsTrigger value="upload">Upload</TabsTrigger>
                                      <TabsTrigger value="url">URL</TabsTrigger>
                                      <TabsTrigger value="ai">AI Generate</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="upload" className="space-y-4">
                                      <div
                                        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${dragActive
                                          ? "border-primary bg-primary/5"
                                          : "border-muted-foreground/25 hover:border-muted-foreground/50"
                                          }`}
                                        onDragEnter={handleDrag}
                                        onDragLeave={handleDrag}
                                        onDragOver={handleDrag}
                                        onDrop={handleDrop}
                                      >
                                        {selectedFile || previewUrl ? (
                                          <div className="flex items-center gap-4">
                                            {displayImageUrl ? (
                                              <div className="relative">
                                                <img
                                                  src={displayImageUrl ?
                                                    `https://images.weserv.nl/?url=${encodeURIComponent(displayImageUrl)}` :
                                                    "/placeholder.svg"
                                                  }
                                                  alt="Preview"
                                                  className="w-16 h-16 object-cover rounded-lg"
                                                  referrerPolicy="no-referrer"
                                                  crossOrigin="anonymous"
                                                  onError={(e) => {
                                                    e.currentTarget.style.display = "none"
                                                    const fallback = e.currentTarget.nextElementSibling as HTMLElement
                                                    if (fallback) fallback.style.display = "flex"
                                                  }}
                                                />
                                                {/* Fallback */}
                                                <div className="w-16 h-16 hidden flex-col items-center justify-center rounded-lg bg-muted">
                                                  <ImageOff className="h-6 w-6 text-muted-foreground mb-1" />
                                                  <span className="text-[10px] text-muted-foreground">No image</span>
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="w-16 h-16 flex flex-col items-center justify-center rounded-lg bg-muted">
                                                <ImageOff className="h-6 w-6 text-muted-foreground mb-1" />
                                                <span className="text-[10px] text-muted-foreground">No image</span>
                                              </div>
                                            )}

                                            <div className="flex-1">
                                              <p className="text-sm font-medium">
                                                {selectedFile?.name || "Image selected"}
                                              </p>
                                              <p className="text-xs text-muted-foreground">
                                                {selectedFile && `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`}
                                              </p>
                                            </div>
                                            <Button type="button" variant="outline" size="sm" onClick={removeFile}>
                                              <X className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        ) : (
                                          <div className="text-center">
                                            <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                                            <p className="text-sm text-muted-foreground mb-1">
                                              Drag and drop an image here, or{" "}
                                              <button
                                                type="button"
                                                className="text-primary hover:underline"
                                                onClick={() => fileInputRef.current?.click()}
                                              >
                                                browse
                                              </button>
                                            </p>
                                            <p className="text-xs text-muted-foreground">PNG, JPG, WebP up to 10MB</p>
                                          </div>
                                        )}
                                        <input
                                          ref={fileInputRef}
                                          type="file"
                                          accept={ACCEPTED_IMAGE_TYPES.join(",")}
                                          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                                          className="hidden"
                                        />
                                      </div>
                                    </TabsContent>

                                    <TabsContent value="url" className="space-y-4">
                                      <FormField
                                        control={form.control}
                                        name="image_url"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormControl>
                                              <Input
                                                placeholder="https://example.com/image.jpg"
                                                disabled={!!selectedFile}
                                                {...field}
                                              />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                    </TabsContent>

                                    <TabsContent value="ai" className="space-y-4">
                                      <div className="space-y-4">
                                        <div className="flex gap-2">
                                          <Button
                                            type="button"
                                            variant="outline"
                                            onClick={generateImageFromContent}
                                            disabled={isGeneratingImage || !form.watch("postContent")?.trim()}
                                            className="flex-1 bg-transparent"
                                          >
                                            {isGeneratingImage ? (
                                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            ) : (
                                              <Wand2 className="h-4 w-4 mr-2" />
                                            )}
                                            Generate from Content
                                          </Button>
                                        </div>

                                        <div className="relative">
                                          <div className="absolute inset-0 flex items-center">
                                            <span className="w-full border-t" />
                                          </div>
                                          <div className="relative flex justify-center text-xs uppercase">
                                            <span className="bg-background px-2 text-muted-foreground">Or</span>
                                          </div>
                                        </div>

                                        <div className="flex gap-2">
                                          <Input
                                            placeholder="Describe the image you want to generate..."
                                            value={imagePrompt}
                                            onChange={(e) => setImagePrompt(e.target.value)}
                                            disabled={isGeneratingImage}
                                          />
                                          <Button
                                            type="button"
                                            onClick={generateImage}
                                            disabled={isGeneratingImage || !imagePrompt.trim()}
                                          >
                                            {isGeneratingImage ? (
                                              <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                              <Sparkles className="h-4 w-4" />
                                            )}
                                          </Button>
                                        </div>
                                      </div>
                                      {watchedImageUrl && (
                                        <div className="mt-2">
                                          <img
                                            src={watchedImageUrl ?
                                              `https://images.weserv.nl/?url=${encodeURIComponent(watchedImageUrl)}` :
                                              "/placeholder.svg"
                                            }
                                            referrerPolicy="no-referrer"
                                            crossOrigin="anonymous"
                                            alt="Generated"
                                            className="w-32 h-32 object-cover rounded-lg"
                                            onError={(e) => {
                                              e.currentTarget.src = "/placeholder.svg"
                                            }}
                                          />
                                        </div>
                                      )}
                                    </TabsContent>
                                  </Tabs>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Call to Action - Same as create form */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium">Call to Action</h3>

                        <FormField
                          control={form.control}
                          name="actionButton"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Action Button</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select an action" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="NO_ACTION">No action button</SelectItem>
                                  {actionButtonOptions.map((option) => {
                                    const Icon = option.icon
                                    return (
                                      <SelectItem key={option.value} value={option.value}>
                                        <div className="flex items-center gap-2">
                                          <Icon className="h-4 w-4" />
                                          {option.label}
                                        </div>
                                      </SelectItem>
                                    )
                                  })}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {watchedActionButton && watchedActionButton !== "CALL" && watchedActionButton !== "NO_ACTION" && (
                          <FormField
                            control={form.control}
                            name="actionLink"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <ExternalLink className="h-4 w-4" />
                                  Action Link
                                </FormLabel>
                                <FormControl>
                                  <Input placeholder="https://your-website.com" {...field} />
                                </FormControl>
                                <FormDescription>
                                  URL users will be directed to when they click the action button
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        {watchedActionButton === "CALL" && (
                          <FormField
                            control={form.control}
                            name="callPhone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <Phone className="h-4 w-4" />
                                  Phone Number
                                </FormLabel>
                                <FormControl>
                                  <Input placeholder="+1234567890" {...field} />
                                </FormControl>
                                <FormDescription>
                                  Phone number users can call when they click the action button
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>

                      <Button type="submit" className="w-full" disabled={isUpdating}>
                        {isUpdating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Updating Post...
                          </>
                        ) : (
                          <>
                            <Edit3 className="mr-2 h-4 w-4" />
                            Update Post
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>

            </div>
          </ScrollArea>
        </div>
      </DialogContent>

    </Dialog>
  )
}
