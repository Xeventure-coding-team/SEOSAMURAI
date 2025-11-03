"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  CheckCircle2,
  Loader2,
  Edit,
  AlertTriangle,
  Phone,
  Globe,
  Briefcase,
  Clock,
  MessageSquare,
  Link2,
  Video,
  AlertCircle,
  FileText,
  HelpCircle,
  Plus,
  Upload,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { useGMBStore } from "@/store/gmbStore"
import { TaskActionForm } from "./task-action-form"
import toast from "react-hot-toast"
import { ACTION_TYPES } from "@/types/action-types"

interface BusinessHours {
  [key: string]: {
    open: string
    close: string
    closed: boolean
  }
}

interface SocialLinks {
  [key: string]: string
}

interface QnAItem {
  question: string
  answer: string
}

interface PostData {
  title: string
  description: string
  image_url: string
  file?: File | null
  callToAction?: string
  topicType?: string
  actionButton?: string
  actionLink?: string
  callPhone?: string
}

interface FormDataType {
  description: string
  files: File[]
  phone: string
  website: string
  services: string
  reviewsReply: string
  video: File[]
  businessHours: BusinessHours
  socialLinks: SocialLinks
  attributes: string
  qna: QnAItem[]
  post: PostData
  appointment: string,
  chatType: "whatsapp" | "sms" | ""
  chatValue: string
}


interface DescriptionAnalytics {
  wordCount: number
  characterCount: number
  readabilityScore: string
  suggestions: string[]
}

const validationHelpers = {
  phone: (value: string) => {
    if (!value.trim()) return "Phone number is required"
    const phoneRegex = /^[\d\s\-+()]{10,}$/
    if (!phoneRegex.test(value)) return "Please enter a valid phone number"
    return null
  },
  website: (value: string) => {
    if (!value.trim()) return "Website URL is required"
    try {
      new URL(value)
      return null
    } catch {
      return "Please enter a valid URL (e.g., https://example.com)"
    }
  },
  description: (value: string) => {
    if (!value.trim()) return "Description is required"
    if (value.trim().length < 10) return "Description must be at least 10 characters"
    if (value.trim().length > 5000) return "Description cannot exceed 5000 characters"
    return null
  },
  services: (value: string) => {
    if (!value.trim()) return "Services are required"
    if (value.trim().length < 5) return "Please provide at least 5 characters"
    if (value.trim().length > 2000) return "Services cannot exceed 2000 characters"
    return null
  },
  reviewsReply: (value: string) => {
    if (!value.trim()) return "Reply is required"
    if (value.trim().length < 5) return "Reply must be at least 5 characters"
    if (value.trim().length > 1000) return "Reply cannot exceed 1000 characters"
    return null
  },
  photo: (files: File[]) => {
    if (!files || files.length === 0) return "Please select a photo"
    if (files.length > 1) return "Only one photo can be uploaded"
    const maxSize = 10 * 1024 * 1024 // 10MB
    const file = files[0]
    if (!file.type.startsWith("image/")) return "File must be an image"
    if (file.size > maxSize) return "Photo cannot exceed 10MB"
    return null
  },
  video: (files: File[]) => {
    if (!files || files.length === 0) return "Please select a video"
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (files.length > 1) return "Only one video can be uploaded"
    const file = files[0]
    if (!file.type.startsWith("video/")) return "File must be a video"
    if (file.size > maxSize) return "Video cannot exceed 100MB"
    return null
  },
  hours: (businessHours: BusinessHours) => {
    for (const [day, hours] of Object.entries(businessHours)) {
      if (!hours.closed) {
        if (!hours.open || !hours.close) return `Please set hours for ${day}`
        if (hours.open >= hours.close) return `Closing time must be after opening time for ${day}`
      }
    }
    return null
  },
  links: (socialLinks: SocialLinks) => {
    for (const [platform, url] of Object.entries(socialLinks)) {
      if (url.trim()) {
        try {
          new URL(url)
        } catch {
          return `Invalid URL for ${platform}`
        }
      }
    }
    return null
  },
  attributes: (value: string) => {
    if (!value.trim()) return "Please select at least one attribute"
    try {
      const parsed = JSON.parse(value)
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return "Please select at least one attribute"
      }
      return null
    } catch {
      return "Invalid attributes format"
    }
  },
  qna: (items: QnAItem[]) => {
    if (!items || items.length === 0) return "Please add at least one Q&A pair"
    for (const item of items) {
      if (!item.question.trim()) return "All questions are required"
      if (!item.answer.trim()) return "All answers are required"
      if (item.question.trim().length < 5) return "Questions must be at least 5 characters"
      if (item.answer.trim().length < 5) return "Answers must be at least 5 characters"
    }
    return null
  },
  post: (post: PostData) => {
    if (!post.title.trim()) return "Post content is required"
    if (post.title.trim().length < 10) return "Post content must be at least 10 characters"
    return null
  },

  chat: ({ chatType, chatValue }: { chatType: string; chatValue: string }) => {
    if (!chatType) return "Please select a chat type (WhatsApp or SMS)."
    if (!chatValue.trim()) return "Chat value is required."

    if (chatType === "whatsapp") {
      // WhatsApp must start with https://wa.me/ followed by digits
      const waRegex = /^https:\/\/wa\.me\/\d+(?:\?text=.*)?$/
      if (!waRegex.test(chatValue.trim())) {
        return "Please enter a valid WhatsApp link (e.g., https://wa.me/15551234567)."
      }
    } else if (chatType === "sms") {
      // SMS must be a valid international phone number
      const smsRegex = /^\+\d{6,15}$/
      if (!smsRegex.test(chatValue.trim())) {
        return "Please enter a valid phone number (e.g., +15551234567)."
      }
    } else {
      return "Invalid chat type."
    }

    return null
  },
  
}

const TaskActionButton = ({
  task,
  locationId,
  onTaskUpdate,
  description,
  mutate,
  businessName,
  primaryCategory,
  additionalCategories,
}: any) => {
  const [isOpen, setIsOpen] = useState(false)
  const [showCautionDialog, setShowCautionDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [descriptionAnalytics, setDescriptionAnalytics] = useState<DescriptionAnalytics | null>(null)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imagePrompt, setImagePrompt] = useState("")
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [showSuccessAlert, setShowSuccessAlert] = useState(false)
  const [taskResult, setTaskResult] = useState<any>(null)

  const gmbAccountId = useGMBStore((state) => state.accountId)
  const accessToken = useGMBStore((state) => state.accessToken)

  const [formData, setFormData] = useState<FormDataType>({
    description: "",
    files: [],
    phone: "",
    website: "",
    services: "",
    reviewsReply: "",
    video: [],
    businessHours: {
      monday: { open: "09:00", close: "17:00", closed: false },
      tuesday: { open: "09:00", close: "17:00", closed: false },
      wednesday: { open: "09:00", close: "17:00", closed: false },
      thursday: { open: "09:00", close: "17:00", closed: false },
      friday: { open: "09:00", close: "17:00", closed: false },
      saturday: { open: "10:00", close: "16:00", closed: false },
      sunday: { open: "10:00", close: "16:00", closed: true },
    },
    socialLinks: {
      facebook: "",
      instagram: "",
      twitter: "",
      linkedin: "",
      youtube: "",
    },
    attributes: "",
    qna: [],
    post: {
      title: "",
      description: "",
      image_url: "",
      file: null,
      topicType: "STANDARD",
      actionButton: "NO_ACTION",
      actionLink: "",
      callPhone: "",
    },
    appointment: "",
    chatType: "",
    chatValue: "",
  })


  useEffect(() => {
    if (task.actionType === "description" && description && !formData.description) {
      setFormData((prev) => ({ ...prev, description }))
    }
  }, [task.actionType, description, formData.description])

  const validateForm = () => {
    setError(null)

    switch (task.actionType) {
      case "phone":
        return validationHelpers.phone(formData.phone)
      case "website":
        return validationHelpers.website(formData.website)
      case "description":
        return validationHelpers.description(formData.description)
      case "services":
        return validationHelpers.services(formData.services)
      case "reviews_reply":
        return validationHelpers.reviewsReply(formData.reviewsReply)
      case "photo":
        return validationHelpers.photo(formData.files)
      case "video":
        return validationHelpers.video(formData.video)
      case "hours":
        return validationHelpers.hours(formData.businessHours)
      case "links":
        return validationHelpers.links(formData.socialLinks)
      case "attributes":
        return validationHelpers.attributes(formData.attributes)
      case "qna":
        return validationHelpers.qna(formData.qna)
      case "post":
        return validationHelpers.post(formData.post)
      case "appointment":
        return validationHelpers.website((formData as any).appointment || "")
      case "chat":
        return validationHelpers.chat({
          chatType: formData.chatType,
          chatValue: formData.chatValue,
        })
      default:
        return null
    }
  }

  const enhanceDescription = async () => {
    if (!formData.description.trim()) {
      setError("Please enter a description first")
      return
    }

    setAiLoading(true)
    try {
      const response = await fetch("/api/ai/enhance-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: formData.description }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to enhance description")
      }

      const { enhancedDescription } = await response.json()
      setFormData((prev) => ({ ...prev, description: enhancedDescription }))
      setError(null)
    } catch (error) {
      console.error("Error enhancing description:", error)
      setError(error instanceof Error ? error.message : "Failed to enhance description")
    } finally {
      setAiLoading(false)
    }
  }

  const generateDescription = async () => {
    setAiLoading(true)
    try {
      const response = await fetch("/api/ai/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessContext: task.description || "business",
          businessName: businessName,
          primaryCategory: primaryCategory,
          additionalCategories: additionalCategories,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to generate description")
      }

      const { generatedDescription } = await response.json()
      setFormData((prev) => ({ ...prev, description: generatedDescription }))
      setError(null)
    } catch (error) {
      console.error("Error generating description:", error)
      setError(error instanceof Error ? error.message : "Failed to generate description")
    } finally {
      setAiLoading(false)
    }
  }

  const generateImageFromContent = async () => {
    if (!formData.post.title.trim()) {
      setError("Please enter post description first")
      return
    }

    setIsGeneratingImage(true)
    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ occasion: formData.post.title }),
      })

      const result = await response.json()
      if (result.success) {
        setFormData((prev) => ({
          ...prev,
          post: { ...prev.post, image_url: result.imageUrl },
        }))
        setError(null)
      } else {
        setError(result.message || "Failed to generate image")
      }
    } catch (err) {
      setError("Failed to generate image")
      console.error("Image generation error:", err)
    } finally {
      setIsGeneratingImage(false)
    }
  }

  const generateImage = async () => {
    if (!imagePrompt.trim()) {
      setError("Please enter a prompt for image generation")
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
        setFormData((prev) => ({
          ...prev,
          post: { ...prev.post, image_url: result.imageUrl },
        }))
        setImagePrompt("")
        setError(null)
      } else {
        setError(result.message || "Failed to generate image")
      }
    } catch (err) {
      setError("Failed to generate image")
      console.error("Image generation error:", err)
    } finally {
      setIsGeneratingImage(false)
    }
  }

  const handleSubmit = async () => {
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    try {
      const data = new FormData()
      data.append("taskId", task.id)
      data.append("locationId", locationId)
      data.append("actionType", task.actionType)

      if (task.actionType === "photo" && formData.files.length > 0) {
        formData.files.forEach((file) => {
          data.append("photos", file)
        })
      } else if (task.actionType === "video" && formData.video.length > 0) {
        data.append("videos", formData.video[0])
      } else if (task.actionType === "description") {
        data.append("description", formData.description)
      } else if (task.actionType === "phone") {
        data.append("phone", formData.phone)
      } else if (task.actionType === "website") {
        data.append("website", formData.website)
      } else if (task.actionType === "services") {
        data.append("services", formData.services)
      } else if (task.actionType === "hours") {
        data.append("businessHours", JSON.stringify(formData.businessHours))
      } else if (task.actionType === "reviews_reply") {
        data.append("reviewsReply", formData.reviewsReply)
      } else if (task.actionType === "links") {
        data.append("socialLinks", JSON.stringify(formData.socialLinks))
      } else if (task.actionType === "attributes") {
        data.append("attributes", formData.attributes)
      } else if (task.actionType === "qna") {
        data.append("qna", JSON.stringify(formData.qna))
      } else if (task.actionType === "post") {
        data.append("postTitle", formData.post.title)
        data.append("postDescription", formData.post.description)
        data.append("postImageUrl", formData.post.image_url)

        if (formData.post.file) {
          data.append("postImage", formData.post.file)
        }

        // ✅ Add new call-to-action and topicType fields
        data.append("postTopicType", formData.post.topicType || "STANDARD")
        data.append("postActionButton", formData.post.actionButton || "NO_ACTION")
        data.append("postActionLink", formData.post.actionLink || "")
        data.append("postCallPhone", formData.post.callPhone || "")
      }
      else if (task.actionType === "appointment") {
        data.append("appointment", (formData as any).appointment)
      }

      else if (task.actionType === "chat") {
        data.append("chatType", formData.chatType)
        data.append("chatValue", formData.chatValue)
      }

      let endpoint = `/api/tasks/${task.id}/verify`

      if (task.editableViaAPI) {
        endpoint = `/api/tasks/${task.id}/dynamic?gmbAccountId=${encodeURIComponent(
          gmbAccountId,
        )}&accessToken=${encodeURIComponent(accessToken)}`
      }

      const response = await fetch(endpoint, {
        method: "POST",
        body: data,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.details || errorData.message || "Failed to complete task")
      }

      const result = await response.json()

      if (result.gmbUpdated && result.gmbUpdateNote) {
        toast.success(
          (t) => (
            <div className="flex flex-col gap-2">
              <div className="font-semibold">Task Completed! 🎉</div>
              <div className="text-sm text-muted-foreground">
                +{result.pointsAwarded} points
                {result.leveledUp && ` • Level ${result.newLevel}!`}
              </div>
            </div>
          ),
          {
            duration: 5000,
          },
        )

        setTimeout(() => {
          toast(result.gmbUpdateNote, {
            icon: "ℹ️",
            duration: 6000,
            style: {
              background: "#3b82f6",
              color: "#fff",
            },
          })
        }, 500)
      } else {
        toast.success(
          (t) => (
            <div className="flex flex-col gap-2">
              <div className="font-semibold">Task Completed Successfully! 🎉</div>
              <div className="text-sm">
                +{result.pointsAwarded} points
                {result.leveledUp && ` • Leveled up to ${result.newLevel}!`}
                {result.newStreak > 1 && ` • ${result.newStreak} day streak! 🔥`}
              </div>
              {result.newMilestones?.length > 0 && (
                <div className="text-xs text-muted-foreground">🏆 New milestone unlocked!</div>
              )}
            </div>
          ),
          {
            duration: 5000,
            position: "top-center",
          },
        )
      }

      setTaskResult(result)
      setShowSuccessAlert(true)

      setIsOpen(false)
      setFormData({
        description: "",
        files: [],
        phone: "",
        website: "",
        services: "",
        reviewsReply: "",
        video: [],
        businessHours: {
          monday: { open: "09:00", close: "17:00", closed: false },
          tuesday: { open: "09:00", close: "17:00", closed: false },
          wednesday: { open: "09:00", close: "17:00", closed: false },
          thursday: { open: "09:00", close: "17:00", closed: false },
          friday: { open: "09:00", close: "17:00", closed: false },
          saturday: { open: "10:00", close: "16:00", closed: false },
          sunday: { open: "10:00", close: "16:00", closed: true },
        },
        socialLinks: {
          facebook: "",
          instagram: "",
          twitter: "",
          linkedin: "",
          youtube: "",
        },
        attributes: "",
        qna: [],
        post: {
          title: "",
          description: "",
          image_url: "",
          file: null,
        },
        appointment: "",
        chatType: "",
        chatValue: "",
      })
      setError(null)
      setDescriptionAnalytics(null)
      setShowAnalytics(false)
      setPreviewUrl(null)
      onTaskUpdate?.()
    } catch (error) {
      console.error("Error completing task:", error)
      setError(error instanceof Error ? error.message : "Failed to complete task. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteClick = () => {
    if (task.caution) {
      setShowCautionDialog(true)
    } else if (task.editableViaAPI) {
      setIsOpen(true)
    } else {
      handleManualVerification()
    }
  }

  const handleManualVerification = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/tasks/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          locationId: locationId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to verify task")
      }

      onTaskUpdate?.()
    } catch (error) {
      console.error("Error verifying task:", error)
      alert(error instanceof Error ? error.message : "Failed to verify task. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const proceedAfterCaution = () => {
    setShowCautionDialog(false)
    if (task.editableViaAPI) {
      setIsOpen(true)
    } else {
      handleManualVerification()
    }
  }

  const getButtonIcon = () => {
    const config = ACTION_TYPES[task.actionType]
    if (!config) return <CheckCircle2 className="w-4 h-4" />

    const iconMap: Record<string, React.ReactNode> = {
      Upload: <Upload className="w-4 h-4" />,
      Video: <Video className="w-4 h-4" />,
      Edit: <Edit className="w-4 h-4" />,
      Phone: <Phone className="w-4 h-4" />,
      Globe: <Globe className="w-4 h-4" />,
      Briefcase: <Briefcase className="w-4 h-4" />,
      Clock: <Clock className="w-4 h-4" />,
      MessageSquare: <MessageSquare className="w-4 h-4" />,
      Link2: <Link2 className="w-4 h-4" />,
      FileText: <FileText className="w-4 h-4" />,
      HelpCircle: <HelpCircle className="w-4 h-4" />,
      Plus: <Plus className="w-4 h-4" />,
    }

    return iconMap[config.icon] || <CheckCircle2 className="w-4 h-4" />
  }

  const getButtonText = () => {
    if (!task.editableViaAPI) return "Verify"
    const config = ACTION_TYPES[task.actionType]
    return config?.label || "Complete"
  }

  return (
    <>
      {showSuccessAlert && taskResult && (
        <AlertDialog open={showSuccessAlert} onOpenChange={setShowSuccessAlert}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <span className="text-2xl">🎉</span>
                Task Completed!
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4 pt-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-green-900 dark:text-green-100">Points Earned</div>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        +{taskResult.pointsAwarded}
                      </div>
                    </div>
                    {taskResult.leveledUp && (
                      <div className="text-right">
                        <div className="text-sm font-medium text-green-900 dark:text-green-100">Level Up!</div>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          Level {taskResult.newLevel}
                        </div>
                      </div>
                    )}
                  </div>

                  {taskResult.newStreak > 1 && (
                    <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                      <span className="text-2xl">🔥</span>
                      <div>
                        <div className="text-sm font-medium text-orange-900 dark:text-orange-100">Streak Active</div>
                        <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                          {taskResult.newStreak} Days
                        </div>
                      </div>
                    </div>
                  )}

                  {taskResult.newMilestones && taskResult.newMilestones.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium flex items-center gap-2">
                        <span className="text-xl">🏆</span>
                        New Milestones Unlocked
                      </div>
                      {taskResult.newMilestones.map((milestone: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-2 bg-purple-50 dark:bg-purple-950 rounded border border-purple-200 dark:border-purple-800"
                        >
                          <div className="text-sm font-medium text-purple-900 dark:text-purple-100">
                            {milestone.name}
                          </div>
                          <div className="text-xs text-purple-600 dark:text-purple-400">{milestone.description}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {taskResult.newAchievements && taskResult.newAchievements.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium flex items-center gap-2">
                        <span className="text-xl">🎖️</span>
                        New Achievements
                      </div>
                      {taskResult.newAchievements.map((achievement: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-2 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800"
                        >
                          <div className="text-sm font-medium text-blue-900 dark:text-blue-100">{achievement.name}</div>
                          <div className="text-xs text-blue-600 dark:text-blue-400">{achievement.description}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {taskResult.gmbUpdated && taskResult.gmbUpdateNote && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-start gap-2">
                        <span className="text-lg mt-0.5">ℹ️</span>
                        <div>
                          <div className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                            Google My Business Update
                          </div>
                          <div className="text-xs text-blue-700 dark:text-blue-300">{taskResult.gmbUpdateNote}</div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction
                onClick={() => {
                  setShowSuccessAlert(false)
                  setTaskResult(null)
                  mutate()
                }}
              >
                Awesome!
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <Button size="sm" onClick={handleCompleteClick} disabled={loading} className="flex-1 gap-2">
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            {getButtonIcon()}
            {getButtonText()}
          </>
        )}
      </Button>

      <Dialog open={showCautionDialog} onOpenChange={setShowCautionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Important Notice
            </DialogTitle>
          </DialogHeader>
          <Alert>
            <AlertDescription>{task.caution}</AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCautionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={proceedAfterCaution}>Proceed</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{task.title}</DialogTitle>
            <DialogDescription>{task.description}</DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {error && (
              <div className="mb-4">
                <Alert variant="destructive">
                  <AlertCircle />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </div>
            )}
            <TaskActionForm
              actionType={task.actionType}
              formData={formData}
              setFormData={setFormData}
              error={error}
              setError={setError}
              aiLoading={aiLoading}
              descriptionAnalytics={descriptionAnalytics}
              showAnalytics={showAnalytics}
              setShowAnalytics={setShowAnalytics}
              dragActive={dragActive}
              setDragActive={setDragActive}
              previewUrl={previewUrl}
              setPreviewUrl={setPreviewUrl}
              imagePrompt={imagePrompt}
              setImagePrompt={setImagePrompt}
              isGeneratingImage={isGeneratingImage}
              businessName={businessName}
              primaryCategory={primaryCategory}
              additionalCategories={additionalCategories}
              onEnhanceDescription={enhanceDescription}
              onGenerateDescription={generateDescription}
              onGenerateImageFromContent={generateImageFromContent}
              onGenerateImage={generateImage}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading || !!error}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default TaskActionButton
