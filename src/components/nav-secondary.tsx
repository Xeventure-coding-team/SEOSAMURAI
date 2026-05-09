"use client"

import * as React from "react"
import { LucideIcon } from "lucide-react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

interface NavSecondaryItem {
  title: string
  url: string
  icon: LucideIcon
}

interface NavSecondaryProps extends React.ComponentPropsWithoutRef<typeof SidebarGroup> {
  items: NavSecondaryItem[]
}

// Simple component without complex memoization to avoid issues
export function NavSecondary({ 
  items, 
  className,
  ...props 
}: NavSecondaryProps) {
  const pathname = usePathname()

  const isActive = React.useCallback((url: string) => {
    if (url === "/") return pathname === "/"
    return pathname.startsWith(url)
  }, [pathname])

  // Return null if no items
  if (!items || items.length === 0) {
    return null
  }

  return (
    <SidebarGroup className={cn(className)} {...props}>
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.5">
          {items.map((item) => {
            const active = isActive(item.url)
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  className={cn(
                    "h-9 rounded-lg text-sm font-medium",
                    "transition-all duration-100",
                    "text-white hover:text-white",
                    "hover:bg-white/[0.08]",
                    active && [
                      "bg-blue-500/15 text-blue-400 font-semibold",
                      "hover:bg-blue-500/20 hover:text-blue-300"
                    ]
                  )}
                >
                  <Link 
                    href={item.url} 
                    className="flex items-center gap-2.5 w-full text-white"
                    aria-current={active ? "page" : undefined}
                  >
                    <item.icon 
                      className={cn(
                        "size-4 shrink-0 transition-all duration-100 text-white",
                        active ? "text-blue-400" : "text-white"
                      )} 
                    />
                    <span className="flex-1 truncate text-white">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}