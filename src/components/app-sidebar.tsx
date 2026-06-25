"use client";

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useUser } from "@hexclave/next";
import { usePathname } from "next/navigation";
import { usePageStore } from "@/store/usePageStore";
import Logo from "./Logo";


import {
  BarChart2,
  CalendarClock,
  ChartBar,
  Eye,
  Globe,
  HeadphonesIcon,
  LayoutGrid,
  MapPin,
  Megaphone,
  MessageSquare,
  ScanLine,
  Settings,
  Share2,
  Star,
} from "lucide-react"

export const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },

  navMain: [
    {
      title: "Overview",
      url: "/app/dashboard",
      icon: LayoutGrid,
      group: "Core",
    },
    {
      title: "Locations",
      url: "/app/locations",
      icon: MapPin,
      group: "Core",
    },
    {
      title: "Bulk Posting",
      url: "/app/post/bulk",
      icon: Share2,
      group: "Posting & Reputation",
    },
    {
      title: "Scheduled Posts",
      url: "/app/post/schedule",
      icon: CalendarClock,
      group: "Posting & Reputation",
    },
    {
      title: "Reviews",
      url: "/app/reviews",
      icon: Star,
      group: "Posting & Reputation",
    },
    {
      title: "Review Poster",
      url: "/app/shared-google-review-poster",
      icon: Megaphone,
      group: "Posting & Reputation",
    },
    {
      title: "Tracked Reviews",
      url: "/app/tracked-reviews",
      icon: Eye,
      group: "Posting & Reputation",
    },
    {
      title: "Websites",
      url: "/app/websites",
      icon: Globe,
      group: "Posting & Reputation",
    },
    {
      title: "Geo-Grid Scan",
      url: "/app/scan",
      icon: ScanLine,
      group: "Tools & Support",
    },
    {
      title: "Help & Support",
      url: "/app/help-desk",
      icon: HeadphonesIcon,
      group: "Tools & Support",
    },
  ],

  navSecondary: [
    {
      title: "Track Usage",
      url: "/app/usages",
      icon: ChartBar,
    },
    {
      title: "Contact Support",
      url: "/app/contact-support",
      icon: MessageSquare,
    },
    {
      title: "Settings",
      url: "/app/settings",
      icon: Settings,
    },
  ],
}


export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const user = useUser();

  const pathname = usePathname();

  const setPageName = usePageStore((state) => state.setPageName);

  React.useEffect(() => {
    const allNavItems = [
      ...data.navMain,
      ...data.navSecondary,
    ];

    const mergedItems = [...allNavItems];

    const currentItem = mergedItems.find((item) => item.url === pathname);

    setPageName(
      (currentItem && "title" in currentItem && currentItem.title) ||
      (currentItem && "name" in currentItem && typeof currentItem.name === "string" && currentItem.name) ||
      "Unknown Page"
    );

  }, [pathname, setPageName]);


  return (
    <Sidebar collapsible="offcanvas" {...props} variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5 !h-auto"
            >
              <Logo textColor="dark" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{
          name: user?.displayName ?? undefined,
          email: user?.primaryEmail ?? undefined,
          avatar: user?.profileImageUrl ?? undefined,
        }} />
      </SidebarFooter>
    </Sidebar>
  )
}