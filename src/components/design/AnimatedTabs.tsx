"use client"

import React from "react"
import { AnimatePresence, motion } from "motion/react"
import { useTabs, type Tab } from "@/hooks/UseTabs"
import { cn } from "@/lib/utils"

// Component for individual tab items
interface AnimatedTabItemProps {
  children: React.ReactNode
  value: string
  label?: string
}

export function AnimatedTabItem({ children, value, label }: AnimatedTabItemProps) {
  return (
    <div data-tab-value={value} data-tab-label={label}>
      {children}
    </div>
  )
}

// Main tabs component
interface AnimatedTabsProps {
  children: React.ReactNode
  items: string[]
  defaultTab?: string
  className?: string
  noPadding?: boolean
}

const transition = {
  type: "tween",
  ease: "easeOut",
  duration: 0.15,
}

const getHoverAnimationProps = (hoveredRect: DOMRect, navRect: DOMRect) => ({
  x: hoveredRect.left - navRect.left - 10,
  y: hoveredRect.top - navRect.top - 4,
  width: hoveredRect.width + 20,
  height: hoveredRect.height + 10,
})

const TabContent = ({ children, noPadding }: { children: React.ReactNode; noPadding: boolean }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={transition}
      className={`${noPadding == true ? "mt-4" : "mt-4 py-4 md:py-6 px-4 lg:px-6"}`}
    >
      {children}
    </motion.div>
  )
}

const TabNavigation = ({
  tabs,
  selectedTabIndex,
  setSelectedTab,
}: {
  tabs: Tab[]
  selectedTabIndex: number
  setSelectedTab: (input: [number, number]) => void
}) => {
  const [buttonRefs, setButtonRefs] = React.useState<Array<HTMLButtonElement | null>>([])

  React.useEffect(() => {
    setButtonRefs((prev) => prev.slice(0, tabs.length))
  }, [tabs.length])

  const navRef = React.useRef<HTMLDivElement>(null)
  const navRect = navRef.current?.getBoundingClientRect()

  const selectedRect = buttonRefs[selectedTabIndex]?.getBoundingClientRect()

  const [hoveredTabIndex, setHoveredTabIndex] = React.useState<number | null>(null)
  const hoveredRect = buttonRefs[hoveredTabIndex ?? -1]?.getBoundingClientRect()

  const formatLabel = (label: string) => {
    return label
      .split(/[-_\s]+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ")
  }

  return (
    <nav
      ref={navRef}
      className="flex flex-shrink-0 justify-center items-center relative z-0 py-2"
      onPointerLeave={() => setHoveredTabIndex(null)}
    >
      {tabs.map((item, i) => {
        const isActive = selectedTabIndex === i
        const isDangerZone = item.value === "danger-zone"

        return (
          <button
            key={item.value}
            className={cn(
              "relative flex items-center px-6 py-3 rounded-md transition-colors font-medium text-sm z-20",
              {
                "text-muted-foreground hover:text-foreground": !isActive && !isDangerZone,
                "text-foreground": isActive && !isDangerZone,
                "text-destructive hover:text-destructive/80": isDangerZone,
              },
            )}
            onPointerEnter={() => setHoveredTabIndex(i)}
            onFocus={() => setHoveredTabIndex(i)}
            onClick={() => setSelectedTab([i, i > selectedTabIndex ? 1 : -1])}
          >
            <span
              ref={(el) => {
                buttonRefs[i] = el as HTMLButtonElement
              }}
            >
              {formatLabel(item.label)}
            </span>
          </button>
        )
      })}

      <AnimatePresence>
        {hoveredRect && navRect && (
          <motion.div
            key="hover"
            className={`absolute z-10 top-0 left-0 rounded-md ${
              hoveredTabIndex === tabs.findIndex(({ value }) => value === "danger-zone")
                ? "bg-destructive/10"
                : "bg-muted"
            }`}
            initial={{ ...getHoverAnimationProps(hoveredRect, navRect), opacity: 0 }}
            animate={{ ...getHoverAnimationProps(hoveredRect, navRect), opacity: 1 }}
            exit={{ ...getHoverAnimationProps(hoveredRect, navRect), opacity: 0 }}
            transition={transition}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedRect && navRect && (
          <motion.div
            className={`absolute z-10 bottom-0 left-0 h-[2px] ${
              selectedTabIndex === tabs.findIndex(({ value }) => value === "danger-zone")
                ? "bg-destructive"
                : "bg-primary"
            }`}
            initial={false}
            animate={{
              width: selectedRect.width + 18,
              x: `calc(${selectedRect.left - navRect.left - 9}px)`,
              opacity: 1,
            }}
            transition={transition}
          />
        )}
      </AnimatePresence>
    </nav>
  )
}

export function AnimatedTabs({ children, items, defaultTab, className, noPadding }: AnimatedTabsProps) {
  // Extract tab items and their content from children
  const tabItems = React.useMemo(() => {
    const itemsMap = new Map<string, { content: React.ReactNode; label?: string }>()

    React.Children.forEach(children, (child) => {
      // Fixed: Access the props directly using the prop names, not data attributes
      if (React.isValidElement(child) && child.props.value) {
        itemsMap.set(child.props.value, {
          content: child.props.children,
          label: child.props.label,
        })
      }
    })

    return items.map((item) => {
      const itemData = itemsMap.get(item)
      return {
        label: itemData?.label || item.charAt(0).toUpperCase() + item.slice(1),
        value: item,
        content: itemData?.content || <div>No content available for {item}</div>,
      }
    })
  }, [children, items])

  // Setup the tabs hook
  const [hookProps] = React.useState(() => {
    const initialTabId = defaultTab && items.includes(defaultTab) ? defaultTab : items[0]

    return {
      tabs: tabItems.map(({ label, value }) => ({
        label,
        value,
      })),
      initialTabId,
    }
  })

  const framer = useTabs(hookProps)

  // Get current tab content
  const currentTabContent = tabItems.find((tab) => tab.value === framer.selectedTab.value)?.content

  return (
    <div className={cn("w-full", className)}>
      <div
        className={`relative flex w-full bg-background items-center justify-between rounded-t-3xl rounded-b-none ${noPadding ? "border" : "border-b"} ${noPadding ? "rounded-md" : ""} border-border overflow-x-auto overflow-y-hidden`}
      >
        <TabNavigation {...framer.tabProps} />
      </div>
      <AnimatePresence mode="wait">
        <TabContent key={framer.selectedTab.value} noPadding={noPadding ? noPadding : false}>
          {currentTabContent}
        </TabContent>
      </AnimatePresence>
    </div>
  )
}
