"use client";

import { useTransition } from "react";
import toast from "react-hot-toast";
import { createCheckoutSession, createBillingPortalSession, createUpgradePortalSession } from "@/lib/actions/stripe";
import { detectCurrency } from "@/lib/stripe";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { PlanId, SupportedCurrency } from "@/lib/stripe";
import { useRouter } from "next/navigation";

interface CheckoutButtonProps {
  planId: PlanId;
  isCurrentPlan: boolean;
  isHighlight?: boolean;
  isLoggedIn: boolean;
  hasActiveSubscription?: boolean;
  currency?: string;
}

export function CheckoutButton({
  planId,
  isCurrentPlan,
  isHighlight,
  isLoggedIn,
  hasActiveSubscription,
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
      const cur = (currency ?? detectCurrency()) as SupportedCurrency;

      try {
        if (isCurrentPlan) {
          await createBillingPortalSession();
        } else if (hasActiveSubscription) {
          await createUpgradePortalSession(planId, cur);
        } else {
          await createCheckoutSession(planId, cur);
        }
      } catch (err: any) {
        // Next.js redirect() throws internally — ignore those
        if (err?.message?.includes("NEXT_REDIRECT")) return;
        toast.error(err?.message ?? "Something went wrong. Please try again.");
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
      {isLoggedIn
        ? hasActiveSubscription ? "Switch Plan" : "Subscribe"
        : "Get Started"
      }
    </Button>
  );
}