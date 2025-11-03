import { NextResponse } from "next/server"
import { stackServerApp } from "@/stack"
import { prisma } from "../../../../../../lib/prisma"

function getMonthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function getEndOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

// POST /api/tasks/[taskId]/exclude
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
    const body = await req.json()
    const { reason = "dismissed" } = body // "dismissed", "not_interested", "completed_elsewhere"

    // Get the task to exclude
    const task = await prisma.task.findUnique({
      where: { id: taskId }
    })

    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      )
    }

    // Verify ownership
    if (task.userId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized to exclude this task" },
        { status: 403 }
      )
    }

    const currentMonth = getMonthKey()
    const expiresAt = getEndOfMonth(new Date())

    // Add to exclusion list
    const exclusion = await prisma.taskExclusion.upsert({
      where: {
        userId_locationId_month_taskTitle_taskType: {
          userId: user.id,
          locationId: task.locationId,
          month: currentMonth,
          taskTitle: task.title,
          taskType: task.type
        }
      },
      create: {
        userId: user.id,
        locationId: task.locationId,
        month: currentMonth,
        taskTitle: task.title,
        taskType: task.type,
        category: task.category,
        reason,
        taskId: task.id,
        expiresAt
      },
      update: {
        reason,
        taskId: task.id,
        excludedAt: new Date()
      }
    })

    // Optionally update task status to "excluded" or delete it
    await prisma.task.update({
      where: { id: taskId },
      data: { status: "excluded" }
    })

    return NextResponse.json({
      success: true,
      message: "Task excluded from recommendations this month",
      exclusion: {
        id: exclusion.id,
        taskTitle: exclusion.taskTitle,
        reason: exclusion.reason,
        expiresAt: exclusion.expiresAt
      }
    })
  } catch (error: any) {
    console.error("Exclude task error:", error)
    return NextResponse.json(
      { error: "Failed to exclude task", details: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/tasks/[taskId]/exclude - Remove from exclusion list
export async function DELETE(
  req: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    const user = await stackServerApp.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { taskId } = params
    const currentMonth = getMonthKey()

    // Get the task
    const task = await prisma.task.findUnique({
      where: { id: taskId }
    })

    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      )
    }

    // Verify ownership
    if (task.userId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    // Remove from exclusion list
    await prisma.taskExclusion.deleteMany({
      where: {
        userId: user.id,
        locationId: task.locationId,
        month: currentMonth,
        taskTitle: task.title,
        taskType: task.type
      }
    })

    // Update task status back to pending
    await prisma.task.update({
      where: { id: taskId },
      data: { status: "pending" }
    })

    return NextResponse.json({
      success: true,
      message: "Task removed from exclusion list"
    })
  } catch (error: any) {
    console.error("Remove exclusion error:", error)
    return NextResponse.json(
      { error: "Failed to remove exclusion", details: error.message },
      { status: 500 }
    )
  }
}