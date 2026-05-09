import { stackServerApp } from "@/stack"
import { NextResponse } from "next/server"
import { prisma } from "../../../../../../lib/prisma"
import { getPlanLimits, PlanId } from "@/lib/stripe"
import { saveLocationChoice } from "@/lib/location-choice"

export async function POST(req: Request) {
  const user = await stackServerApp.getUser()
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { selectedIds } = await req.json()

  const subscription = await prisma.subscription.findUnique({
    where: { stackUserId: user.id }
  })
  if (!subscription) return NextResponse.json({ error: "No subscription" }, { status: 403 })

  const limit = getPlanLimits(subscription.plan.toLowerCase() as PlanId).locations
  if (selectedIds.length > limit) {
    return NextResponse.json({ error: "Too many locations selected" }, { status: 403 })
  }

  // Deactivate all
  await prisma.locations.updateMany({
    where: { user_id: user.id, is_deleted: false },
    data: { is_active: false }
  })

  // Activate selected
  await prisma.locations.updateMany({
    where: { user_id: user.id, location_id: { in: selectedIds } },
    data: { is_active: true }
  })

  // ✅ Save choice for this billing period
  await saveLocationChoice(user.id)

  return NextResponse.json({ success: true })
}