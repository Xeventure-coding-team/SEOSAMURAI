// nav-main.tsx
"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { LucideIcon } from "lucide-react"
import Link from "next/link"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

interface NavBadge {
  label: string
  variant?: "default" | "secondary" | "destructive"
}

interface NavItem {
  title: string
  url: string
  icon?: LucideIcon
  badge?: NavBadge
  group?: string
}

interface NavMainProps {
  items: NavItem[]
}

const BADGE_STYLES = {
  default: {
    base: "bg-blue-500/30 text-blue-200 border-blue-500/40",
    active: "bg-blue-400/40 text-blue-100 border-blue-400/50",
  },
  secondary: {
    base: "bg-sky-500/25 text-sky-200 border-sky-500/35",
    active: "bg-sky-400/30 text-sky-100 border-sky-400/40",
  },
  destructive: {
    base: "bg-rose-500/25 text-rose-200 border-rose-500/35",
    active: "bg-rose-400/30 text-rose-100 border-rose-400/40",
  },
} as const

const ACTIVE_ITEM_STYLES = {
  background: "rgba(59, 130, 246, 0.16)",
  border: "1px solid rgba(96, 165, 250, 0.35)",
  boxShadow: "inset 0 1px 0 rgba(147, 197, 253, 0.1)",
} as const

const Badge = React.memo(({ badge, active }: { badge: NavBadge; active: boolean }) => {
  const variant = badge.variant ?? "default"
  const styles = BADGE_STYLES[variant]
  
  return (
    <span
      className={cn(
        "px-1.5 py-px rounded text-[10.5px] font-semibold leading-tight",
        "whitespace-nowrap transition-all duration-100 text-white",
        styles.base,
        active && styles.active
      )}
      aria-hidden="true"
    >
      {badge.label}
    </span>
  )
})

Badge.displayName = "Badge"

const NavItemButton = React.memo(({ 
  item, 
  isActive 
}: { 
  item: NavItem; 
  isActive: boolean;
}) => {
  return (
    <SidebarMenuItem className="relative">
      <div
        className={cn(
          "pointer-events-none absolute left-0 top-1/2 -translate-y-1/2",
          "w-[3px] rounded-r-full z-10 transition-all duration-200",
          isActive ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0"
        )}
        style={{
          height: "55%",
          background: "linear-gradient(to bottom, #60a5fa, #3b82f6)",
        }}
        aria-hidden="true"
      />

      <SidebarMenuButton
        asChild
        isActive={isActive}
        className={cn(
          "h-9 w-full rounded-lg text-[15px] font-medium",
          "transition-all duration-100 ease-in-out",
          "text-white hover:text-white hover:bg-white/[0.08]",
          isActive && "text-blue-100 font-semibold hover:text-blue-100",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
        )}
        style={isActive ? ACTIVE_ITEM_STYLES : undefined}
      >
        <Link
          href={item.url}
          className="flex items-center gap-2.5 px-3 w-full h-full text-white"
          aria-current={isActive ? "page" : undefined}
        >
          {item.icon && (
            <item.icon
              className="size-[18px] shrink-0 transition-all duration-100 text-white"
              style={{
                opacity: isActive ? 1 : 0.6,
                color: isActive ? "#93c5fd" : "white",
              }}
              aria-hidden="true"
            />
          )}
          <span className="flex-1 truncate text-white">{item.title}</span>
          {item.badge && <Badge badge={item.badge} active={isActive} />}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
})

NavItemButton.displayName = "NavItemButton"

const NavGroup = React.memo(({ 
  group, 
  items, 
  isActiveFn 
}: { 
  group: string; 
  items: NavItem[]; 
  isActiveFn: (url: string) => boolean;
}) => {
  return (
    <SidebarGroup className="px-0 py-0">
      {group !== "Main" && (
        <SidebarGroupLabel
          className={cn(
            "h-6 px-2 mb-1",
            "text-[10px] font-semibold uppercase tracking-[0.1em]",
            "text-white hover:text-white transition-colors",
          )}
        >
          {group}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu className="gap-1">
          {items.map((item) => (
            <NavItemButton
              key={`${item.group}-${item.title}`}
              item={item}
              isActive={isActiveFn(item.url)}
            />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
})

NavGroup.displayName = "NavGroup"

export function NavMain({ items }: NavMainProps) {
  const pathname = usePathname()

  const isActive = React.useCallback((url: string) => {
    if (url === "/") return pathname === "/"
    if (url !== "/" && pathname === url) return true
    return pathname.startsWith(`${url}/`) || pathname === url
  }, [pathname])

  const { grouped, groupOrder } = React.useMemo(() => {
    const groups = new Map<string, NavItem[]>()
    const order: string[] = []
    const seen = new Set<string>()

    for (const item of items) {
      const groupName = item.group ?? "Main"
      
      if (!seen.has(groupName)) {
        seen.add(groupName)
        order.push(groupName)
        groups.set(groupName, [])
      }
      
      groups.get(groupName)!.push(item)
    }

    return {
      grouped: groups,
      groupOrder: order,
    }
  }, [items])

  if (items.length === 0) {
    return (
      <div className="flex flex-col py-2 px-3 text-white text-sm">
        No navigation items
      </div>
    )
  }

  return (
    <nav className="flex flex-col py-2" aria-label="Main navigation">
      {groupOrder.map((groupName) => {
        const groupItems = grouped.get(groupName)
        if (!groupItems?.length) return null

        return (
          <React.Fragment key={groupName}>
            <NavGroup
              group={groupName}
              items={groupItems}
              isActiveFn={isActive}
            />
            {groupOrder.indexOf(groupName) !== groupOrder.length - 1 && (
              <div className="my-2 h-px bg-white/[0.08]" aria-hidden="true" />
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}