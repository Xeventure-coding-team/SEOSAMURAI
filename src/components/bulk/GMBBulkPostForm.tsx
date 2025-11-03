"use client"

import React from "react"
import { useState, useRef, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Upload,
  Loader2,
  Send,
  Phone,
  Calendar,
  ShoppingBag,
  BookOpen,
  UserPlus,
  Plus,
  Trash2,
  Eye,
  Copy,
  Sparkles,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { type CreatePostData, useGmbPosts } from "@/hooks/useGmbPosts"
import toast from "react-hot-toast"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface GmbPostFormProps {
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
  previewUrl?: string
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

export function GmbBulkPostForm({
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
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [bulkPosts, setBulkPosts] = useState<BulkPostData[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [enhancingPosts, setEnhancingPosts] = useState<Set<string>>(new Set())
  const [activePreview, setActivePreview] = useState<number>(0)
  const [activeForm, setActiveForm] = useState<number>(0)
  const [postingProgress, setPostingProgress] = useState<{
    current: number
    total: number
    currentPostContent: string
    errors?: string[]
  } | null>(null)

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

  const addBulkPost = () => {
    const newPost: BulkPostData = {
      id: `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      postContent: "",
      actionButton: "NO_ACTION",
    }
    setBulkPosts([...bulkPosts, newPost])
    setActiveForm(bulkPosts.length)
  }

  const removeBulkPost = (id: string) => {
    const postIndex = bulkPosts.findIndex((post) => post.id === id)
    setBulkPosts(bulkPosts.filter((post) => post.id !== id))

    if (activeForm >= bulkPosts.length - 1) {
      setActiveForm(Math.max(0, bulkPosts.length - 2))
    }
    if (postIndex <= activeForm && activeForm > 0) {
      setActiveForm(activeForm - 1)
    }
  }

  const updateBulkPost = (id: string, field: keyof BulkPostData, value: any) => {
    setBulkPosts((prevPosts) => prevPosts.map((post) => (post.id === id ? { ...post, [field]: value } : post)))
  }

  const duplicatePost = (post: BulkPostData) => {
    const duplicated = {
      ...post,
      id: `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file: undefined,
      previewUrl: undefined,
    }
    setBulkPosts([...bulkPosts, duplicated])
    setActiveForm(bulkPosts.length)
    toast.success("Post duplicated successfully")
  }

  const enhanceBulkPostContent = async (postId: string, content: string) => {
    if (!content.trim()) {
      toast.error("Please enter post content first")
      return
    }

    setEnhancingPosts((prev) => new Set([...prev, postId]))
    try {
      const response = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occasion: content,
        }),
      })

      const result = await response.json()

      if (result.success) {
        updateBulkPost(postId, "postContent", result.content)
        toast.success("Text enhanced successfully")
      } else {
        toast.error(result.message || "Failed to enhance text")
      }
    } catch (error) {
      toast.error("Failed to enhance text")
      console.error("Enhancement error:", error)
    } finally {
      setEnhancingPosts((prev) => {
        const newSet = new Set(prev)
        newSet.delete(postId)
        return newSet
      })
    }
  }

  const handleBulkFileSelect = (postId: string, file: File) => {
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

    try {
      const previewUrl = URL.createObjectURL(file)

      setBulkPosts((prevPosts) =>
        prevPosts.map((post) => (post.id === postId ? { ...post, file, previewUrl, image_url: "" } : post)),
      )

      toast.success("Image selected successfully")
    } catch (error) {
      console.error("Error creating preview URL:", error)
      toast.error("Failed to process image file")
    }
  }

  const removeBulkPostImage = (postId: string) => {
    const post = bulkPosts.find((p) => p.id === postId)
    if (post?.previewUrl) {
      URL.revokeObjectURL(post.previewUrl)
    }
    updateBulkPost(postId, "file", undefined)
    updateBulkPost(postId, "previewUrl", undefined)
    updateBulkPost(postId, "image_url", "")
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
    const option = actionButtonOptions.find((opt) => opt.value === actionType.toUpperCase())

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

      // Create posts with progress tracking
      let successCount = 0
      let failCount = 0
      const totalPosts = validPosts.length
      const errors: string[] = []

      setPostingProgress({
        current: 0,
        total: totalPosts,
        currentPostContent: validPosts[0]?.postContent.slice(0, 50) + "..." || "",
        errors: [],
      })

      for (let i = 0; i < validPosts.length; i++) {
        const post = validPosts[i]

        setPostingProgress({
          current: i + 1,
          total: totalPosts,
          currentPostContent: post.postContent.slice(0, 50) + (post.postContent.length > 50 ? "..." : ""),
          errors: errors,
        })

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
            const errorMsg = `Post ${i + 1}: ${result.message || "Failed to create"}`
            errors.push(errorMsg)
            console.error(`Failed to create post ${i + 1}:`, result.message)
          }
        } catch (error) {
          failCount++
          const errorMsg = `Post ${i + 1}: Network error`
          errors.push(errorMsg)
          console.error(`Error creating post ${i + 1}:`, error)
        }

        if (i < validPosts.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      }

      setPostingProgress({
        current: totalPosts,
        total: totalPosts,
        currentPostContent: "Completed",
        errors: errors,
      })

      // Wait a moment to show final state
      await new Promise((resolve) => setTimeout(resolve, 2000))

      setPostingProgress(null)

      // Show final results
      if (successCount > 0) {
        toast.success(`Successfully created ${successCount} post${successCount > 1 ? "s" : ""}`)
        setBulkPosts([])
        setActivePreview(0)
        setActiveForm(0)
      }
      if (failCount > 0) {
        toast.error(`Failed to create ${failCount} post${failCount > 1 ? "s" : ""}`)
      }
    } catch (error) {
      console.error("Bulk submit error:", error)
      toast.error("An error occurred during bulk posting")
      setPostingProgress(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEnhanceContent = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    await enhanceContent()
  }

  const getCurrentPreviewPost = () => {
    if (bulkPosts.length === 0) return null
    return bulkPosts[activeForm] || bulkPosts[0]
  }

  const currentPreviewPost = getCurrentPreviewPost()

  return (
    <div className="w-full mx-auto">
      {postingProgress && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full mx-4 border border-white/20 shadow-2xl">
            <div className="text-center space-y-6">
              {/* Progress Circle */}
              <div className="relative w-24 h-24 mx-auto">
                <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="none" />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke="url(#progressGradient)"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${(postingProgress.current / postingProgress.total) * 283} 283`}
                    className="transition-all duration-500 ease-out"
                  />
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {postingProgress.current}/{postingProgress.total}
                  </span>
                </div>
              </div>

              {/* Status Text */}
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-white">
                  {postingProgress.current === postingProgress.total ? "Completed!" : "Creating Posts..."}
                </h3>
                <p className="text-white/80 text-sm">
                  {postingProgress.current === postingProgress.total
                    ? "All posts processed"
                    : `Processing: ${postingProgress.currentPostContent}`}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500 ease-out relative"
                  style={{ width: `${(postingProgress.current / postingProgress.total) * 100}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                </div>
              </div>

              {/* Error Display */}
              {postingProgress.errors && postingProgress.errors.length > 0 && (
                <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <h4 className="text-red-200 font-medium mb-2 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Failed Posts ({postingProgress.errors.length})
                  </h4>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {postingProgress.errors.map((error, index) => (
                      <p key={index} className="text-red-200/80 text-xs">
                        {error}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Success/Completion Message */}
              {postingProgress.current === postingProgress.total && (
                <div className="mt-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                  <p className="text-green-200 text-sm">
                    {postingProgress.errors && postingProgress.errors.length > 0
                      ? `Completed with ${postingProgress.total - postingProgress.errors.length} successful posts`
                      : "All posts created successfully!"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <Card className="xl:col-span-4 flex flex-col">
          <CardHeader className="flex-shrink-0">
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Post Preview
              {bulkPosts.length > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {activeForm + 1} of {bulkPosts.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {bulkPosts.length > 0
                ? "Preview of the post you're currently editing"
                : "See how your post will appear on Google My Business"}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-6">
            <div className="bg-white border rounded-lg p-4 shadow-sm flex-1 min-h-0 flex flex-col">
              {/* Business Header Mockup */}
              <div className="flex items-center gap-3 mb-4 flex-shrink-0">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                  {businessName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{businessName}</h3>
                  <p className="text-sm text-gray-500">Updated post</p>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
                {currentPreviewPost?.postContent ? (
                  <div className="text-gray-900 whitespace-pre-wrap break-words">{currentPreviewPost.postContent}</div>
                ) : bulkPosts.length > 0 ? (
                  <p className="text-gray-400 italic">Post content will appear here...</p>
                ) : (
                  <p className="text-gray-400 italic">Your post content will appear here...</p>
                )}

                {(currentPreviewPost?.image_url || currentPreviewPost?.previewUrl) && (
                  <div className="rounded-lg overflow-hidden">
                    <img
                      src={currentPreviewPost.previewUrl || currentPreviewPost.image_url || "/placeholder.svg"}
                      alt="Post image"
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg"
                      }}
                    />
                  </div>
                )}

                {currentPreviewPost?.actionButton && currentPreviewPost.actionButton !== "NO_ACTION" && (
                  <div className="pt-2">
                    <div className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium">
                      {React.createElement(getActionButtonInfo(currentPreviewPost.actionButton).icon, {
                        className: "h-4 w-4 flex-shrink-0",
                      })}
                      <span className="truncate">{getActionButtonInfo(currentPreviewPost.actionButton).label}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {bulkPosts.length > 0 && (
              <div className="mt-4 p-3 bg-muted rounded-lg flex-shrink-0">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Posts:</span>
                    <span className="font-medium">{bulkPosts.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">With Images:</span>
                    <span className="font-medium">{bulkPosts.filter((p) => p.image_url || p.previewUrl).length}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-8 flex flex-col h-full">
          <CardContent className="flex-1 min-h-0">
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg mb-6 flex-shrink-0">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold">Bulk Post Creation</h3>
                  <p className="text-sm text-muted-foreground">
                    Create multiple posts at once with individual customization
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0 ml-4">
                  <Button onClick={addBulkPost} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Post
                  </Button>
                  {bulkPosts.length > 0 && (
                    <Button
                      onClick={() => {
                        setBulkPosts([])
                        setActiveForm(0)
                        toast.success("All posts cleared")
                      }}
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                    >
                      Clear All
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex-1 min-h-0">
                {bulkPosts.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center py-12 border-2 border-dashed border-muted-foreground/25 rounded-lg w-100 mx-auto">
                      <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
                        <Send className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-medium mb-2">No posts created yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Click "Add Post" to start creating your bulk posting campaign
                      </p>
                      <Button onClick={addBulkPost}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Post
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col">
                    {bulkPosts.length > 1 && (
                      <div className="flex items-center justify-between mb-4 p-3 bg-muted/50 rounded-lg flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveForm(Math.max(0, activeForm - 1))}
                          disabled={activeForm === 0}
                        >
                          Previous Form
                        </Button>
                        <div className="flex items-center gap-2">
                          <Badge variant="default">
                            Editing Post {activeForm + 1} of {bulkPosts.length}
                          </Badge>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveForm(Math.min(bulkPosts.length - 1, activeForm + 1))}
                          disabled={activeForm === bulkPosts.length - 1}
                        >
                          Next Form
                        </Button>
                      </div>
                    )}

                    <div className="flex-1 min-h-0 overflow-y-auto pr-2">
                      {bulkPosts.map((post, index) => (
                        <Card key={post.id} className={index === activeForm ? "" : "hidden"}>
                          <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <Badge variant="default">Post {index + 1}</Badge>
                                {post.postContent && (
                                  <Badge variant="outline" className="text-xs">
                                    {post.postContent.length}/1500
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Button
                                  onClick={() => duplicatePost(post)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  title="Duplicate post"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  onClick={() => removeBulkPost(post.id)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                  title="Delete post"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>

                          <CardContent className="space-y-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label htmlFor={`content-${post.id}`}>Post Content</Label>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => enhanceBulkPostContent(post.id, post.postContent)}
                                  disabled={enhancingPosts.has(post.id) || !post.postContent.trim()}
                                  className="h-8"
                                >
                                  {enhancingPosts.has(post.id) ? (
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  ) : (
                                    <Sparkles className="h-3 w-3 mr-1" />
                                  )}
                                  Enhance
                                </Button>
                              </div>
                              <Textarea
                                id={`content-${post.id}`}
                                value={post.postContent}
                                onChange={(e) => updateBulkPost(post.id, "postContent", e.target.value)}
                                placeholder="What's happening at your business?"
                                className="h-[120px] resize-none"
                                maxLength={1500}
                              />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Action Button</Label>
                                <Select
                                  value={post.actionButton || "NO_ACTION"}
                                  onValueChange={(value) => {
                                    setBulkPosts((prevPosts) =>
                                      prevPosts.map((p) =>
                                        p.id === post.id
                                          ? {
                                              ...p,
                                              actionButton: value,
                                              // Clear related fields when NO_ACTION is selected
                                              ...(value === "NO_ACTION" ? { actionLink: "", callPhone: "" } : {}),
                                            }
                                          : p,
                                      ),
                                    )
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select an action" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="NO_ACTION">No Action</SelectItem>
                                    {actionButtonOptions.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        <div className="flex items-center gap-2">
                                          <option.icon className="h-4 w-4" />
                                          {option.label}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {post.actionButton === "CALL" && (
                                <div className="space-y-2">
                                  <Label>Phone Number</Label>
                                  <Input
                                    placeholder="+1234567890"
                                    value={post.callPhone || ""}
                                    onChange={(e) => updateBulkPost(post.id, "callPhone", e.target.value)}
                                  />
                                </div>
                              )}

                              {post.actionButton &&
                                post.actionButton !== "NO_ACTION" &&
                                post.actionButton !== "CALL" && (
                                  <div className="space-y-2">
                                    <Label>Action Link</Label>
                                    <Input
                                      placeholder="https://example.com"
                                      value={post.actionLink || ""}
                                      onChange={(e) => updateBulkPost(post.id, "actionLink", e.target.value)}
                                    />
                                  </div>
                                )}
                            </div>

                            <div className="space-y-3">
                              <Label>Image</Label>
                              <Tabs defaultValue="url" className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                  <TabsTrigger value="upload">Upload File</TabsTrigger>
                                  <TabsTrigger value="url">Image URL</TabsTrigger>
                                </TabsList>

                                <TabsContent value="upload" className="space-y-3">
                                  <div
                                    className="border-2 border-dashed rounded-lg p-4 text-center transition-colors hover:border-primary/50 cursor-pointer"
                                    onClick={() => {
                                      const input = document.createElement("input")
                                      input.type = "file"
                                      input.accept = "image/jpeg,image/jpg,image/png,image/webp"
                                      input.multiple = false

                                      input.onchange = (e) => {
                                        const target = e.target as HTMLInputElement
                                        const file = target.files?.[0]
                                        if (file) {
                                          handleBulkFileSelect(post.id, file)
                                        }
                                      }

                                      input.click()
                                    }}
                                    onDragOver={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                    }}
                                    onDragEnter={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                    }}
                                    onDragLeave={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                    }}
                                    onDrop={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()

                                      const files = Array.from(e.dataTransfer.files)
                                      if (files.length > 0) {
                                        const file = files[0]
                                        if (file.type.startsWith("image/")) {
                                          handleBulkFileSelect(post.id, file)
                                        } else {
                                          toast.error("Please drop an image file")
                                        }
                                      }
                                    }}
                                  >
                                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground mb-2">
                                      Drag and drop an image here, or click to select
                                    </p>
                                    <p className="text-xs text-muted-foreground">Supports JPEG, PNG, WebP up to 10MB</p>
                                  </div>
                                </TabsContent>

                                <TabsContent value="url" className="space-y-3">
                                  <Input
                                    placeholder="Enter image URL"
                                    value={post.image_url || ""}
                                    onChange={(e) => {
                                      const url = e.target.value
                                      setBulkPosts((prevPosts) =>
                                        prevPosts.map((p) =>
                                          p.id === post.id
                                            ? {
                                                ...p,
                                                image_url: url,
                                                // Clear file and preview URL when entering image URL
                                                ...(url ? { file: undefined, previewUrl: undefined } : {}),
                                              }
                                            : p,
                                        ),
                                      )
                                    }}
                                  />
                                </TabsContent>
                              </Tabs>

                              {(post.image_url || post.previewUrl) && (
                                <div className="relative inline-block max-w-full">
                                  <img
                                    src={post.previewUrl || post.image_url || "/placeholder.svg"}
                                    alt="Post preview"
                                    className="w-full max-w-sm h-32 rounded-lg object-cover border"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement
                                      target.src = "/placeholder.svg"
                                    }}
                                  />
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    className="absolute top-2 right-2 h-8 w-8 p-0 shadow-lg"
                                    onClick={() => removeBulkPostImage(post.id)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <Card className="bg-primary/5 border-primary/20 mt-4">
                      <CardContent>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-medium">Ready to publish?</h4>
                            <p className="text-sm text-muted-foreground">
                              {bulkPosts.filter((p) => p.postContent.trim()).length} of {bulkPosts.length} posts have
                              content
                            </p>
                          </div>
                          <Button
                            onClick={handleBulkSubmit}
                            disabled={isSubmitting || bulkPosts.filter((p) => p.postContent.trim()).length === 0}
                            size="lg"
                            className="w-full sm:w-auto"
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Creating Posts...
                              </>
                            ) : (
                              <>
                                <Send className="h-4 w-4 mr-2" />
                                Create All Posts ({bulkPosts.filter((p) => p.postContent.trim()).length})
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
