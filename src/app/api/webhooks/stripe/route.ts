import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe, getPlanByPriceId, getPlanLimits, PlanId } from "@/lib/stripe";
import { PlanType, SubscriptionStatus } from "@/generated/prisma";
import { prisma } from "../../../../../lib/prisma";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

function getPeriodEnd(subscription: Stripe.Subscription): Date {
  const item = subscription.items.data[0];
  const ts =
    (item as any)?.billing_period?.end ??
    (subscription as any).current_period_end;

  if (!ts) {
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
    active:             "ACTIVE",
    canceled:           "CANCELED",
    incomplete:         "INCOMPLETE",
    incomplete_expired: "INCOMPLETE_EXPIRED",
    past_due:           "PAST_DUE",
    trialing:           "TRIALING",
    unpaid:             "UNPAID",
    paused:             "CANCELED",
  };
  return map[status] ?? "INCOMPLETE";
}

// ─── Plan change handlers ─────────────────────────────────────────────────────

async function handleDowngrade(userId: string, newPlanId: PlanId) {
  const newLimits = getPlanLimits(newPlanId);

  // Locations — lock extras, keep oldest
  const activeLocations = await prisma.locations.findMany({
    where: { user_id: userId, is_active: true, is_deleted: false },
    orderBy: { created_at: "asc" },
  });

  if (activeLocations.length > newLimits.locations) {
    const toLock = activeLocations.slice(newLimits.locations).map((l) => l.id);
    await prisma.locations.updateMany({
      where: { id: { in: toLock } },
      data: { is_active: false },
    });
    console.log(`Locked ${toLock.length} locations for user ${userId}`);
  }

  // Websites — lock extras, keep oldest
  const activeWebsites = await prisma.website.findMany({
    where: { userId, isActive: true },
    orderBy: { createdAt: "asc" },
  });

  if (activeWebsites.length > newLimits.websites) {
    const toLock = activeWebsites.slice(newLimits.websites).map((w) => w.id);
    await prisma.website.updateMany({
      where: { id: { in: toLock } },
      data: { isActive: false },
    });
    console.log(`Locked ${toLock.length} websites for user ${userId}`);
  }

  // Review posters — no action, slot gate handles creation blocking
}

async function handleUpgrade(userId: string, newPlanId: PlanId) {
  const newLimits = getPlanLimits(newPlanId);

  // Locations — unlock previously locked ones up to new limit
  const activeCount = await prisma.locations.count({
    where: { user_id: userId, is_active: true, is_deleted: false },
  });

  const locationsToUnlock = newLimits.locations - activeCount;
  if (locationsToUnlock > 0) {
    const locked = await prisma.locations.findMany({
      where: { user_id: userId, is_active: false, is_deleted: false },
      orderBy: { created_at: "asc" },
      take: locationsToUnlock,
    });

    if (locked.length > 0) {
      await prisma.locations.updateMany({
        where: { id: { in: locked.map((l) => l.id) } },
        data: { is_active: true },
      });
      console.log(`Unlocked ${locked.length} locations for user ${userId}`);
    }
  }

  // Websites — unlock previously locked ones up to new limit
  const activeWebsiteCount = await prisma.website.count({
    where: { userId, isActive: true },
  });

  const websitesToUnlock = newLimits.websites - activeWebsiteCount;
  if (websitesToUnlock > 0) {
    const locked = await prisma.website.findMany({
      where: { userId, isActive: false },
      orderBy: { createdAt: "asc" },
      take: websitesToUnlock,
    });

    if (locked.length > 0) {
      await prisma.website.updateMany({
        where: { id: { in: locked.map((w) => w.id) } },
        data: { isActive: true },
      });
      console.log(`Unlocked ${locked.length} websites for user ${userId}`);
    }
  }

  // Review posters — no action, slot gate allows creation automatically
}

async function handlePlanChange(userId: string, oldPlanId: PlanId, newPlanId: PlanId) {
  const oldLimits = getPlanLimits(oldPlanId);
  const newLimits = getPlanLimits(newPlanId);

  const isDowngrade =
    newLimits.locations < oldLimits.locations ||
    newLimits.websites  < oldLimits.websites;

  console.log(`Plan change for ${userId}: ${oldPlanId} → ${newPlanId} (${isDowngrade ? "downgrade" : "upgrade"})`);

  if (isDowngrade) {
    await handleDowngrade(userId, newPlanId);
  } else {
    await handleUpgrade(userId, newPlanId);
  }
}

// ─── Webhook handler ──────────────────────────────────────────────────────────

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

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const stackUserId = subscription.metadata?.stackUserId;
        const priceId = subscription.items.data[0]?.price.id;

        if (!stackUserId || !priceId) {
          console.error("Missing stackUserId or priceId");
          break;
        }

        const plan = getPlanByPriceId(priceId);
        if (!plan) {
          console.error("Unknown price ID:", priceId);
          break;
        }

        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;

        // Get old plan before upsert
        const existing = await prisma.subscription.findUnique({
          where: { stackUserId },
          select: { plan: true },
        });

        await prisma.subscription.upsert({
          where: { stackUserId },
          create: {
            stackUserId,
            stripeCustomerId:       customerId,
            stripeSubscriptionId:   subscription.id,
            stripePriceId:          priceId,
            stripeCurrentPeriodEnd: getPeriodEnd(subscription),
            status:                 stripeStatusToPrisma(subscription.status),
            plan:                   plan.id.toUpperCase() as PlanType,
            cancelAtPeriodEnd:      (subscription as any).cancel_at_period_end ?? false,
          },
          update: {
            stripeCustomerId:       customerId,
            stripeSubscriptionId:   subscription.id,
            stripePriceId:          priceId,
            stripeCurrentPeriodEnd: getPeriodEnd(subscription),
            status:                 stripeStatusToPrisma(subscription.status),
            plan:                   plan.id.toUpperCase() as PlanType,
            cancelAtPeriodEnd:      (subscription as any).cancel_at_period_end ?? false,
          },
        });

        // Handle plan change if plan actually changed
        if (existing?.plan) {
          const oldPlanId = existing.plan.toLowerCase() as PlanId;
          const newPlanId = plan.id as PlanId;
          if (oldPlanId !== newPlanId) {
            await handlePlanChange(stackUserId, oldPlanId, newPlanId);
          }
        }

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const stackUserId = subscription.metadata?.stackUserId;

        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: { status: "CANCELED" },
        });

        // Lock all locations and websites on cancellation
        if (stackUserId) {
          await prisma.locations.updateMany({
            where: { user_id: stackUserId, is_deleted: false },
            data: { is_active: false },
          });
          await prisma.website.updateMany({
            where: { userId: stackUserId },
            data: { isActive: false },
          });
          console.log(`Locked all resources for cancelled user ${stackUserId}`);
        }

        break;
      }

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