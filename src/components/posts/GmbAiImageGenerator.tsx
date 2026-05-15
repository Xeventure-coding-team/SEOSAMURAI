"use client"

import React, { useState, useCallback } from "react"
import {
  Wand2,
  Loader2,
  RefreshCw,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Download,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import toast from "react-hot-toast"

// ─── Types ────────────────────────────────────────────────────────────────────

type ImageStyle = "promotional" | "minimal" | "bold" | "elegant"
type ImageSize = "1024x1024" | "1024x1792" | "1792x1024"
type ImageQuality = "low" | "medium" | "high" | "auto"

interface GmbAiImageGeneratorProps {
  // Required — passed from the parent post form
  locationId: string   // MongoDB _id of the location
  accessToken: string
  accountId: string
  postContent?: string   // pre-fill from the post textarea

  // Callback — parent sets the chosen image URL on success
  onImageGenerated: (url: string) => void
}

interface GeneratedImage {
  url: string
  revised_prompt: string | null
  prompt_used: string
  size: string
  quality: string
}

interface GenerateResponse {
  image: GeneratedImage
  meta: {
    businessName: string
    category: string
    address: string
    logoUrl: string
    coverPhotoUrl: string
    provider: string
    model: string
    defaults_used: Record<string, string | null | boolean>
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const IMAGE_STYLES: { value: ImageStyle; label: string; description: string }[] = [
  { value: "promotional", label: "Promotional", description: "Vibrant and eye-catching" },
  { value: "minimal", label: "Minimal", description: "Clean and simple" },
  { value: "bold", label: "Bold", description: "High contrast" },
  { value: "elegant", label: "Elegant", description: "Refined and polished" },
]

const IMAGE_SIZES: { value: ImageSize; label: string; aspect: string }[] = [
  { value: "1024x1024", label: "Square", aspect: "1:1" },
  { value: "1792x1024", label: "Landscape", aspect: "16:9" },
  { value: "1024x1792", label: "Portrait", aspect: "9:16" },
]

const COLOR_PRESETS = [
  { label: "Auto", value: "auto" },
  { label: "Blue & White", value: "deep blue and white with yellow accents" },
  { label: "Red & Gold", value: "warm red and golden yellow" },
  { label: "Rose Gold", value: "rose gold and soft white" },
  { label: "Electric", value: "electric blue and black" },
  { label: "Navy & Gold", value: "navy blue and gold" },
  { label: "Teal", value: "teal and clean white" },
  { label: "Purple & Silver", value: "rich purple and silver" },
  { label: "Orange & Black", value: "vibrant orange and deep black" },
  { label: "Green & Gold", value: "emerald green and gold" },
  { label: "Pink & Charcoal", value: "hot pink and charcoal gray" },
  { label: "Cyan & Navy", value: "bright cyan and navy blue" },
  { label: "Coral & Cream", value: "coral and soft cream" },
]

const LANGUAGES = [
  "English",
  "Hindi",
  "Malayalam",
  "Tamil",
  "Telugu",
  "Kannada",
  "Marathi",
  "Gujarati",
  "Bengali",
  "Punjabi",
  "Urdu",
  "Arabic",
  "Spanish",
  "French",
]

// ─── Component ────────────────────────────────────────────────────────────────

export function GmbAiImageGenerator({
  locationId,
  accessToken,
  accountId,
  postContent = "",
  onImageGenerated,
}: GmbAiImageGeneratorProps) {
  // ── Form state ──────────────────────────────────────────────────────────────
  const [topic, setTopic] = useState(postContent)
  const [style, setStyle] = useState<ImageStyle>("promotional")
  const [size, setSize] = useState<ImageSize>("1024x1024")
  const [quality, setQuality] = useState<ImageQuality>("medium")
  const [language, setLanguage] = useState("English")
  const [colorPreset, setColorPreset] = useState("auto")
  const [customColor, setCustomColor] = useState("")
  const [ctaText, setCtaText] = useState("")
  const [instructions, setInstructions] = useState("")
  const [includeLogo, setIncludeLogo] = useState(true)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // ── Result state ────────────────────────────────────────────────────────────
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<GenerateResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  // ── Derived ─────────────────────────────────────────────────────────────────
  const effectiveColor = customColor.trim() || (colorPreset !== "auto" ? colorPreset : undefined)
  const topicCharCount = topic.length
  const instructionsCharCount = instructions.length
  const TOPIC_CHAR_LIMIT = 100
  const INSTRUCTIONS_CHAR_LIMIT = 200

  // ── Generate ─────────────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic or offer description")
      return
    }

    setIsGenerating(true)
    setError(null)
    setResult(null)

    try {
      const body = {
        location_name: locationId,
        access_token: accessToken,
        gmb_account_id: accountId,
        post_content: topic,
        language,
        image_style: style,
        image_size: size,
        image_quality: quality,
        include_logo: includeLogo,
        ...(effectiveColor && { color_preference: effectiveColor }),
        ...(ctaText.trim() && { cta_text: ctaText }),
        ...(instructions.trim() && { instructions: instructions }),
      }

      const res = await fetch("/api/gmb/create-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || data.debug || "Image generation failed")
      }

      setResult(data)
      toast.success("Image generated!")
    } catch (err: any) {
      const msg = err.message || "Something went wrong"
      setError(msg)
      toast.error(msg)
    } finally {
      setIsGenerating(false)
    }
  }, [topic, style, size, quality, language, effectiveColor, ctaText, instructions, includeLogo, locationId, accessToken, accountId])

  const handleUseImage = () => {
    if (result?.image?.url) {
      onImageGenerated(result.image.url)
      toast.success("Image applied to post!")
    }
  }

  const handleDownloadImage = async () => {
    if (!result?.image?.url) return
    try {
      const response = await fetch(result.image.url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `gmb-image-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("Image downloaded!")
    } catch (err) {
      toast.error("Failed to download image")
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 mt-5">

      {/* ── Topic / Offer ──────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="ai-topic" className="text-sm font-medium">
            What to promote? <span className="text-red-500">*</span>
          </Label>
          <Badge variant={topicCharCount > TOPIC_CHAR_LIMIT ? "destructive" : "secondary"} className="text-xs">
            {topicCharCount}/{TOPIC_CHAR_LIMIT}
          </Badge>
        </div>
        <Textarea
          id="ai-topic"
          placeholder="e.g. 30% off summer sale, limited time offer"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="min-h-20 resize-none text-sm"
          disabled={isGenerating}
        />
      </div>

      {/* ── Style Picker ───────────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Design Style</Label>
        <div className="grid grid-cols-2 gap-2">
          {IMAGE_STYLES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setStyle(s.value)}
              className={cn(
                "rounded-lg border p-3 text-left transition-all",
                style === s.value
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              )}
            >
              <p className="text-sm font-medium">{s.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── CTA Text ───────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label htmlFor="cta-text" className="text-sm font-medium">
          Button Text <span className="text-muted-foreground font-normal">(Optional)</span>
        </Label>
        <Input
          id="cta-text"
          placeholder='e.g. "Learn More", "Shop Now"'
          value={ctaText}
          onChange={(e) => setCtaText(e.target.value)}
          disabled={isGenerating}
          className="text-sm"
        />
      </div>

      {/* ── Custom Instructions ────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="instructions" className="text-sm font-medium">
            Custom Instructions <span className="text-muted-foreground font-normal">(Optional)</span>
          </Label>
          <Badge variant={instructionsCharCount > INSTRUCTIONS_CHAR_LIMIT ? "destructive" : "secondary"} className="text-xs">
            {instructionsCharCount}/{INSTRUCTIONS_CHAR_LIMIT}
          </Badge>
        </div>
        <Textarea
          id="instructions"
          placeholder="Custom Instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          className="min-h-16 resize-none text-sm"
          disabled={isGenerating}
        />
      </div>

      {/* ── Advanced Options (collapsible) ─────────────────────────────── */}
      <div className="border-t pt-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex w-full items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>More Options</span>
          {showAdvanced ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {showAdvanced && (
          <div className="space-y-4 mt-4">

            {/* Language & Color Selects (grouped) */}
            <div className="grid grid-cols-2 gap-4">
              {/* Language */}
              <div className="space-y-2">
                <Label htmlFor="language-select" className="text-sm font-medium">Language</Label>
                <Select value={language} onValueChange={setLanguage} disabled={isGenerating}>
                  <SelectTrigger id="language-select" className="text-sm w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l} value={l} className="text-sm">{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Color Preset */}
              <div className="space-y-2">
                <Label htmlFor="color-select" className="text-sm font-medium">Colors</Label>
                <Select value={colorPreset} onValueChange={setColorPreset} disabled={isGenerating}>
                  <SelectTrigger id="color-select" className="text-sm w-full">
                    <SelectValue placeholder="Auto" />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_PRESETS.map((c) => (
                      <SelectItem key={c.value} value={c.value} className="text-sm">
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Custom Color Input */}
            <div className="space-y-2">
              <Label htmlFor="custom-color" className="text-sm font-medium">Custom Colors <span className="text-muted-foreground font-normal">(Optional)</span></Label>
              <Input
                id="custom-color"
                placeholder="e.g. teal and white"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                disabled={isGenerating}
                className="text-sm"
              />
            </div>

          </div>
        )}
      </div>

      {/* ── Generate Button ─────────────────────────────────────────────── */}
      {!result && (
        <Button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating || !topic.trim()}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating image…
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4 mr-2" />
              Generate Image
            </>
          )}
        </Button>
      )}

      {/* ── Error ──────────���───────────────────────────────────────────── */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {/* ── Result ─────────────────────────────────────────────────────── */}
      {result && (
        <div className="border-t pt-6 space-y-4">

          {/* Image preview */}
          <div className="relative overflow-hidden rounded-lg border">
            <img
              src={result.image.url}
              alt="AI generated"
              className="w-full object-cover"
              onError={(e) => { e.currentTarget.src = "/placeholder.svg" }}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              type="button"
              className="flex-1"
              onClick={handleUseImage}
            >
              <Check className="h-4 w-4 mr-2" />
              Use This Image
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadImage}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
