import { NextResponse } from "next/server"
import { prisma } from "../../../../../../lib/prisma"
import { stackServerApp } from "@/stack"
import { checkMilestones, awardAchievement, calculateLevel, calculateStreak } from "@/helpers/gamification"

// Helper functions
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export async function POST(
  req: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    const user = await stackServerApp.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { taskId } = params

    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 })
    }

    // Fetch the task
    const task = await prisma.task.findUnique({
      where: {
        id: taskId,
        userId: user.id
      }
    })

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    if (task.status === 'completed') {
      return NextResponse.json({ error: "Task already completed" }, { status: 400 })
    }

    const completedAt = new Date()
    const currentWeek = getWeekNumber(completedAt)
    const currentMonth = getMonthKey(completedAt)

    // Create completedTask record with all fields from Task
    await prisma.completedTask.create({
      data: {
        userId: task.userId,
        locationId: task.locationId,
        placeId: task.placeId,
        title: task.title,
        description: task.description,
        category: task.category,
        type: task.type,
        priority: task.priority,
        impact: task.impact,
        points: task.points,
        repeatable: task.repeatable,
        estimatedTime: task.estimatedTime,
        week: task.week,
        month: currentMonth,
        completedAt,
        // Additional fields from Task schema
        repeatFrequency: task.repeatFrequency || null,
        businessType: task.businessType || "all",
        actionType: task.actionType,
        editableViaAPI: task.editableViaAPI,
        verificationType: task.verificationType || "auto",
        caution: task.caution || null,
        // Verification fields - will be set during verification
        verificationConfidence: null,
        verificationReason: null,
        pointsAwarded: null,
        pointsPenalty: null,
        verifiedAt: null
      }
    })

    // Fetch current progress
    const locationProgress = await prisma.locationProgress.findUnique({
      where: {
        userId_locationId: {
          userId: user.id,
          locationId: task.locationId
        }
      }
    })

    if (!locationProgress) {
      return NextResponse.json({ error: "Location progress not found" }, { status: 404 })
    }

    // Calculate streak
    const { currentStreak } = await calculateStreak(user.id, task.locationId)

    // Calculate new total points and level
    const newTotalPoints = locationProgress.totalPoints + task.points
    const newLevel = calculateLevel(newTotalPoints)
    const newLongestStreak = Math.max(locationProgress.longestStreak, currentStreak)

    // Update scores based on category
    let profileScoreIncrement = 0
    let engagementScoreIncrement = 0
    let contentScoreIncrement = 0

    if (task.category === 'basic_info' || task.type === 'profile') {
      profileScoreIncrement = Math.min(task.points, 20)
    } else if (task.category === 'engagement' || task.type === 'reviews') {
      engagementScoreIncrement = Math.min(task.points, 20)
    } else if (task.category === 'visual' || task.type === 'photos') {
      contentScoreIncrement = Math.min(task.points, 20)
    }

    // Update progress
    const updatedProgress = await prisma.locationProgress.update({
      where: {
        userId_locationId: {
          userId: user.id,
          locationId: task.locationId
        }
      },
      data: {
        totalPoints: newTotalPoints,
        weeklyPoints: { increment: task.points },
        monthlyPoints: { increment: task.points },
        tasksCompleted: { increment: 1 },
        profileScore: { increment: profileScoreIncrement },
        engagementScore: { increment: engagementScoreIncrement },
        contentScore: { increment: contentScoreIncrement },
        lastActiveDate: completedAt,
        currentStreak: currentStreak,
        longestStreak: newLongestStreak,
        level: newLevel,
      }
    })

    // Update task status to completed
    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'completed' }
    })

    // Update global user progress
    await prisma.userProgress.update({
      where: { userId: user.id },
      data: {
        totalPoints: { increment: task.points },
        tasksCompleted: { increment: 1 },
        currentLevel: calculateLevel(newTotalPoints)
      }
    })

    // Check for new milestones
    const newMilestones = await checkMilestones(user.id, task.locationId, updatedProgress)

    // Check for achievements
    const newAchievements = []
    
    // First task achievement
    if (updatedProgress.tasksCompleted === 1) {
      const firstTask = await awardAchievement(user.id, task.locationId, 'first_task')
      if (firstTask) newAchievements.push(firstTask)
    }

    // Speed demon: 5 tasks in one day
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const tasksToday = await prisma.completedTask.count({
      where: {
        userId: user.id,
        locationId: task.locationId,
        completedAt: { gte: today, lt: tomorrow }
      }
    })

    if (tasksToday >= 5) {
      const speedDemon = await awardAchievement(user.id, task.locationId, 'speed_demon')
      if (speedDemon) newAchievements.push(speedDemon)
    }

    // Task-type specific achievements
    const reviewTasks = await prisma.completedTask.count({
      where: { userId: user.id, locationId: task.locationId, type: 'reviews' }
    })
    if (reviewTasks === 10) {
      const reviewMaster = await awardAchievement(user.id, task.locationId, 'review_master')
      if (reviewMaster) newAchievements.push(reviewMaster)
    }

    const photoTasks = await prisma.completedTask.count({
      where: { userId: user.id, locationId: task.locationId, type: 'photos' }
    })
    if (photoTasks === 10) {
      const photoPro = await awardAchievement(user.id, task.locationId, 'photo_pro')
      if (photoPro) newAchievements.push(photoPro)
    }

    const engagementTasks = await prisma.completedTask.count({
      where: { userId: user.id, locationId: task.locationId, category: 'engagement' }
    })
    if (engagementTasks === 10) {
      const engagementExpert = await awardAchievement(user.id, task.locationId, 'engagement_expert')
      if (engagementExpert) newAchievements.push(engagementExpert)
    }

    // Check if this is the first week with all tasks completed
    const weekTasks = await prisma.task.count({
      where: { userId: user.id, locationId: task.locationId, week: task.week }
    })
    const weekCompleted = await prisma.completedTask.count({
      where: { userId: user.id, locationId: task.locationId, week: task.week }
    })
    if (weekTasks === weekCompleted && weekTasks > 0) {
      const perfectWeek = await awardAchievement(user.id, task.locationId, 'perfect_week')
      if (perfectWeek) newAchievements.push(perfectWeek)
    }

    const leveledUp = newLevel > locationProgress.level

    return NextResponse.json({
      message: "Task completed successfully",
      pointsAwarded: task.points,
      newLevel: newLevel,
      leveledUp: leveledUp,
      newStreak: currentStreak,
      newTotalPoints: newTotalPoints,
      newMilestones: newMilestones,
      newAchievements: newAchievements
    })
  } catch (error: any) {
    console.error("Task completion error:", error)
    return NextResponse.json(
      { error: "Failed to complete task", details: error.message },
      { status: 500 }
    )
  }
}