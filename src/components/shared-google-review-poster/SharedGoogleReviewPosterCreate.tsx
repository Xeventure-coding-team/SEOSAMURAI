"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
import { QrCode } from "lucide-react"
import ReviewPosterDisplay from "./ReviewPosterDisplay"

export default function GoogleReviewPosterCreate() {
  const [businessName, setBusinessName] = useState("")
  const [reviewUrl, setReviewUrl] = useState("")
  const [bgColor, setBgColor] = useState("#10b981")
  const [keywords, setKeywords] = useState("")
  const [showPoster, setShowPoster] = useState(false)

  const handleGenerate = () => {
    if (!businessName || !reviewUrl) {
      alert("Please enter your business name and Google review link.")
      return
    }
    setShowPoster(true)
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
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Business Name</label>
                  <Input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. GloPar Travels"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Google Review Link</label>
                  <Input
                    type="url"
                    value={reviewUrl}
                    onChange={(e) => setReviewUrl(e.target.value)}
                    placeholder="https://g.page/r/your-business/review"
                  />
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
                  <Button onClick={handleGenerate} className="flex-1">
                    <QrCode className="h-4 w-4 mr-2" />
                    Generate
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
                      keywords={keywords}
                    />
                  </div>
                ) : (
                  <div className="text-center py-24 text-muted-foreground">
                    <div className="mb-4 inline-block p-6 bg-muted rounded-full">
                      <QrCode className="h-16 w-16 opacity-40" />
                    </div>
                    <p className="text-lg font-medium mb-1">Ready to create?</p>
                    <p className="text-sm">Fill in the details and click Generate</p>
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
