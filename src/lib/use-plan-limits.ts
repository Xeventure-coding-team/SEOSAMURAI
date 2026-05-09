import { useUsage } from "@/lib/use-usage"
import { getPlanLimits, PlanId } from "@/lib/stripe"

export function usePlanLimits() {
  const { data } = useUsage()

  if (!data?.plan) return null

  return getPlanLimits(data.plan.toLowerCase() as PlanId)
}