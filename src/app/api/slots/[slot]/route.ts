import { NextResponse } from "next/server";
import { stackServerApp } from "@/stack";
import { getPlanLimits, PlanId } from "@/lib/stripe";
import { prisma } from "../../../../../lib/prisma";

const SLOT_COUNTERS = {
  locations: (userId: string) => prisma.locations.count({ 
    where: { user_id: userId, is_deleted: false } 
  }),
  websites: (userId: string) => prisma.website.count({ 
    where: { userId } 
  }),
};

const SLOT_LIMIT_KEY = {
  locations: "locations",
  websites:  "websites",
} as const;

const empty = { current: 0, limit: 0, remaining: 0 };

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slot: string }> }
) {
  const { slot } = await params;

  if (!SLOT_COUNTERS[slot as keyof typeof SLOT_COUNTERS]) {
    return NextResponse.json({ current: 0, limit: 0, remaining: 0 });
  }

  const user = await stackServerApp.getUser();
  if (!user) return NextResponse.json({ current: 0, limit: 0, remaining: 0 });

  // Always count — regardless of subscription
  const current = await SLOT_COUNTERS[slot as keyof typeof SLOT_COUNTERS](user.id);

  const subscription = await prisma.subscription.findUnique({
    where: { stackUserId: user.id },
  });

  // No subscription or inactive — show real count but limit = 0
  if (
    !subscription ||
    (subscription.status !== "ACTIVE" && subscription.status !== "TRIALING")
  ) {
    return NextResponse.json({ current, limit: 0, remaining: 0 });
  }

  const planId    = subscription.plan.toLowerCase() as PlanId;
  const limits    = getPlanLimits(planId);
  const limitKey  = SLOT_LIMIT_KEY[slot as keyof typeof SLOT_LIMIT_KEY];
  const limit     = limits[limitKey] as number;
  const remaining = Math.max(0, limit - current);

  return NextResponse.json({ current, limit, remaining });
}