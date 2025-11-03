"use client"

import React from "react"
import { useState, useRef, useCallback } from "react"
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
  Plus,
  Trash2,
  Eye,
  Wand2,
  Clock,
  FileText,
  CalendarCheck,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useGmbPosts, type CreatePostData } from "@/hooks/useGmbPosts"
import toast from "react-hot-toast"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "../ui/scroll-area"
import { TooltipContent, TooltipTrigger, Tooltip } from "../ui/tooltip"

interface GmbPostFormProps {
  isOpen: boolean
  onClose: () => void
  accountId?: string | null
  locationId?: string | null
  accessToken?: string | null
  enableBulkPosting?: boolean
  onPostCreated?: (post: any) => void
  businessName: string
}

interface BulkPostData {
  id: string
  postContent: string
  actionButton?: string
  actionLink?: string
  callPhone?: string
  image_url?: string
  file?: File
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

export function GmbPostForm({
  isOpen,
  onClose,
  accountId,
  locationId,
  accessToken,
  enableBulkPosting = false,
  onPostCreated,
  businessName,
}: GmbPostFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [imagePrompt, setImagePrompt] = useState("")
  const [bulkPosts, setBulkPosts] = useState<BulkPostData[]>([])
  const [activeTab, setActiveTab] = useState("single")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { createPost, loading } = useGmbPosts()

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

  const displayImageUrl = previewUrl || form.watch("image_url")
  const watchedImageUrl = form.watch("image_url")

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
    alert("starting")
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

  const addBulkPost = () => {
    const newPost: BulkPostData = {
      id: Date.now().toString(),
      postContent: "",
      actionButton: "NO_ACTION",
    }
    setBulkPosts([...bulkPosts, newPost])
  }

  const removeBulkPost = (id: string) => {
    setBulkPosts(bulkPosts.filter((post) => post.id !== id))
  }

  const updateBulkPost = (id: string, field: keyof BulkPostData, value: any) => {
    setBulkPosts(bulkPosts.map((post) => (post.id === id ? { ...post, [field]: value } : post)))
  }

  const duplicatePost = (post: BulkPostData) => {
    const duplicated = { ...post, id: Date.now().toString() }
    setBulkPosts([...bulkPosts, duplicated])
  }

  const createBulkPosts = async () => {
    if (!accountId || !locationId || !accessToken) {
      toast.error("Missing account credentials")
      return
    }

    const validPosts = bulkPosts.filter((post) => post.postContent.trim())
    if (validPosts.length === 0) {
      toast.error("Please add at least one post with content")
      return
    }

    let successCount = 0
    let failCount = 0

    for (const post of validPosts) {
      try {
        const postData: CreatePostData = {
          postContent: post.postContent,
          actionButton: post.actionButton || null,
          actionLink: post.actionLink || null,
          callPhone: post.callPhone || null,
          account: accountId,
          location: locationId,
          accessToken: accessToken,
          image_url: post.image_url || undefined,
          file: post.file || undefined,
        }

        const result = await createPost(postData)
        if (result.success) {
          successCount++
          onPostCreated?.(result.data)
        } else {
          failCount++
        }
      } catch (error) {
        failCount++
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully created ${successCount} posts`)
      setBulkPosts([])
    }
    if (failCount > 0) {
      toast.error(`Failed to create ${failCount} posts`)
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
    if (!accountId || !locationId || !accessToken) {
      toast.error("Missing account credentials")
      return
    }

    try {
      const postData: CreatePostData = {
        postContent: data.postContent,
        actionButton: data.actionButton || null,
        actionLink: data.actionLink || null,
        callPhone: data.callPhone || null,
        account: accountId,
        location: locationId,
        accessToken: accessToken,
        image_url: data.image_url || undefined,
        file: selectedFile || undefined,
      }

      const result = await createPost(postData)

      if (result.success) {
        toast.success("Post created successfully!")
        form.reset()
        removeFile()
        onPostCreated?.(result.data)
      } else {
        toast.error(result.message || "Failed to create post")
      }
    } catch (error) {
      toast.error("An error occurred while creating the post")
      console.error("Post creation error:", error)
    }
  }

  const watchedActionButton = form.watch("actionButton")?.toUpperCase()
  const characterCount = form.watch("postContent")?.length || 0
  const watchedPostContent = form.watch("postContent")

  const getActionButtonInfo = (actionType: string) => {
    const option = actionButtonOptions.find((opt) => opt.value === actionType.toLocaleLowerCase())

    return option || { label: "No Action", icon: Send }
  }

  const handleBulkSubmit = async () => {
    setIsSubmitting(true)
    try {
      // Validate bulk posts
      const validPosts = bulkPosts.filter((post) => post.postContent.trim())
      if (validPosts.length === 0) {
        toast.error("Please add at least one post with content")
        return
      }

      // Create posts
      let successCount = 0
      let failCount = 0

      for (const post of validPosts) {
        try {
          const postData: CreatePostData = {
            postContent: post.postContent,
            actionButton: post.actionButton || null,
            actionLink: post.actionLink || null,
            callPhone: post.callPhone || null,
            account: accountId ?? null,
            location: locationId ?? null,
            accessToken: accessToken ?? null,
            image_url: post.image_url || undefined,
            file: post.file || undefined,
          }


          const result = await createPost(postData)
          if (result.success) {
            successCount++
            onPostCreated?.(result.data)
          } else {
            failCount++
          }
        } catch (error) {
          failCount++
        }
      }

      // Show toast messages
      if (successCount > 0) {
        toast.success(`Successfully created ${successCount} posts`)
        setBulkPosts([])
      }
      if (failCount > 0) {
        toast.error(`Failed to create ${failCount} posts`)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
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
            <Plus className="h-5 w-5" />
            Create New GMB Post
          </DialogTitle>
          <DialogDescription>
            Publish updates, offers, or events to your Google Business Profile and engage with customers.
          </DialogDescription>
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
                  <CardDescription>See how your post will appear on Google My Business</CardDescription>
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
                    <Send className="h-5 w-5" />
                    {enableBulkPosting ? "GMB Post Manager" : "Create GMB Post"}
                  </CardTitle>
                  <CardDescription>
                    {enableBulkPosting
                      ? "Create single posts or manage bulk posting campaigns for your Google My Business listing"
                      : "Create engaging posts for your Google My Business listing"}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  {enableBulkPosting ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold">Bulk Post Creation</h3>
                          <p className="text-sm text-muted-foreground">Create multiple posts at once</p>
                        </div>
                        <Button onClick={addBulkPost} variant="outline">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Post
                        </Button>
                      </div>

                      {bulkPosts.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                          <p className="text-muted-foreground">No posts created yet. Click "Add Post" to get started.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {bulkPosts.map((post, index) => (
                            <Card key={index} className="p-4">
                              <div className="flex items-start justify-between mb-4">
                                <h4 className="font-medium">Post {index + 1}</h4>
                                <Button
                                  onClick={() => removeBulkPost(String(index))}
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>

                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor={`content-${index}`}>Post Content</Label>
                                  <Textarea
                                    id={`content-${index}`}
                                    value={post.postContent}
                                    onChange={(e) => updateBulkPost(post.id, "postContent", e.target.value)}
                                    placeholder="What's happening at your business?"
                                    className="min-h-[100px]"
                                  />
                                </div>

                                <div>
                                  <Label>Image</Label>
                                  <Tabs defaultValue="url" className="w-full">
                                    <TabsList className="grid w-full grid-cols-2">
                                      <TabsTrigger value="upload">Upload</TabsTrigger>
                                      <TabsTrigger value="url">URL</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="upload" className="space-y-4">
                                      <div
                                        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
                                          }`}
                                        onDragEnter={(e) => {
                                          e.preventDefault()
                                          setDragActive(true)
                                        }}
                                        onDragLeave={(e) => {
                                          e.preventDefault()
                                          setDragActive(false)
                                        }}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={(e) => {
                                          e.preventDefault()
                                          setDragActive(false)
                                          const files = Array.from(e.dataTransfer.files)
                                          if (files.length > 0 && files[0].type.startsWith("image/")) {
                                            const file = files[0]
                                            const url = URL.createObjectURL(file)
                                            updateBulkPost(post.id, "file", file)
                                            updateBulkPost(post.id, "image_url", url)
                                          }
                                        }}
                                      >
                                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                        <p className="text-sm text-muted-foreground mb-2">
                                          Drag and drop an image here, or click to select
                                        </p>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          onClick={() => {
                                            const input = document.createElement("input")
                                            input.type = "file"
                                            input.accept = "image/*"
                                            input.onchange = (e) => {
                                              const file = (e.target as HTMLInputElement).files?.[0]
                                              if (file) {
                                                const url = URL.createObjectURL(file)
                                                updateBulkPost(post.id, "file", file)
                                                updateBulkPost(post.id, "image_url", url)
                                              }
                                            }
                                            input.click()
                                          }}
                                        >
                                          Select Image
                                        </Button>
                                      </div>
                                    </TabsContent>

                                    <TabsContent value="url" className="space-y-4">
                                      <div>
                                        <Input
                                          placeholder="Enter image URL"
                                          value={post.image_url || ""}
                                          onChange={(e) => updateBulkPost(post.id, "image_url", e.target.value)}
                                        />
                                      </div>
                                    </TabsContent>
                                  </Tabs>

                                  {post.image_url && (
                                    <div className="mt-4">
                                      <img
                                        src={post.image_url || "/placeholder.svg"}
                                        alt="Post preview"
                                        className="w-full max-w-sm rounded-lg object-cover"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement
                                          target.src = "/image-preview-concept.png"
                                        }}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </Card>
                          ))}

                          <Button
                            onClick={handleBulkSubmit}
                            disabled={isSubmitting || bulkPosts.length === 0}
                            className="w-full"
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Creating Posts...
                              </>
                            ) : (
                              <>
                                <Send className="h-4 w-4 mr-2" />
                                Create All Posts ({bulkPosts.length})
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
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
                                Share updates, promotions, or news about your business. Use the magic wand to generate an
                                image from your content!
                              </FormDescription>
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
                                        {/* File Upload Area */}
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

                        <Button type="submit" className="w-full" disabled={loading}>
                          {loading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating Post...
                            </>
                          ) : (
                            <>
                              <Send className="mr-2 h-4 w-4" />
                              Create Post
                            </>
                          )}
                        </Button>
                      </form>
                    </Form>
                  )}
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
