import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stackServerApp } from "@/stack";
import { getUserSubscription } from "@/lib/actions/stripe";

export async function POST(req: Request) {
  const user = await stackServerApp.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { enable } = await req.json();

  const subscription = await getUserSubscription(user.id);
  if (!subscription?.stripeSubscriptionId)
    return NextResponse.json({ error: "No subscription" }, { status: 404 });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);  

  // Fetch live status from Stripe
  const stripeSub = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);

  if (enable) {
    if (stripeSub.status === "canceled") {
      // Fully cancelled — can't reactivate, must create new subscription
      // Return a flag so the frontend can redirect to checkout instead
      return NextResponse.json({ error: "fully_canceled" }, { status: 400 });
    }

    // Still active but set to cancel at period end — undo that
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

  } else {
    if (stripeSub.status === "canceled") {
      return NextResponse.json({ error: "already_canceled" }, { status: 400 });
    }

    // Schedule cancellation at period end
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
  }

  return NextResponse.json({ success: true });
}