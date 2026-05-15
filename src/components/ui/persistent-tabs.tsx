"use client"

import React, { createContext, useContext, useState } from "react"
import { cn } from "@/lib/utils"

const TabsContext = createContext<{
  activeTab: string
  setActiveTab: (tab: string) => void
}>({ activeTab: "", setActiveTab: () => {} })

export function PersistentTabs({
  defaultValue,
  value,
  onValueChange,
  children,
  className,
}: {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  className?: string
}) {
  const [internalTab, setInternalTab] = useState(defaultValue ?? "")

  const activeTab = value ?? internalTab
  const setActiveTab = (tab: string) => {
    setInternalTab(tab)
    onValueChange?.(tab)
  }

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export function PersistentTabsList({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground w-full mb-4",
        className
      )}
    >
      {children}
    </div>
  )
}

export function PersistentTabsTrigger({
  value,
  children,
  className,
}: {
  value: string
  children: React.ReactNode
  className?: string
}) {
  const { activeTab, setActiveTab } = useContext(TabsContext)

  return (
    <button
      type="button"
      onClick={() => setActiveTab(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex-1",
        activeTab === value
          ? "bg-background text-foreground shadow"
          : "hover:text-foreground"
      )}
    >
      {children}
    </button>
  )
}

export function PersistentTabsContent({
  value,
  children,
  className,
}: {
  value: string
  children: React.ReactNode
  className?: string
}) {
  const { activeTab } = useContext(TabsContext)

  return (
    // Always mounted, just hidden — state is never lost
    <div className={cn(activeTab === value ? "block" : "hidden", className)}>
      {children}
    </div>
  )
}