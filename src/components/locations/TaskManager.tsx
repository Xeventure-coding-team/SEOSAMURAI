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
  Award,
  Zap,
  Target,
  Flame,
  Crown,
  XCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AnimatedTabItem, AnimatedTabs } from "../design/AnimatedTabs"
import TaskActionButton from "./TaskActionButton"

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
      <div className="pt-12 flex items-center justify-center">
        <div className="inline-flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          <span>Preparing your workspace...</span>
        </div>
      </div>
    )
  }

  const handleTaskUpdate = () => {
    // Refresh tasks or update UI
    console.log('Task updated successfully');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground text-pretty">Task Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {"Week "}
            {currentWeek}
            {currentWeek ? " • " : ""}
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
        <div className="bg-destructive/10 border border-destructive/30 p-4 rounded-lg relative" role="alert" aria-live="polite">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-destructive" aria-hidden="true" />
            <p className="text-destructive">{(error as Error).message}</p>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg relative" role="status" aria-live="polite">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" aria-hidden="true" />
            <p className="text-foreground">{success}</p>
          </div>
          <button
            onClick={() => setSuccess("")}
            className="absolute top-4 right-4 text-primary hover:text-primary/80"
            aria-label="Close alert"
          >
            ✕
          </button>
        </div>
      )}


      <Card className="pt-0">
        <AnimatedTabs
          items={["overview", "tasks", "completed", "excluded", "achievements", "milestones"]}
          defaultTab="overview"
          className="w-full"
          noPadding={true}
        >
          <AnimatedTabItem value="overview" label="Overview">
            <div className="p-6">
              {stats ? (
                <>
                  {/* Hero Stats */}
                  <div className="bg-card border border-border rounded-2xl p-6 text-foreground shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-muted/60 p-3 rounded-xl ring-1 ring-border">
                          <Crown className="w-8 h-8 text-primary" aria-hidden="true" />
                        </div>
                        <div>
                          <div className="text-4xl font-bold">
                            {"Level "}
                            {stats.level}
                          </div>
                          <div className="text-muted-foreground">Local Champion</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold">{stats.totalPoints}</div>
                        <div className="text-muted-foreground">Total Points</div>
                      </div>
                    </div>

                    {/* XP Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {"Progress to Level "}
                          {stats.level + 1}
                        </span>
                        <span className="text-foreground">{stats.progressToNextLevel}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-500"
                          style={{ width: `${stats.progressToNextLevel}%` }}
                          aria-label="XP progress"
                        />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {stats.pointsInCurrentLevel}/{stats.pointsForNextLevel} XP
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div className="bg-card border border-border rounded-xl p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <Flame className="w-5 h-5 text-primary" aria-hidden="true" />
                        <span className="text-sm text-muted-foreground">Streak</span>
                      </div>
                      <div className="text-3xl font-bold text-foreground">{stats.currentStreak}</div>
                      <div className="text-xs text-muted-foreground">{stats.longestStreak} longest</div>
                    </div>

                    <div className="bg-card border border-border rounded-xl p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-5 h-5 text-primary" aria-hidden="true" />
                        <span className="text-sm text-muted-foreground">This Week</span>
                      </div>
                      <div className="text-3xl font-bold text-foreground">{stats.weeklyPoints}</div>
                      <div className="text-xs text-muted-foreground">points earned</div>
                    </div>

                    <div className="bg-card border border-border rounded-xl p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-5 h-5 text-primary" aria-hidden="true" />
                        <span className="text-sm text-muted-foreground">Completed</span>
                      </div>
                      <div className="text-3xl font-bold text-foreground">{stats.tasksCompleted}</div>
                      <div className="text-xs text-muted-foreground">total tasks</div>
                    </div>

                    <div className="bg-card border border-border rounded-xl p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-5 h-5 text-primary" aria-hidden="true" />
                        <span className="text-sm text-muted-foreground">This Month</span>
                      </div>
                      <div className="text-3xl font-bold text-foreground">{stats.monthlyPoints}</div>
                      <div className="text-xs text-muted-foreground">points earned</div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-card border border-border rounded-2xl p-8 text-center">
                  <Trophy className="w-10 h-10 text-primary mx-auto mb-3" aria-hidden="true" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">Start your streak</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    No overview yet. Refresh to roll new quests and begin earning XP.
                  </p>
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
                </div>
              )}

              {/* Score Breakdown */}
              {scores ? (
                <div className="bg-card border border-border rounded-xl p-6 mt-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" aria-hidden="true" />
                    Performance Scores
                  </h3>
                  <div className="space-y-4">
                    {[
                      { label: "Profile Score", value: scores.profile },
                      { label: "Engagement Score", value: scores.engagement },
                      { label: "Content Score", value: scores.content },
                    ].map((s) => (
                      <div key={s.label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">{s.label}</span>
                          <span className="font-semibold text-foreground">{s.value}/100</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${s.value}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-card border border-border rounded-xl p-6 mt-4 text-center text-muted-foreground">
                  No score data yet.
                </div>
              )}
            </div>
          </AnimatedTabItem>

          <AnimatedTabItem value="tasks" label="Tasks">
            <div className="p-5">
              <h3 className="text-lg font-semibold mb-4 text-foreground">Active Tasks</h3>
              {tasks.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-12 text-center">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
                  <p className="text-muted-foreground mb-4">No tasks available for this location</p>
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
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow focus-within:ring-1 focus-within:ring-primary/50 min-h-[220px]"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusIcon(task.status)}
                            <h4 className="font-semibold text-foreground">{task.title}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">{task.description}</p>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)} ml-2 flex-shrink-0`} />
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        {/* Category or Type (at least one badge) */}
                        <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full capitalize">
                          {(
                            task.category && task.type &&
                              task.category.replace(/_/g, " ").toLowerCase() ===
                              task.type.replace(/_/g, " ").toLowerCase()
                              ? task.category
                              : task.category || task.type || "uncategorized"
                          ).replace(/_/g, " ")}
                        </span>

                        {/* Impact badge */}
                        <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full flex items-center gap-1 capitalize">
                          <TrendingUp className="w-3 h-3 text-primary" />
                          {(task.impact || "normal").replace(/_/g, " ")}
                        </span>
                      </div>


                      <div className="mb-3">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{
                              width: task.status === "completed" ? "100%" : task.status === "in_progress" ? "50%" : "0%",
                            }}
                          />
                        </div>
                      </div>

                      {task.status !== "completed" && (
                        <div className="flex gap-2">
                          <TaskActionButton
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
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  onClick={() => excludeTask(task.id)}
                                  disabled={excludingTaskId === task.id}
                                  variant="outline"
                                  size="sm"
                                  className="gap-2"
                                >
                                  {excludingTaskId === task.id ? (
                                    <>
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                      Excluding...
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="w-4 h-4" />
                                      Exclude
                                    </>
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Hide this task until the next refresh</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </AnimatedTabItem>

          <AnimatedTabItem value="completed" label="Completed">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-foreground">Completed This Month</h3>
              {completedTasks.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-12 text-center">
                  <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
                  <p className="text-muted-foreground">No completed tasks this month</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {completedTasks.map((task) => (
                    <div key={task.id} className="bg-card border border-border rounded-xl p-5 opacity-90">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="w-5 h-5 text-primary" aria-hidden="true" />
                            <h4 className="font-semibold text-foreground">{task.title}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">{task.description}</p>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)} ml-2`} />
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full capitalize">
                          {(task.category || "uncategorized").replace(/_/g, " ")}
                        </span>
                        <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full capitalize">
                          {(task.type || "general").replace(/_/g, " ")}
                        </span>
                        <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full flex items-center gap-1 capitalize">
                          <TrendingUp className="w-3 h-3 text-primary" aria-hidden="true" />
                          {(task.impact || "normal").replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm mb-3">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-4 h-4" aria-hidden="true" />
                          {task.estimatedTime}
                        </span>
                        <span className="font-semibold text-primary">+{task.points} pts earned</span>
                      </div>

                      <div className="mb-3">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary transition-all" style={{ width: "100%" }} />
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground text-center">
                        Completed {task.completedAt ? new Date(task.completedAt).toLocaleDateString() : "Recently"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </AnimatedTabItem>

          <AnimatedTabItem value="excluded" label="Excluded">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-foreground">Excluded This Month</h3>
              {excludedTasks.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-12 text-center">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
                  <p className="text-muted-foreground">No excluded tasks this month</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {excludedTasks.map((task, key) => (
                    <div key={key} className="bg-card border border-border rounded-xl p-5 opacity-70">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
                            <h4 className="font-semibold text-foreground line-through">{task.title}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">{task.description}</p>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)} ml-2`} />
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full capitalize">
                          {(task.category || "uncategorized").replace(/_/g, " ")}
                        </span>
                        <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full capitalize">
                          {(task.type || "general").replace(/_/g, " ")}
                        </span>
                        <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full flex items-center gap-1 capitalize">
                          <TrendingUp className="w-3 h-3 text-primary" aria-hidden="true" />
                          {(task.impact || "normal").replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="text-xs text-muted-foreground text-center py-2 bg-muted rounded-lg">
                        Excluded — Will reset next month
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </AnimatedTabItem>

          <AnimatedTabItem value="achievements" label="Achievements">
            <div className="p-6">
              {data?.achievements && data.achievements.length > 0 ? (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-primary" aria-hidden="true" />
                    Recent Achievements
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {data.achievements.map((a) => (
                      <div
                        key={a.id}
                        className="group relative flex items-center gap-4 p-4 bg-card rounded-lg border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-md"
                      >
                        {/* Icon circle with gradient effect */}
                        <div className="relative w-8 h-8 flex-shrink-0 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border border-primary/20 group-hover:border-primary/40 transition-all duration-300 group-hover:scale-105">
                          <span className="font-bold text-primary text-xl">
                            {a.title.charAt(0)}
                          </span>
                        </div>

                        {/* Content section */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <h3 className="font-semibold text-foreground text-base leading-tight group-hover:text-primary transition-colors duration-200">
                            {a.title}
                          </h3>
                          <p className="text-sm text-muted-foreground leading-snug line-clamp-2">
                            {a.description}
                          </p>
                        </div>

                        {/* Points badge with subtle animation */}
                        <div className="flex-shrink-0">
                          <div className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full font-semibold text-sm shadow-sm group-hover:shadow-md transition-all duration-300 group-hover:scale-105">
                            +{a.points}
                          </div>
                        </div>

                        {/* Subtle accent line */}
                        <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-border to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-card border border-border rounded-xl p-6 text-center text-muted-foreground">
                  No recent achievements.
                </div>
              )}
            </div>
          </AnimatedTabItem>

          <AnimatedTabItem value="milestones" label="Milestones">

            <div className="p-6">
              {data?.milestones.recent && data.milestones.recent.length > 0 ? (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-primary" aria-hidden="true" />
                    Recent Milestones
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {data.milestones.recent.map((m) => (
                      <div
                        key={m.id}
                        className="group relative flex items-center gap-4 p-4 bg-card rounded-lg border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-md"
                      >
                        {/* Icon circle with gradient effect */}
                        <div className="relative w-8 h-8 flex-shrink-0 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border border-primary/20 group-hover:border-primary/40 transition-all duration-300 group-hover:scale-105">
                          <span className="font-bold text-primary text-xl">
                            {m.title.charAt(0)}
                          </span>
                        </div>

                        {/* Content section */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <h3 className="font-semibold text-foreground text-base leading-tight group-hover:text-primary transition-colors duration-200">
                            {m.title}
                          </h3>
                          <p className="text-sm text-muted-foreground leading-snug line-clamp-2">
                            {m.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Achieved: {new Date(m.achievedAt).toLocaleDateString()}
                          </p>
                        </div>

                        {/* Points badge with subtle animation */}
                        <div className="flex-shrink-0">
                          <div className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full font-semibold text-sm shadow-sm group-hover:shadow-md transition-all duration-300 group-hover:scale-105">
                            +{m.value}
                          </div>
                        </div>

                        {/* Subtle accent line */}
                        <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-border to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-card border border-border rounded-xl p-6 text-center text-muted-foreground">
                  No recent milestones.
                </div>
              )}
            </div>

          </AnimatedTabItem>
        </AnimatedTabs>
      </Card>

    </div>
  )
}
