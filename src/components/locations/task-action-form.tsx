"use client"

import type React from "react"
import { Upload, Loader2, Wand2, BarChart3, Clock, X, ExternalLink, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import ServicesTextareaAutocomplete from "../tasks/services-autocomplete"
import { ChatActionForm } from "../tasks/ChatActionForm"

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
  chatType: "whatsapp" | "sms" | ""
  chatValue: string
}

interface DescriptionAnalytics {
  wordCount: number
  characterCount: number
  readabilityScore: string
  suggestions: string[]
}

interface TaskActionFormProps {
  actionType: string
  formData: FormDataType
  setFormData: React.Dispatch<React.SetStateAction<FormDataType>>
  error: string | null
  setError: (error: string | null) => void
  aiLoading: boolean
  descriptionAnalytics: DescriptionAnalytics | null
  showAnalytics: boolean
  setShowAnalytics: (show: boolean) => void
  dragActive: boolean
  setDragActive: (active: boolean) => void
  previewUrl: string | null
  setPreviewUrl: (url: string | null) => void
  imagePrompt: string
  setImagePrompt: (prompt: string) => void
  isGeneratingImage: boolean
  businessName: string
  primaryCategory: string
  additionalCategories: string
  onEnhanceDescription: () => Promise<void>
  onGenerateDescription: () => Promise<void>
  onGenerateImageFromContent: () => Promise<void>
  onGenerateImage: () => Promise<void>
}

const actionButtonOptions = [
  { value: "LEARN_MORE", label: "Learn More", icon: ExternalLink },
  { value: "BOOK_NOW", label: "Book Now", icon: ExternalLink },
  { value: "SHOP_NOW", label: "Shop Now", icon: ExternalLink },
  { value: "CALL", label: "Call", icon: Phone },
  { value: "CONTACT", label: "Contact", icon: ExternalLink },
]

export const TaskActionForm = ({
  actionType,
  formData,
  setFormData,
  setError,
  aiLoading,
  descriptionAnalytics,
  showAnalytics,
  dragActive,
  setDragActive,
  previewUrl,
  setPreviewUrl,
  imagePrompt,
  setImagePrompt,
  isGeneratingImage,
  onEnhanceDescription,
  onGenerateDescription,
  onGenerateImageFromContent,
  onGenerateImage,
}: TaskActionFormProps) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setFormData({ ...formData, files: [files[0]] })
    }
    setError(null)
  }

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setFormData({ ...formData, video: files })
    setError(null)
  }

  const handleHoursChange = (day: string, field: string, value: string | boolean) => {
    setFormData({
      ...formData,
      businessHours: {
        ...formData.businessHours,
        [day]: {
          ...formData.businessHours[day],
          [field]: value,
        },
      },
    })
    setError(null)
  }

  const handleSocialLinkChange = (platform: string, value: string) => {
    setFormData({
      ...formData,
      socialLinks: {
        ...formData.socialLinks,
        [platform]: value,
      },
    })
    setError(null)
  }

  const handleQnAChange = (index: number, field: "question" | "answer", value: string) => {
    const newQna = [...formData.qna]
    newQna[index] = { ...newQna[index], [field]: value }
    setFormData({ ...formData, qna: newQna })
    setError(null)
  }

  const addQnAItem = () => {
    setFormData({
      ...formData,
      qna: [...formData.qna, { question: "", answer: "" }],
    })
  }

  const removeQnAItem = (index: number) => {
    setFormData({
      ...formData,
      qna: formData.qna.filter((_, i) => i !== index),
    })
  }

  const handlePostImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      const file = files[0]
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setFormData({
        ...formData,
        post: { ...formData.post, file, image_url: "" },
      })
    }
  }

  const handlePostImageDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file)
        setPreviewUrl(url)
        setFormData({
          ...formData,
          post: { ...formData.post, file, image_url: "" },
        })
      }
    }
  }

  const removePostImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    setFormData({
      ...formData,
      post: { ...formData.post, file: null, image_url: "" },
    })
  }

  switch (actionType) {
    case "photo":
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="photo-upload">Upload Photo</Label>
            <p className="text-xs text-muted-foreground mb-2">Max 1 photo, 10MB (JPG, PNG, WebP)</p>
            <Input id="photo-upload" type="file" accept="image/*" onChange={handleFileChange} className="mt-2" />
            {formData.files.length > 0 && (
              <p className="text-sm text-muted-foreground mt-2">{formData.files[0].name} selected</p>
            )}
          </div>
        </div>
      )

    case "video":
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="video-upload">Upload Video</Label>
            <p className="text-xs text-muted-foreground mb-2">MP4, WebM, or OGG format (max 40MB)</p>
            <Input id="video-upload" type="file" accept="video/*" onChange={handleVideoChange} className="mt-2" />
            {formData.video.length > 0 && (
              <p className="text-sm text-muted-foreground mt-2">{formData.video[0].name} selected</p>
            )}
          </div>
        </div>
      )

    case "description":
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="description">Business Description</Label>
            <p className="text-xs text-muted-foreground mb-2">10–750 characters</p>

            <Textarea
              id="description"
              placeholder="Enter your business description..."
              value={formData.description}
              onChange={(e) => {
                const value = e.target.value
                if (value.length <= 750) {
                  setFormData({ ...formData, description: value })
                  setError(null)
                }
              }}
              className={`mt-2 min-h-[120px] ${formData.description.length < 10 || formData.description.length > 750
                ? "border-red-500 focus-visible:ring-red-500"
                : ""
                }`}
            />

            <p
              className={`text-xs mt-1 ${formData.description.length > 750 ? "text-red-500" : "text-muted-foreground"}`}
            >
              {formData.description.length}/750
            </p>

            {formData.description.length > 750 && (
              <p className="text-xs text-red-500 mt-1">Description cannot exceed 750 characters.</p>
            )}

            {formData.description.length > 0 && formData.description.length < 10 && (
              <p className="text-xs text-red-500 mt-1">Description should be at least 10 characters.</p>
            )}

            <div className="flex gap-2 mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onEnhanceDescription}
                disabled={aiLoading || !formData.description.trim()}
                className="gap-2 bg-transparent"
              >
                <Wand2 className="w-4 h-4" />
                {aiLoading ? "Enhancing..." : "Enhance"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onGenerateDescription}
                disabled={aiLoading}
                className="gap-2 bg-transparent"
              >
                <Wand2 className="w-4 h-4" />
                {aiLoading ? "Generating..." : "Generate"}
              </Button>
            </div>

            {showAnalytics && descriptionAnalytics && (
              <Alert className="mt-4 border-blue-200 bg-blue-50">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <div className="space-y-2">
                    <p className="font-semibold">Description Analytics</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-medium">Words:</span> {descriptionAnalytics.wordCount}
                      </div>
                      <div>
                        <span className="font-medium">Characters:</span> {descriptionAnalytics.characterCount}
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium">Readability:</span> {descriptionAnalytics.readabilityScore}
                      </div>
                    </div>
                    {descriptionAnalytics.suggestions.length > 0 && (
                      <div>
                        <p className="font-medium mb-1">Suggestions:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {descriptionAnalytics.suggestions.map((suggestion, idx) => (
                            <li key={idx} className="text-sm">
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      )

    case "phone":
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={formData.phone}
              onChange={(e) => {
                setFormData({ ...formData, phone: e.target.value })
                setError(null)
              }}
              className="mt-2"
            />
          </div>
        </div>
      )

    case "website":
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="website">Website URL</Label>
            <Input
              id="website"
              type="url"
              placeholder="https://www.example.com"
              value={formData.website}
              onChange={(e) => {
                setFormData({ ...formData, website: e.target.value })
                setError(null)
              }}
              className="mt-2"
            />
          </div>
        </div>
      )

    case "services":
      return (
        <div className="space-y-4">
          <ServicesTextareaAutocomplete
            value={formData.services}
            onChange={(value) => setFormData({ ...formData, services: value })}
          />
        </div>
      )

    case "hours":
      return (
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Business Hours
            </h3>
            <p className="text-xs text-muted-foreground">Set your business hours for each day</p>
          </div>
          <div className="space-y-3">
            {Object.entries(formData.businessHours).map(([day, hours]) => (
              <div
                key={day}
                className="flex items-center gap-3 p-3 bg-background border rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="w-20 capitalize font-medium text-sm">{day}</div>
                <div className="flex-1 flex items-center gap-2">
                  <Input
                    type="time"
                    value={hours.open}
                    onChange={(e) => handleHoursChange(day, "open", e.target.value)}
                    disabled={hours.closed}
                    className="w-20 text-sm"
                  />
                  <span className="text-muted-foreground text-sm">to</span>
                  <Input
                    type="time"
                    value={hours.close}
                    onChange={(e) => handleHoursChange(day, "close", e.target.value)}
                    disabled={hours.closed}
                    className="w-20 text-sm"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={hours.closed}
                    onChange={(e) => handleHoursChange(day, "closed", e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Closed</span>
                </label>
              </div>
            ))}
          </div>
        </div>
      )

    case "reviews_reply":
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="reviews-reply">Reply to Review</Label>
            <p className="text-xs text-muted-foreground mb-2">5-1000 characters, professional tone recommended</p>
            <Textarea
              id="reviews-reply"
              placeholder="Write your response to the review..."
              value={formData.reviewsReply}
              onChange={(e) => {
                setFormData({ ...formData, reviewsReply: e.target.value })
                setError(null)
              }}
              className="mt-2 min-h-[120px]"
            />
            <p className="text-xs text-muted-foreground mt-1">{formData.reviewsReply.length}/1000</p>
          </div>
        </div>
      )

    case "qna":
      return (
        <div className="space-y-4">
          <div>
            <Label>Q&A Pairs</Label>
            <p className="text-xs text-muted-foreground mb-4">Add frequently asked questions and answers</p>
            <div className="space-y-4">
              {formData.qna.map((item, index) => (
                <div key={index} className="space-y-2 p-3 border rounded-lg">
                  <Input
                    placeholder="Question..."
                    value={item.question}
                    onChange={(e) => handleQnAChange(index, "question", e.target.value)}
                  />
                  <Textarea
                    placeholder="Answer..."
                    value={item.answer}
                    onChange={(e) => handleQnAChange(index, "answer", e.target.value)}
                    className="min-h-[80px]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeQnAItem(index)}
                    className="w-full"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" onClick={addQnAItem} className="w-full mt-4 bg-transparent">
              Add Q&A Pair
            </Button>
          </div>
        </div>
      )

    case "post":
      return (
        <div className="space-y-6">
          {/* Post Content */}
          <div>
            <Label htmlFor="post-title">Post Content</Label>
            <Textarea
              id="post-title"
              placeholder="Enter post content..."
              value={formData.post.title}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  post: { ...formData.post, title: e.target.value },
                })
                setError(null)
              }}
              className="mt-2"
              rows={3}
            />
          </div>

          {/* Image Upload / URL / AI Generate */}
          <div>
            <Label>Post Image</Label>
            <Tabs defaultValue="upload" className="w-full mt-2">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="upload">Upload</TabsTrigger>
                <TabsTrigger value="url">URL</TabsTrigger>
                <TabsTrigger value="ai">AI Generate</TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-4">
                <div
                  className={`border-2 border-dashed rounded-lg p-6 transition-colors ${dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
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
                  onDrop={handlePostImageDrop}
                >
                  {previewUrl ? (
                    <div className="flex items-center gap-4">
                      <img
                        src={previewUrl || "/placeholder.svg"}
                        alt="Preview"
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Image selected</p>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={removePostImage}>
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
                          onClick={() => document.getElementById("post-image-upload")?.click()}
                        >
                          browse
                        </button>
                      </p>
                      <p className="text-xs text-muted-foreground">PNG, JPG, WebP up to 10MB</p>
                      <input
                        id="post-image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handlePostImageChange}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="url" className="space-y-4">
                <Input
                  placeholder="https://example.com/image.jpg"
                  value={formData.post.image_url}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      post: { ...formData.post, image_url: e.target.value },
                    })
                  }}
                />
              </TabsContent>

              <TabsContent value="ai" className="space-y-4">
                <div className="space-y-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onGenerateImageFromContent}
                    disabled={isGeneratingImage || !formData.post.title.trim()}
                    className="w-full gap-2 bg-transparent"
                  >
                    {isGeneratingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    Generate from Description
                  </Button>

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
                      placeholder="Describe the image..."
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      disabled={isGeneratingImage}
                    />
                    <Button type="button" onClick={onGenerateImage} disabled={isGeneratingImage || !imagePrompt.trim()}>
                      {isGeneratingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {(previewUrl || formData.post.image_url) && (
              <div className="mt-4">
                <img
                  src={previewUrl || formData.post.image_url}
                  alt="Post preview"
                  className="w-full max-w-xs h-40 rounded-lg object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = "/placeholder.svg"
                  }}
                />
              </div>
            )}
          </div>

          {/* Call to Action */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Call to Action</h3>

            <div>
              <Label htmlFor="action-button">Action Button</Label>
              <Select
                value={formData.post.actionButton || "NO_ACTION"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    post: { ...formData.post, actionButton: value },
                  })
                }
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select an action" />
                </SelectTrigger>
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
            </div>

            {/* Action Link / Phone */}
            {formData.post.actionButton &&
              formData.post.actionButton !== "CALL" &&
              formData.post.actionButton !== "NO_ACTION" && (
                <div>
                  <Label htmlFor="action-link" className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Action Link
                  </Label>
                  <Input
                    id="action-link"
                    placeholder="https://your-website.com"
                    value={formData.post.actionLink || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        post: { ...formData.post, actionLink: e.target.value },
                      })
                    }
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    URL users will be directed to when they click the action button
                  </p>
                </div>
              )}

            {formData.post.actionButton === "CALL" && (
              <div>
                <Label htmlFor="call-phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Number
                </Label>
                <Input
                  id="call-phone"
                  placeholder="+1234567890"
                  value={formData.post.callPhone || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      post: { ...formData.post, callPhone: e.target.value },
                    })
                  }
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Phone number users can call when they click the action button
                </p>
              </div>
            )}
          </div>
        </div>
      )

    case "appointment":
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="appointment-link">Appointment Link</Label>
            <p className="text-xs text-muted-foreground mb-2 mt-2">
              Add your online booking or appointment link (e.g., Calendly, Booksy, etc.)
            </p>
            <Input
              id="appointment-link"
              type="url"
              placeholder="https://your-booking-link.com"
              value={(formData as any).appointment || ""}
              onChange={(e) => {
                setFormData({ ...formData, appointment: e.target.value } as any)
                setError(null)
              }}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Ensure the link directs to a valid and secure booking page.
            </p>
          </div>
        </div>
      )

    case "chat":
      return (
        <ChatActionForm formData={formData} setFormData={setFormData} />
      )

    default:
      return (
        <p className="text-sm text-muted-foreground">
          Awesome work! Click Complete to mark this task as done and celebrate your progress—every step counts. But
          double-check everything first; finishing strong means finishing smart!
        </p>
      )
  }
}
