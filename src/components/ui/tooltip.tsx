"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

function TooltipProvider({
  delayDuration = 100,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  )
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  )
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  sideOffset = 6,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          // Layout & shape
          "z-50 w-fit max-w-xs rounded-md px-3 py-1.5",
          // Color: black in light mode, white in dark mode
          // [--tooltip-bg:...] drives the arrow fill via CSS var
          "bg-zinc-900 text-zinc-50 [--tooltip-bg:theme(colors.zinc.900)]",
          "dark:bg-zinc-50 dark:text-zinc-900 dark:[--tooltip-bg:theme(colors.zinc.50)]",
          // Typography
          "text-xs font-medium leading-snug tracking-wide",
          // Subtle shadow for depth
          "shadow-md shadow-black/20 dark:shadow-black/10",
          // Ring for crisp edge definition
          "ring-1 ring-black/5 dark:ring-white/10",
          // Origin for zoom animation
          "origin-(--radix-tooltip-content-transform-origin)",
          // Enter animations
          "animate-in fade-in-0 zoom-in-95",
          // Exit animations
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          // Slide-in per side
          "data-[side=bottom]:slide-in-from-top-1.5",
          "data-[side=left]:slide-in-from-right-1.5",
          "data-[side=right]:slide-in-from-left-1.5",
          "data-[side=top]:slide-in-from-bottom-1.5",
          className
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow
          width={11}
          height={6}
          style={{ fill: "var(--tooltip-bg)" }}
        />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }