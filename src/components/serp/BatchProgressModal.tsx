"use client"

import type React from "react"
import { useState, useEffect, useRef, type JSX } from "react"
import { CheckCircle, XCircle, Clock, TrendingUp, TrendingDown, Minus, AlertCircle, RefreshCw } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

// TypeScript Interfaces
interface BatchProgressData {
  batchId: string
  status: "RUNNING" | "COMPLETED" | "FAILED"
  totalKeywords: number
  processedKeywords: number
  failedKeywords: number
  currentKeyword: string
  estimatedTimeRemaining: number
  progress: number
  results: BatchResult[]
}

interface BatchResult {
  keyword: string
  location: string
  success: boolean
  currentRank?: number
  previousRank?: number
  rankChange?: "UP" | "DOWN" | "NEW" | "SAME" | "NOT_FOUND"
  rankChangeValue?: number
  error?: string
  processedAt?: string
}

interface BatchProgressModalProps {
  isOpen: boolean
  onClose: () => void
  batchId: string | null
  businessName: string
  totalKeywords?: number
  locationId?: string
}

interface BatchApiResponse {
  success: boolean
  data: BatchProgressData
  error?: string
}

const BatchProgressModal: React.FC<BatchProgressModalProps> = ({
  isOpen,
  onClose,
  batchId,
  businessName,
  totalKeywords = 0,
  locationId
}) => {
  const [progress, setProgress] = useState<BatchProgressData>({
    batchId: "",
    status: "RUNNING",
    totalKeywords: 0,
    processedKeywords: 0,
    failedKeywords: 0,
    currentKeyword: "",
    estimatedTimeRemaining: 0,
    progress: 0,
    results: [],
  })

  const [isLoading, setIsLoading] = useState<boolean>(true)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const [startTime, setStartTime] = useState<number>(0)
  const [elapsedTime, setElapsedTime] = useState<number>(0)
  const [stoppedTime, setStoppedTime] = useState<number | null>(null)

  useEffect(() => {
    if (isOpen) {
      setStartTime(Date.now())
      setElapsedTime(0)
    } else {
      setStartTime(0)
      setElapsedTime(0)
    }
  }, [isOpen])

  useEffect(() => {
    let elapsedInterval: NodeJS.Timeout | null = null

    if (isOpen && startTime > 0) {
      elapsedInterval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
    }

    return () => {
      if (elapsedInterval) {
        clearInterval(elapsedInterval)
      }
    }
  }, [isOpen, startTime])

    useEffect(() => {
    if (progress.status === "COMPLETED") {
      // freeze the last elapsed value
      if (stoppedTime === null) {
        setStoppedTime(elapsedTime)
      }
      return // stop interval
    }

    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [progress.status, stoppedTime])

  useEffect(() => {
    if (!isOpen || !batchId) return

    const fetchProgress = async (): Promise<void> => {
      try {
        const response = await fetch(`/api/batch-update?batchId=${batchId}`)
        const data: BatchApiResponse = await response.json()

        if (data.success) {
          setProgress(data.data)
          setIsLoading(false)

          if (data.data.status === "COMPLETED" || data.data.status === "FAILED") {
            if (intervalRef.current) {
              clearInterval(intervalRef.current)
              intervalRef.current = null
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch batch progress:", error)
      }
    }

    fetchProgress()

    intervalRef.current = setInterval(fetchProgress, 2000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isOpen, batchId])

  const formatTime = (seconds: number): string => {
    if (progress.status === "COMPLETED") { }
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const getRankChangeIcon = (rankChange?: string): JSX.Element => {
    switch (rankChange) {
      case "UP":
        return <TrendingUp className="w-4 h-4 text-green-600" />
      case "DOWN":
        return <TrendingDown className="w-4 h-4 text-red-600" />
      case "NEW":
        return (
          <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-xs text-white font-bold">N</span>
          </div>
        )
      case "SAME":
        return <Minus className="w-4 h-4 text-muted-foreground" />
      default:
        return <XCircle className="w-4 h-4 text-red-600" />
    }
  }

  const getRankChangeBadge = (
    rankChange?: string,
    currentRank?: number,
    previousRank?: number,
    rankChangeValue?: number,
  ): JSX.Element => {
    switch (rankChange) {
      case "UP":
        return (
          <Badge variant="secondary" className="text-green-700 bg-green-100">
            ↑{rankChangeValue} (#{currentRank})
          </Badge>
        )
      case "DOWN":
        return (
          <Badge variant="secondary" className="text-red-700 bg-red-100">
            ↓{rankChangeValue} (#{currentRank})
          </Badge>
        )
      case "NEW":
        return (
          <Badge variant="secondary" className="text-blue-700 bg-blue-100">
            New #{currentRank}
          </Badge>
        )
      case "SAME":
        return <Badge variant="outline">#{currentRank} (no change)</Badge>
      case "NOT_FOUND":
        return <Badge variant="destructive">Not found</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const isCompleted = progress.status === "COMPLETED" || progress.status === "FAILED"
  const successRate =
    progress.totalKeywords > 0
      ? Math.round(((progress.processedKeywords - progress.failedKeywords) / progress.totalKeywords) * 100)
      : 0


  const displayTime =
    progress.status === "COMPLETED" && stoppedTime !== null
      ? stoppedTime
      : elapsedTime

  return (
    <Dialog open={isOpen} onOpenChange={() => isCompleted && onClose()}>
      <DialogContent className="min-w-full w-full max-h-[90vh]">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <span className="text-lg font-semibold">Batch Rank Update</span>
              <p className="text-sm text-muted-foreground font-normal mt-1 truncate">{businessName}</p>
            </div>
            {!isCompleted && (
              <Badge variant="secondary" className="ml-4 flex-shrink-0 bg-blue-100 text-blue-800 border-blue-200">
                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                Running
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border/50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-foreground">{progress.processedKeywords}</div>
                <div className="text-sm text-muted-foreground font-medium">Processed</div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {progress.processedKeywords - progress.failedKeywords}
                </div>
                <div className="text-sm text-muted-foreground font-medium">Successful</div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-destructive">{progress.failedKeywords}</div>
                <div className="text-sm text-muted-foreground font-medium">Failed</div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-foreground">{successRate}%</div>
                <div className="text-sm text-muted-foreground font-medium">Success Rate</div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-muted-foreground">{progress.progress}%</span>
            </div>
            <Progress value={progress.progress} className="h-3" />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-2 min-w-0">
              {progress.status === "RUNNING" && (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" />
                  <span className="text-sm truncate">
                    {progress.currentKeyword ? `Processing: "${progress.currentKeyword}"` : "Preparing..."}
                  </span>
                </>
              )}
              {progress.status === "COMPLETED" && (
                <>
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm font-medium">Batch completed successfully!</span>
                </>
              )}
              {progress.status === "FAILED" && (
                <>
                  <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                  <span className="text-sm font-medium">Batch completed with errors</span>
                </>
              )}
            </div>

            <div className="flex items-center space-x-4 text-sm text-muted-foreground flex-shrink-0">
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>Elapsed: {formatTime(displayTime)}</span>
              </div>
              {progress.status === "RUNNING" && progress.estimatedTimeRemaining > 0 && (
                <div className="flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>ETA: {formatTime(progress.estimatedTimeRemaining * 60)}</span>
                </div>
              )}
            </div>


          </div>

          <Separator />

          <div className="flex-1 min-h-0">

            <h3 className="text-lg font-semibold mb-4">
              Keyword Results ({progress.results.length}/{progress.totalKeywords})
            </h3>

            <ScrollArea className="h-[600px] lg:h-[500px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                  <span className="text-muted-foreground">Loading batch details...</span>
                </div>
              ) : progress.results.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                    <Clock className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h4 className="text-lg font-semibold mb-2">Processing Keywords</h4>
                  <p className="text-muted-foreground">Results will appear here as keywords are processed...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-4">
                  {progress.results.map((result, index) => (
                    <Card key={`${result.keyword}-${index}`} className="border-border/50">
                      <CardContent>
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            {result.success ? (
                              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                            ) : (
                              <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                            )}

                            <div className="min-w-0 flex-1">
                              <div className="font-medium truncate">"{result.keyword}"</div>
                              <div className="text-sm text-muted-foreground truncate">
                                {result.location}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-end space-x-4 flex-shrink-0">
                            {result.success ? (
                              <div className="flex items-center space-x-2">
                                {getRankChangeIcon(result.rankChange)}
                                <div className="text-right">
                                  {getRankChangeBadge(
                                    result.rankChange,
                                    result.currentRank,
                                    result.previousRank,
                                    result.rankChangeValue
                                  )}
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {result.processedAt
                                      ? new Date(result.processedAt).toLocaleTimeString()
                                      : ""}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="text-right">
                                <Badge variant="destructive" className="mb-1">
                                  {"Processing failed"}
                                </Badge>
                                <div className="text-xs text-muted-foreground">
                                  {result.processedAt
                                    ? new Date(result.processedAt).toLocaleTimeString()
                                    : "Failed to process"}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {progress.status === "RUNNING" &&
                    progress.processedKeywords < progress.totalKeywords && (
                      <div className="col-span-full text-center py-6">
                        <div className="inline-flex items-center space-x-2 text-muted-foreground">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span className="text-sm">
                            {progress.totalKeywords - progress.processedKeywords} keywords
                            remaining...
                          </span>
                        </div>
                      </div>
                    )}
                </div>

              )}
            </ScrollArea>
          </div>

          <Separator />

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Batch ID: <code className="text-xs bg-muted px-1 py-0.5 rounded">{progress.batchId}</code>
            </div>

            <div className="flex justify-end">
              {isCompleted ? (
                <Button onClick={onClose} className="min-w-20">
                  Close
                </Button>
              ) : (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing in progress...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface Location {
  lat: number
  lng: number
}

interface KeywordTrackerIntegrationProps {
  location: Location
  businessName: string
  trackedKeywords: any[]
}

const KeywordTrackerIntegration: React.FC<KeywordTrackerIntegrationProps> = ({
  location,
  businessName,
  trackedKeywords,
}) => {
  const [showProgress, setShowProgress] = useState<boolean>(false)
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  const requestBatchUpdate = async (): Promise<void> => {
    setUpdating("batch")
    try {
      const response = await fetch("/api/batch-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: businessName,
          location: `${location.lat},${location.lng}`,
        }),
      })

      const data: { success: boolean; data: { batchId: string }; error?: string } = await response.json()

      if (data.success) {
        setCurrentBatchId(data.data.batchId)
        setShowProgress(true)
        setUpdating(null)
      } else {
        throw new Error(data.error || "Failed to request batch update")
      }
    } catch (err) {
      console.error("Batch update failed:", err)
      setUpdating(null)
    }
  }

  const handleProgressClose = (): void => {
    setShowProgress(false)
    setCurrentBatchId(null)
  }

  return (
    <>
      <Button onClick={requestBatchUpdate} disabled={updating === "batch"} className="flex items-center space-x-2">
        {updating === "batch" ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Starting Update...</span>
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4" />
            <span>Update All Keywords</span>
          </>
        )}
      </Button>

      <BatchProgressModal
        isOpen={showProgress}
        onClose={handleProgressClose}
        batchId={currentBatchId}
        businessName={businessName}
        totalKeywords={trackedKeywords.length}
      />
    </>
  )
}

export default BatchProgressModal
