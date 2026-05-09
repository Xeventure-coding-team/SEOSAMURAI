// app/api/webhooks/stripe/route.ts
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe, getPlanByPriceId } from "@/lib/stripe";
import { PlanType, SubscriptionStatus } from "@/generated/prisma";
import { prisma } from "../../../../../lib/prisma";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;


function getPeriodEnd(subscription: Stripe.Subscription): Date {
  const item = subscription.items.data[0];
  // New SDK: billing_period.end on each item
  const ts =
    (item as any)?.billing_period?.end ??
    (subscription as any).current_period_end;

  if (!ts) {
    // Last resort: add 1 interval from now
    const interval = item?.plan?.interval ?? "month";
    const d = new Date();
    if (interval === "year") d.setFullYear(d.getFullYear() + 1);
    else d.setMonth(d.getMonth() + 1);
    return d;
  }
  return new Date(ts * 1000);
}

function stripeStatusToPrisma(status: Stripe.Subscription.Status): SubscriptionStatus {
  const map: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
    active: "ACTIVE",
    canceled: "CANCELED",
    incomplete: "INCOMPLETE",
    incomplete_expired: "INCOMPLETE_EXPIRED",
    past_due: "PAST_DUE",
    trialing: "TRIALING",
    unpaid: "UNPAID",
    paused: "CANCELED",
  };
  return map[status] ?? "INCOMPLETE";
}

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const sig = headersList.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      // ── New subscription created or updated ──────────────────────────────
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const stackUserId = subscription.metadata?.stackUserId;
        const priceId = subscription.items.data[0]?.price.id;

        if (!stackUserId || !priceId) {
          console.error("Missing stackUserId or priceId in subscription metadata");
          break;
        }

        const plan = getPlanByPriceId(priceId);
        if (!plan) {
          console.error("Unknown price ID:", priceId);
          break;
        }

        // Resolve the Stripe customer ID
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;

        await prisma.subscription.upsert({
          where: { stackUserId },
          create: {
            stackUserId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscription.id,
            stripePriceId: priceId,
            stripeCurrentPeriodEnd: getPeriodEnd(subscription),
            status: stripeStatusToPrisma(subscription.status),
            plan: plan.id.toUpperCase() as PlanType,
            cancelAtPeriodEnd: (subscription as any).cancel_at_period_end ?? false,
          },
          update: {
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscription.id,
            stripePriceId: priceId,
            stripeCurrentPeriodEnd: getPeriodEnd(subscription),
            status: stripeStatusToPrisma(subscription.status),
            plan: plan.id.toUpperCase() as PlanType,
            cancelAtPeriodEnd: (subscription as any).cancel_at_period_end ?? false,
          },
        });
        break;
      }

      // ── Subscription deleted ──────────────────────────────────────────────
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: { status: "CANCELED" },
        });
        break;
      }

      // ── Invoice paid (renew period) ───────────────────────────────────────
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as any).subscription as string | undefined;
        if (!subscriptionId) break;

        const stripeSub = await getStripe().subscriptions.retrieve(subscriptionId);
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscriptionId },
          data: {
            status: "ACTIVE",
            stripeCurrentPeriodEnd: getPeriodEnd(stripeSub),
          },
        });
        break;
      }

      // ── Invoice payment failed ────────────────────────────────────────────
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as any).subscription as string | undefined;
        if (!subscriptionId) break;

        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscriptionId },
          data: { status: "PAST_DUE" },
        });
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error("Error processing webhook:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}