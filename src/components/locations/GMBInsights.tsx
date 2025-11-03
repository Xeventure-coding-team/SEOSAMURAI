"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Phone,
  MapPin,
  Globe,
  MessageCircle,
  Calendar,
  ShoppingBag,
  UtensilsCrossed,
  FileText,
  Monitor,
  Smartphone,
} from "lucide-react"
import ErrorRender from "../Error"
import { Loader } from "../Loader/Loader"

interface DailyMetric {
  dailyMetric: string
  dailySubEntityType?: {
    timeOfDay?: string
  }
}

interface DailyMetricTimeSeries {
  dailyMetric: string
  dailySubEntityType?: {
    timeOfDay?: string
  }
  timeSeries?: {
    datedValues: Array<{
      date: { year: number; month: number; day: number }
      value: string
    }>
  }
}

interface MultiDailyMetricTimeSeries {
  dailyMetricTimeSeries: DailyMetricTimeSeries[]
}

interface InsightsResponse {
  insights: {
    multiDailyMetricTimeSeries?: MultiDailyMetricTimeSeries[]
    timeSeries?: any // Keep for backward compatibility
  }
  dateRange: {
    startDate: { year: number; month: number; day: number }
    endDate: { year: number; month: number; day: number }
  }
  totals?: Record<string, number>
}

interface GMBInsightsProps {
  locationId: string
  accessToken: string
}

export default function GMBInsights({ locationId, accessToken }: GMBInsightsProps) {
  const [insightsData, setInsightsData] = useState<InsightsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!locationId || !accessToken) {
      setError("Missing required parameters: locationId and accessToken")
      setLoading(false)
      return
    }

    const today = new Date()
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - 30)
    const startDateStr = startDate.toISOString().split("T")[0]
    const endDateStr = today.toISOString().split("T")[0]

    const fetchInsights = async () => {
      try {
        const response = await fetch(
          "/api/insights?" +
            new URLSearchParams({
              location_name: locationId,
              access_token: accessToken,
              start_date: startDateStr,
              end_date: endDateStr,
            }),
        )

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        console.log("Received insights data:", data) // Debug log
        setInsightsData(data)
      } catch (err: any) {
        console.error("Error fetching insights:", err)
        setError(err.message || "Failed to fetch insights")
      } finally {
        setLoading(false)
      }
    }

    fetchInsights()
  }, [locationId, accessToken])

  // Function to get icon for each metric
  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case "CALL_CLICKS":
        return <Phone className="w-4 h-4" />
      case "WEBSITE_CLICKS":
        return <Globe className="w-4 h-4" />
      case "BUSINESS_DIRECTION_REQUESTS":
        return <MapPin className="w-4 h-4" />
      case "BUSINESS_CONVERSATIONS":
        return <MessageCircle className="w-4 h-4" />
      case "BUSINESS_IMPRESSIONS_DESKTOP_MAPS":
        return <Monitor className="w-4 h-4" />
      case "BUSINESS_IMPRESSIONS_MOBILE_MAPS":
        return <Smartphone className="w-4 h-4" />
      case "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH":
        return <Monitor className="w-4 h-4" />
      case "BUSINESS_IMPRESSIONS_MOBILE_SEARCH":
        return <Smartphone className="w-4 h-4" />
      case "BUSINESS_BOOKINGS":
        return <Calendar className="w-4 h-4" />
      case "BUSINESS_FOOD_ORDERS":
        return <UtensilsCrossed className="w-4 h-4" />
      case "BUSINESS_FOOD_MENU_CLICKS":
        return <FileText className="w-4 h-4" />
      default:
        return <ShoppingBag className="w-4 h-4" />
    }
  }

  // Function to format metric name
  const formatMetricName = (metric: string): string => {
    const names: Record<string, string> = {
      CALL_CLICKS: "Phone Calls",
      WEBSITE_CLICKS: "Website Clicks",
      BUSINESS_DIRECTION_REQUESTS: "Direction Requests",
      BUSINESS_CONVERSATIONS: "Messages",
      BUSINESS_IMPRESSIONS_DESKTOP_MAPS: "Desktop Map Views",
      BUSINESS_IMPRESSIONS_MOBILE_MAPS: "Mobile Map Views",
      BUSINESS_IMPRESSIONS_DESKTOP_SEARCH: "Desktop Search Views",
      BUSINESS_IMPRESSIONS_MOBILE_SEARCH: "Mobile Search Views",
      BUSINESS_BOOKINGS: "Bookings",
      BUSINESS_FOOD_ORDERS: "Food Orders",
      BUSINESS_FOOD_MENU_CLICKS: "Menu Views",
    }
    return names[metric] || metric.replace("BUSINESS_", "").replace(/_/g, " ")
  }

  // Define all possible metrics with default values
  const allMetrics = [
    "BUSINESS_IMPRESSIONS_DESKTOP_MAPS",
    "BUSINESS_IMPRESSIONS_MOBILE_MAPS",
    "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH",
    "BUSINESS_IMPRESSIONS_MOBILE_SEARCH",
    "BUSINESS_CONVERSATIONS",
    "BUSINESS_DIRECTION_REQUESTS",
    "CALL_CLICKS",
    "WEBSITE_CLICKS",
    "BUSINESS_BOOKINGS",
    "BUSINESS_FOOD_ORDERS",
    "BUSINESS_FOOD_MENU_CLICKS",
  ]

  // Calculate totals for each metric based on the actual API response structure
  const calculateTotals = () => {
    // If totals are already provided in the response, use them
    if (insightsData?.totals) {
      return insightsData.totals
    }

    const totals: Record<string, number> = {}

    // Initialize all metrics with 0
    allMetrics.forEach((metric) => {
      totals[metric] = 0
    })

    if (!insightsData?.insights) {
      return totals
    }

    // Handle new multiDailyMetricTimeSeries structure
    if (insightsData.insights.multiDailyMetricTimeSeries) {
      insightsData.insights.multiDailyMetricTimeSeries.forEach((multiSeries) => {
        if (multiSeries.dailyMetricTimeSeries) {
          multiSeries.dailyMetricTimeSeries.forEach((series) => {
            const metric = series.dailyMetric
            if (series.timeSeries?.datedValues) {
              const total = series.timeSeries.datedValues.reduce((sum, item) => {
                return sum + (Number.parseInt(item.value || "0") || 0)
              }, 0)
              totals[metric] = (totals[metric] || 0) + total
            }
          })
        }
      })
    }

    // Fallback to old timeSeries structure for backward compatibility
    else if (insightsData.insights.timeSeries) {
      const timeSeries = insightsData.insights.timeSeries

      if (Array.isArray(timeSeries)) {
        timeSeries.forEach((series) => {
          if (series.metric && series.datedValues) {
            const total = series.datedValues.reduce((sum: number, item: any) => {
              return sum + (Number.parseInt(item.value || "0") || 0)
            }, 0)
            totals[series.metric] = total
          }
        })
      } else if (timeSeries.datedValues) {
        timeSeries.datedValues.forEach((datedValue: any) => {
          if (datedValue.metricValues) {
            datedValue.metricValues.forEach((metricValue: any) => {
              const metric = metricValue.metric
              const value = metricValue.value || 0
              totals[metric] = (totals[metric] || 0) + value
            })
          }
        })
      }
    }

    return totals
  }

  // Format date helper
  const formatDate = (dateObj: { year: number; month: number; day: number }) => {
    return new Date(dateObj.year, dateObj.month - 1, dateObj.day).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  // Get data availability info
  const getDataInfo = () => {
    const totals = calculateTotals()
    const hasData = Object.values(totals).some((value) => value > 0)

    // Try to get day count from date range
    let dayCount = 0
    if (insightsData?.dateRange) {
      const start = new Date(
        insightsData.dateRange.startDate.year,
        insightsData.dateRange.startDate.month - 1,
        insightsData.dateRange.startDate.day,
      )
      const end = new Date(
        insightsData.dateRange.endDate.year,
        insightsData.dateRange.endDate.month - 1,
        insightsData.dateRange.endDate.day,
      )
      dayCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    }

    return { hasData, dayCount }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              GMB Insights - Last 30 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Loader text="Retrieving information..." />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
       <ErrorRender error="We couldn't load this content. You can retry or report the issue." />
    )
  }

  const totals = calculateTotals()
  const dataInfo = getDataInfo()
  const dateRange = insightsData?.dateRange

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            GMB Insights Summary
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {dateRange ? (
              <>
                Performance metrics from {formatDate(dateRange.startDate)} to {formatDate(dateRange.endDate)} (
                {dataInfo.dayCount} days)
              </>
            ) : (
              "Performance metrics for your Google My Business listing"
            )}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {Object.entries(totals).map(([metric, total]) => (
    <Card key={metric}>
      <CardContent>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {getMetricIcon(metric)}
            <h3 className="font-medium text-sm">{formatMetricName(metric)}</h3>
          </div>
        </div>
        <div className="text-2xl font-bold">{total.toLocaleString()}</div>
        <p className="text-xs text-muted-foreground">Total in period</p>
      </CardContent>
    </Card>
  ))}
</div>

{!dataInfo.hasData && (
  <div className="mt-4">
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-3">
          <div className="text-yellow-500 mt-1">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h4 className="font-medium mb-1">No Activity Recorded</h4>
            <p className="text-sm text-muted-foreground mb-3">
              We retrieved {dataInfo.dayCount} days of data from your Google My Business account, but no customer engagement was recorded during this period.
            </p>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">Possible reasons:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Your business profile had no customer interactions</li>
                <li>The location is newly created</li>
                <li>Some metrics may not be available for your business type</li>
                <li>Data may be delayed (typically 24-48 hours)</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
)}
        </CardContent>
      </Card>

      {dataInfo.hasData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="text-center">
                  <div className="text-2xl font-bold">
                    {(totals["BUSINESS_IMPRESSIONS_DESKTOP_MAPS"] || 0) +
                      (totals["BUSINESS_IMPRESSIONS_MOBILE_MAPS"] || 0) +
                      (totals["BUSINESS_IMPRESSIONS_DESKTOP_SEARCH"] || 0) +
                      (totals["BUSINESS_IMPRESSIONS_MOBILE_SEARCH"] || 0)}
                  </div>
                  <div className="text-sm text-muted-foreground font-medium">Total Views</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center">
                  <div className="text-2xl font-bold">{totals["CALL_CLICKS"] || 0}</div>
                  <div className="text-sm text-muted-foreground font-medium">Phone Calls</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center">
                  <div className="text-2xl font-bold">{totals["WEBSITE_CLICKS"] || 0}</div>
                  <div className="text-sm text-muted-foreground font-medium">Website Visits</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center">
                  <div className="text-2xl font-bold">{totals["BUSINESS_DIRECTION_REQUESTS"] || 0}</div>
                  <div className="text-sm text-muted-foreground font-medium">Directions</div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
