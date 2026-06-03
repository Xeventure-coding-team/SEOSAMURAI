"use server";

import { stackServerApp } from "@/stack";
import { getStripe, PLANS, type PlanId, type SupportedCurrency } from "@/lib/stripe";
import { redirect } from "next/navigation";
import { prisma } from "../../../lib/prisma";

// ─── Get or create Stripe customer ────────────────────────────────────────────
async function getOrCreateStripeCustomer(stackUserId: string, email: string) {
  const existing = await prisma.subscription.findUnique({
    where: { stackUserId },
    select: { stripeCustomerId: true },
  });
 
  if (existing?.stripeCustomerId) return existing.stripeCustomerId;
 
  const customer = await getStripe().customers.create({
    email,
    metadata: { stackUserId },
  });
 
  return customer.id;
}

// ─── Create checkout session ───────────────────────────────────────────────────
export async function createCheckoutSession(
  planId: PlanId,
  currency: SupportedCurrency = "inr"
) {
  const user = await stackServerApp.getUser();
  if (!user) redirect("/handler/sign-in");

  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) throw new Error("Invalid plan");

  const priceId = plan.priceIds[currency];
  if (!priceId) throw new Error(`No price configured for ${currency}`);

  // If already subscribed, send to billing portal to change plan
  const existingSub = await prisma.subscription.findFirst({
    where: {
      stackUserId: user.id,
      status: { in: ["ACTIVE", "TRIALING"] },
    },
  });

  if (existingSub) return createBillingPortalSession();

  const customerId = await getOrCreateStripeCustomer(
    user.id,
    user.primaryEmail ?? ""
  );

  const checkoutSession = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_PUBLIC_URL}/app/dashboard?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_PUBLIC_URL}/pricing?canceled=true`,
    subscription_data: {
      metadata: { stackUserId: user.id, planId },
    },
    allow_promotion_codes: true,
  });

  redirect(checkoutSession.url!);
}

// ─── Billing portal ────────────────────────────────────────────────────────────
export async function createBillingPortalSession() {
  const user = await stackServerApp.getUser();
  if (!user) redirect("/handler/sign-in");

  const sub = await prisma.subscription.findUnique({
    where: { stackUserId: user.id },
    select: { stripeCustomerId: true },
  });

  if (!sub?.stripeCustomerId) redirect("/pricing");

  const portalSession = await getStripe().billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_PUBLIC_URL}/app/dashboard`,
  });

  redirect(portalSession.url);
}

// ─── Get user subscription ─────────────────────────────────────────────────────
export async function getUserSubscription(stackUserId: string) {
  return prisma.subscription.findFirst({
    where: {
      stackUserId,
      status: { in: ["ACTIVE", "TRIALING"] },
    },
  });
}

export async function upgradeSubscription(
  planId: PlanId,
  currency: SupportedCurrency = "inr"
) {
  const user = await stackServerApp.getUser();
  if (!user) redirect("/handler/sign-in");

  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) throw new Error("Invalid plan");

  const priceId = plan.priceIds[currency];
  if (!priceId) throw new Error(`No price configured for ${currency}`);

  const existingSub = await prisma.subscription.findFirst({
    where: {
      stackUserId: user.id,
      status: { in: ["ACTIVE", "TRIALING"] },
    },
  });

  if (!existingSub?.stripeSubscriptionId) {
    // No active sub — go to normal checkout
    return createCheckoutSession(planId, currency);
  }

  // Get current subscription from Stripe
  const stripeSub = await getStripe().subscriptions.retrieve(
    existingSub.stripeSubscriptionId
  );

  // Update to new price — proration handled by Stripe, no refund
  await getStripe().subscriptions.update(existingSub.stripeSubscriptionId, {
    items: [{
      id: stripeSub.items.data[0].id,
      price: priceId,
    }],
    proration_behavior: "create_prorations", // charges difference only, no refund
  });

  redirect(`${process.env.NEXT_PUBLIC_PUBLIC_URL}/app/dashboard`);
}


export async function createUpgradePortalSession(
  planId: PlanId,
  currency: SupportedCurrency = "inr"
) {
  const user = await stackServerApp.getUser();
  if (!user) redirect("/handler/sign-in");

  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) throw new Error("Invalid plan");

  const priceId = plan.priceIds[currency];

  const sub = await prisma.subscription.findFirst({
    where: {
      stackUserId: user.id,
      status: { in: ["ACTIVE", "TRIALING"] },
    },
  });

  if (!sub?.stripeCustomerId || !sub?.stripeSubscriptionId) {
    return createCheckoutSession(planId, currency);
  }

  const stripeSub = await getStripe().subscriptions.retrieve(
    sub.stripeSubscriptionId
  );

  // ← Guard: already on this price, nothing to change
  const currentPriceId = stripeSub.items.data[0].price.id;
  if (currentPriceId === priceId) {
    redirect(`${process.env.NEXT_PUBLIC_PUBLIC_URL}/pricing`);
  }

  const portalSession = await getStripe().billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_PUBLIC_URL}/app/dashboard`,
    flow_data: {
      type: "subscription_update_confirm",
      subscription_update_confirm: {
        subscription: sub.stripeSubscriptionId,
        items: [{
          id: stripeSub.items.data[0].id,
          price: priceId,
          quantity: 1,
        }],
      },
    },
  });

  redirect(portalSession.url);
}