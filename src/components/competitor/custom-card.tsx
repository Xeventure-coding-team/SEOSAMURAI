import type React from "react"
import { cn } from "@/lib/utils"
import { forwardRef } from "react"

interface CustomCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "outlined" | "ghost"
  interactive?: boolean
}

const CustomCard = forwardRef<HTMLDivElement, CustomCardProps>(
  ({ className, variant = "default", interactive = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base styles using shadcn design tokens
          "rounded-lg border bg-card text-card-foreground shadow-sm",
          // Variant styles
          {
            "border-border": variant === "default",
            "border-border shadow-lg": variant === "elevated",
            "border-2 border-border bg-transparent shadow-none": variant === "outlined",
            "border-none shadow-none bg-transparent": variant === "ghost",
          },
          // Interactive styles
          interactive && [
            "cursor-pointer transition-all duration-200",
            "hover:shadow-md hover:scale-[1.02]",
            "active:scale-[0.98]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          ],
          className,
        )}
        {...props}
      />
    )
  },
)
CustomCard.displayName = "CustomCard"

const CustomCardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  ),
)
CustomCardHeader.displayName = "CustomCardHeader"

const CustomCardTitle = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props} />
  ),
)
CustomCardTitle.displayName = "CustomCardTitle"

const CustomCardDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  ),
)
CustomCardDescription.displayName = "CustomCardDescription"

const CustomCardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />,
)
CustomCardContent.displayName = "CustomCardContent"

const CustomCardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  ),
)
CustomCardFooter.displayName = "CustomCardFooter"

export { CustomCard, CustomCardHeader, CustomCardTitle, CustomCardDescription, CustomCardContent, CustomCardFooter }
