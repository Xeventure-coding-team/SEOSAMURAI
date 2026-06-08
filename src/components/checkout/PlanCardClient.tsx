"use client";

import { Check, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckoutButton } from "@/components/checkout/checkout-button";
import { formatPrice, type SupportedCurrency, type PlanId } from "@/lib/stripe";
import { useCurrency } from "@/providers/CurrencyProvider";

interface PlanData {
  id: PlanId;
  name: string;
  description: string;
  prices: Record<SupportedCurrency, number>;
  interval: "month" | "year";
  features: string[];
  highlight: boolean;
  cta: string;
  isCurrentPlan: boolean;
}

interface PlanCardClientProps {
  plan: PlanData;
  hasActiveSubscription: boolean;
  isLoggedIn: boolean;
}

export function PlanCardClient({ plan, hasActiveSubscription, isLoggedIn }: PlanCardClientProps) {
  const { currency } = useCurrency();
  const price = plan.prices[currency];

  return (
    <div
      className={cn(
        "relative rounded-2xl border flex flex-col gap-5 p-6 transition-all duration-200",
        plan.isCurrentPlan
          ? "border-primary/30 bg-primary/5 ring-1 ring-primary/20"
          : plan.highlight
            ? "border-primary/40 bg-card shadow-md shadow-primary/5 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5"
            : "border-border bg-card hover:border-border/80 hover:shadow-sm hover:-translate-y-0.5"
      )}
    >
      {/* Top badges */}
      {plan.isCurrentPlan && (
        <Badge
          variant="outline"
          className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap bg-primary text-primary-foreground border-primary text-[11px] px-3"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground/80 animate-pulse mr-1.5 inline-block" />
          Current plan
        </Badge>
      )}
      {!plan.isCurrentPlan && plan.highlight && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] px-3">
          <Zap className="h-3 w-3 mr-1 fill-current" />
          Most popular
        </Badge>
      )}

      {/* Plan name + description */}
      <div className="space-y-1 pt-1">
        <h2 className="text-lg font-semibold tracking-tight">{plan.name}</h2>
        <p className="text-sm text-muted-foreground leading-snug">{plan.description}</p>
      </div>

      {/* Price — updates instantly on currency change */}
      <div className={cn(
        "rounded-xl px-4 py-4 border",
        plan.isCurrentPlan ? "bg-primary/10" : "bg-muted/50"
      )}>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold tracking-tight">
            {formatPrice(price, currency)}
          </span>
          <span className="text-muted-foreground text-sm font-medium">/{plan.interval}</span>
        </div>
        {price === 0 ? (
          <p className="text-xs text-muted-foreground mt-1">Free forever · No credit card needed</p>
        ) : (
          <p className="text-xs text-muted-foreground mt-1">Billed {plan.interval}ly</p>
        )}
      </div>

      {/* Feature list */}
      <ul className="space-y-3.5 flex-1">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-center gap-3">
            <span className={cn(
              "h-5 w-5 rounded-full flex items-center justify-center shrink-0",
              plan.isCurrentPlan ? "bg-primary" : "bg-primary/15"
            )}>
              <Check className={cn(
                "h-3 w-3 stroke-[3]",
                plan.isCurrentPlan ? "text-primary-foreground" : "text-primary"
              )} />
            </span>
            <span className="text-sm leading-snug text-foreground font-medium">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <CheckoutButton
        planId={plan.id}
        isCurrentPlan={plan.isCurrentPlan}
        hasActiveSubscription={hasActiveSubscription}
        isHighlight={plan.highlight}
        isLoggedIn={isLoggedIn}
      />
    </div>
  );
}