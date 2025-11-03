import { cn } from "@/lib/utils"

interface ModernLoaderProps {
  size?: "sm" | "md" | "lg"
  variant?: "default" | "dots" | "pulse" | "orbit"
  text?: string
  className?: string
}

export function Loader({ size = "md", variant = "default", text, className }: ModernLoaderProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  }

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  }

  if (variant === "dots") {
    return (
      <div className={cn("flex flex-col items-center gap-3 mt-4", className)}>
        <div className="flex space-x-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                "bg-primary rounded-full animate-pulse",
                size === "sm" ? "w-2 h-2" : size === "md" ? "w-3 h-3" : "w-4 h-4",
              )}
              style={{
                animationDelay: `${i * 0.2}s`,
                animationDuration: "1.4s",
              }}
            />
          ))}
        </div>
        {text && <p className={cn("text-muted-foreground font-medium", textSizeClasses[size])}>{text}</p>}
      </div>
    )
  }

  if (variant === "pulse") {
    return (
      <div className={cn("flex flex-col items-center gap-3  mt-4", className)}>
        <div className={cn("bg-primary rounded-full animate-pulse", sizeClasses[size])} />
        {text && <p className={cn("text-muted-foreground font-medium", textSizeClasses[size])}>{text}</p>}
      </div>
    )
  }

  if (variant === "orbit") {
    return (
      <div className={cn("flex flex-col items-center gap-3  mt-4", className)}>
        <div className={cn("relative", sizeClasses[size])}>
          <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
          <div
            className="absolute inset-1 rounded-full border border-transparent border-t-primary/60 animate-spin"
            style={{ animationDirection: "reverse", animationDuration: "0.8s" }}
          />
        </div>
        {text && <p className={cn("text-muted-foreground font-medium", textSizeClasses[size])}>{text}</p>}
      </div>
    )
  }

  // Default spinner with modern gradient effect
  return (
    <div className={cn("flex flex-col items-center gap-3  mt-4", className)}>
      <div className={cn("relative", sizeClasses[size])}>
        {/* Outer ring with gradient */}
        <div
          className="absolute inset-0 rounded-full bg-gradient-to-r from-primary via-primary/60 to-transparent animate-spin"
          style={{ animationDuration: "1s" }}
        />
        <div className="absolute inset-0.5 rounded-full bg-background" />

        {/* Inner spinning dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={cn(
              "bg-primary rounded-full animate-pulse",
              size === "sm" ? "w-1 h-1" : size === "md" ? "w-2 h-2" : "w-3 h-3",
            )}
          />
        </div>
      </div>
      {text && <p className={cn("text-muted-foreground font-medium animate-pulse", textSizeClasses[size])}>{text}</p>}
    </div>
  )
}

// Convenience components for common use cases
export function LoadingSpinner({ className }: { className?: string }) {
  return <Loader variant="default" className={className} />
}

export function LoadingDots({ text, className }: { text?: string; className?: string }) {
  return <Loader variant="dots" text={text} className={className} />
}

export function LoadingPulse({ text, className }: { text?: string; className?: string }) {
  return <Loader variant="pulse" text={text} className={className} />
}

export function LoadingOrbit({ text, className }: { text?: string; className?: string }) {
  return <Loader variant="orbit" text={text} className={className} />
}
