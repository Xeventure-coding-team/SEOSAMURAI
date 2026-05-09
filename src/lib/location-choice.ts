import { getPlanLimits, PlanId } from "@/lib/stripe"
import { prisma } from "../../lib/prisma"

export async function saveLocationChoice(userId: string): Promise<void> {
  const usage = await prisma.usage.findUnique({
    where: { stackUserId: userId },
    select: { periodStart: true, periodEnd: true }
  })

  if (!usage) return

  await prisma.locationChoice.upsert({
    where: {
      stackUserId_periodEnd: {
        stackUserId: userId,
        periodEnd: usage.periodEnd,
      }
    },
    update: { confirmedAt: new Date() },
    create: {
      stackUserId: userId,
      confirmedAt: new Date(),
      periodStart: usage.periodStart,
      periodEnd:   usage.periodEnd,
    }
  })
}

export async function hasValidLocationChoice(userId: string): Promise<boolean> {
  const [subscription, usage, activeCount] = await Promise.all([
    prisma.subscription.findUnique({
      where: { stackUserId: userId },
      select: { plan: true }
    }),
    prisma.usage.findUnique({
      where: { stackUserId: userId },
      select: { periodStart: true, periodEnd: true }
    }),
    prisma.locations.count({
      where: { user_id: userId, is_active: true, is_deleted: false }
    })
  ])

  if (!subscription || !usage) return false

  const limit = getPlanLimits(subscription.plan.toLowerCase() as PlanId).locations

  // Over limit — force re-choice regardless
  if (activeCount > limit) return false

  const choice = await prisma.locationChoice.findFirst({
    where: {
      stackUserId: userId,
      periodStart: { lte: new Date() },
      periodEnd:   { gte: new Date() },
    }
  })

  return !!choice
}