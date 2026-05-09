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