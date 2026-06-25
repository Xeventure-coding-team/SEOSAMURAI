import { cn } from "@/lib/utils"
import { SquareAccordion } from "../loading-ui/square-accordion"

interface ModernLoaderProps {
  size?: "sm" | "md" | "lg"
  variant?: "default" | "dots" | "pulse" | "orbit"
  text?: string
  className?: string
}

export function Loader({ size = "md", variant = "default", text, className }: ModernLoaderProps) {
  // Default spinner with modern gradient effect
  return (
    <div className={cn("flex items-center justify-center w-full h-full min-h-[200px]", className)}>
      <SquareAccordion />
    </div>
  )
}

// Convenience components for common use cases
export function LoadingSpinner({ className }: { className?: string }) {
  return <div className={cn("flex items-center justify-center w-full h-full min-h-[200px]", className)}>
    <SquareAccordion />
  </div>
}

export function LoadingDots({ text, className }: { text?: string; className?: string }) {
  return <div className={cn("flex items-center justify-center w-full h-full min-h-[200px]", className)}>
    <SquareAccordion />
  </div>
}

export function LoadingPulse({ text, className }: { text?: string; className?: string }) {
  return <div className={cn("flex items-center justify-center w-full h-full min-h-[200px]", className)}>
    <SquareAccordion />
  </div>
}

export function LoadingOrbit({ text, className }: { text?: string; className?: string }) {
  return <div className={cn("flex items-center justify-center w-full h-full min-h-[200px]", className)}>
    <SquareAccordion />
  </div>
}