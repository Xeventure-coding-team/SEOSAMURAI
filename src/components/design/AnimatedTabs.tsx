"use client"

import React from "react"
import { useRouter, usePathname } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface AnimatedTabItemProps {
  children: React.ReactNode
  value: string
  label?: string
}

export function AnimatedTabItem({ children, value }: AnimatedTabItemProps) {
  return <TabsContent value={value}>{children}</TabsContent>
}

interface AnimatedTabsProps {
  children: React.ReactNode
  items: string[]
  defaultTab?: string
  className?: string
  noPadding?: boolean
  syncHash?: boolean
  variant?: "line" | "pill" | "underline" // Add more variants as needed
}

export function AnimatedTabs({
  children,
  items,
  defaultTab,
  className,
  noPadding,
  syncHash = false,
  variant = "line", // Default to line for backward compatibility
}: AnimatedTabsProps) {
  const router = useRouter()
  const pathname = usePathname()

  const resolveInitialTab = () => {
    if (syncHash && typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "")
      if (items.includes(hash)) return hash
    }
    return defaultTab && items.includes(defaultTab) ? defaultTab : items[0]
  }

  const [activeTab, setActiveTab] = React.useState(resolveInitialTab)

  // Sync from hash changes (back/forward nav)
  React.useEffect(() => {
    if (!syncHash) return
    const onHashChange = () => {
      const hash = window.location.hash.replace("#", "")
      if (items.includes(hash)) setActiveTab(hash)
    }
    window.addEventListener("hashchange", onHashChange)
    return () => window.removeEventListener("hashchange", onHashChange)
  }, [syncHash, items])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    if (syncHash) {
      router.replace(`${pathname}#${value}`, { scroll: false })
    }
  }

  const formatLabel = (label: string) =>
    label
      .split(/[-_\s]+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ")

  const isManagePage = /^\/app\/locations\/[^/]+\/manage(?:\/.*)?$/.test(pathname)

  // Variant-specific styles
  const getVariantStyles = (item: string) => {
    const isDanger = item === "danger-zone"
    const baseStyles = {
      line: cn(
        "relative h-auto rounded-md border-b-2 border-transparent bg-transparent px-3 py-2.5",
        "text-sm font-medium whitespace-nowrap",
        "text-muted-foreground shadow-none",
        "transition-all duration-200",
        "hover:text-foreground hover:bg-muted/60",
        "focus-visible:ring-0 focus-visible:ring-offset-0",
        // Active state — soft tinted background instead of a flat underline
        "data-[state=active]:border-primary",
        "data-[state=active]:text-primary",
        "data-[state=active]:bg-primary/[0.07]",
        "data-[state=active]:shadow-none",
        "data-[state=active]:rounded-t-md",
        // Danger tab
        isDanger &&
          "text-destructive/80 hover:text-destructive hover:bg-destructive/10 data-[state=active]:border-destructive data-[state=active]:text-destructive data-[state=active]:bg-destructive/[0.07]"
      ),
      pill: cn(
        "relative h-9 rounded-lg border border-transparent px-4",
        "text-[14px] font-medium whitespace-nowrap leading-none",
        "text-muted-foreground shadow-none",
        "transition-all duration-150 ease-out",
        "hover:text-foreground hover:bg-background/70",
        "focus-visible:ring-0 focus-visible:ring-offset-0",
        // Active state — soft primary tint with a gentle shadow for lift
        "data-[state=active]:bg-background",
        "data-[state=active]:text-primary",
        "data-[state=active]:border-border/60",
        "data-[state=active]:shadow-sm",
        // Danger tab
        isDanger &&
          "text-destructive/70 hover:text-destructive hover:bg-destructive/10 data-[state=active]:text-destructive data-[state=active]:bg-background data-[state=active]:border-destructive/30"
      ),
      underline: cn(
        "relative h-auto rounded-md bg-transparent px-3 py-2",
        "text-sm font-medium whitespace-nowrap",
        "text-muted-foreground shadow-none",
        "transition-all duration-200",
        "hover:text-foreground hover:bg-muted/60",
        "focus-visible:ring-0 focus-visible:ring-offset-0",
        // Active state with soft fill + underline animation
        "data-[state=active]:text-foreground",
        "data-[state=active]:bg-muted/50",
        "data-[state=active]:shadow-none",
        // Underline animation
        "after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:origin-left",
        "after:scale-x-0 after:bg-primary after:transition-transform after:duration-200 after:rounded-full",
        "data-[state=active]:after:scale-x-100",
        // Danger tab
        isDanger &&
          "text-destructive/80 hover:text-destructive hover:bg-destructive/10 data-[state=active]:text-destructive data-[state=active]:bg-destructive/[0.07] data-[state=active]:after:bg-destructive"
      ),
    }

    return variant in baseStyles ? baseStyles[variant] : baseStyles.line
  }

  const getContainerStyles = () => {
    const styles = {
      line: "border-b border-border bg-muted/30 rounded-t-lg pt-1",
      pill: "", // No border — pill sits in its own inset track, no container divider
      underline: "border-b border-border bg-muted/30 rounded-t-lg pt-1",
    }
    // Use `in` instead of `||` — an empty string is a valid, intentional
    // style (no border) and must not fall through to the line default.
    return variant in styles ? styles[variant] : styles.line
  }

  const getListStyles = () => {
    const styles = {
      line: "h-auto w-full justify-start gap-2 overflow-x-auto rounded-none bg-transparent p-0",
      pill: cn(
        "inline-flex h-11 w-auto items-center justify-start gap-1",
        "overflow-x-auto rounded-xl bg-muted/60 p-1.5 border border-border/40"
      ),
      underline: "h-auto w-full justify-start gap-2 overflow-x-auto rounded-none bg-transparent p-0",
    }
    return variant in styles ? styles[variant] : styles.line
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className={cn("w-full", className)}>

      <div className={cn(getContainerStyles())}>
        <TabsList className={cn(getListStyles())}>
          {items.map((item) => (
            <TabsTrigger
              key={item}
              value={item}
              className={getVariantStyles(item)}
            >
              {formatLabel(item)}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <div
        className={cn(
          noPadding ? "mt-5" : "py-6",
          !noPadding && isManagePage && "px-6"
        )}
      >
        {children}
      </div>
    </Tabs>
  )
}