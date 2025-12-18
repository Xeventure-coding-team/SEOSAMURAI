"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Plus,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Target,
  RefreshCw,
  MapPin,
  Search,
  BarChart3,
  Eye,
  ExternalLink,
  Info,
  AlertTriangle,
  Pencil,
  Check,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Minus,
  SearchX,
  HelpCircle,
} from "lucide-react"
import BatchProgressModal from "./BatchProgressModal"
import { LoadingSpinner } from "../Loader/Loader"

interface KeywordData {
  id?: string
  keyword: string
  currentRank: number
  location: string
  targetDomain?: string
  rank: number | null
  previousRank: number | null
  rankChange: "UP" | "DOWN" | "NEW" | "SAME" | "NOT_FOUND"
  rankChangeValue: number
  url?: string
  title?: string
  snippet?: string
  canUpdate: boolean
  nextUpdateTime: string
  timeUntilUpdate: number
  isActive: boolean
  createdAt?: string
}

interface AddKeywordsResponse {
  success: boolean
  message: string
  data: any[]
}

interface SerpResponse {
  success: boolean
  data: KeywordData
  metadata: {
    updated: boolean
    refreshRateHours: number
    trackingActive: boolean
  }
}

interface Location {
  lat: number
  lng: number
}

interface KeywordTrackerProps {
  location: Location;
  businessName: string;
  locationId: string;
  coordinates: { lat: number; lng: number } | null;
  keywordLocation: string
}

const KeywordTracker: React.FC<KeywordTrackerProps> = ({ location, businessName, locationId, coordinates, keywordLocation }) => {
  const [showAddModal, setShowAddModal] = useState(false)
  const [keywords, setKeywords] = useState<string[]>([""])
  const [targetDomain, setTargetDomain] = useState("")
  const [bulkKeywords, setBulkKeywords] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<AddKeywordsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showBulkInput, setShowBulkInput] = useState(false)
  const [trackedKeywords, setTrackedKeywords] = useState<KeywordData[]>([])
  const [updating, setUpdating] = useState<string | null>(null)
  const [fetchingKeywords, setFetchingKeywords] = useState(true)
  const [selectedKeyword, setSelectedKeyword] = useState<KeywordData | null>(null)

  const [batchCountdown, setBatchCountdown] = useState<number>(0)
  const [batchUpdateAvailable, setBatchUpdateAvailable] = useState<boolean>(false)

  const [showProgress, setShowProgress] = useState<boolean>(false)
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null)

  // Edit state for inline editing
  const [editKeywordId, setEditKeywordId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>("")
  const [savingEdit, setSavingEdit] = useState<boolean>(false)

  // Add useEffect for countdown timer
  useEffect(() => {
    if (trackedKeywords.length > 0) {
      // Get the earliest next update time from all keywords
      const nextUpdate = trackedKeywords.reduce(
        (earliest, keyword) => {
          const keywordUpdate = new Date(keyword.nextUpdateTime)
          return !earliest || keywordUpdate < earliest ? keywordUpdate : earliest
        },
        null as Date | null,
      )

      if (nextUpdate) {
        const updateCountdown = () => {
          const now = new Date()
          const timeUntil = Math.max(0, Math.floor((nextUpdate.getTime() - now.getTime()) / 1000))
          setBatchCountdown(timeUntil)
          setBatchUpdateAvailable(timeUntil === 0)
        }

        // Update immediately
        updateCountdown()

        // Update every second
        const interval = setInterval(updateCountdown, 1000)
        return () => clearInterval(interval)
      }
    }
  }, [trackedKeywords])

  useEffect(() => {
    fetchTrackedKeywords()
  }, [])

  // Update countdown timers every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTrackedKeywords((prev) =>
        prev.map((kw) => ({
          ...kw,
          timeUntilUpdate: Math.max(0, kw.timeUntilUpdate - 60),
          canUpdate: kw.timeUntilUpdate <= 60,
        })),
      )
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  const fetchTrackedKeywords = async () => {
    setFetchingKeywords(true)
    try {
      const params = new URLSearchParams()

      if (location) {
        params.append("locationId", locationId)
      }

      if (businessName) {
        params.append("businessName", businessName)
      }

      const response = await fetch(`/api/keywords?${params}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setTrackedKeywords(result.data)
        }
      } else {
        throw new Error("Failed to fetch keywords")
      }
    } catch (err) {
      console.error("Failed to fetch keywords:", err)
      setError("Failed to load tracked keywords")
    } finally {
      setFetchingKeywords(false)
    }
  }

  const deleteKeyword = async (keywordId: string) => {
    try {
      const response = await fetch(`/api/keywords?id=${keywordId}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (result.success) {
        // Remove from local state
        setTrackedKeywords((prev) => prev.filter((kw) => kw.id !== keywordId))
      } else {
        throw new Error(result.error || "Failed to delete keyword")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete keyword")
    }
  }

  // Format countdown time function
  const formatCountdown = (seconds: number): string => {
    if (seconds <= 0) return "Available now"

    const days = Math.floor(seconds / (24 * 60 * 60))
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60))
    const minutes = Math.floor((seconds % (60 * 60)) / 60)
    const secs = seconds % 60

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m ${secs}s`
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  // Modal form handlers
  const MAX_KEYWORDS = 10

  const updateKeyword = (index: number, value: string) => {
    const newKeywords = [...keywords]
    newKeywords[index] = value
    setKeywords(newKeywords)
  }

  const removeKeywordField = (index: number) => {
    if (keywords.length > 1) {
      const newKeywords = keywords.filter((_, i) => i !== index)
      setKeywords(newKeywords)
    }
  }

  const processBulkKeywords = () => {
    const bulkList = bulkKeywords
      .split("\n")
      .map((k) => k.trim())
      .filter((k) => k.length > 0)
      .slice(0, MAX_KEYWORDS) // Limit to max keywords

    setKeywords(bulkList.length > 0 ? bulkList : [""])
    setBulkKeywords("")
    setShowBulkInput(false)
  }

  const handleSubmit = async () => {
    const validKeywords = keywords.filter((k) => k.trim().length > 0)

    if (validKeywords.length === 0) {
      setError("Please enter at least one keyword")
      return
    }

    if (validKeywords.length > MAX_KEYWORDS) {
      setError(`Maximum ${MAX_KEYWORDS} keywords allowed`)
      return
    }

    if (trackedKeywords.length + validKeywords.length > MAX_KEYWORDS) {
      setError(`You can only track up to ${MAX_KEYWORDS} keywords total. Currently tracking ${trackedKeywords.length}.`)
      return
    }

    if (!location) {
      setError("Please enter a location")
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/serp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords: validKeywords,
          location: keywordLocation,
          businessName: businessName,
          locationId: locationId
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to add keywords")
      }

      setSuccess(data)
      setKeywords([""])
      setTargetDomain("")

      // Refresh the tracked keywords list
      await fetchTrackedKeywords()

      // Close modal after success
      setTimeout(() => {
        setShowAddModal(false)
        setSuccess(null)
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const clearAlerts = () => {
    setSuccess(null)
    setError(null)
  }

  type RankChange = "UP" | "DOWN" | "NEW" | "NOT_FOUND" | "SAME" |"UNKNOWN"

  interface RankChangeConfig {
    text: string
    icon: React.ReactNode
    colors: string
  }

  const RANK_CHANGE_CONFIG: Record<RankChange, RankChangeConfig> = {
    UP: {
      text: "Improved",
      icon: <TrendingUp className="w-3.5 h-3.5" />,
      colors: "text-emerald-700 bg-emerald-50/80 border border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/80 dark:border-emerald-800/60"
    },
    DOWN: {
      text: "Declined",
      icon: <TrendingDown className="w-3.5 h-3.5" />,
      colors: "text-red-700 bg-red-50/80 border border-red-200 dark:text-red-300 dark:bg-red-950/80 dark:border-red-800/60"
    },
    NEW: {
      text: "New",
      icon: <Sparkles className="w-3.5 h-3.5" />,
      colors: "text-blue-700 bg-blue-50/80 border border-blue-200 dark:text-blue-300 dark:bg-blue-950/80 dark:border-blue-800/60"
    },
    NOT_FOUND: {
      text: "Not Ranked",
      icon: <SearchX className="w-3.5 h-3.5" />,
      colors: "text-gray-700 bg-gray-50/80 border border-gray-200 dark:text-gray-300 dark:bg-gray-900/80 dark:border-gray-700/60"
    },
    SAME: {
      text: "Ranking Unchanged",
      icon: <Minus className="w-3.5 h-3.5" />,
      colors: "text-gray-600 bg-gray-50/80 border border-gray-200 dark:text-gray-400 dark:bg-gray-900/80 dark:border-gray-700/60"
    },
    UNKNOWN: {
      text: "Unknown",
      icon: <HelpCircle className="w-3.5 h-3.5" />,
      colors: "text-gray-600 bg-gray-50/80 border border-gray-200 dark:text-gray-400 dark:bg-gray-900/80 dark:border-gray-700/60"
    }
  }

  const getRankChangeText = (change: string, value?: number): string => {
    const changeType = (change as RankChange) || "UNKNOWN"
    const config = RANK_CHANGE_CONFIG[changeType] || RANK_CHANGE_CONFIG.UNKNOWN

    if (changeType === "UP" && value) {
      return `${value}`
    }

    if (changeType === "DOWN" && value) {
      return `${value}`
    }

    return config.text
  }

  const getRankChangeColor = (change: string): string => {
    const changeType = (change as RankChange) || "UNKNOWN"
    return RANK_CHANGE_CONFIG[changeType]?.colors || RANK_CHANGE_CONFIG.UNKNOWN.colors
  }

  const getRankChangeIcon = (change: string): React.ReactNode => {
    const changeType = (change as RankChange) || "UNKNOWN"
    return RANK_CHANGE_CONFIG[changeType]?.icon || RANK_CHANGE_CONFIG.UNKNOWN.icon
  }

  type BadgeStyle = string

  const getPositionBadgeColor = (currentRank: number | null): BadgeStyle => {
    if (currentRank === null || currentRank <= 0) {
      return "bg-muted text-muted-foreground"
    }

    const thresholds: { max: number; style: BadgeStyle }[] = [
      { max: 3, style: "bg-green-100 text-green-800 border-green-200" },
      { max: 10, style: "bg-blue-100 text-blue-800 border-blue-200" },
      { max: 20, style: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    ]

    for (const { max, style } of thresholds) {
      if (currentRank <= max) return style
    }

    return "bg-red-100 text-red-800 border-red-200"
  }

  useEffect(() => {
    if (!location || !businessName || businessName === "Unknown Page") {
      setLoading(true)
    } else {
      setLoading(false)
    }
  }, [location, businessName])

  const requestBatchUpdate = async (): Promise<void> => {
    setUpdating("batch")
    try {
      const response = await fetch("/api/batch-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: businessName,
          location: `${coordinates.lat},${coordinates.lng}`,
          locationId: locationId
        }),
      })

      const data: { success: boolean; data: { batchId: string }; error?: string } = await response.json()

      if (data.success) {
        // This triggers the modal to open
        setCurrentBatchId(data.data.batchId)
        setShowProgress(true)
        setUpdating(null)
      } else {
        throw new Error(data.error || "Failed to request batch update")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request batch update")
      setUpdating(null)
    }
  }

  const handleProgressClose = (): void => {
    setShowProgress(false)
    setCurrentBatchId(null)
    // Refresh keywords list when modal closes
    fetchTrackedKeywords()
  }

  const startEdit = (kw: KeywordData) => {
    if (!kw.id) return
    setEditKeywordId(kw.id)
    setEditValue(kw.keyword)
  }

  const cancelEdit = () => {
    setEditKeywordId(null)
    setEditValue("")
  }

  const saveEdit = async () => {
    if (!editKeywordId) return
    if (!editValue.trim()) {
      setError("Keyword cannot be empty")
      return
    }
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/batch-update?id=${editKeywordId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: editValue.trim(), businessName: businessName }),
      })
      const data = await res.json()
      if (!res.ok || data?.success === false) {
        throw new Error(data?.error || "Failed to update keyword")
      }
      // update local state
      setTrackedKeywords((prev) => prev.map((k) => (k.id === editKeywordId ? { ...k, keyword: editValue.trim() } : k)))
      setEditKeywordId(null)
      setEditValue("")
      await fetchTrackedKeywords()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to edit keyword")
    } finally {
      setSavingEdit(false)
    }
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <BatchProgressModal
          isOpen={showProgress}
          onClose={handleProgressClose}
          batchId={currentBatchId}
          businessName={businessName}
          totalKeywords={trackedKeywords.length}
          locationId={locationId}
        />

        {!location || !businessName || businessName === "Unknown Page" ? (
          <LoadingSpinner />
        ) : (
          <div className="mx-auto space-y-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold tracking-tight text-balance text-foreground">Keyword Tracker</h1>
                <p className="text-lg text-muted-foreground">Monitor your search rankings and track performance</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Info className="h-4 w-4" />
                  <span>
                    Currently tracking {trackedKeywords.length} of {MAX_KEYWORDS} keywords
                  </span>
                </div>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="lg"
                    className="w-full sm:w-auto shadow-lg"
                    disabled={trackedKeywords.length >= MAX_KEYWORDS}
                    onClick={() => setShowAddModal(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Keywords
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {trackedKeywords.length >= MAX_KEYWORDS
                    ? `Maximum ${MAX_KEYWORDS} keywords reached`
                    : "Add new keywords to track"}
                </TooltipContent>
              </Tooltip>
            </div>

            <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="space-y-3">
                  <DialogTitle className="flex items-center gap-2 text-xl">
                    <Target className="h-6 w-6" />
                    Add Keywords to Track
                  </DialogTitle>
                  <DialogDescription className="text-base">
                    Add keywords to monitor their search rankings and track performance over time.
                    <span className="block mt-2 text-sm font-medium text-muted-foreground">
                      {trackedKeywords.length} of {MAX_KEYWORDS} keywords currently tracked
                    </span>
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Keywords</Label>
                    </div>

                    {showBulkInput ? (
                      <div className="space-y-4">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Textarea
                              placeholder={`Enter keywords, one per line (max ${MAX_KEYWORDS})...`}
                              value={bulkKeywords}
                              onChange={(e) => setBulkKeywords(e.target.value)}
                              className="min-h-[150px] resize-none"
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            Enter each keyword on a new line. Maximum {MAX_KEYWORDS} keywords allowed.
                          </TooltipContent>
                        </Tooltip>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {bulkKeywords.split("\n").filter((k) => k.trim()).length} keywords entered
                          </span>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={processBulkKeywords}
                            disabled={!bulkKeywords.trim()}
                          >
                            Process Keywords
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {keywords.map((keyword, index) => (
                          <div key={index} className="flex gap-3 items-center">
                            <div className="flex-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Input
                                    value={keyword}
                                    onChange={(e) => updateKeyword(index, e.target.value)}
                                    placeholder={`Enter keyword ....`}
                                    className="h-12"
                                  />
                                </TooltipTrigger>
                                <TooltipContent>Enter a keyword to track its search ranking</TooltipContent>
                              </Tooltip>
                            </div>
                            {keywords.length > 1 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeKeywordField(index)}
                                    className="h-12 w-12 p-0"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Remove this keyword</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        ))}

                        {keywords.length >= MAX_KEYWORDS && (
                          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            <span className="text-sm text-amber-800">Maximum {MAX_KEYWORDS} keywords reached</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-4 pt-6 border-t">
                    <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1 h-12">
                      Cancel
                    </Button>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={handleSubmit}
                          disabled={
                            loading ||
                            keywords.every((k) => !k.trim()) ||
                            trackedKeywords.length + keywords.filter((k) => k.trim()).length > MAX_KEYWORDS
                          }
                          className="flex-1 h-12 shadow-lg"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            <>
                              <Target className="mr-2 h-4 w-4" />
                              Add Keywords
                            </>
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {trackedKeywords.length + keywords.filter((k) => k.trim()).length > MAX_KEYWORDS
                          ? `Would exceed ${MAX_KEYWORDS} keyword limit`
                          : "Add these keywords to your tracking list"}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {success && (
              <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800 dark:text-green-200">Success!</AlertTitle>
                <AlertDescription className="text-green-700 dark:text-green-300">{success.message}</AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-800 dark:text-red-200">Error</AlertTitle>
                <AlertDescription className="text-red-700 dark:text-red-300">
                  <p>{error}</p>
                  <Button variant="outline" size="sm" onClick={clearAlerts} className="mt-3 bg-transparent">
                    Dismiss
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {trackedKeywords.length > 0 && (
              <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950 shadow-lg">
                <CardContent>
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900">
                        <RefreshCw className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-blue-900 dark:text-blue-100 text-lg">
                          {batchUpdateAvailable ? "Batch Update Available" : "Next Batch Update"}
                        </p>
                        <p className="text-blue-700 dark:text-blue-300">
                          {batchUpdateAvailable
                            ? `Update all ${trackedKeywords.length} keywords now`
                            : `Next update in: ${formatCountdown(batchCountdown)}`}
                        </p>
                      </div>
                    </div>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={requestBatchUpdate}
                          disabled={!batchUpdateAvailable}
                          className={`w-full sm:w-auto h-12 shadow-lg ${
                            batchUpdateAvailable 
                              ? "bg-blue-600 hover:bg-blue-700" 
                              : "opacity-50 cursor-not-allowed"
                          }`}
                          size="lg"
                        >
                          {updating === "batch" ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Starting Update...
                            </>
                          ) : (
                            <>
                              Update All Keywords
                              <Badge variant="secondary" className="ml-2 bg-white/20 text-white border-white/30">
                                {trackedKeywords.length}
                              </Badge>
                            </>
                          )}
                        </Button>
                      </TooltipTrigger>
                       <TooltipContent>
                        {batchUpdateAvailable
                          ? "Update all tracked keywords with latest rankings"
                          : `Batch update will be available ${formatCountdown(batchCountdown)}`}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <BarChart3 className="h-6 w-6" />
                  Tracked Keywords
                  <Badge variant="secondary" className="ml-auto bg-primary/10 text-primary border-primary/20">
                    {trackedKeywords.length}/{MAX_KEYWORDS}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {fetchingKeywords ? (
                  <div className="p-8">
                    <div className="space-y-6">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center space-x-6">
                          <Skeleton className="h-12 w-12 rounded-full" />
                          <div className="space-y-3 flex-1">
                            <Skeleton className="h-4 w-[300px]" />
                            <Skeleton className="h-4 w-[200px]" />
                          </div>
                          <Skeleton className="h-8 w-[120px]" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : trackedKeywords.length === 0 ? (
                  <div className="p-16 text-center">
                    <div className="mx-auto mb-8 h-32 w-32 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                      <Target className="h-16 w-16 text-primary/60" />
                    </div>
                    <h3 className="text-2xl font-semibold mb-4 text-balance">No Keywords Tracked Yet</h3>
                    <p className="text-muted-foreground mb-8 max-w-md mx-auto text-lg leading-relaxed">
                      Start tracking keywords to monitor your search rankings and performance over time
                    </p>
                    <Button onClick={() => setShowAddModal(true)} size="lg" className="shadow-lg">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Your First Keyword
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b-2">
                          <TableHead className="w-[350px] font-semibold">Keyword</TableHead>
                          <TableHead className="text-center font-semibold">Position</TableHead>
                          <TableHead className="text-center font-semibold">Ranking Change</TableHead>
                          <TableHead className="text-center font-semibold">Previous Rank</TableHead>
                          <TableHead className="text-right font-semibold">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trackedKeywords.map((kw) => (
                          <TableRow key={kw.id} className="group hover:bg-muted/50 transition-colors">
                            <TableCell className="py-4">
                              <div className="space-y-2">
                                {editKeywordId === kw.id ? (
                                  <Input
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    placeholder="Edit keyword..."
                                    className="h-9"
                                  />
                                ) : (
                                  <div className="font-semibold text-pretty text-base">{kw.keyword}</div>
                                )}
                                {kw.targetDomain && (
                                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {kw.targetDomain}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant="outline"
                                    className={`font-mono text-xs px-3 py-1 ${getPositionBadgeColor(kw.currentRank)}`}
                                  >
                                    {kw.currentRank ? `#${kw.currentRank}` : "#0"}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>Current search ranking position</TooltipContent>
                              </Tooltip>
                            </TableCell>

                            <TableCell className="text-center">
                              {kw.rankChange !== "NOT_FOUND" ? (
                                <Tooltip>
                                  <div>
                                    <Badge
                                      variant="outline"
                                      className={`${getRankChangeColor(kw.rankChange)} px-3 py-1 text-xs font-medium`}
                                    >
                                      <span className="flex items-center gap-1">
                                        {RANK_CHANGE_CONFIG[kw.rankChange]?.icon}
                                        {getRankChangeText(kw.rankChange, kw.rankChangeValue)}
                                      </span>
                                    </Badge>
                                  </div>
                                  <TooltipContent>Ranking change since last update</TooltipContent>
                                </Tooltip>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className={`${getRankChangeColor(kw.rankChange)} px-3 py-1`}
                                >
                                  <span className="flex items-center gap-1">
                                    {RANK_CHANGE_CONFIG[kw.rankChange]?.icon}
                                    No Change
                                  </span>
                                </Badge>
                              )}
                            </TableCell>

                            <TableCell className="text-center">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant="outline"
                                    className={`font-mono text-xs px-3 py-1 bg-gray-100 ${getPositionBadgeColor(
                                      kw.previousRank
                                    )}`}
                                  >
                                    {kw.previousRank ? `#${kw.previousRank}` : "#0"}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>Previous search ranking position</TooltipContent>
                              </Tooltip>
                            </TableCell>

                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {editKeywordId === kw.id ? (
                                  <>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={saveEdit}
                                          disabled={savingEdit || !editValue.trim()}
                                          className="opacity-100 h-9 w-9 p-0 hover:bg-primary/10"
                                        >
                                          {savingEdit ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <Check className="h-4 w-4" />
                                          )}
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>{savingEdit ? "Saving..." : "Save changes"}</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={cancelEdit}
                                          className="opacity-100 h-9 w-9 p-0 hover:bg-primary/10"
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Cancel</TooltipContent>
                                    </Tooltip>
                                  </>
                                ) : (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => startEdit(kw)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity h-9 w-9 p-0 hover:bg-primary/10"
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Edit keyword</TooltipContent>
                                  </Tooltip>
                                )}

                                {kw.url && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedKeyword(kw)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity h-9 w-9 p-0 hover:bg-primary/10"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>View keyword details</TooltipContent>
                                  </Tooltip>
                                )}

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={() => deleteKeyword(kw.id!)}>
                                      <X className="h-6 w-6" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Delete this keyword</TooltipContent>
                                </Tooltip>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Dialog open={!!selectedKeyword} onOpenChange={() => setSelectedKeyword(null)}>
              <DialogContent className="max-w-3xl">
                <DialogHeader className="space-y-3">
                  <DialogTitle className="flex items-center gap-2 text-xl">
                    <Search className="h-6 w-6" />
                    {selectedKeyword?.keyword}
                  </DialogTitle>
                  <DialogDescription className="text-base">
                    Current ranking details and search result information
                  </DialogDescription>
                </DialogHeader>

                {selectedKeyword && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-6">
                      <Card className="shadow-md">
                        <CardContent className="p-6 text-center">
                          <div className="text-3xl font-bold text-primary mb-2">#{selectedKeyword.currentRank}</div>
                          <div className="text-sm text-muted-foreground font-medium">Current Position</div>
                        </CardContent>
                      </Card>
                      <Card className="shadow-md">
                        <CardContent className="p-6 text-center">
                          <div className="flex items-center justify-center gap-2 text-xl font-semibold mb-2">
                            <span className={getRankChangeColor(selectedKeyword.rankChange).split(" ")[0]}>
                              {getRankChangeText(selectedKeyword.rankChange, selectedKeyword.rankChangeValue)}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground font-medium">Rank Change</div>
                        </CardContent>
                      </Card>
                    </div>

                    {selectedKeyword.url && (
                      <Card className="shadow-md">
                        <CardHeader>
                          <CardTitle className="text-lg">Search Result</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <h4 className="font-semibold text-blue-600 hover:underline cursor-pointer text-lg">
                              {selectedKeyword.title}
                            </h4>
                            <p className="text-sm text-green-600 mt-1">{selectedKeyword.url}</p>
                          </div>
                          {selectedKeyword.snippet && (
                            <p className="text-muted-foreground leading-relaxed">{selectedKeyword.snippet}</p>
                          )}
                          <Button variant="outline" size="sm" asChild className="mt-4 bg-transparent">
                            <a href={selectedKeyword.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View Result
                            </a>
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}

export default KeywordTracker
