"use client"

import { type Icon } from "@tabler/icons-react"
import { ChevronRight, Circle } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import React, { useState, useEffect, useRef } from "react"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

interface NavSubItem {
  title: string
  url: string
  badge?: string | number
  description?: string
}

interface NavItem {
  title: string
  url: string
  icon?: Icon
  badge?: string | number
  children?: NavSubItem[]
  group?: string
  disabled?: boolean
  external?: boolean
}

interface NavMainProps {
  items: NavItem[]
  collapsed?: boolean
  onItemClick?: (item: NavItem) => void
}

const isActive = (pathname: string, url: string) => {
  if (!url || url === "#") return false
  if (url === "/") return pathname === "/"
  if (url.includes("#")) return pathname === url.split("#")[0]
  return pathname === url || pathname.startsWith(url + "/")
}

const hasActiveChild = (pathname: string, children?: NavSubItem[]) =>
  children?.some((c) => isActive(pathname, c.url)) ?? false

const CountBadge = ({ label, variant = "default" }: { label: string | number; variant?: "default" | "success" | "warning" | "error" }) => {
  const variantStyles = {
    default: "bg-white/20 text-white",
    success: "bg-emerald-500/20 text-white",
    warning: "bg-amber-500/20 text-white",
    error: "bg-red-500/20 text-white",
  }

  return (
    <span
      className={cn(
        "ml-auto inline-flex h-5 min-w-5 items-center justify-center",
        "rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
        "transition-colors duration-150",
        variantStyles[variant]
      )}
    >
      {label}
    </span>
  )
}

const Tooltip = ({ children, content }: { children: React.ReactNode; content: string }) => {
  const [show, setShow] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => setShow(true), 300)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setShow(false)
  }

  return (
    <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {children}
      {show && (
        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 px-2 py-1 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded-md shadow-lg whitespace-nowrap">
          {content}
        </div>
      )}
    </div>
  )
}

const FlatItem = ({ item, collapsed, onItemClick }: { item: NavItem; collapsed?: boolean; onItemClick?: (item: NavItem) => void }) => {
  const pathname = usePathname()
  const active = isActive(pathname, item.url)

  const buttonContent = (
    <SidebarMenuButton
      asChild
      isActive={active}
      disabled={item.disabled}
        className={cn(
    "h-10 rounded-md px-3 gap-3 group w-full",
    "text-[15px] font-medium transition-all duration-100",
    "text-white hover:text-white",
    "hover:bg-white/[0.08]",
    active && [
      "bg-blue-500/15 text-white font-semibold",
      "hover:bg-blue-500/20 hover:text-blue-300",
    ]
  )}
    >
      <Link
        href={item.disabled ? "#" : item.url}
        aria-current={active ? "page" : undefined}
        target={item.external ? "_blank" : undefined}
        rel={item.external ? "noopener noreferrer" : undefined}
        onClick={() => onItemClick?.(item)}
      >
        {item.icon && (
          <item.icon
            className={cn(
              "size-[19px] shrink-0 transition-all duration-100",
              active ? "text-blue-400" : "text-white"
            )}
          />
        )}
        {!collapsed && (
          <>
            <span className="truncate flex-1 text-left">{item.title}</span>
            {item.badge && <CountBadge label={item.badge} />}
          </>
        )}
      </Link>
    </SidebarMenuButton>
  )

  if (collapsed) {
    return (
      <SidebarMenuItem className="list-none">
        <Tooltip content={item.title}>
          {buttonContent}
        </Tooltip>
      </SidebarMenuItem>
    )
  }

  return <SidebarMenuItem className="list-none">{buttonContent}</SidebarMenuItem>
}

const CollapsibleItem = ({ item, collapsed, onItemClick }: { item: NavItem; collapsed?: boolean; onItemClick?: (item: NavItem) => void }) => {
  const pathname = usePathname()
  const active = isActive(pathname, item.url)
  const childActive = hasActiveChild(pathname, item.children)
  const [open, setOpen] = useState(active || childActive)

  useEffect(() => {
    if (collapsed) {
      setOpen(false)
    } else {
      setOpen(active || childActive)
    }
  }, [collapsed, active, childActive])

  if (collapsed) {
    return (
      <SidebarMenuItem className="list-none">
        <Tooltip content={item.title}>
          <SidebarMenuButton
            isActive={active || childActive}
            className={cn(
              "h-10 rounded-md px-3 gap-3 cursor-pointer group w-full",
              "text-[15px] font-medium transition-all duration-100",
              active || childActive
                ? "bg-blue-500/15 text-blue-400 font-semibold hover:bg-blue-500/20 hover:text-blue-300"
                : "text-white hover:bg-white/[0.08] hover:text-white"
            )}
          >
            {item.icon && (
              <item.icon
                className={cn(
                  "size-[19px] shrink-0 transition-all duration-100",
                  active || childActive
                    ? "text-blue-400"
                    : "text-white"
                )}
              />
            )}
          </SidebarMenuButton>
        </Tooltip>
      </SidebarMenuItem>
    )
  }

  return (
    <SidebarMenuItem className="list-none">
      <SidebarMenuButton
        onClick={() => setOpen((v) => !v)}
        isActive={active}
        className={cn(
          "h-10 rounded-md px-3 gap-3 cursor-pointer group w-full", // Medium height
          "text-[15px] font-medium transition-colors duration-150",
          "text-white hover:text-white"
        )}
      >
        {item.icon && (
          <item.icon
            className={cn(
              "size-[19px] shrink-0", // Medium icon size
              "text-white group-hover:text-white"
            )}
          />
        )}
        <span className="flex-1 truncate text-left">{item.title}</span>
        {item.badge && (
          <span
            className={cn(
              "inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
              "bg-white/20 text-white"
            )}
          >
            {item.badge}
          </span>
        )}
        <ChevronRight
          className={cn(
            "size-3.5 shrink-0 transition-transform duration-150",
            "text-white/60",
            open && "rotate-90"
          )}
        />
      </SidebarMenuButton>

      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          open ? "max-h-[1000px]" : "max-h-0"
        )}
      >
        <SidebarMenuSub className="ml-6 mt-2 border-l border-white/20 pl-4 flex flex-col gap-1">
          {item.children?.map((child) => {
            const childIsActive = isActive(pathname, child.url)
            return (
              <SidebarMenuSubItem key={child.url} className="list-none">
                <SidebarMenuSubButton
                  asChild
                  isActive={childIsActive}
                  className={cn(
                    "h-9 rounded-md px-3 gap-2.5", // Medium submenu height
                    "text-sm font-medium transition-colors duration-150",
                    "group/sub",
                    "text-white hover:text-white"
                  )}
                >
                  <Link
                    href={child.url}
                    aria-current={childIsActive ? "page" : undefined}
                    onClick={() => onItemClick?.({ ...item, ...child })}
                  >
                    <Circle
                      className={cn(
                        "size-1.5 shrink-0",
                        "text-white/60"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="truncate block">{child.title}</span>
                      {child.description && (
                        <span className="text-[10px] opacity-60 truncate block">
                          {child.description}
                        </span>
                      )}
                    </div>
                    {child.badge && <CountBadge label={child.badge} variant="default" />}
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            )
          })}
        </SidebarMenuSub>
      </div>
    </SidebarMenuItem>
  )
}

export function NavMain({ items, collapsed = false, onItemClick }: NavMainProps) {
  const groups = React.useMemo(() => {
    const map = new Map<string, typeof items>()
    for (const item of items) {
      const key = item.group ?? "Main"
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }
    return Array.from(map.entries()).map(([label, items]) => ({ label, items }))
  }, [items])

  return (
    <nav className="flex flex-col gap-6 px-2 mt-6" aria-label="Main navigation">
      {groups.map((group, gi) => (
        <SidebarGroup key={gi} className="p-0">
          {group.label && !collapsed && (
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/50 select-none flex items-center gap-2">
              <span className="flex-1">{group.label}</span>
              {group.items.length > 0 && (
                <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] font-medium text-white">
                  {group.items.length}
                </span>
              )}
            </p>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="flex flex-col gap-1">
              {group.items.map((item) =>
                item.children?.length ? (
                  <CollapsibleItem
                    key={item.url}
                    item={item}
                    collapsed={collapsed}
                    onItemClick={onItemClick}
                  />
                ) : (
                  <FlatItem
                    key={item.url}
                    item={item}
                    collapsed={collapsed}
                    onItemClick={onItemClick}
                  />
                )
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </nav>
  )
}

NavMain.displayName = "NavMain"