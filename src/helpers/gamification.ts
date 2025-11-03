import { prisma } from "../../lib/prisma"

// Milestone definitions
const MILESTONE_TEMPLATES = [
  // Points milestones
  { name: "First Steps", description: "Earn your first 10 points", type: "points", threshold: 10, reward: "Bronze Badge", icon: "🥉", points: 5 },
  { name: "Getting Started", description: "Earn 50 points", type: "points", threshold: 50, reward: "Silver Badge", icon: "🥈", points: 10 },
  { name: "Point Collector", description: "Earn 100 points", type: "points", threshold: 100, reward: "Gold Badge", icon: "🥇", points: 20 },
  { name: "Point Master", description: "Earn 500 points", type: "points", threshold: 500, reward: "Diamond Badge", icon: "💎", points: 50 },
  { name: "Point Legend", description: "Earn 1000 points", type: "points", threshold: 1000, reward: "Legendary Badge", icon: "🏆", points: 100 },
  
  // Streak milestones
  { name: "3 Day Streak", description: "Complete tasks for 3 days in a row", type: "streak", threshold: 3, reward: "Consistency Badge", icon: "🔥", points: 15 },
  { name: "Week Warrior", description: "Complete tasks for 7 days in a row", type: "streak", threshold: 7, reward: "Weekly Champion", icon: "⭐", points: 30 },
  { name: "Two Week Master", description: "Complete tasks for 14 days in a row", type: "streak", threshold: 14, reward: "Dedication Badge", icon: "💪", points: 50 },
  { name: "Month Champion", description: "Complete tasks for 30 days in a row", type: "streak", threshold: 30, reward: "Elite Badge", icon: "👑", points: 100 },
  
  // Task completion milestones
  { name: "Task Beginner", description: "Complete 5 tasks", type: "tasks", threshold: 5, reward: "Starter Badge", icon: "✅", points: 10 },
  { name: "Task Regular", description: "Complete 25 tasks", type: "tasks", threshold: 25, reward: "Committed Badge", icon: "📋", points: 25 },
  { name: "Task Expert", description: "Complete 50 tasks", type: "tasks", threshold: 50, reward: "Expert Badge", icon: "🎯", points: 50 },
  { name: "Task Master", description: "Complete 100 tasks", type: "tasks", threshold: 100, reward: "Master Badge", icon: "🏅", points: 100 },
  
  // Level milestones
  { name: "Level Up", description: "Reach level 2", type: "level", threshold: 2, reward: "Leveling Badge", icon: "📈", points: 10 },
  { name: "Rising Star", description: "Reach level 5", type: "level", threshold: 5, reward: "Rising Star Badge", icon: "🌟", points: 30 },
  { name: "Top Performer", description: "Reach level 10", type: "level", threshold: 10, reward: "Top Performer Badge", icon: "🚀", points: 75 },
]

// Achievement templates (earned for specific actions)
const ACHIEVEMENT_TEMPLATES = {
  first_task: { type: "first_task", title: "First Task Complete", description: "You completed your first task!", points: 10 },
  perfect_week: { type: "perfect_week", title: "Perfect Week", description: "Completed all tasks this week", points: 50 },
  review_master: { type: "review_master", title: "Review Master", description: "Completed 10 review-related tasks", points: 40 },
  photo_pro: { type: "photo_pro", title: "Photo Pro", description: "Completed 10 photo-related tasks", points: 40 },
  engagement_expert: { type: "engagement_expert", title: "Engagement Expert", description: "Completed 10 engagement tasks", points: 40 },
  speed_demon: { type: "speed_demon", title: "Speed Demon", description: "Completed 5 tasks in one day", points: 30 },
  comeback: { type: "comeback", title: "Comeback", description: "Started a new streak after losing one", points: 20 },
}

/**
 * Initialize milestones in database (call once on app startup or first use)
 */
export async function initializeMilestones() {
  try {
    const existingCount = await prisma.milestone.count()
    
    if (existingCount > 0) {      
      return
    }

    // Create milestones one by one to ensure uniqueness
    for (const milestone of MILESTONE_TEMPLATES) {
      await prisma.milestone.create({
        data: {
          name: milestone.name,
          description: milestone.description,
          type: milestone.type,
          threshold: milestone.threshold,
          reward: milestone.reward,
          icon: milestone.icon,
          points: milestone.points
        }
      })
    }

    console.log(`✓ Initialized ${MILESTONE_TEMPLATES.length} milestones`)
  } catch (error) {
    console.error('Error initializing milestones:', error)
    throw error
  }
}

/**
 * Initialize user and location progress on first task generation
 */
export async function initializeGamification(userId: string, locationId: string, placeId?: string) {
  try {
    // Ensure milestones exist
    await initializeMilestones()

    // Initialize UserProgress
    await prisma.userProgress.upsert({
      where: { userId },
      create: {
        userId,
        totalPoints: 0,
        currentLevel: 1,
        tasksCompleted: 0,
        locationsCount: 1
      },
      update: {
        // Increment locations count if this is a new location
        locationsCount: { increment: 1 }
      }
    })

    // Initialize LocationProgress
    const locationProgress = await prisma.locationProgress.upsert({
      where: {
        userId_locationId: { userId, locationId }
      },
      create: {
        userId,
        locationId,
        placeId: placeId || null,
        totalPoints: 0,
        weeklyPoints: 0,
        monthlyPoints: 0,
        tasksCompleted: 0,
        profileScore: 0,
        engagementScore: 0,
        contentScore: 0,
        currentStreak: 0,
        longestStreak: 0,
        level: 1,
        lastActiveDate: new Date()
      },
      update: {}
    })

    console.log(`✓ Initialized gamification for user ${userId}, location ${locationId}`)
    return locationProgress
  } catch (error) {
    console.error('Error initializing gamification:', error)
    throw error
  }
}

/**
 * Check and award milestones for a location
 */
export async function checkMilestones(userId: string, locationId: string, locationProgress: any) {
  try {
    const milestones = await prisma.milestone.findMany({
      orderBy: { threshold: 'asc' }
    })

    const newMilestones = []

    for (const milestone of milestones) {
      // Check if already achieved
      const existing = await prisma.locationMilestone.findUnique({
        where: {
          userId_locationId_milestoneId: {
            userId,
            locationId,
            milestoneId: milestone.id
          }
        }
      })

      if (existing) continue

      // Check if threshold met
      let currentValue = 0
      switch (milestone.type) {
        case 'points':
          currentValue = locationProgress.totalPoints
          break
        case 'streak':
          currentValue = locationProgress.currentStreak
          break
        case 'tasks':
          currentValue = locationProgress.tasksCompleted
          break
        case 'level':
          currentValue = locationProgress.level
          break
      }

      if (currentValue >= milestone.threshold) {
        const achieved = await prisma.locationMilestone.create({
          data: {
            userId,
            locationId,
            milestoneId: milestone.id,
            milestoneName: milestone.name,
            type: milestone.type,
            title: milestone.name,
            description: milestone.description,
            value: currentValue,
            notified: false
          }
        })

        // Award bonus points
        await prisma.locationProgress.update({
          where: {
            userId_locationId: { userId, locationId }
          },
          data: {
            totalPoints: { increment: milestone.points }
          }
        })

        // Also update global user progress
        await prisma.userProgress.update({
          where: { userId },
          data: {
            totalPoints: { increment: milestone.points }
          }
        })

        newMilestones.push({ 
          ...milestone, 
          achievedAt: achieved.achievedAt,
          id: achieved.id 
        })
      }
    }

    return newMilestones
  } catch (error) {
    console.error('Error checking milestones:', error)
    return []
  }
}

/**
 * Award achievement for specific actions
 */
export async function awardAchievement(
  userId: string, 
  locationId: string, 
  achievementType: keyof typeof ACHIEVEMENT_TEMPLATES
) {
  try {
    const template = ACHIEVEMENT_TEMPLATES[achievementType]
    if (!template) return null

    // Check if already earned
    const existing = await prisma.locationAchievement.findFirst({
      where: {
        userId,
        locationId,
        type: achievementType
      }
    })

    if (existing) return null

    // Create achievement
    const achievement = await prisma.locationAchievement.create({
      data: {
        userId,
        locationId,
        type: template.type,
        title: template.title,
        description: template.description,
        points: template.points
      }
    })

    // Award points to location
    await prisma.locationProgress.update({
      where: {
        userId_locationId: { userId, locationId }
      },
      data: {
        totalPoints: { increment: template.points }
      }
    })

    // Award points to global user progress
    await prisma.userProgress.update({
      where: { userId },
      data: {
        totalPoints: { increment: template.points }
      }
    })

    return achievement
  } catch (error) {
    console.error('Error awarding achievement:', error)
    return null
  }
}

/**
 * Calculate level based on points
 */
export function calculateLevel(points: number): number {
  // Level formula: sqrt(points / 100)
  return Math.floor(Math.sqrt(points / 100)) + 1
}

/**
 * Get points needed for next level
 */
export function getPointsForNextLevel(currentLevel: number): number {
  return Math.pow(currentLevel, 2) * 100
}

/**
 * Get current progress toward next level
 */
export function getLevelProgress(currentPoints: number, currentLevel: number): {
  currentLevelPoints: number
  nextLevelPoints: number
  progressPercent: number
} {
  const currentLevelPoints = Math.pow(currentLevel - 1, 2) * 100
  const nextLevelPoints = Math.pow(currentLevel, 2) * 100
  const pointsIntoLevel = currentPoints - currentLevelPoints
  const pointsNeeded = nextLevelPoints - currentLevelPoints
  const progressPercent = Math.min(100, Math.round((pointsIntoLevel / pointsNeeded) * 100))

  return {
    currentLevelPoints,
    nextLevelPoints,
    progressPercent
  }
}

/**
 * Calculate streak from completed tasks
 */
export async function calculateStreak(userId: string, locationId: string): Promise<{
  currentStreak: number
  includesYesterday: boolean
}> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  let streak = 0
  let checkDate = new Date(today)
  let hasTaskToday = false
  let hasTaskYesterday = false

  // Check backwards from today
  for (let i = 0; i < 365; i++) { // Max 365 days lookback
    const dayStart = new Date(checkDate)
    const dayEnd = new Date(checkDate)
    dayEnd.setHours(23, 59, 59, 999)

    const tasksOnDay = await prisma.completedTask.count({
      where: {
        userId,
        locationId,
        completedAt: {
          gte: dayStart,
          lte: dayEnd
        }
      }
    })

    if (i === 0) {
      hasTaskToday = tasksOnDay > 0
    }
    if (i === 1) {
      hasTaskYesterday = tasksOnDay > 0
    }

    if (tasksOnDay > 0) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      // If no task today, but has task yesterday, continue from yesterday
      if (i === 0 && !hasTaskToday) {
        checkDate.setDate(checkDate.getDate() - 1)
        continue
      }
      // Otherwise streak is broken
      break
    }
  }

  return {
    currentStreak: streak,
    includesYesterday: hasTaskYesterday
  }
}

/**
 * Update location progress after task completion
 */
export async function updateProgressAfterTaskCompletion(
  userId: string,
  locationId: string,
  points: number,
  category: string
) {
  try {
    // Calculate new streak
    const { currentStreak } = await calculateStreak(userId, locationId)

    // Get current location progress
    const locationProgress = await prisma.locationProgress.findUnique({
      where: { userId_locationId: { userId, locationId } }
    })

    if (!locationProgress) {
      throw new Error('Location progress not found')
    }

    const newTotalPoints = locationProgress.totalPoints + points
    const newLevel = calculateLevel(newTotalPoints)
    const newLongestStreak = Math.max(locationProgress.longestStreak, currentStreak)

    // Update category scores
    let profileIncrement = 0
    let engagementIncrement = 0
    let contentIncrement = 0

    if (category === 'profile') profileIncrement = points
    else if (category === 'engagement') engagementIncrement = points
    else if (category === 'content') contentIncrement = points

    // Update location progress
    const updated = await prisma.locationProgress.update({
      where: { userId_locationId: { userId, locationId } },
      data: {
        totalPoints: { increment: points },
        weeklyPoints: { increment: points },
        monthlyPoints: { increment: points },
        tasksCompleted: { increment: 1 },
        currentStreak,
        longestStreak: newLongestStreak,
        level: newLevel,
        lastActiveDate: new Date(),
        profileScore: { increment: profileIncrement },
        engagementScore: { increment: engagementIncrement },
        contentScore: { increment: contentIncrement }
      }
    })

    // Update global user progress
    await prisma.userProgress.update({
      where: { userId },
      data: {
        totalPoints: { increment: points },
        tasksCompleted: { increment: 1 },
        currentLevel: calculateLevel(locationProgress.totalPoints + points)
      }
    })

    // Check for new milestones
    const newMilestones = await checkMilestones(userId, locationId, updated)

    // Check for special achievements
    const newAchievements = await checkSpecialAchievements(userId, locationId)

    // Check for first task achievement
    if (updated.tasksCompleted === 1) {
      const firstTask = await awardAchievement(userId, locationId, 'first_task')
      if (firstTask) newAchievements.push(firstTask)
    }

    return {
      locationProgress: updated,
      newMilestones,
      newAchievements,
      leveledUp: newLevel > locationProgress.level
    }
  } catch (error) {
    console.error('Error updating progress:', error)
    throw error
  }
}

/**
 * Check for special achievements based on task patterns
 */
export async function checkSpecialAchievements(userId: string, locationId: string) {
  const achievements = []

  try {
    // Check tasks completed today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const tasksToday = await prisma.completedTask.count({
      where: {
        userId,
        locationId,
        completedAt: { gte: today, lt: tomorrow }
      }
    })

    // Speed Demon: 5 tasks in one day
    if (tasksToday >= 5) {
      const achievement = await awardAchievement(userId, locationId, 'speed_demon')
      if (achievement) achievements.push(achievement)
    }

    // Check task type counts
    const reviewTasks = await prisma.completedTask.count({
      where: { userId, locationId, type: 'reviews' }
    })
    if (reviewTasks >= 10) {
      const achievement = await awardAchievement(userId, locationId, 'review_master')
      if (achievement) achievements.push(achievement)
    }

    const photoTasks = await prisma.completedTask.count({
      where: { userId, locationId, type: 'photos' }
    })
    if (photoTasks >= 10) {
      const achievement = await awardAchievement(userId, locationId, 'photo_pro')
      if (achievement) achievements.push(achievement)
    }

    const engagementTasks = await prisma.completedTask.count({
      where: { userId, locationId, category: 'engagement' }
    })
    if (engagementTasks >= 10) {
      const achievement = await awardAchievement(userId, locationId, 'engagement_expert')
      if (achievement) achievements.push(achievement)
    }
  } catch (error) {
    console.error('Error checking special achievements:', error)
  }

  return achievements
}

/**
 * Reset weekly/monthly points (call from cron job)
 */
export async function resetPeriodicPoints(period: 'weekly' | 'monthly') {
  try {
    const field = period === 'weekly' ? 'weeklyPoints' : 'monthlyPoints'
    
    await prisma.locationProgress.updateMany({
      data: {
        [field]: 0
      }
    })
  } catch (error) {
    console.error(`Error resetting ${period} points:`, error)
  }
}

export {
  MILESTONE_TEMPLATES,
  ACHIEVEMENT_TEMPLATES
}