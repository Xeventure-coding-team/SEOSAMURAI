import { getPlanLimits, PlanId } from "@/lib/stripe";
import { prisma } from "../../lib/prisma";

type SlotResource = "locations" | "websites";

// Map resource → how to count it in DB
const SLOT_COUNTERS: Record<SlotResource, (userId: string) => Promise<number>> = {
  locations: (userId) => prisma.locations.count({ where: { user_id: userId } }),
  websites:  (userId) => prisma.website.count({  where: { userId: userId } }),
};

export async function canAddSlot(
  stackUserId: string,
  resource: SlotResource
): Promise<{ ok: true; remaining: number } | { ok: false; reason: "limit_reached" | "no_subscription" }> {
  const subscription = await prisma.subscription.findUnique({
    where: { stackUserId },
  });

  if (!subscription) return { ok: false, reason: "no_subscription" };

  const planId  = subscription.plan.toLowerCase() as PlanId;
  const limits  = getPlanLimits(planId);
  const limit   = limits[resource] as number;
  const current = await SLOT_COUNTERS[resource](stackUserId);

  if (current >= limit) return { ok: false, reason: "limit_reached" };

  return { ok: true, remaining: limit - current - 1 };
}