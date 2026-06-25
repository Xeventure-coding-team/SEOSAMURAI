"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import {
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Trophy,
  TrendingUp,
  Zap,
  Target,
  Flame,
  Crown,
  XCircle,
  CalendarClock,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import TaskActionButton from "./TaskActionButton"
import { PlanGate } from "../PlanGate"
import { Skeleton } from "../ui/skeleton"
import { Badge } from "../ui/badge"

type Task = {
  id: string
  title: string
  description?: string
  status: "pending" | "in_progress" | "completed" | "excluded"
  priority?: "high" | "medium" | "low"
  category?: string
  type?: string
  impact?: string
  estimatedTime?: string
  points: number
  completedAt?: string
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  achievedAt: string;
  value: number;
}

type ApiData = {
  stats?: {
    level: number
    totalPoints: number
    progressToNextLevel: number
    pointsInCurrentLevel: number
    pointsForNextLevel: number
    currentStreak: number
    longestStreak: number
    weeklyPoints: number
    tasksCompleted: number
    monthlyPoints: number
  }
  scores?: {
    profile: number
    engagement: number
    content: number
  }
  tasks?: {
    active: Task[]
    statistics?: any
  }
  performance?: {
    topCategories: Array<{ category: string; tasksCompleted: number; pointsEarned: number }>
  }
  milestones?: {
    recent: Milestone[]
  }
  achievements?: Array<{ id: string; title: string; description?: string; points: number }>
  completedTasks?: Task[]
  excludedTasks?: Task[]
  week?: string
  refreshedAt?: string
  nextRefresh?: string
  message?: string
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || "Failed to fetch")
  }
  return res.json()
}

export default function TaskManager({
  locationId,
  placeId,
  gmbAccountId,
  accessToken,
  description,
  businessName,
  primaryCategory,
  additionalCategories,
  address,
  services
}: {
  locationId?: string
  placeId?: string
  gmbAccountId?: string
  accessToken?: string
  description?: string
  businessName?: string
  primaryCategory?: string
  additionalCategories?: string[]
  address?: string
  services?: Record<string, any>
}) {
  const [refreshing, setRefreshing] = useState(false)
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null)
  const [excludingTaskId, setExcludingTaskId] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function getWeekNumber(date: Date): string {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  }

  const currentWeek = getWeekNumber(new Date());

  const { data, error, isLoading, mutate } = useSWR<ApiData>(
    locationId
      ? `/api/tasks?locationId=${encodeURIComponent(locationId)}`
      : null,
    fetcher,
    { revalidateOnFocus: true, revalidateOnReconnect: true },
  )

  const stats = data?.stats
  const scores = data?.scores
  const tasks = data?.tasks?.active || []
  const completedTasks = data?.completedTasks || []
  const excludedTasks = data?.excludedTasks || []
  const performance = data?.performance
  const weekFromApi = data?.week || currentWeek
  const refreshedAt = data?.refreshedAt
  const nextRefresh = data?.nextRefresh

  // Refetch when window refocuses or after any key actions
  useEffect(() => {
    const onFocus = () => mutate()
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [mutate])

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "high":
        return "bg-destructive"
      case "medium":
        return "bg-primary"
      case "low":
        return "bg-muted"
      default:
        return "bg-border"
    }
  }

  const getStatusIcon = (status: Task["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-primary" aria-hidden="true" />
      case "in_progress":
        return <Clock className="w-5 h-5 text-primary" aria-hidden="true" />
      default:
        return <AlertCircle className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
    }
  }

  const getDaysUntilRefresh = () => {
    if (!nextRefresh) return null
    const now = new Date()
    const next = new Date(nextRefresh)
    const daysLeft = Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return daysLeft
  }

  const daysUntilRefresh = getDaysUntilRefresh()
  const canRefresh = !nextRefresh || (daysUntilRefresh !== null && daysUntilRefresh <= 0)

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId, placeId, gmbAccountId, accessToken }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to generate tasks")
      }
      const body = (await res.json()) as ApiData
      if (body.message) setSuccess(body.message)
      // Always revalidate all data after refresh
      await mutate()
    } catch (e: any) {
      console.error("Generate tasks error:", e)
    } finally {
      setRefreshing(false)
      // Clear success after a moment
      if (success) setTimeout(() => setSuccess(null), 2500)
    }
  }

  const completeTask = async (taskId: string) => {
    setCompletingTaskId(taskId)
    try {
      const res = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to complete task")
      }
      const body = (await res.json()) as ApiData
      if (body.message) setSuccess(body.message)
      // Revalidate everything to stay in sync
      await mutate()
    } catch (e: any) {
      console.error("Complete task error:", e)
    } finally {
      setCompletingTaskId(null)
      if (success) setTimeout(() => setSuccess(null), 2500)
    }
  }

  const excludeTask = async (taskId: string) => {
    setExcludingTaskId(taskId)
    try {
      const res = await fetch(`/api/tasks/${taskId}/exclude`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "dismissed" }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to exclude task")
      }
      const body = (await res.json()) as ApiData
      if (body.message) setSuccess(body.message)
      // Revalidate everything to stay in sync
      await mutate()
    } catch (e: any) {
      console.error("Exclude task error:", e)
    } finally {
      setExcludingTaskId(null)
      if (success) setTimeout(() => setSuccess(null), 2500)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="space-y-6 py-8">
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </div>
          <div className="flex gap-3 pt-4">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-32" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const handleTaskUpdate = () => {
    // Refresh tasks or update UI
    console.log('Task updated successfully');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">

        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Task Dashboard
          </h1>

          <p className="text-sm text-muted-foreground">
            Week {currentWeek}
            {currentWeek && " • "}
            {locationId}
          </p>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button onClick={handleRefresh} disabled={refreshing || !canRefresh} className="gap-2">
                  <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
                  {refreshing ? "Generating..." : "Refresh Tasks"}
                </Button>
              </div>
            </TooltipTrigger>
            {!canRefresh ? (
              <TooltipContent>
                <p>{`Tasks were already generated${refreshedAt ? "" : ""}`}</p>
                {typeof daysUntilRefresh === "number" && (
                  <p className="text-xs mt-1">Next refresh in {daysUntilRefresh} day(s)</p>
                )}
              </TooltipContent>
            ) : (
              <TooltipContent>
                <p>Generate new tasks for this location</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg" role="alert" aria-live="polite">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-destructive text-sm">{(error as Error).message}</p>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg" role="status" aria-live="polite">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-sm font-medium">{success}</p>
            </div>
            <button
              onClick={() => setSuccess("")}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close alert"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="excluded">Excluded</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-3 mt-4">
          {stats ? (
            <>
              {/* Level Card */}
              <Card>
                <CardContent className="space-y-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Current Level
                      </p>

                      <h2 className="text-3xl font-bold tracking-tight">
                        Level {stats.level}
                      </h2>

                      <p className="text-sm text-muted-foreground mt-1">
                        Local Champion
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-4xl font-bold text-primary">
                        {stats.totalPoints}
                      </div>

                      <p className="text-sm text-muted-foreground">
                        Total XP
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Progress to Level {stats.level + 1}
                      </span>

                      <span className="font-semibold">
                        {stats.progressToNextLevel}%
                      </span>
                    </div>

                    <div className="h-3 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-700"
                        style={{
                          width: `${stats.progressToNextLevel}%`,
                        }}
                      />
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {stats.pointsInCurrentLevel} / {stats.pointsForNextLevel} XP
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-1">
                  <CardContent>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Streak
                        </p>

                        <div className="text-3xl font-bold mt-1">
                          {stats.currentStreak}
                        </div>
                      </div>

                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Flame className="h-5 w-5 text-primary" />
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {stats.longestStreak} longest
                    </p>
                  </CardContent>
                </Card>

                <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-1">
                  <CardContent>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          This Week
                        </p>

                        <div className="text-3xl font-bold mt-1">
                          {stats.weeklyPoints}
                        </div>
                      </div>

                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Zap className="h-5 w-5 text-primary" />
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      points earned
                    </p>
                  </CardContent>
                </Card>

                <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-1">
                  <CardContent>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Completed
                        </p>

                        <div className="text-3xl font-bold mt-1">
                          {stats.tasksCompleted}
                        </div>
                      </div>

                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      total tasks
                    </p>
                  </CardContent>
                </Card>

                <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-1">
                  <CardContent>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          This Month
                        </p>

                        <div className="text-3xl font-bold mt-1">
                          {stats.monthlyPoints}
                        </div>
                      </div>

                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <TrendingUp className="h-5 w-5 text-primary" />
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      points earned
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Score Breakdown */}
              {scores && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Target className="h-5 w-5 text-primary" aria-hidden="true" />
                      </div>

                      <div>
                        <h3 className="font-bold">Performance Scores</h3>
                        <p className="text-sm font-normal text-muted-foreground">
                          Your profile health and engagement metrics
                        </p>
                      </div>
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {[
                      { label: "Profile Score", value: scores.profile },
                      { label: "Engagement Score", value: scores.engagement },
                      { label: "Content Score", value: scores.content },
                    ].map((s) => (
                      <div key={s.label} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {s.label}
                          </span>

                          <span className="text-sm font-semibold">
                            {s.value}/100
                          </span>
                        </div>

                        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-700"
                            style={{ width: `${s.value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Trophy className="w-10 h-10 text-muted-foreground mb-3" aria-hidden="true" />
                <h3 className="font-semibold mb-1">Start your streak</h3>
                <p className="text-sm text-muted-foreground mb-4 text-center">
                  No overview yet. Refresh to roll new quests and begin earning XP.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="mt-4">
          <PlanGate mode={{ type: "feature", feature: "tasks" }} featureName="Tasks">
            <div className="space-y-3">
              <div className="space-y-1">
                <h3 className="text-xl font-bold tracking-tight">
                  Active Tasks
                </h3>

                <p className="text-sm text-muted-foreground">
                  Pending and in-progress tasks for this location
                </p>
              </div>
              {tasks.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <AlertCircle className="w-10 h-10 text-muted-foreground mb-3" aria-hidden="true" />
                    <p className="text-muted-foreground mb-4">No tasks available</p>
                    <Button onClick={handleRefresh} disabled={refreshing} className="gap-2">
                      {refreshing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4" aria-hidden="true" />
                          Generate Tasks
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tasks.map((task) => (
                    <Card key={task.id} className="flex flex-col">
                      <CardContent className="space-y-4 flex-1">

                        {/* Title & Status */}
                        <div className="flex items-start gap-4">
                          <div className="mt-1 shrink-0">
                            {getStatusIcon(task.status)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4
                              className={`text-lg font-bold leading-tight tracking-tight ${task.status === "completed"
                                ? "line-through text-muted-foreground"
                                : "text-foreground"
                                }`}
                            >
                              {task.title}
                            </h4>

                            {task.description && (
                              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                {task.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-2">
                          <span className="px-3 py-1 bg-secondary text-secondary-foreground text-xs rounded-full capitalize font-medium">
                            {(task.category || task.type || "uncategorized").replace(/_/g, " ")}
                          </span>
                          <span className="px-3 py-1 bg-secondary text-secondary-foreground text-xs rounded-full capitalize font-medium flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5" />
                            {(task.impact || "normal").replace(/_/g, " ")}
                          </span>
                          {task.status === "in_progress" && (
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium border border-blue-200">
                              In Progress
                            </span>
                          )}
                          {task.status === "completed" && (
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium border border-emerald-200">
                              ✓ Done
                            </span>
                          )}
                        </div>

                        {/* Progress */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-muted-foreground">
                              Progress
                            </span>

                            <span
                              className={`text-sm font-semibold ${task.status === "completed"
                                ? "text-emerald-600"
                                : task.status === "in_progress"
                                  ? "text-primary"
                                  : "text-muted-foreground"
                                }`}
                            >
                              {task.status === "completed"
                                ? "100%"
                                : task.status === "in_progress"
                                  ? "50%"
                                  : "0%"}
                            </span>
                          </div>

                          <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out ${task.status === "completed"
                                ? "bg-emerald-500"
                                : task.status === "in_progress"
                                  ? "bg-primary"
                                  : "bg-muted-foreground/30"
                                }`}
                              style={{
                                width:
                                  task.status === "completed"
                                    ? "100%"
                                    : task.status === "in_progress"
                                      ? "50%"
                                      : "0%",
                              }}
                            />
                          </div>

                          <div className="flex justify-between text-[11px] text-muted-foreground">
                            <span>Not started</span>
                            <span>In progress</span>
                            <span>Completed</span>
                          </div>
                        </div>


                      </CardContent>

                      <CardFooter className="w-full">
                        {task.status !== "completed" && (
                          <div className="w-full">
                            <div className="flex items-center gap-3 w-full">
                              {/* Action button - 80% */}
                              <div className="flex-[4] [&>*]:w-full">
                                <TaskActionButton
                                  className="w-full"
                                  task={task}
                                  locationId={locationId}
                                  onTaskUpdate={handleTaskUpdate}
                                  description={description}
                                  placeId={placeId}
                                  gmbAccountId={gmbAccountId}
                                  accessToken={accessToken}
                                  businessName={businessName}
                                  primaryCategory={primaryCategory}
                                  additionalCategories={additionalCategories}
                                  address={address}
                                  services={services}
                                  mutate={mutate}
                                />
                              </div>

                              {/* Exclude button - 20% */}
                              <div className="basis-1/5">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        onClick={() => excludeTask(task.id)}
                                        disabled={excludingTaskId === task.id}
                                        variant="outline"
                                        className="w-full gap-2 hover:text-destructive hover:border-destructive/50"
                                      >
                                        {excludingTaskId === task.id ? (
                                          <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Removing...
                                          </>
                                        ) : (
                                          <>
                                            <XCircle className="w-4 h-4" />
                                            Exclude
                                          </>
                                        )}
                                      </Button>
                                    </TooltipTrigger>

                                    <TooltipContent side="bottom">
                                      <p className="text-sm">
                                        Hide this task until the next refresh
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardFooter>

                    </Card>
                  ))}
                </div>
              )}
            </div>
          </PlanGate>
        </TabsContent>

        {/* Completed Tab */}
        <TabsContent value="completed" className="mt-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <h3 className="text-2xl font-bold leading-none">
                Completed This Month
              </h3>

              <p className="text-sm text-muted-foreground">
                Tasks you've successfully completed this month
              </p>
            </div>
            {completedTasks.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 rounded-full bg-primary/10 p-4">
                    <CheckCircle2
                      className="w-8 h-8 text-primary"
                      aria-hidden="true"
                    />
                  </div>

                  <h4 className="text-lg font-semibold">
                    No completed tasks yet
                  </h4>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Complete your first task to start building your streak.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {completedTasks.map((task) => (
                  <Card
                    key={task.id}
                    className="transition-all duration-200 hover:shadow-md"
                  >
                    <CardContent className="space-y-4">
                      {/* Title */}
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                          <CheckCircle2
                            className="h-5 w-5 text-emerald-600"
                            aria-hidden="true"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="text-lg font-semibold leading-tight tracking-tight">
                            {task.title}
                          </h4>

                          {task.description && (
                            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full border bg-muted px-3 py-1 text-xs font-semibold capitalize text-muted-foreground">
                          {(task.category || "uncategorized").replace(/_/g, " ")}
                        </span>

                        <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold capitalize text-primary">
                          {(task.type || "general").replace(/_/g, " ")}
                        </span>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between border-t pt-4">
                        <div className="space-y-0.5">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Completed
                          </p>

                          <p className="text-sm font-semibold">
                            {task.completedAt
                              ? new Date(task.completedAt).toLocaleDateString()
                              : "Recently"}
                          </p>
                        </div>

                        <div className="rounded-full bg-primary/10 px-4 py-2">
                          <span className="text-sm font-bold text-primary">
                            +{task.points} XP
                          </span>
                        </div>
                      </div>

                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

          </div>
        </TabsContent>

        {/* Excluded Tab */}
        <TabsContent value="excluded" className="mt-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <h3 className="text-2xl font-bold tracking-tight">
                Excluded This Month
              </h3>

              <p className="text-sm text-muted-foreground">
                Tasks you've chosen to hide from your monthly progress
              </p>
            </div>
            {excludedTasks.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 rounded-full bg-muted p-4">
                    <AlertCircle
                      className="h-8 w-8 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </div>

                  <h4 className="text-lg font-semibold">
                    No excluded tasks
                  </h4>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Hidden tasks will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {excludedTasks.map((task) => (
                  <Card key={task.id} className="bg-muted/20">
                    <CardContent className="space-y-3">
                      {/* Title */}
                      <div className="flex items-start gap-3">
                        <AlertCircle
                          className="h-4 w-4 text-muted-foreground mt-1 shrink-0"
                          aria-hidden="true"
                        />

                        <div className="flex-1">
                          <h4 className="text-base font-medium text-muted-foreground line-through">
                            {task.title}
                          </h4>

                          {task.description && (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="border-t pt-3">
                        <p className="text-xs text-muted-foreground">
                          Resets next month
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

          </div>
        </TabsContent>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="mt-4">
          <PlanGate mode={{ type: "feature", feature: "task-achievements" }} featureName="Achievements">
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <Trophy className="h-6 w-6 text-primary" aria-hidden="true" />

                  <h3 className="text-2xl font-bold tracking-tight">
                    Recent Achievements
                  </h3>
                </div>

                <p className="text-sm text-muted-foreground">
                  Milestones and achievements you've earned
                </p>
              </div>
              {data?.achievements && data.achievements.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {data.achievements.map((a) => (
                    <Card
                      key={a.id}
                      className="transition-all duration-200 hover:shadow-md"
                    >
                      <CardContent>
                        <div className="flex items-start gap-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                            <Trophy className="h-5 w-5 text-primary" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className="text-base font-semibold leading-tight">
                              {a.title}
                            </h4>

                            {a.description && (
                              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                                {a.description}
                              </p>
                            )}

                            <div className="mt-3">
                              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                                +{a.points} XP
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <Trophy className="w-10 h-10 text-muted-foreground/50 mb-2" aria-hidden="true" />
                    <p className="text-muted-foreground font-medium mb-0.5">No achievements yet</p>
                    <p className="text-xs text-muted-foreground/70">Complete tasks to earn achievements</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </PlanGate>
        </TabsContent>

        {/* Milestones Tab */}
        <TabsContent value="milestones" className="mt-4">
          <PlanGate mode={{ type: "feature", feature: "task-milestones" }} featureName="Milestones">
            {/* Milestones Tab */}


            <div className="space-y-3">
              <div className="space-y-1.5">
                <h3 className="flex items-center gap-3 text-2xl font-bold tracking-tight">
                  <Trophy className="h-6 w-6 text-primary" aria-hidden="true" />
                  Recent Milestones
                </h3>

                <p className="text-sm text-muted-foreground">
                  Celebrate key accomplishments and progress milestones
                </p>
              </div>
              {data?.milestones.recent && data.milestones.recent.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {data.milestones.recent.map((m) => (
                    <Card
                      key={m.id}
                      className="transition-all duration-200 hover:shadow-md hover:-translate-y-1"
                    >
                      <CardContent className="space-y-4">

                        {/* Header */}
                        <div className="flex items-start gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/15">
                            <Trophy
                              className="h-5 w-5 text-primary"
                              aria-hidden="true"
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-lg font-bold leading-tight tracking-tight">
                                {m.title}
                              </h4>

                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                                Milestone
                              </span>
                            </div>

                            {m.description && (
                              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                {m.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between border-t pt-4">
                          <div className="space-y-1">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              Achieved on
                            </p>

                            <p className="text-sm font-semibold">
                              {new Date(m.achievedAt).toLocaleDateString()}
                            </p>
                          </div>

                          <div className="flex items-center gap-1 rounded-full bg-primary/10 px-4 py-2">
                            <Trophy className="h-4 w-4 text-primary" />
                            <span className="text-sm font-bold text-primary">
                              +{m.value} XP
                            </span>
                          </div>
                        </div>

                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-4 rounded-full bg-primary/10 p-4">
                      <Trophy
                        className="h-8 w-8 text-primary"
                        aria-hidden="true"
                      />
                    </div>

                    <h4 className="text-lg font-semibold">
                      No milestones yet
                    </h4>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Achieve milestones to track your progress.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

          </PlanGate>
        </TabsContent>
      </Tabs>
    </div>
  )
}
