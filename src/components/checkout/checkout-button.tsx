"use client";

import { useTransition } from "react";
import toast from "react-hot-toast";
import {
  createCheckoutSession,
  createBillingPortalSession,
  createUpgradePortalSession,
} from "@/lib/actions/stripe";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { PlanId } from "@/lib/stripe";
import { useRouter } from "next/navigation";
import { useCurrency } from "@/providers/CurrencyProvider";
import { cn } from "@/lib/utils";

interface CheckoutButtonProps {
  planId: PlanId;
  isCurrentPlan: boolean;
  isHighlight?: boolean;
  isLoggedIn: boolean;
  hasActiveSubscription?: boolean;
}

export function CheckoutButton({
  planId,
  isCurrentPlan,
  isHighlight,
  isLoggedIn,
  hasActiveSubscription,
}: CheckoutButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  // Read currency from global context — updated by CurrencySelector
  const { currency } = useCurrency();

  const handleClick = () => {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }

    startTransition(async () => {
      try {
        if (isCurrentPlan) {
          await createBillingPortalSession();
        } else if (hasActiveSubscription) {
          await createUpgradePortalSession(planId, currency);
        } else {
          await createCheckoutSession(planId, currency);
        }
      } catch (err: any) {
        if (err?.message?.includes("NEXT_REDIRECT")) return;
        toast.error(err?.message ?? "Something went wrong. Please try again.");
      }
    });
  };

  if (isCurrentPlan) {
    return (
      <Button
        variant="outline"
        onClick={handleClick}
        disabled={isPending}
        className="w-full"
      >
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
  className={cn(
    "w-full",
    !isHighlight &&
      "bg-background text-foreground border-border hover:bg-muted"
  )}
>
  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  {isLoggedIn
    ? hasActiveSubscription
      ? "Switch Plan"
      : "Subscribe"
    : "Get Started"}
</Button>
  );
}