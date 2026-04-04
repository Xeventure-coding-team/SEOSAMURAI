"use client"

import { usePathname } from "next/navigation"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import Link from "next/link"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: any
    group?: string
  }[]
}) {
  const pathname = usePathname()

  const isActive = (url: string) => {
    if (url === "/") return pathname === "/"
    return pathname.startsWith(url)
  }

  return (
    <SidebarGroup className="py-2">
      <SidebarGroupContent>
        <SidebarMenu className="gap-2">
          {items.map((item) => {
            const active = isActive(item.url)

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  className={cn(
                    "h-9 px-3 rounded-md",
                    "text-[15px] font-500",
                    "transition-all duration-150",
                    // Default state
                    "text-sidebar-foreground/80 hover:text-sidebar-foreground",
                    // Hover state
                    "hover:bg-sidebar-accent/50",
                    // Active state - uses primary color from theme
                    active && [
                      "bg-primary/10 text-primary font-600",
                      "hover:bg-primary/15"
                    ]
                  )}
                >
                  <Link href={item.url} className="flex items-center gap-3 w-full">
                    {item.icon && (
                      <item.icon className={cn(
                        "w-4 h-4 shrink-0 transition-colors",
                        active ? "text-primary" : "text-sidebar-foreground/60"
                      )} />
                    )}
                    <span className="truncate">{item.title}</span>
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