import { prisma } from "../../lib/prisma"
import { getPlanLimits, PlanId } from "./stripe"

export async function syncLocationLimits(userId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { stackUserId: userId }
  })

  if (!subscription) {
    // No subscription — deactivate all locations
    await prisma.locations.updateMany({
      where: { user_id: userId, is_deleted: false },
      data: { is_active: false }
    })
    return
  }

  // ✅ Check if subscription is actually active
  if (subscription.status !== "ACTIVE") {
    // Expired/cancelled — deactivate all
    await prisma.locations.updateMany({
      where: { user_id: userId, is_deleted: false },
      data: { is_active: false }
    })
    return
  }

  // ✅ Check if period has ended (Stripe webhook delayed)
  if (new Date(subscription.stripeCurrentPeriodEnd) < new Date()) {
    await prisma.locations.updateMany({
      where: { user_id: userId, is_deleted: false },
      data: { is_active: false }
    })
    return
  }

  // Active subscription — enforce location limit
  const limit = getPlanLimits(subscription.plan.toLowerCase() as PlanId).locations

  const activeLocations = await prisma.locations.findMany({
    where: { user_id: userId, is_active: true, is_deleted: false },
    orderBy: { created_at: "asc" }
  })

  if (activeLocations.length <= limit) return

  const toPause = activeLocations.slice(limit)
  await prisma.locations.updateMany({
    where: { id: { in: toPause.map(l => l.id) } },
    data: { is_active: false }
  })
}