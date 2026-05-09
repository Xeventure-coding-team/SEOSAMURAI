import { getPlanLimits } from "@/lib/stripe"
import { PlanId } from "@/lib/stripe"
import { prisma } from "../../lib/prisma"

export async function syncKeywordLimits(userId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { stackUserId: userId }
  })
  if (!subscription) return

  const limit = getPlanLimits(subscription.plan.toLowerCase() as PlanId).keywordTracking

  const activeKeywords = await prisma.keywordTracking.findMany({
    where: { userId, isActive: true },
    orderBy: { createdAt: "asc" } // keep oldest, pause newest
  })

  if (activeKeywords.length <= limit) return // nothing to do

  const toPause = activeKeywords.slice(limit)

  await prisma.keywordTracking.updateMany({
    where: { id: { in: toPause.map(k => k.id) } },
    data: { isActive: false, status: "paused" }
  })

  console.log(`[syncKeywordLimits] Paused ${toPause.length} keywords for user ${userId}`)
}