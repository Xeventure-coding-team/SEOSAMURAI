"use client";

import { useTransition } from "react";
import { createCheckoutSession, createBillingPortalSession } from "@/lib/actions/stripe";
import { detectCurrency } from "@/lib/stripe";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { PlanId } from "@/lib/stripe";
import { useRouter } from "next/navigation";

interface CheckoutButtonProps {
  planId: PlanId;
  isCurrentPlan: boolean;
  isHighlight?: boolean;
  isLoggedIn: boolean;
  currency?: string;
}

export function CheckoutButton({
  planId,
  isCurrentPlan,
  isHighlight,
  isLoggedIn,
  currency,
}: CheckoutButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleClick = () => {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }

    startTransition(async () => {
      if (isCurrentPlan) {
        await createBillingPortalSession();
      } else {
        const cur = (currency ?? detectCurrency()) as any;
      await createCheckoutSession(planId, cur);
      }
    });
  };

  if (isCurrentPlan) {
    return (
      <Button variant="outline" onClick={handleClick} disabled={isPending}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Manage Plan
      </Button>
    );
  }

  return (
    <Button
      onClick={handleClick}
      disabled={isPending}
      variant={isHighlight ? "default" : "outline"}
      className="w-full"
    >
      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {isLoggedIn ? "Subscribe" : "Get Started"}
    </Button>
  );
}