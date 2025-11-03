"use client"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useEffect, useState, useRef, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useCalendarContext } from "../calendar-context"
import { format } from "date-fns"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { DateTimePicker } from "@/components/from/date-time-picker"

import React from "react"
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
  Eye,
  Wand2,
  Trash2,
  CheckCircle,
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import toast from "react-hot-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useGmbPostsScheduled } from "@/hooks/useGmbPostsScheduled"
import PostPublished from "./PostPublished"

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
  scheduled: z.string().optional(),
  viewColor: z.string().optional(),
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

export default function CalendarManageEventDialog() {
  const { manageEventDialogOpen, setManageEventDialogOpen, selectedEvent, setSelectedEvent, events, setEvents } =
    useCalendarContext()

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [imagePrompt, setImagePrompt] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)


  const { updatePost, deletePost, loading } = useGmbPostsScheduled()

  const form = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      postContent: "",
      actionButton: "NO_ACTION",
      actionLink: "",
      callPhone: "",
      image_url: "",
      scheduled: "",
      viewColor: "#3b82f6",
    },
  })

  useEffect(() => {
    if (selectedEvent) {
      form.reset({
        postContent: selectedEvent.summary || "",
        actionButton: selectedEvent.actionType || "NO_ACTION",
        actionLink: selectedEvent.actionUrl || "",
        callPhone: selectedEvent.callPhone || "",
        image_url: selectedEvent.imageUrl || "",
        scheduled: format(selectedEvent.scheduledAt || new Date(), "yyyy-MM-dd'T'HH:mm"),
        viewColor: selectedEvent.viewColor || "#3b82f6",
      })
    }
  }, [selectedEvent, form])

  const displayImageUrl = previewUrl || form.watch("image_url")
  const watchedImageUrl = form.watch("image_url")
  const watchedPostContent = form.watch("postContent")
  const watchedActionButton = form.watch("actionButton")?.toUpperCase()
  const characterCount = form.watch("postContent")?.length || 0

  const getActionButtonInfo = (actionType: string) => {
    const option = actionButtonOptions.find((opt) => opt.value === actionType)
    return option || { label: "No Action", icon: Send }
  }

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
      console.error("Enhancement error:", error)
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
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast.error("Please select a valid image file (JPEG, PNG, WebP)")
        return
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error("File size must be less than 10MB")
        return
      }

      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
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

  const handleEnhanceContent = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    await enhanceContent()
  }

  async function onSubmit(values: PostFormData) {
    if (!selectedEvent) return

    try {
      // Convert form data to backend schema format
      const convertToSchemaActionType = (actionType: string): string => {
        switch (actionType) {
          case "BOOK":
            return "book-a-visit"
          case "ORDER":
            return "place-an-order"
          case "SHOP":
            return "shop"
          case "LEARN_MORE":
            return "read-more"
          case "SIGN_UP":
            return "sign-up"
          case "CALL":
            return "call"
          case "RESERVE":
            return "reserve"
          case "GET_QUOTE":
            return "get-quote"
          case "APPOINTMENT":
            return "appointment"
          default:
            return actionType
        }
      }

      // Prepare update data
      const updateData: any = {
        summary: values.postContent,
        scheduledPublishTime: values.scheduled ? new Date(values.scheduled).toISOString() : undefined,
      }

      // Add call to action if specified
      if (values.actionButton && values.actionButton !== "NO_ACTION") {
        updateData.callToAction = {
          actionType: convertToSchemaActionType(values.actionButton),
        }

        if (values.actionButton === "CALL" && values.callPhone) {
          updateData.callToAction.url = `tel:${values.callPhone}`
        } else if (values.actionLink) {
          updateData.callToAction.url = values.actionLink
        }
      }

      // Add file if selected
      if (selectedFile) {
        updateData.file = selectedFile
      } else if (values.image_url) {
        updateData.media = [
          {
            mediaFormat: "PHOTO",
            sourceUrl: values.image_url,
          },
        ]
      }

      // Call the update API
      await updatePost(
        selectedEvent.accessToken || "",
        selectedEvent.accountId || "",
        selectedEvent.locationId || "",
        selectedEvent.postName || selectedEvent.id || "",
        updateData,
      )

      // Update local state
      const updatedEvent = {
        ...selectedEvent,
        summary: values.postContent,
        scheduledAt: new Date(values.scheduled || selectedEvent.scheduledAt),
        actionType: values.actionButton,
        actionUrl: values.actionLink,
        callPhone: values.callPhone,
        imageUrl: values.image_url,
        color: values.color,
      }

      setEvents(events.map((event) => (event.id === selectedEvent.id ? updatedEvent : event)))
      handleClose()
      toast.success("Post updated successfully!")
    } catch (error: any) {
      console.error("Error updating post:", error)
      toast.error(error.message || "Failed to update post")
    }
  }

  async function handleDelete() {
    if (!selectedEvent) return
    const res = await deletePost(
      selectedEvent.accessToken || "",
      selectedEvent.accountId || "",
      selectedEvent.locationId || "",
      selectedEvent.postName || selectedEvent.id || "",);
    setEvents(events.filter((event) => event.id !== selectedEvent.id))
    handleClose()
    toast.success("Post deleted successfully!")
  }

  function handleClose() {
    setManageEventDialogOpen(false)
    setSelectedEvent(null)
    form.reset()
    removeFile()
  }

  return (
    <Dialog open={manageEventDialogOpen} onOpenChange={handleClose}>
      <DialogContent
        className="min-w-full
        fixed inset-0 left-0 top-0 translate-x-0 translate-y-0
        m-0 p-0 w-screen h-screen max-w-none max-h-screen
        rounded-none overflow-hidden flex flex-col
      "
      >
        
        <DialogHeader className="shrink-0 pl-4 pt-4 hidden">
          <DialogTitle>Manage Scheduled Post</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <div className="flex-1 overflow-hidden w-full">
            <ScrollArea className="h-full p-4">
              <div className="w-full max-w-none">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Post Preview Panel */}
                  <Card className="lg:sticky lg:top-4 h-fit lg:col-span-3">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5" />
                        Post Preview
                      </CardTitle>
                      <CardDescription>See how your post will appear on Google My Business</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-white border rounded-lg p-4 shadow-sm">
                        {/* Business Header Mockup */}
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                            B
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">Business Name</h3>
                            <p className="text-sm text-gray-500">Updated post</p>
                          </div>
                        </div>

                        {/* Post Content */}
                        <div className="space-y-3">
                          {watchedPostContent ? (
                            <p className="text-gray-900 whitespace-pre-wrap line-clamp-6">{watchedPostContent}</p>
                          ) : (
                            <p className="text-gray-400 italic">Your post content will appear here...</p>
                          )}

                          {/* Image Preview */}
                          {(watchedImageUrl || previewUrl) && (
                            <div className="rounded-lg overflow-hidden">
                              <img
                                src={displayImageUrl || "/placeholder.svg"}
                                alt="Post image"
                                className="w-full h-48 object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = "/placeholder.svg"
                                }}
                              />
                            </div>
                          )}

                          {/* Action Button Preview */}
                          {watchedActionButton && watchedActionButton !== "NO_ACTION" && (
                            <div className="pt-2">
                              <div className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium">
                                {React.createElement(getActionButtonInfo(watchedActionButton).icon, {
                                  className: "h-4 w-4",
                                })}
                                {getActionButtonInfo(watchedActionButton).label}
                              </div>
                            </div>
                          )}
                        </div>


                      </div>

                      <div className="space-y-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" className="w-full" type="button">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Post
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Post</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this scheduled post? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <Button variant="outline" className="w-full bg-transparent" onClick={handleClose}>
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Form Panel */}
                  <Card className="lg:sticky lg:top-4 h-fit lg:col-span-9">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Send className="h-5 w-5" />
                        Edit Scheduled Post
                      </CardTitle>
                      <CardDescription>Update your scheduled Google My Business post</CardDescription>
                    </CardHeader>

                    <CardContent>
                      {selectedEvent?.status == "PUBLISHED" ? <>
                         <PostPublished />
                      </> : <>
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
                                  Share updates, promotions, or news about your business. Use the magic wand to enhance
                                  your content!
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="scheduled"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="font-bold">Scheduled Date & Time</FormLabel>
                                <FormControl>
                                  <DateTimePicker field={field} />
                                </FormControl>
                                <FormDescription>
                                  When this post should be published to Google My Business
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Color Field */}
                          <FormField
                            control={form.control}
                            name="viewColor"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Event Color</FormLabel>
                                <FormControl>
                                  <div className="flex gap-2 items-center">
                                    <input
                                      type="color"
                                      value={field.value || "#3b82f6"}
                                      onChange={field.onChange}
                                      className="w-12 h-10 rounded border border-input cursor-pointer"
                                    />
                                    <Input
                                      value={field.value || "#3b82f6"}
                                      onChange={field.onChange}
                                      placeholder="#3b82f6"
                                      className="flex-1"
                                    />
                                  </div>
                                </FormControl>
                                <FormDescription>Choose a color for this event in the calendar</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Media Section */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-medium">Media</h3>
                              <Badge variant="outline">Optional</Badge>
                            </div>

                            {/* Image Upload Section */}
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
                                                {displayImageUrl && (
                                                  <div className="relative">
                                                    <img
                                                      src={displayImageUrl || "/placeholder.svg"}
                                                      alt="Preview"
                                                      className="w-16 h-16 object-cover rounded-lg"
                                                      onError={(e) => {
                                                        e.currentTarget.src = "/placeholder.svg"
                                                      }}
                                                    />
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
                                                src={watchedImageUrl || "/placeholder.svg"}
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

                          {/* Call to Action */}
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

                            {watchedActionButton &&
                              watchedActionButton !== "CALL" &&
                              watchedActionButton !== "NO_ACTION" && (
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

                          {selectedEvent?.status == "PUBLISHED" ? null : <>
                            <div className="flex justify-end">
                              <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Updating Post...
                                  </>
                                ) : (
                                  <>
                                    <Send className="mr-2 h-4 w-4" />
                                    Update Post
                                  </>
                                )}
                              </Button>
                            </div>
                          </>}

                        </form>
                      </>}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </ScrollArea>
          </div>
        </Form >
      </DialogContent >
    </Dialog >
  )
}
