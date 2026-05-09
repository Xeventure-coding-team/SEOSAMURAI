import { Lock, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface LocationLockedProps {
  locationName?: string
  className?: string
}

export function LocationLocked({ locationName, className }: LocationLockedProps) {
  return (
    <div className={cn(
      "relative flex flex-col items-center justify-center gap-6 rounded-xl border border-dashed bg-muted/30 py-16 px-8 text-center",
      className
    )}>
      {/* Icon */}
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Lock className="h-6 w-6 text-muted-foreground" />
      </div>

      {/* Text */}
      <div className="flex flex-col gap-2 max-w-sm">
        <h3 className="text-base font-medium">
          {locationName ? `${locationName} is inactive` : "Location inactive"}
        </h3>
        <p className="text-sm text-muted-foreground">
          This location is on your account but your current plan doesn't cover it.
          Upgrade to reactivate and manage this location.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button asChild size="sm">
          <Link href="/app/settings/billing">
            <Zap className="h-3.5 w-3.5 mr-1.5" />
            Upgrade Plan
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/app/locations">
            View All Locations
          </Link>
        </Button>
      </div>
    </div>
  )
}