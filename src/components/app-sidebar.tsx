"use client";

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import {
  ChartBar,
  Circle,
  LayoutDashboard,
  MapPin,
  Star,
  Camera,
  FileText,
  BrainCircuit,
  Settings,
  Timer,
  ExternalLink,
  Megaphone,
  Contact,
  Headset,
  ScanLine,
  Eye,
} from "lucide-react"
import { useUser } from "@stackframe/stack";
import { usePathname } from "next/navigation";
import { usePageStore } from "@/store/usePageStore";
import Logo from "./Logo";
import { UsageRemaining } from "./subscription/UsageRemaining";


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
      title: "Unreplied Reviews",
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
      icon: LayoutDashboard,
      group: "Posting & Reputation",
    },

    // Tools & Support
    {
      title: "Geo-Grid Rank Tracking",
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
      <SidebarHeader className="border-b border-sidebar-border/30 py-4 px-2">
        <Logo />
      </SidebarHeader>
      <SidebarContent className="px-2">
        <NavMain items={data.navMain} />
      </SidebarContent>

      <SidebarFooter>

        <div className="px-4 py-4 mb-4 border rounded-2xl border-neutral-600">
          <UsageRemaining
            compact
            metrics={["postsUsed", "aiReviewRepliesUsed", "geoGridScansUsed", "scheduledPostsUsed" , "reviewPostersUsed"]}
          />
        </div>

        <NavUser user={{
          name: user?.displayName ?? undefined,
          email: user?.primaryEmail ?? undefined,
          avatar: user?.profileImageUrl ?? undefined,
        }} />
      </SidebarFooter>

    </Sidebar>
  )
}
