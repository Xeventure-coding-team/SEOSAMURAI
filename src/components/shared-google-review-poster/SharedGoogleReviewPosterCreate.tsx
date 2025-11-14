"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
import { QrCode, Save, Loader2, Palette } from "lucide-react"
import ReviewPosterDisplay from "./ReviewPosterDisplay"
import LocationSelector from "./LocationSelector"
import toast from "react-hot-toast"
import axios from "axios"

interface Location {
  name: string
  title: string
  location_id: string
  formattedAddress: string
  displayName?: string
  businessWebsite?: string | null
  metadata?: {
    placeId?: string
    mapsUri?: string
    newReviewUri?: string
    hasVoiceOfMerchant?: boolean
  }
}

// Background pattern options
const patternOptions = [
  { 
    id: "none", 
    name: "None", 
    component: null 
  },
  { 
    id: "dots", 
    name: "Dots", 
    component: (
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="currentColor" opacity="0.1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)" />
      </svg>
    )
  },
  { 
    id: "grid", 
    name: "Grid", 
    component: (
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    )
  },
  { 
    id: "lines", 
    name: "Lines", 
    component: (
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="lines" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 0 10 L 10 0" stroke="currentColor" strokeWidth="1" opacity="0.1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#lines)" />
      </svg>
    )
  },
  { 
    id: "zigzag", 
    name: "Zigzag", 
    component: (
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="zigzag" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 0 10 L 10 0 L 20 10 L 30 0" stroke="currentColor" strokeWidth="2" opacity="0.1" fill="none"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#zigzag)" />
      </svg>
    )
  },
  { 
    id: "circles", 
    name: "Circles", 
    component: (
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="circles" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="20" cy="20" r="15" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#circles)" />
      </svg>
    )
  },
  { 
    id: "diagonal", 
    name: "Diagonal", 
    component: (
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="diagonal" width="10" height="10" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1" opacity="0.1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#diagonal)" />
      </svg>
    )
  },
  { 
    id: "waves", 
    name: "Waves", 
    component: (
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="waves" width="40" height="20" patternUnits="userSpaceOnUse">
            <path d="M 0 10 Q 10 5, 20 10 T 40 10" stroke="currentColor" strokeWidth="1" opacity="0.1" fill="none"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#waves)" />
      </svg>
    )
  }
]

export default function GoogleReviewPosterCreate() {
  const [businessName, setBusinessName] = useState("")
  const [reviewUrl, setReviewUrl] = useState("")
  const [bgColor, setBgColor] = useState("#10b981")
  const [bgPattern, setBgPattern] = useState("none")
  const [keywords, setKeywords] = useState("")
  const [showPoster, setShowPoster] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState("")
  const [selectedLocationData, setSelectedLocationData] = useState<Location | null>(null)
  const [saving, setSaving] = useState(false)

  const handleLocationChange = (locationName: string, locationData: Location) => {
    setSelectedLocation(locationName)
    setSelectedLocationData(locationData)

    // Set business name
    const displayName = locationData.displayName || locationData.title || locationName.split("/").pop() || "Unknown Location"
    setBusinessName(displayName)

    // Set review URL from metadata.newReviewUri
    if (locationData.metadata?.newReviewUri) {
      setReviewUrl(locationData.metadata.newReviewUri)
    } else if (locationData.metadata?.placeId) {
      const constructedUrl = `https://search.google.com/local/writereview?placeid=${locationData.metadata.placeId}`
      setReviewUrl(constructedUrl)
    }
  }

  const handleGenerate = () => {
    if (!businessName || !reviewUrl) {
      toast.error("Please enter your business name and Google review link.", {
        duration: 3000,
        position: "top-right",
      })
      return
    }
    setShowPoster(true)
  }

  const handleSave = async () => {
    if (!businessName || !reviewUrl) {
      toast.error("Please enter your business name and Google review link.", {
        duration: 3000,
        position: "top-right",
      })
      return
    }

    try {
      setSaving(true)

      const payload = {
        businessName,
        reviewUrl,
        bgColor,
        bgPattern, 
        keywords: keywords || null,
        placeId: selectedLocationData?.metadata?.placeId || null,
      }

      const response = await axios.post("/api/review-poster", payload)

      if (response.data.success) {
        toast.success("Review poster saved successfully!", {
          duration: 3000,
          position: "top-right",
        })
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || "Failed to save poster"
      toast.error(errorMessage, {
        duration: 4000,
        position: "top-right",
      })
    } finally {
      setSaving(false)
    }
  }

  const colorOptions = [
    { name: "Green", value: "#10b981" },
    { name: "Blue", value: "#3b82f6" },
    { name: "Purple", value: "#8b5cf6" },
    { name: "Orange", value: "#f59e0b" },
    { name: "Red", value: "#ef4444" },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <QrCode className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold">Review Poster Creator</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Create beautiful QR-enabled posters to boost your Google reviews
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Customize Poster</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Business Location Selection Component */}
                <LocationSelector
                  value={selectedLocation}
                  onLocationChange={handleLocationChange}
                  placeholder="Choose a location"
                  showLabel={true}
                />
                <div>
                  <label className="text-sm font-medium">or</label>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Business Name</label>
                  <Input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. GloPar Travels"
                  />
                  <p className="text-xs text-muted-foreground">
                    Auto-filled from location or enter manually
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Google Review Link</label>
                  <Input
                    type="url"
                    value={reviewUrl}
                    onChange={(e) => setReviewUrl(e.target.value)}
                    placeholder="https://g.page/r/your-business/review"
                  />
                  <p className="text-xs text-muted-foreground">
                    Auto-filled from location or paste your review link
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Background Color</label>
                  <div className="flex gap-2 mb-3">
                    <Input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <span className="text-sm text-muted-foreground pt-2">{bgColor}</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setBgColor(color.value)}
                        className="w-full h-10 rounded-md border-2 border-border hover:border-primary transition-colors"
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                {/* New Background Pattern Section */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Background Pattern
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {patternOptions.map((pattern) => (
                      <button
                        key={pattern.id}
                        onClick={() => setBgPattern(pattern.id)}
                        className={`relative aspect-square rounded-md border-2 overflow-hidden transition-all ${
                          bgPattern === pattern.id 
                            ? "border-primary ring-2 ring-primary/20" 
                            : "border-border hover:border-primary/50"
                        }`}
                        title={pattern.name}
                      >
                        {pattern.id === "none" ? (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <span className="text-xs font-medium">None</span>
                          </div>
                        ) : (
                          <div 
                            className="w-full h-full text-white"
                            style={{ color: bgColor }}
                          >
                            {pattern.component}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Choose a pattern to overlay on your background
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Keywords / Review Hints</label>
                  <Textarea
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="great service, friendly staff, quick delivery..."
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">Separate keywords with commas</p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button onClick={handleGenerate} variant="outline" className="flex-1">
                    <QrCode className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving || !businessName || !reviewUrl}
                    className="flex-1"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Poster Preview */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>

              <CardContent>
                {showPoster ? (
                  <div className="flex justify-center">
                    <ReviewPosterDisplay
                      businessName={businessName}
                      reviewUrl={reviewUrl}
                      bgColor={bgColor}
                      bgPattern={bgPattern} 
                      keywords={keywords}
                    />
                  </div>
                ) : (
                  <div className="text-center py-24 text-muted-foreground">
                    <div className="mb-4 inline-block p-6 bg-muted rounded-full">
                      <QrCode className="h-16 w-16 opacity-40" />
                    </div>
                    <p className="text-lg font-medium mb-1">Ready to create?</p>
                    <p className="text-sm">Fill in the details and click Preview</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}