import { stackServerApp } from "@/stack";
import { getUserSubscription } from "@/lib/actions/stripe";
import { redirect } from "next/navigation";
import { PlanType } from "@/generated/prisma";

const PLAN_HIERARCHY: Record<PlanType, number> = {
  STARTER: 1,
  GROWTH: 2,
  PRO: 3,
};

/**
 * Use in Server Components or Server Actions to guard premium content.
 *
 * @example
 * await requireSubscription("PRO");
 */
export async function requireSubscription(minimumPlan: PlanType = "STARTER") {
  const user = await stackServerApp.getUser();
  if (!user) redirect("/handler/sign-in");

  const subscription = await getUserSubscription(user.id);

  if (!subscription) {
    redirect("/pricing?reason=subscription_required");
  }

  const userLevel = PLAN_HIERARCHY[subscription.plan] ?? 0;
  const requiredLevel = PLAN_HIERARCHY[minimumPlan] ?? 999;

  if (userLevel < requiredLevel) {
    redirect(`/pricing?reason=upgrade_required&required=${minimumPlan}`);
  }

  return { user, subscription };
}

/**
 * Returns subscription info without redirecting — use for conditional UI.
 */
export async function getSubscriptionInfo() {
  const user = await stackServerApp.getUser();
  if (!user) return { user: null, subscription: null };

  const subscription = await getUserSubscription(user.id);
  return { user, subscription };
}

/**
 * Returns true if the user has at least the given plan.
 */
export async function hasMinimumPlan(plan: PlanType): Promise<boolean> {
  const user = await stackServerApp.getUser();
  if (!user) return false;

  const subscription = await getUserSubscription(user.id);
  if (!subscription) return false;

  return (PLAN_HIERARCHY[subscription.plan] ?? 0) >= (PLAN_HIERARCHY[plan] ?? 999);
}