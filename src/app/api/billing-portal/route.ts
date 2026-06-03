import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stackServerApp } from "@/stack";
import { getUserSubscription } from "@/lib/actions/stripe";

export async function POST(req: Request) {
  const user = await stackServerApp.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscription = await getUserSubscription(user.id);
  if (!subscription?.stripeCustomerId) {
    return NextResponse.json({ error: "No subscription found" }, { status: 404 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/app/settings/billing`,
  });

  // Return the URL — let the client redirect
  return NextResponse.json({ url: session.url });
}