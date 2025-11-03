import { NextResponse } from "next/server"
import TASK_TEMPLATES_JSON from '@/data/tasks.json'
import { stackServerApp } from "@/stack"
import { prisma } from "../../../../lib/prisma"
import { initializeGamification } from "@/helpers/gamification"
import {
  selectTasksForLocation,
  prioritizeTaskOrder,
  validateTaskAssignment,
  generateAssignmentSummary,
  getTaskRecommendations
} from "@/helpers/taskHelper"

interface TaskTemplate {
  id: string
  title: string
  description: string
  type: string
  priority: 'high' | 'medium' | 'low'
  repeatable: boolean
  repeatFrequency?: 'weekly' | 'monthly' | 'quarterly'
  estimatedTime: string
  estimated_time?: string
  impact: 'high' | 'medium' | 'low'
  category: string
  points: number
  prerequisites?: string[]
  seasonalRelevance?: string[]
  actionType?: string
  businessType?: string
  editableViaAPI?: boolean
  verificationType?: string
  caution?: string
}


interface LocationAnalysis {
  hasDescription: boolean
  hasPhotos: boolean
  hasReviews: boolean
  hasHours: boolean
  reviewCount: number
  photoCount: number
  averageRating: number
  needsImprovement: string[]
}

// Enhanced parser with better validation
function parseTaskTemplate(data: any, index: number): TaskTemplate {
  const getField = (obj: any, key: string): any => {
    if (typeof obj === 'object' && !Array.isArray(obj)) {
      return obj[key]
    }
    if (Array.isArray(obj)) {
      const idx = obj.findIndex((v, i) => i % 3 === 0 && v === key)
      return idx !== -1 ? obj[idx + 2] : undefined
    }
    return undefined
  }

  const parseBoolean = (val: any): boolean => {
    if (typeof val === 'boolean') return val
    if (typeof val === 'string') return val.toLowerCase() === 'true'
    return false
  }

  const parseNumber = (val: any, defaultVal: number = 0): number => {
    const num = parseInt(String(val), 10)
    return isNaN(num) ? defaultVal : num
  }

  try {
    return {
      id: getField(data, 'id') || `task_${String(index + 1).padStart(3, '0')}`,
      title: getField(data, 'title') || 'Unknown Task',
      description: getField(data, 'description') || '',
      type: getField(data, 'type') || 'profile',
      priority: (getField(data, 'priority') || 'medium') as 'high' | 'medium' | 'low',
      repeatable: parseBoolean(getField(data, 'repeatable')),
      repeatFrequency: getField(data, 'repeatFrequency') ||
        (parseBoolean(getField(data, 'repeatable')) ? 'monthly' : undefined),
      estimatedTime: getField(data, 'estimatedTime') ||
        getField(data, 'estimated_time') || '15 minutes',
      impact: (getField(data, 'impact') || 'medium') as 'high' | 'medium' | 'low',
      category: getField(data, 'category') || 'basic_info',
      points: parseNumber(getField(data, 'points'), 10),
      prerequisites: getField(data, 'prerequisites') || undefined,
      seasonalRelevance: getField(data, 'seasonalRelevance') || undefined,
      actionType: getField(data, 'actionType') || 'manual' // <-- add this
    }
  } catch (error) {
    console.error(`Failed to parse task at index ${index}:`, error)
    return {
      id: `task_${String(index + 1).padStart(3, '0')}`,
      title: 'Unknown Task',
      description: '',
      type: 'profile',
      priority: 'medium',
      repeatable: false,
      estimatedTime: '15 minutes',
      impact: 'medium',
      category: 'basic_info',
      points: 10,
      actionType: 'manual'
    }
  }
}

// Load and validate task templates
const TASK_TEMPLATES: TaskTemplate[] = (() => {
  try {
    const tasks = (TASK_TEMPLATES_JSON as any[])
      .map((data, index) => parseTaskTemplate(data, index))
      .filter(task => task.title !== 'Unknown Task')

    return tasks
  } catch (error) {
    console.error('ERROR parsing task templates:', error)
    return []
  }
})()

// Utility functions
function getWeekNumber(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

// Analyze location to determine needs
function analyzeLocation(locationData: any): LocationAnalysis {
  const analysis: LocationAnalysis = {
    hasDescription: false,
    hasPhotos: false,
    hasReviews: false,
    hasHours: false,
    reviewCount: 0,
    photoCount: 0,
    averageRating: 0,
    needsImprovement: []
  }

  if (!locationData) return analysis

  analysis.hasDescription = !!locationData.description
  analysis.hasPhotos = locationData.photos && locationData.photos.length > 0
  analysis.hasReviews = locationData.reviews && locationData.reviews.length > 0
  analysis.hasHours = !!locationData.opening_hours
  analysis.reviewCount = locationData.reviews?.length || 0
  analysis.photoCount = locationData.photos?.length || 0
  analysis.averageRating = locationData.rating || 0

  // Determine improvement areas
  if (!analysis.hasDescription) analysis.needsImprovement.push('basic_info')
  if (analysis.photoCount < 10) analysis.needsImprovement.push('visual')
  if (analysis.reviewCount < 20) analysis.needsImprovement.push('engagement')
  if (analysis.averageRating < 4.0) analysis.needsImprovement.push('reputation')
  if (!analysis.hasHours) analysis.needsImprovement.push('basic_info')

  return analysis
}

async function verifyTaskCompletion(ct: any, locationData: any): Promise<boolean> {
  if (ct.type === 'profile' || ct.category === 'basic_info') {
    if (ct.title.toLowerCase().includes('opening hours') || ct.id?.includes('task_001')) {
      return !!locationData?.opening_hours;
    }
    if (ct.title.toLowerCase().includes('website') || ct.id?.includes('task_005')) {
      return !!locationData?.website;
    }
  }

  if (ct.type === 'photos' || ct.category === 'visual') {
    const photoCount = locationData?.photos?.length || 0;
    return photoCount >= 10;
  }

  if (ct.type === 'reviews' || ct.category === 'engagement') {
    const reviewCount = locationData?.user_ratings_total || 0;
    const rating = locationData?.rating || 0;
    return reviewCount >= 10 && rating >= 4.0;
  }

  // Default to true for non-verifiable tasks
  return true;
}

export function getMonthKeyFormated(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

// 🎛️ CONFIGURATION: Set to true to assign ALL available tasks (Debug)
const ALLOW_ALL_TASKS = true;

export async function POST(req: Request) {
  try {
    const user = await stackServerApp.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { placeId, locationId, accessToken, gmbAccountId, forceGenerate = false } = body

    if (!placeId && !locationId) {
      return NextResponse.json(
        { error: "Either placeId or locationId is required" },
        { status: 400 }
      )
    }

    if (TASK_TEMPLATES.length === 0) {
      return NextResponse.json(
        { error: "No task templates available" },
        { status: 500 }
      )
    }

    const currentWeek = getWeekNumber(new Date())
    const currentMonth = getMonthKey(new Date())
    const cleanLocationId = locationId?.replace(/^locations\//, "") || placeId

    // Initialize gamification early
    await initializeGamification(user.id, cleanLocationId, placeId)

    // 🔒 CRITICAL: Check for existing tasks for this week FIRST
    const existingWeekTasks = await prisma.task.findMany({
      where: {
        userId: user.id,
        locationId: cleanLocationId,
        week: currentWeek,
        status: { in: ["pending", "in_progress"] }
      }
    });

    // If we already have tasks for this week and not forcing, return them immediately
    if (existingWeekTasks.length > 0 && !forceGenerate && !ALLOW_ALL_TASKS) {
      return NextResponse.json({
        tasks: existingWeekTasks,
        message: `Tasks already exist for week ${currentWeek}`,
        week: currentWeek,
        status: "existing_tasks"
      })
    }

    // If forcing regeneration, delete existing tasks for this week
    if (forceGenerate && existingWeekTasks.length > 0) {
      await prisma.task.deleteMany({
        where: {
          userId: user.id,
          locationId: cleanLocationId,
          week: currentWeek,
          status: { in: ["pending", "in_progress"] }
        }
      })
    }

    // 🧠 Check last refresh record
    let lastRefresh = null
    try {
      lastRefresh = await prisma.userTaskRefresh.findUnique({
        where: {
          userId_month: { userId: user.id, month: currentMonth },
          locationIds: {
            has: locationId,
          },
        }
      })
    } catch (error) {
      console.warn("UserTaskRefresh table may not exist yet, skipping check:", error)
    }

    // Only check refresh date if we have a valid record AND not forcing generation AND not allowAll
    if (lastRefresh && !forceGenerate && !ALLOW_ALL_TASKS) {
      const now = new Date()
      const lastUpdate = new Date(lastRefresh.refreshedAt)
      const daysSinceRefresh =
        (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)

      if (daysSinceRefresh < 7) { // Weekly refresh
        const existingTasks = await prisma.task.findMany({
          where: {
            userId: user.id,
            locationId: cleanLocationId,
            week: currentWeek,
            status: { not: "completed" }
          }
        });

        if (existingTasks.length > 0) {
          return NextResponse.json({
            tasks: existingTasks,
            message: `Tasks were already generated ${Math.floor(daysSinceRefresh)} day(s) ago`,
            refreshedAt: lastRefresh.refreshedAt,
            nextRefresh: lastRefresh.nextRefresh,
            status: "recent_refresh",
            week: currentWeek
          })
        }
      }
    }

    // Get ALL existing tasks (not just this week) to prevent duplicates
    const allExistingTasks = await prisma.task.findMany({
      where: {
        userId: user.id,
        locationId: cleanLocationId,
        status: { not: "completed" }
      }
    });

    // Fetch location data
    let locationData = null;

    if (placeId && process.env.PLACES_KEY) {
      try {
        const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
        url.searchParams.set("place_id", placeId);
        url.searchParams.set("fields", [
          "name",
          "rating",
          "formatted_address",
          "photos",
          "reviews",
          "opening_hours",
          "user_ratings_total",
          "website"
        ].join(","));
        url.searchParams.set("key", process.env.PLACES_KEY);

        const response = await fetch(url);
        const data = await response.json();

        if (response.ok && data.status === "OK") {
          locationData = data.result;
        } else {
          console.warn(`Google Places API returned status: ${data.status}`, data.error_message);
        }

      } catch (error) {
        console.error("Failed to fetch location details:", error);
      }
    }

    // Get location progress
    const locationProgress = await prisma.locationProgress.findUnique({
      where: {
        userId_locationId: {
          userId: user.id,
          locationId: cleanLocationId
        }
      }
    })

    // Get completed tasks and verify them
    const completedTasks = await prisma.completedTask.findMany({
      where: {
        userId: user.id,
        locationId: cleanLocationId,
      }
    });

    const cheatedTasks = [];
    for (const ct of completedTasks) {
      const isVerified = await verifyTaskCompletion(ct, locationData);
      if (!isVerified) {
        cheatedTasks.push(ct);

        // Subtract points for cheating
        await prisma.locationProgress.update({
          where: {
            userId_locationId: {
              userId: user.id,
              locationId: cleanLocationId
            }
          },
          data: {
            totalPoints: { decrement: ct.points },
            weeklyPoints: { decrement: ct.week === currentWeek ? ct.points : 0 },
            monthlyPoints: { decrement: getMonthKey(new Date(ct.completedAt)) === currentMonth ? ct.points : 0 },
            tasksCompleted: { decrement: 1 },
          }
        });

        // Delete the cheated completed task
        await prisma.completedTask.delete({
          where: { id: ct.id }
        });

        // Reassign in next month with reduced points
        const reducedPoints = Math.floor(ct.points * 0.5);
        const nextMonthDate = new Date();
        nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
        nextMonthDate.setDate(1);
        const nextWeek = getWeekNumber(nextMonthDate);

        await prisma.task.create({
          data: {
            userId: user.id,
            locationId: cleanLocationId,
            placeId: ct.placeId || placeId || null,
            title: ct.title,
            description: ct.description,
            category: ct.category,
            type: ct.type,
            priority: ct.priority,
            impact: ct.impact,
            points: reducedPoints,
            repeatable: ct.repeatable,
            estimatedTime: ct.estimatedTime,
            week: nextWeek,
            status: "pending",
            repeatFrequency: ct.repeatFrequency || null,
            businessType: ct.businessType || "all",
            actionType: ct.actionType,
            editableViaAPI: ct.editableViaAPI,
            verificationType: ct.verificationType || "auto",
            caution: ct.caution || null
          }
        });

      }
    }

    // 🔑 BUILD COMPREHENSIVE EXCLUSION SET
    const excludedTitles = new Set<string>();
    const excludedReasons = new Map<string, string>();

    if (!ALLOW_ALL_TASKS) {
      // Add all pending/in-progress tasks (from any week)
      allExistingTasks.forEach(t => {
        excludedTitles.add(t.title);
        excludedReasons.set(t.title, `Already assigned in week ${t.week} (${t.status})`);
      });

      // ✅ FIX: Add completed non-repeatable tasks
      for (const ct of completedTasks) {
        const template = TASK_TEMPLATES.find(tt => tt.title === ct.title);
        if (template && template.repeatable === false) {
          excludedTitles.add(ct.title);
          excludedReasons.set(ct.title, `Completed on ${ct.completedAt.toLocaleDateString()} (non-repeatable)`);
        }
      }
    } else {
      console.log("⚡ ALLOW_ALL_TASKS enabled: Assigning all available tasks");
    }

    // ✅ FIX: Normalize task templates to match Prisma schema
    const normalizedTemplates = TASK_TEMPLATES.map(t => ({
      ...t,
      estimated_time: t.estimatedTime, // Keep for backward compatibility
      actionType: t.actionType || "manual", // Ensure actionType exists
      editableViaAPI: t.editableViaAPI ?? true, // Default to true if not specified
      verificationType: t.verificationType || "auto", // Extract from verification object
      repeatFrequency: t.repeatFrequency || null, // Ensure it's null if not set
      businessType: t.businessType || "all", // Default to "all"
      caution: t.caution || null // Ensure it's null if not set
    }));

    // Filter available tasks - exclude ALL tasks in excludedTitles
    const availableTasks = normalizedTemplates.filter(task => {
      const isExcluded = excludedTitles.has(task.title);
      if (isExcluded) {
        console.log(`⏭️ Skipping "${task.title}": ${excludedReasons.get(task.title)}`);
      }
      return !isExcluded;
    });

    if (availableTasks.length === 0 && !ALLOW_ALL_TASKS) {
      return NextResponse.json({
        tasks: allExistingTasks,
        message: "No new tasks available - all tasks are either pending or completed",
        week: currentWeek,
        status: "no_available_tasks"
      })
    }

    // Use task helper to select tasks intelligently
    let selectedTasks;
    if (ALLOW_ALL_TASKS) {
      selectedTasks = availableTasks; // Assign ALL tasks
    } else {
      selectedTasks = selectTasksForLocation(availableTasks, {
        locationData,
        existingTasks: allExistingTasks,
        locationProgress,
        currentWeek
      });
    }

    if (selectedTasks.length === 0) {
      return NextResponse.json({
        tasks: allExistingTasks,
        message: "No new tasks could be selected for this week",
        week: currentWeek,
        status: "selection_failed"
      })
    }

    // Validate the selection
    const validation = validateTaskAssignment(selectedTasks, allExistingTasks)
    if (!validation.valid) {
      console.warn("Task assignment validation warnings:", validation.errors)
    }

    // Prioritize tasks
    const prioritizedTasks = prioritizeTaskOrder(selectedTasks)

    // Generate assignment summary
    const summary = generateAssignmentSummary(prioritizedTasks)

    // Get task recommendations with reasons
    const recommendations = getTaskRecommendations(prioritizedTasks, {
      locationData,
      existingTasks: allExistingTasks,
      locationProgress,
      currentWeek
    })

    // 🎯 FINAL DUPLICATE CHECK: Verify no task titles already exist for this week
    const finalTaskTitles = prioritizedTasks.map(t => t.title);

    const [existingTaskTitlesThisWeek, existingTaskTitlesAnyWeek] = await Promise.all([
      // Check this week
      prisma.task.findMany({
        where: {
          userId: user.id,
          locationId: cleanLocationId,
          week: currentWeek,
          title: { in: finalTaskTitles }
        },
        select: { title: true, status: true }
      }),
      // Check any pending/in-progress tasks
      prisma.task.findMany({
        where: {
          userId: user.id,
          locationId: cleanLocationId,
          title: { in: finalTaskTitles },
          status: { in: ["pending", "in_progress"] }
        },
        select: { title: true, week: true, status: true }
      })
    ]);

    if (!ALLOW_ALL_TASKS) {
      const allDuplicateTitles = new Set([
        ...existingTaskTitlesThisWeek.map(t => t.title),
        ...existingTaskTitlesAnyWeek.map(t => t.title)
      ]);

      if (allDuplicateTitles.size > 0) {
        console.warn(`⚠️ Pre-transaction check found ${allDuplicateTitles.size} duplicates`);

        const filteredTasks = prioritizedTasks.filter(t => !allDuplicateTitles.has(t.title));

        if (filteredTasks.length === 0) {
          return NextResponse.json({
            tasks: existingWeekTasks,
            message: "All selected tasks already exist",
            week: currentWeek,
            status: "duplicates_prevented"
          });
        }

        // Replace with non-duplicate tasks
        prioritizedTasks.length = 0;
        prioritizedTasks.push(...filteredTasks);
      }
    }

    // ✅ FIX: Create tasks with properly mapped fields from normalized templates
    const tasksToCreate = prioritizedTasks.map(task => ({
      userId: user.id,
      locationId: cleanLocationId,
      placeId: placeId || null,
      title: task.title,
      description: task.description,
      category: task.category,
      type: task.type,
      priority: task.priority,
      impact: task.impact,
      points: task.points,
      repeatable: task.repeatable,
      estimatedTime: task.estimated_time || task.estimatedTime, // Handle both naming conventions
      week: currentWeek,
      status: "pending" as const,
      // ✅ CRITICAL: Map all additional fields correctly
      repeatFrequency: task.repeatFrequency || null,
      businessType: task.businessType || "all",
      actionType: task.actionType || "manual",
      editableViaAPI: task.editableViaAPI ?? true,
      verificationType: task.verificationType || "auto",
      caution: task.caution || null
    }));

    // ✅ Validate that all required fields are present
    tasksToCreate.forEach((task, index) => {
      if (!task.actionType) {
        console.error(`❌ Task ${index} missing actionType:`, task.title);
      }
      if (task.verificationType === undefined) {
        console.error(`❌ Task ${index} missing verificationType:`, task.title);
      }
    });

    // Use transaction with atomic duplicate checking
    const newTasks = await prisma.$transaction(async (tx) => {
      if (!ALLOW_ALL_TASKS) {
        // CRITICAL: Triple-check for duplicates inside transaction
        const [existingByTitle, existingByWeek] = await Promise.all([
          // Check by title (any status, any week)
          tx.task.findMany({
            where: {
              userId: user.id,
              locationId: cleanLocationId,
              title: { in: tasksToCreate.map(t => t.title) },
              status: { in: ["pending", "in_progress"] }
            },
            select: { title: true, week: true, status: true }
          }),
          // Check by week (all tasks this week)
          tx.task.findMany({
            where: {
              userId: user.id,
              locationId: cleanLocationId,
              week: currentWeek
            },
            select: { title: true, status: true }
          })
        ]);

        // Build comprehensive duplicate detection
        const duplicates = new Set<string>();
        existingByTitle.forEach(t => {
          duplicates.add(t.title);        });
        existingByWeek.forEach(t => {
          duplicates.add(t.title);        });

        if (duplicates.size > 0) {          
          throw new Error(`Duplicate tasks detected: ${Array.from(duplicates).join(', ')}`);
        }
      }

      // Only create if no duplicates found (or ALLOW_ALL_TASKS is enabled)
      const result = await tx.task.createMany({
        data: tasksToCreate,
      });

      // Fetch and return created tasks with proper ordering
      return await tx.task.findMany({
        where: {
          userId: user.id,
          locationId: cleanLocationId,
          week: currentWeek,
          status: "pending",
          title: { in: tasksToCreate.map(t => t.title) }
        },
        orderBy: [
          { priority: 'desc' },
          { impact: 'desc' },
          { createdAt: 'desc' }
        ]
      });
    }).catch(error => {
      console.error("❌ Transaction failed:", error.message);

      // If transaction fails due to duplicates, return existing tasks
      if (error.message.includes('Duplicate') && !ALLOW_ALL_TASKS) {
          return existingWeekTasks;
      }

      // For other errors, throw to outer catch
      throw error;
    });

    // 🎯 Update or create refresh record after successful task generation
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(0, 0, 0, 0);

    // Update the UserTaskRefresh record with per-location tracking
    try {
      // First, get existing refresh record to preserve other locations
      const existingRefresh = await prisma.userTaskRefresh.findUnique({
        where: {
          userId_month: { userId: user.id, month: currentMonth }
        }
      });

      // Get current week in format "2025-W44"
      const currentWeek = getWeekNumber(new Date());

      // Build the location entry with week tag
      const locationWithWeek = `${cleanLocationId}:${currentWeek}`;

      // Get existing locationIds array
      const existingLocationIds = existingRefresh?.locationIds || [];

      // Remove any existing entry for this location (to update it)
      const otherLocations = existingLocationIds.filter(
        (entry: string) => !entry.startsWith(`${cleanLocationId}:`)
      );

      // Add this location with current week tag
      const updatedLocationIds = [...otherLocations, locationWithWeek];

      // Calculate total tasks across all locations
      const totalTasks = (existingRefresh?.totalTasks || 0) -
        (existingLocationIds.filter((e: string) => e.startsWith(`${cleanLocationId}:`)).length > 0
          ? existingRefresh?.totalTasks || 0
          : 0) +
        newTasks.length;

      await prisma.userTaskRefresh.upsert({
        where: {
          userId_month: { userId: user.id, month: currentMonth }
        },
        update: {
          refreshedAt: new Date(),
          nextRefresh: nextWeek,
          totalTasks: newTasks.length, // Or totalTasks if you want cumulative
          locationIds: updatedLocationIds,
          triggeredBy: forceGenerate ? "user" : ALLOW_ALL_TASKS ? "allow_all" : "system"
        },
        create: {
          userId: user.id,
          month: currentMonth,
          refreshedAt: new Date(),
          nextRefresh: nextWeek,
          totalTasks: newTasks.length,
          locationIds: [locationWithWeek],
          triggeredBy: forceGenerate ? "user" : ALLOW_ALL_TASKS ? "allow_all" : "system"
        }
      });

    } catch (error) {
      console.warn("Failed to update refresh record:", error);
    }

    return NextResponse.json({
      tasks: newTasks,
      locationData,
      locationProgress,
      week: currentWeek,
      month: currentMonth,
      analysis: analyzeLocation(locationData),
      summary,
      recommendations: recommendations.slice(0, 5),
      validation,
      cheatedTasksDetected: cheatedTasks.length,
      allowAllMode: ALLOW_ALL_TASKS,
      message: ALLOW_ALL_TASKS
        ? `Assigned ALL ${newTasks.length} available tasks for week ${currentWeek}`
        : `Generated ${newTasks.length} unique tasks for week ${currentWeek}`
    })

  } catch (error: any) {
    console.error("Task generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate tasks", details: error.message },
      { status: 500 }
    )
  }
}

// GET /api/locations/tasks
export async function GET(req: Request) {
  try {
    const user = await stackServerApp.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const locationId = searchParams.get("locationId")
    const includeHistory = searchParams.get("includeHistory") === "true"

    if (!locationId) {
      return NextResponse.json(
        { error: "locationId is required" },
        { status: 400 }
      )
    }

    const cleanLocationId = locationId.replace(/^locations\//, "")
    const currentMonth = getMonthKeyFormated(new Date())
    const currentMonth1 = getMonthKey(new Date())

    // 🧠 Get last refresh record for this month
    const lastRefresh = await prisma.userTaskRefresh.findFirst({
      where: {
        userId: user.id,
        month: currentMonth1,
      },
    });

    // 🎯 Extract week for this specific location from locationIds array
    let taskWeek = getWeekNumber(new Date()); // Default to current week
    let locationRefreshedAt: Date | null = null;

    if (lastRefresh?.locationIds) {
      // Find this location's entry in the array (format: "locationId:2025-W44")
      const locationEntry = lastRefresh.locationIds.find(
        (entry: string) => entry.startsWith(cleanLocationId + ':')
      );

      if (locationEntry) {
        // Extract week from format "locationId:2025-W44"
        const parts = locationEntry.split(':');
        if (parts.length === 2) {
          taskWeek = parts[1]; // Gets "2025-W44"
          locationRefreshedAt = lastRefresh.refreshedAt; // Use the refresh timestamp
        }
      }
    }

    // Parallel queries for efficiency
    const [
      tasks,
      locationProgress,
      recentMilestones,
      allMilestones,
      recentAchievements,
      completedThisWeek,
      completedThisMonth,
      allCompleted,
      completedCurrentMonth,
      taskExclusions
    ] = await Promise.all([
      // Active tasks - use taskWeek (generation week for this location)
      prisma.task.findMany({
        where: {
          userId: user.id,
          locationId: cleanLocationId,
          week: taskWeek, // ✅ Use generation week for this specific location
          status: { in: ['pending', 'in_progress'] }
        },
        orderBy: [
          { priority: 'desc' },
          { impact: 'desc' },
          { createdAt: 'asc' }
        ]
      }),

      // Progress
      prisma.locationProgress.findUnique({
        where: {
          userId_locationId: {
            userId: user.id,
            locationId: cleanLocationId
          }
        }
      }),

      // Recent Milestones (last 5)
      prisma.locationMilestone.findMany({
        where: {
          userId: user.id,
          locationId: cleanLocationId
        },
        orderBy: { achievedAt: 'desc' },
        take: 5
      }),

      // All Milestones with full details
      prisma.locationMilestone.findMany({
        where: {
          userId: user.id,
          locationId: cleanLocationId
        },
        orderBy: { achievedAt: 'desc' }
      }),

      // Achievements
      prisma.locationAchievement.findMany({
        where: {
          userId: user.id,
          locationId: cleanLocationId
        },
        orderBy: { earnedAt: 'desc' },
        take: 10
      }),

      // This week's completed - use taskWeek
      prisma.completedTask.findMany({
        where: {
          userId: user.id,
          locationId: cleanLocationId,
          week: taskWeek // ✅ Use same week as active tasks
        },
        orderBy: { completedAt: 'desc' }
      }),

      // This month's completed (using date range)
      prisma.completedTask.findMany({
        where: {
          userId: user.id,
          locationId: cleanLocationId,
          completedAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        },
        orderBy: { completedAt: 'desc' }
      }),

      // All completed (for analytics)
      includeHistory ? prisma.completedTask.findMany({
        where: {
          userId: user.id,
          locationId: cleanLocationId
        },
        select: {
          category: true,
          type: true,
          points: true,
          completedAt: true,
          week: true
        }
      }) : [],

      // Current month's completed tasks
      prisma.completedTask.findMany({
        where: {
          userId: user.id,
          locationId: cleanLocationId,
          completedAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        },
        orderBy: { completedAt: 'desc' }
      }),

      // Task exclusions for this month
      prisma.taskExclusion.findMany({
        where: {
          userId: user.id,
          locationId: cleanLocationId,
          month: currentMonth
        }
      })
    ])

    // Fetch all available milestone templates for progress tracking
    const allMilestoneTemplates = await prisma.milestone.findMany({
      orderBy: [
        { type: 'asc' },
        { threshold: 'asc' }
      ]
    })

    // Calculate milestone progress
    const milestoneProgress = allMilestoneTemplates.map(template => {
      const achieved = allMilestones.find(m => m.milestoneId === template.id)

      let currentValue = 0
      let progress = 0

      switch (template.type) {
        case 'points':
          currentValue = locationProgress?.totalPoints || 0
          progress = Math.min(100, (currentValue / template.threshold) * 100)
          break
        case 'streak':
          currentValue = locationProgress?.currentStreak || 0
          progress = Math.min(100, (currentValue / template.threshold) * 100)
          break
        case 'tasks':
          currentValue = locationProgress?.tasksCompleted || 0
          progress = Math.min(100, (currentValue / template.threshold) * 100)
          break
        case 'level':
          currentValue = locationProgress?.level || 1
          progress = Math.min(100, (currentValue / template.threshold) * 100)
          break
      }

      return {
        id: template.id,
        name: template.name,
        description: template.description,
        type: template.type,
        threshold: template.threshold,
        reward: template.reward,
        icon: template.icon,
        points: template.points,
        currentValue,
        progress: Math.round(progress),
        achieved: !!achieved,
        achievedAt: achieved?.achievedAt || null
      }
    })

    // Calculate statistics
    const taskStats = {
      total: tasks.length,
      completed: completedThisWeek.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      totalPoints: tasks.reduce((sum, t) => sum + t.points, 0),
      earnedPoints: completedThisWeek.reduce((sum, t) => sum + t.points, 0),
      byCategory: tasks.reduce((acc, task) => {
        acc[task.category] = (acc[task.category] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      byPriority: tasks.reduce((acc, task) => {
        acc[task.priority] = (acc[task.priority] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }

    // Monthly statistics
    const monthlyStats = {
      tasksCompleted: completedThisMonth.length,
      pointsEarned: completedThisMonth.reduce((sum, t) => sum + t.points, 0),
      categoriesActive: new Set(completedThisMonth.map(t => t.category)).size
    }

    // Level progress
    const currentLevel = locationProgress?.level || 1
    const pointsForNextLevel = currentLevel * 100
    const currentLevelPoints = (locationProgress?.totalPoints || 0) % 100
    const progressToNextLevel = (currentLevelPoints / pointsForNextLevel) * 100

    return NextResponse.json({
      completedTasks: completedCurrentMonth,

      excludedTasks: taskExclusions.map(ex => ({
        title: ex.taskTitle,
        type: ex.taskType,
        category: ex.category,
        reason: ex.reason,
        excludedAt: ex.excludedAt
      })),

      stats: {
        level: currentLevel,
        totalPoints: locationProgress?.totalPoints || 0,
        weeklyPoints: locationProgress?.weeklyPoints || 0,
        monthlyPoints: locationProgress?.monthlyPoints || 0,
        tasksCompleted: locationProgress?.tasksCompleted || 0,
        currentStreak: locationProgress?.currentStreak || 0,
        longestStreak: locationProgress?.longestStreak || 0,
        lastActiveDate: locationProgress?.lastActiveDate,
        progressToNextLevel: Math.round(progressToNextLevel),
        pointsForNextLevel,
        pointsInCurrentLevel: currentLevelPoints
      },

      scores: {
        profile: locationProgress?.profileScore || 0,
        engagement: locationProgress?.engagementScore || 0,
        content: locationProgress?.contentScore || 0,
        total: (locationProgress?.profileScore || 0) +
          (locationProgress?.engagementScore || 0) +
          (locationProgress?.contentScore || 0)
      },

      tasks: {
        active: tasks,
        completed: completedThisWeek,
        statistics: taskStats
      },

      monthly: monthlyStats,

      milestones: {
        recent: recentMilestones,
        all: milestoneProgress,
        totalAchieved: allMilestones.length,
        totalAvailable: allMilestoneTemplates.length
      },

      achievements: recentAchievements,

      history: includeHistory ? allCompleted : undefined,

      locationId: cleanLocationId,
      week: taskWeek, // ✅ Return the generation week for this location
      month: currentMonth,

      refreshedAt: locationRefreshedAt, // ✅ Return when this location was refreshed
      nextRefresh: lastRefresh?.nextRefresh ?? null,
    })

  } catch (error: any) {
    console.error("Fetch tasks error:", error)
    return NextResponse.json(
      { error: "Failed to fetch tasks", details: error.message },
      { status: 500 }
    )
  }
}