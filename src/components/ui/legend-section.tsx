import { cn } from "@/lib/utils"

interface LegendSectionProps {
  legend: string
  children: React.ReactNode
  className?: string
  legendClassName?: string
}

export function LegendSection({
  legend,
  children,
  className,
  legendClassName,
}: LegendSectionProps) {
  return (
    <fieldset
      className={cn(
        "border border-border rounded-lg px-4 pb-4 pt-2 space-y-4",
        className
      )}
    >
      <legend
        className={cn(
          "text-sm font-medium text-muted-foreground px-2",
          legendClassName
        )}
      >
        {legend}
      </legend>
      {children}
    </fieldset>
  )
}