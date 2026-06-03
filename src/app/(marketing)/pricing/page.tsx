import { PLANS, formatPrice } from "@/lib/stripe";
import { getUserSubscription } from "@/lib/actions/stripe";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckoutButton } from "@/components/checkout/checkout-button";
import { stackServerApp } from "@/stack";

export default async function PricingPage() {
  const user = await stackServerApp.getUser();
  const subscription = user ? await getUserSubscription(user.id) : null;

  // Match by plan field in DB — reliable across all currencies
  const currentPlanId = subscription?.plan?.toLowerCase() ?? null;

  return (
    <main className="container mx-auto px-4 py-24">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold tracking-tight mb-4">
          Simple, transparent pricing
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Start for free, scale as you grow. No hidden fees.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {PLANS.map((plan) => {
          const isCurrentPlan =
            !!subscription &&
            subscription.status === "ACTIVE" &&
            currentPlanId === plan.id;  // ← reliable match

          return (
            <div
              key={plan.id}
              className={cn(
                "relative rounded-2xl border p-8 flex flex-col gap-6",
                plan.highlight
                  ? "border-primary shadow-lg shadow-primary/10 bg-primary/5"
                  : "border-border bg-card"
              )}
            >
              {plan.highlight && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Most Popular
                </Badge>
              )}

              <div>
                <h2 className="text-xl font-semibold">{plan.name}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {plan.description}
                </p>
              </div>

              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold">
                  {formatPrice(plan.price)}
                </span>
                <span className="text-muted-foreground mb-1">
                  /{plan.interval}
                </span>
              </div>

              <ul className="space-y-3 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <CheckoutButton
                planId={plan.id}
                isCurrentPlan={isCurrentPlan}
                hasActiveSubscription={!!subscription}
                isHighlight={plan.highlight}
                isLoggedIn={!!user}
              />
            </div>
          );
        })}
      </div>
    </main>
  );
}