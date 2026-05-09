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
  TrashIcon,
  ChevronUp,
  ChevronDown,
} from "lucide-react"
import BatchProgressModal from "./BatchProgressModal"
import { LoadingSpinner } from "../Loader/Loader"
import toast from "react-hot-toast"
import { UsageGate } from "../usage-gate"
import { useUsage } from "@/lib/use-usage"
import { getPlanLimits, PlanId } from "@/lib/stripe"
import { cn } from "@/lib/utils"
import { KeywordCharts } from "./KeywordCharts"

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

export interface KeywordItem {
  id: string;
  keyword: string;
  location: string;
  locationId: string;
  targetDomain: string | null;

  title: string | null;
  url: string | null;
  snippet: string | null;

  currentRank: number | null;
  previousRank: number | null;

  rankChange: "UP" | "DOWN" | "SAME";
  rankChangeValue: number;

  isActive: boolean;
  canUpdate: boolean;

  createdAt: string; // ISO date
  lastChecked: string | null;
  nextUpdateTime: string | null;

  refreshRate: number; // in hours
  timeUntilUpdate: number; // seconds
}

export interface BatchUpdateInfo {
  nextBatchUpdate: string; // ISO date
  pendingBatch: string | null;
  refreshRate: number; // hours
  systemNote: string;
}

export interface Metadata {
  averageRank: number;
  ranked: number;
  total: number;
  updateable: number;

  lastFetch: string; // ISO date
  locationId: string;
  userId: string;

  batchUpdateInfo: BatchUpdateInfo;
}

export interface KeywordResponse {
  success: boolean;
  data: KeywordItem[];
  metadata: Metadata;
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

  const [keywordData, setKeywordData] = useState<KeywordResponse | null>(null);
  const [batchCountdown, setBatchCountdown] = useState<number>(0)
  const [batchUpdateAvailable, setBatchUpdateAvailable] = useState<boolean>(false)

  const [showProgress, setShowProgress] = useState<boolean>(false)
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null)

  const [showCharts, setShowCharts] = useState(false)

  // Edit state for inline editing
  const [editKeywordId, setEditKeywordId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>("")
  const [savingEdit, setSavingEdit] = useState<boolean>(false)
  const { data: usageData } = useUsage();

  const limitPerLocation = usageData?.plan
    ? getPlanLimits(usageData.plan as PlanId).keywordTracking
    : 0;

  useEffect(() => {
    if (trackedKeywords.length === 0) return;

    const batchedKeywords = trackedKeywords.filter(
      (k) => k.timeUntilUpdate !== -1 && k.nextUpdateTime !== "pending"
    );

    if (batchedKeywords.length === 0) {
      setBatchCountdown(null);
      setBatchUpdateAvailable(false);
      return;
    }

    const nextUpdate = batchedKeywords.reduce((earliest, keyword) => {
      const keywordUpdate = new Date(keyword.nextUpdateTime);
      return !earliest || keywordUpdate < earliest ? keywordUpdate : earliest;
    }, null as Date | null);

    if (!nextUpdate) return;

    const updateCountdown = () => {
      const now = new Date();
      const timeUntil = Math.max(0, Math.floor((nextUpdate.getTime() - now.getTime()) / 1000));
      setBatchCountdown(timeUntil);
      setBatchUpdateAvailable(timeUntil === 0);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [trackedKeywords]);


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
          setKeywordData(result);
          setTrackedKeywords(result.data)
        }
      } else {
        throw new Error("Failed to fetch keywords")
      }
    } catch (err) {
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
      .slice(0, limitPerLocation)

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

    if (validKeywords.length > limitPerLocation) {
      setError(`Maximum ${limitPerLocation} keywords allowed`)
      return
    }

    if (trackedKeywords.length + validKeywords.length > limitPerLocation) {
      setError(`You can only track up to ${limitPerLocation} keywords total. Currently tracking ${trackedKeywords.length}.`)
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

      // OPTIMISTIC UPDATE: Add keywords immediately with loading state
      const optimisticKeywords: KeywordData[] = validKeywords.map(keyword => ({
        keyword,
        location: keywordLocation,
        currentRank: null,
        rank: null,
        previousRank: null,
        rankChange: "NEW",
        rankChangeValue: 0,
        url: null,
        title: null,
        snippet: null,
        canUpdate: false,
        nextUpdateTime: new Date(Date.now() + 5 * 60000).toISOString(), // 5 minutes from now
        timeUntilUpdate: 300,
        isActive: true,
        createdAt: new Date().toISOString()
      }))

      // Add optimistic keywords to the list
      setTrackedKeywords(prev => [...optimisticKeywords, ...prev])

      setSuccess(data)
      setKeywords([""])
      setTargetDomain("")

      // Then fetch actual data from server (replaces optimistic entries)
      await fetchTrackedKeywords()

      // Close modal after success
      setTimeout(() => {
        setShowAddModal(false)
        setSuccess(null)
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      // Remove optimistic entries on error
      await fetchTrackedKeywords()
    } finally {
      setLoading(false)
    }
  }

  const clearAlerts = () => {
    setSuccess(null)
    setError(null)
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
      <div className="min-h-screen">
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
          <div className="mx-auto space-y-4">

            {/* ── Page header ── */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-foreground">Keyword tracker</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">{businessName} · {keywordLocation}</p>
              </div>

              <div className="flex items-center gap-2">
                {/* Usage pill */}
                <div className="flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1.5">
                  <div className="h-1 w-9 overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{ width: `${Math.min((trackedKeywords.length / limitPerLocation) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    {trackedKeywords.length} / {limitPerLocation}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={fetchTrackedKeywords}
                  disabled={fetchingKeywords}
                >
                  {fetchingKeywords
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" /></svg>
                  }
                  Refresh
                </Button>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <UsageGate metric="keywordTrackingUsed">
                      <Button
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        disabled={trackedKeywords.length >= limitPerLocation}
                        onClick={() => setShowAddModal(true)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add keywords
                      </Button>
                    </UsageGate>
                  </TooltipTrigger>
                  <TooltipContent>
                    {trackedKeywords.length >= limitPerLocation
                      ? `Maximum ${limitPerLocation} keywords reached`
                      : "Add new keywords to track"}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>


            {/* ── Batch status bar ── */}
            {trackedKeywords.length > 0 && !!usageData?.plan && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-md border px-4 py-3">
                {/* Left section */}
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground/60" />
                  <p className="text-sm font-medium">
                    {batchCountdown === null
                      ? "Ready for first batch update"
                      : batchUpdateAvailable
                        ? `Ready to update ${trackedKeywords.length} keyword${trackedKeywords.length !== 1 ? 's' : ''}`
                        : `Next update in ${formatCountdown(batchCountdown)}`}
                  </p>
                </div>

                {/* Right section */}
                <div className="flex items-center gap-3">
                  <span className="rounded-full px-2.5 py-1 text-xs font-medium bg-muted/80">
                    {trackedKeywords.length} kw
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs"
                    disabled={updating === "batch" || (!batchUpdateAvailable && batchCountdown !== null)}
                    onClick={batchCountdown === null || batchUpdateAvailable ? requestBatchUpdate : undefined}
                  >
                    {updating === "batch" ? (
                      <><Loader2 className="h-3 w-3 animate-spin" /> Updating...</>
                    ) : (
                      <>{batchCountdown === null ? "Run first batch" : "Update all"} ({trackedKeywords.length})</>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* ── Inline alerts ── */}
            {success && (
              <div className="flex items-center gap-2.5 rounded-md border border-green-200 bg-green-50 px-3.5 py-2.5 dark:border-green-800 dark:bg-green-950/30">
                <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />
                <p className="flex-1 text-sm text-green-800 dark:text-green-300">{success.message}</p>
                <button onClick={clearAlerts}><X className="h-3.5 w-3.5 text-green-600" /></button>
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2.5 rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 dark:border-red-800 dark:bg-red-950/30">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <p className="flex-1 text-sm text-red-800 dark:text-red-300">{error}</p>
                <button onClick={clearAlerts}><X className="h-3.5 w-3.5 text-red-600" /></button>
              </div>
            )}

            {/* ════════════════════════════════════════
                HERO: Keywords table
            ════════════════════════════════════════ */}
            <div className="rounded-xl border border-border bg-background shadow-sm overflow-hidden">

              {/* Table card header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">Tracked keywords</span>
                  {trackedKeywords.length > 0 && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                      {trackedKeywords.length} / {limitPerLocation}
                    </span>
                  )}
                </div>
                {trackedKeywords.length > 0 && (
                  <span className="text-xs text-muted-foreground">Last checked 2h ago</span>
                )}
              </div>

              {/* Loading skeleton */}
              {fetchingKeywords ? (
                <div className="divide-y divide-border/60">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-4">
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className={cn("h-3.5 rounded", i % 2 === 0 ? "w-52" : "w-64")} />
                        <Skeleton className="h-3 w-36 rounded" />
                      </div>
                      <Skeleton className="h-7 w-12 rounded-md" />
                      <Skeleton className="h-7 w-16 rounded-md" />
                      <Skeleton className="h-7 w-12 rounded-md" />
                      <Skeleton className="h-7 w-20 rounded-md" />
                    </div>
                  ))}
                </div>

                /* Empty state */
              ) : trackedKeywords.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="mb-4 rounded-full bg-muted p-4">
                    <Target className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No keywords tracked yet</p>
                  <p className="mt-1.5 max-w-xs text-xs text-muted-foreground leading-relaxed">
                    Add keywords to monitor your search rankings over time.
                  </p>
                  <Button onClick={() => setShowAddModal(true)} variant="outline" size="sm" className="mt-5 h-8 gap-1.5 text-xs">
                    <Plus className="h-3.5 w-3.5" /> Add first keyword
                  </Button>
                </div>

                /* Data table */
              ) : (
                <Table className=" overflow-hidden">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-border/60 bg-muted/20">
                      <TableHead className="pl-5 w-[44%] py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Keyword</TableHead>
                      <TableHead className="text-center py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Position</TableHead>
                      <TableHead className="text-center py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Change</TableHead>
                      <TableHead className="text-center py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Previous</TableHead>
                      <TableHead className="pr-5 text-right py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trackedKeywords.map((kw) => (
                      <TableRow
                        key={kw.id}
                        className={cn(
                          "group border-l-[3px] transition-colors",
                          kw.rankChange === "UP"
                            ? "border-l-green-500 hover:bg-green-50/40 dark:hover:bg-green-950/10"
                            : kw.rankChange === "DOWN"
                              ? "border-l-red-400 hover:bg-red-50/30 dark:hover:bg-red-950/10"
                              : "border-l-transparent hover:bg-muted/30"
                        )}
                      >
                        {/* Keyword */}
                        <TableCell className="pl-5 py-4">
                          {editKeywordId === kw.id ? (
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              placeholder="Edit keyword…"
                              className="h-8 max-w-sm text-sm"
                              autoFocus
                            />
                          ) : (
                            <div>
                              <p className="text-lg font-medium text-foreground leading-snug">{kw.keyword}</p>
                              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                                <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
                                  <circle cx="12" cy="10" r="3" />
                                </svg>
                                {kw.location}
                              </p>
                            </div>
                          )}
                        </TableCell>

                        {/* Position badge */}
                        <TableCell className="text-center py-4">
                          <span className={cn(
                            "inline-flex items-center justify-center rounded-md px-2.5 py-1 font-mono text-sm font-semibold tabular-nums min-w-[2.5rem]",
                            kw.currentRank === 1
                              ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                              : kw.currentRank && kw.currentRank <= 3
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                : kw.currentRank && kw.currentRank <= 10
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                                  : kw.currentRank
                                    ? "bg-muted text-muted-foreground"
                                    : "text-muted-foreground"
                          )}>
                            {kw.currentRank ? `#${kw.currentRank}` : "—"}
                          </span>
                        </TableCell>

                        {/* Change badge */}
                        <TableCell className="text-center py-4">
                          {kw.rankChange === "UP" && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-green-100 px-2 py-1 text-xs font-semibold text-green-800 dark:bg-green-950 dark:text-green-300">
                              <TrendingUp className="h-3.5 w-3.5" />+{kw.rankChangeValue}
                            </span>
                          )}
                          {kw.rankChange === "DOWN" && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-1 text-xs font-semibold text-red-800 dark:bg-red-950 dark:text-red-300">
                              <TrendingDown className="h-3.5 w-3.5" />-{kw.rankChangeValue}
                            </span>
                          )}
                          {kw.rankChange === "NEW" && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                              <Sparkles className="h-3.5 w-3.5" />New
                            </span>
                          )}
                          {(kw.rankChange === "SAME" || kw.rankChange === "NOT_FOUND" || !kw.rankChange) && (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        {/* Previous */}
                        <TableCell className="text-center py-4">
                          {kw.previousRank
                            ? <span className="font-mono text-sm text-muted-foreground">#{kw.previousRank}</span>
                            : <span className="text-sm text-muted-foreground">—</span>
                          }
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="pr-5 text-right py-4">
                          <div className="flex items-center justify-end gap-1">
                            {editKeywordId === kw.id ? (
                              <>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-green-700 dark:text-green-400" onClick={saveEdit} disabled={savingEdit || !editValue.trim()}>
                                      {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Save</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={cancelEdit}>
                                      <X className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Cancel</TooltipContent>
                                </Tooltip>
                              </>
                            ) : (
                              <>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => startEdit(kw)}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Edit keyword</TooltipContent>
                                </Tooltip>

                                {kw.url && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setSelectedKeyword(kw)}>
                                        <Eye className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>View result</TooltipContent>
                                  </Tooltip>
                                )}

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost" size="sm"
                                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                                      onClick={() => deleteKeyword(kw.id!)}
                                    >
                                      <TrashIcon className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Delete</TooltipContent>
                                </Tooltip>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            {/* ════════════════════════════════════════ */}

            {/* ── Charts — collapsible, clearly secondary ── */}
            <div className="mt-14">
              {keywordData && <KeywordCharts keywords={keywordData.data} metadata={keywordData.metadata} />}
            </div>

            {/* ── Add keyword modal ── */}
            <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                    <Target className="h-4 w-4" />
                    Add keywords to track
                  </DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground">
                    {trackedKeywords.length} of {limitPerLocation} keywords currently tracked
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Keywords</Label>
                    <Button
                      variant="ghost" size="sm"
                      className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setShowBulkInput(!showBulkInput)}
                    >
                      {showBulkInput ? "Single entry" : "Bulk paste"}
                    </Button>
                  </div>

                  {showBulkInput ? (
                    <div className="space-y-3">
                      <Textarea
                        placeholder={`One keyword per line (max ${limitPerLocation})…`}
                        value={bulkKeywords}
                        onChange={(e) => setBulkKeywords(e.target.value)}
                        className="min-h-[120px] resize-none text-sm"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {bulkKeywords.split("\n").filter(k => k.trim()).length} entered
                        </span>
                        <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={processBulkKeywords} disabled={!bulkKeywords.trim()}>
                          Process
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {keywords.map((keyword, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={keyword}
                            onChange={(e) => updateKeyword(index, e.target.value)}
                            placeholder="e.g. best coffee shop near me"
                            className="h-9 text-sm"
                          />
                          {keywords.length > 1 && (
                            <Button variant="ghost" size="sm" className="h-9 w-9 shrink-0 p-0" onClick={() => removeKeywordField(index)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      ))}

                      {keywords.length < (limitPerLocation - trackedKeywords.length) && (
                        <Button
                          variant="ghost" size="sm"
                          className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => setKeywords([...keywords, ""])}
                        >
                          <Plus className="h-3 w-3" /> Add another
                        </Button>
                      )}

                      {trackedKeywords.length + keywords.filter(k => k.trim()).length > limitPerLocation && (
                        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 dark:border-amber-800 dark:bg-amber-950/30">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                          <span className="text-xs text-amber-800 dark:text-amber-300">
                            Would exceed {limitPerLocation} keyword limit
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2 border-t">
                    <Button variant="outline" className="flex-1 h-9 text-sm" onClick={() => setShowAddModal(false)}>
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 h-9 text-sm"
                      onClick={handleSubmit}
                      disabled={loading || keywords.every(k => !k.trim()) || trackedKeywords.length + keywords.filter(k => k.trim()).length > limitPerLocation}
                    >
                      {loading
                        ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Adding…</>
                        : "Add keywords"
                      }
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* ── Keyword detail modal ── */}
            <Dialog open={!!selectedKeyword} onOpenChange={() => setSelectedKeyword(null)}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-base font-semibold leading-snug">{selectedKeyword?.keyword}</DialogTitle>
                  <DialogDescription className="text-xs">Ranking details and search result</DialogDescription>
                </DialogHeader>

                {selectedKeyword && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-muted/50 p-4 text-center">
                        <p className="text-2xl font-bold tabular-nums text-foreground">
                          {selectedKeyword.currentRank ? `#${selectedKeyword.currentRank}` : "—"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">Current position</p>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-4 text-center">
                        <p className={cn(
                          "text-2xl font-bold tabular-nums",
                          selectedKeyword.rankChange === "UP" ? "text-green-700 dark:text-green-400"
                            : selectedKeyword.rankChange === "DOWN" ? "text-red-700 dark:text-red-400"
                              : "text-foreground"
                        )}>
                          {selectedKeyword.rankChange === "UP" ? `+${selectedKeyword.rankChangeValue}`
                            : selectedKeyword.rankChange === "DOWN" ? `-${selectedKeyword.rankChangeValue}`
                              : selectedKeyword.rankChange === "NEW" ? "New" : "—"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">Rank change</p>
                      </div>
                    </div>

                    {selectedKeyword.url && (
                      <div className="rounded-lg border border-border p-4 space-y-2.5">
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer leading-snug">
                          {selectedKeyword.title}
                        </p>
                        <p className="text-xs font-mono text-green-700 dark:text-green-500 truncate">{selectedKeyword.url}</p>
                        {selectedKeyword.snippet && (
                          <p className="text-xs text-muted-foreground leading-relaxed pt-2 border-t border-border">{selectedKeyword.snippet}</p>
                        )}
                        <Button variant="outline" size="sm" asChild className="h-7 gap-1.5 text-xs">
                          <a href={selectedKeyword.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" /> Open result
                          </a>
                        </Button>
                      </div>
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
