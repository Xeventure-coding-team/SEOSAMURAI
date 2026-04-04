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
import {
  ChartBar,
  Circle,
  File,
  LayoutDashboard,
  MapPin,
  Radar,
  Users,
  Star,
  Camera,
  FileText,
  BrainCircuit,
  Settings,
  HelpCircle,
  Search,
  Zap,
  Timer,
  ExternalLink,
  Megaphone,
  Contact,
  ScanSearch,
  MessageCircle,
  Headset,
  ScanLine,
  Eye
} from "lucide-react"
import { useUser } from "@stackframe/stack";
import { usePathname } from "next/navigation";
import { usePageStore } from "@/store/usePageStore";


const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },

  navMain: [
    // Core
    {
      title: "Dashboard",
      url: "/app/dashboard",
      icon: LayoutDashboard,
      group: "Core",
    },
    {
      title: "Locations",
      url: "/app/locations",
      icon: MapPin,
      group: "Core",
    },

    // Posting & Reputation
    {
      title: "Bulk Posting",
      url: "/app/post/bulk",
      icon: FileText,
      group: "Posting & Reputation",
    },
    {
      title: "Schedule Posting",
      url: "/app/post/schedule",
      icon: Timer,
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

    // Tools & Support
    {
      title: "Run a Scan",
      url: "/app/scan",
      icon: ScanLine,
      group: "Tools & Support",
    },
    {
      title: "Help Desk",
      url: "/app/help-desk",
      icon: Headset,
      group: "Tools & Support",
    },
  ],

  navClouds: [
    {
      title: "Capture",
      icon: Camera,
      isActive: true,
      url: "#",
      items: [
        { title: "Active Proposals", url: "#" },
        { title: "Archived", url: "#" },
      ],
    },
    {
      title: "Proposal",
      icon: FileText,
      url: "#",
      items: [
        { title: "Active Proposals", url: "#" },
        { title: "Archived", url: "#" },
      ],
    },
    {
      title: "Prompts",
      icon: BrainCircuit,
      url: "#",
      items: [
        { title: "Active Proposals", url: "#" },
        { title: "Archived", url: "#" },
      ],
    },
  ],

  navSecondary: [
    {
      title: "Back to Home",
      url: "/",
      icon: ExternalLink,
    },
    {
      title: "Contact Support",
      url: "/app/contact-support",
      icon: Contact,
    },
    {
      title: "Settings",
      url: "/app/settings",
      icon: Settings,
    },
  ],

  documents: [
    {
      name: "Data Library",
      url: "#",
      icon: Circle,
    },
    {
      name: "Reports",
      url: "#",
      icon: Circle,
    },
    {
      name: "Word Assistant",
      url: "#",
      icon: Circle,
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
      ...data.documents,
    ];

    const cloudItems = data.navClouds.flatMap((cloud) => [
      { title: cloud.title, url: cloud.url },
      ...(cloud.items || []),
    ]);

    const mergedItems = [...allNavItems, ...cloudItems];

    const currentItem = mergedItems.find((item) => item.url === pathname);

    setPageName(
      (currentItem && "title" in currentItem && currentItem.title) ||
      (currentItem && "name" in currentItem && currentItem.name) ||
      "Unknown Page"
    );

  }, [pathname, setPageName]);


  return (
    <Sidebar collapsible="offcanvas" {...props} variant="sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <Zap className="!size-5" />
                <span className="text-base font-semibold">Rankerly</span>
              </a>
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