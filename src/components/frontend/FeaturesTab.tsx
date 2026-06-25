"use client";

import React, { useState } from "react";
import { CircleCheck, ArrowRight, Star, MapPin, Search, Share2, ScanLine, CalendarClock } from "lucide-react";
import MockupDisplay from "./MockupDisplay";
import Link from "next/link";
import { siteConfig } from "@/config/site";

export interface Stat {
  label: string;
  value: string;
}

export interface Feature {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  slug: string;
  title: string;
  description: string;
  features: string[];
  stats: Stat[];
  chartData: number[];
  locationList: string[];
}

const tabs: Record<string, Feature> = {
  tab1: {
    id: "tab1",
    label: "Locations",
    icon: MapPin,
    slug: "locations",
    title: "Manage all your business locations from one place",
    description:
      "Manage all your business locations from a single dashboard. Switch between locations instantly, monitor key performance metrics, and make informed decisions without the need to log into multiple accounts. Everything you need to stay in control of your multi-location presence in one place.",
    features: [
      "Multiple location management",
      "Centralized dashboard",
      "Organized workspace",
      "Quick access to locations",
    ],
    stats: [
      { label: "Locations", value: "24" },
      { label: "Profiles", value: "24" },
      { label: "Connected", value: "100%" },
    ],
    chartData: [65, 78, 82, 91, 88, 95, 92],
    locationList: ["New York", "Los Angeles", "Chicago", "Miami", "Austin"],
  },
  tab2: {
    id: "tab2",
    label: "Geo-Grid Scan",
    icon: ScanLine,
    slug: "geo-grid-scan",
    title: "Visualize your map pack visibility across a grid",
    description:
      "Visualize exactly where your business appears in Google’s local map pack using a geographic grid. Identify ranking gaps, uncover blind spots, and measure your true local search visibility across different areas. Use these insights to refine your strategy and expand your coverage where it matters most.",
    features: [
      "Interactive grid view",
      "Map pack visibility score",
      "Area-by-area breakdown",
      "Coverage trend tracking",
    ],
    stats: [
      { label: "Grid points", value: "156" },
      { label: "Locations", value: "24" },
      { label: "Tracking", value: "Live" },
    ],
    chartData: [55, 62, 58, 73, 81, 78, 85],
    locationList: ["North", "South", "East", "West", "Central"],
  },
  tab3: {
    id: "tab3",
    label: "Reviews",
    icon: Star,
    slug: "reviews",
    title: "Monitor and respond to reviews across all locations",
    description:
      "Stay on top of customer feedback from every location in one place. Monitor reviews in real time, track sentiment trends, and respond quickly to protect your brand reputation. Ensure no important feedback is missed and take action when it matters most.",
    features: [
      "Centralized review inbox",
      "Sentiment analysis",
      "Quick reply tools",
      "Review performance tracking",
    ],
    stats: [
      { label: "Reviews", value: "1.8K" },
      { label: "Avg rating", value: "4.7★" },
      { label: "Locations", value: "24" },
    ],
    chartData: [88, 85, 90, 87, 92, 89, 94],
    locationList: [
      "★★★★★ Great service",
      "★★★★☆ Fast response",
      "★★★★★ Highly recommended",
      "★★★★☆ Friendly staff",
    ],
  },
  tab4: {
    id: "tab4",
    label: "Keyword Tracking",
    icon: Search,
    slug: "keyword-tracking",
    title: "Track how you rank for the keywords that matter",
    description:
      "Track how your Google Business Profile performs across the keywords that matter most to your business. Monitor daily ranking changes, understand which search terms are driving visibility, and analyze how your position evolves over time. With clear insights into local search performance, you can identify growth opportunities, optimize your presence, and improve your chances of ranking higher in competitive searches.",
    features: [
      "Daily keyword tracking",
      "Position history",
      "Local search insights",
      "Opportunity detection",
    ],
    stats: [
      { label: "Keywords", value: "1.2K" },
      { label: "Tracked", value: "Daily" },
      { label: "Locations", value: "24" },
    ],
    chartData: [45, 52, 48, 63, 71, 68, 82],
    locationList: ["Coffee Shop", "Local Cafe", "Best Coffee", "Coffee Near Me"],
  },
  tab5: {
    id: "tab5",
    label: "Bulk Posting",
    icon: Share2,
    slug: "bulk-posting",
    title: "Publish multiple posts to a single location",
    description:
      "Create and publish multiple posts for a single Google Business Profile in one streamlined workflow. Instead of repeating the same process for every update, plan your content once and manage all your posts from a single place. Perfect for businesses that regularly share promotions, announcements, events, and updates, this feature helps you stay consistent, save time, and keep your profile active without manual effort.",
    features: [
      "Create multiple posts in one flow",
      "Schedule and publish instantly",
      "Organize posts by type or campaign",
      "Preview before publishing",
    ],
    stats: [
      { label: "Posts created", value: "128" },
      { label: "Campaigns", value: "24" },
      { label: "Time saved", value: "6hrs" },
    ],
    chartData: [35, 42, 55, 63, 70, 78, 85],
    locationList: ["Promotions", "Announcements", "Events", "Updates"],
  },
  tab6: {
    id: "tab6",
    label: "Scheduled Posting",
    icon: CalendarClock,
    slug: "scheduled-posting",
    title: "Plan and automate your posts in advance",
    description:
      "Schedule your Google Business Profile posts ahead of time and stay consistent without manual effort. Plan campaigns, promotions, and updates in advance, set the perfect publish time, and let the system handle the rest. Stay active across all your locations even when you're offline.",
    features: [
      "Advanced post scheduling",
      "Calendar-based planning",
      "Automated publishing",
      "Timezone-aware posting",
    ],
    stats: [
      { label: "Scheduled posts", value: "340" },
      { label: "Locations", value: "24" },
      { label: "Automation rate", value: "95%" },
    ],
    chartData: [40, 48, 55, 60, 68, 75, 88],
    locationList: ["Promotions", "Announcements", "Events", "Updates"],
  },
};

const SalesSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("tab1");

  return (
    <section className="lg:py-32.5 md:py-22.5 py-10 bg-body-bg dark:bg-zinc-950">
      <div className="container">

        <div className="text-center lg:mb-17.5 md:mb-12.5 mb-6.5">
          <h3 className="lg:text-6xl md:text-[55px] text-3xl text-white mb-2.5 font-bold">
            Every tool you need to dominate local search
          </h3>
          <p className="text-light-200 max-w-2xl mx-auto">
            From rankings to reviews, manage every aspect of your local SEO from one dashboard.
          </p>
        </div>

        <div className="relative">

          <nav
            className="flex gap-1.5 relative lg:mb-12.5 md:mb-12.5 mb-5 justify-center items-center flex-wrap p-1.5 rounded-2xl bg-white/[0.06] border border-white/10 backdrop-blur-xl w-fit mx-auto shadow-[0_0_0_1px_rgba(255,255,255,0.03)]"
            aria-label="Tabs"
            role="tablist"
          >
            {Object.entries(tabs).map(([key, tab]) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === key;
              return (
                <div className="hs-tab" key={key}>
                  <button
                    type="button"
                    className={`group relative flex items-center gap-2.5 py-3 px-6 rounded-xl text-[15px] font-semibold whitespace-nowrap transition-all duration-150 ease-out
            ${isActive
                        ? "bg-white text-zinc-900 shadow-[0_2px_12px_rgba(0,0,0,0.25),0_1px_3px_rgba(0,0,0,0.15)]"
                        : "text-white/50 hover:text-white hover:bg-white/10"
                      }`}
                    aria-selected={isActive}
                    role="tab"
                    onClick={() => setActiveTab(key)}
                  >
                    {isActive && (
                      <span className="absolute inset-0 rounded-xl ring-1 ring-white/20 pointer-events-none" />
                    )}
                    <IconComponent
                      className={`size-[18px] shrink-0 transition-colors duration-150 ${isActive
                          ? "text-zinc-700"
                          : "text-white/40 group-hover:text-white"
                        }`}
                    />
                    <span>{tab.label}</span>
                  </button>
                </div>
              );
            })}
          </nav>

          <div>
            {Object.entries(tabs).map(([key, tab]) => (
              <div
                key={key}
                role="tabpanel"
                className={activeTab === key ? "" : "hidden"}
              >
                <div className="lg:py-12.5 md:py-12.5 py-5">
                  <div className="grid lg:grid-cols-2 gap-4">
                    <div>
                      <h4 className="mb-2.5 lg:text-5xl md:text-[40px] text-[25px] font-bold text-white">
                        {tab.title}
                      </h4>
                      <p className="mb-2.5 text-light-200">{tab.description}</p>

                      <div className="grid lg:grid-cols-2 md:grid-cols-2 gap-4 lg:my-12.5 md:my-12.5 my-6 text-white">
                        {tab.features.map((feature, index) => (
                          <div className="flex items-center gap-2" key={index}>
                            <CircleCheck className="size-5 text-white" />
                            <div>{feature}</div>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center">
                        <Link
                          href={`/product/${tab.slug}`}
                          className="flex justify-center items-center gap-2 bg-white rounded-md py-2.5 px-7.5 group"
                        >
                          <div className="size-5.5 bg-body-bg rounded-full flex justify-center items-center">
                            <ArrowRight className="transition-transform duration-700 transform group-hover:-rotate-45 text-white size-4" />
                          </div>
                          <div className="font-normal">More Details</div>
                        </Link>
                      </div>
                    </div>

                    <MockupDisplay feature={tab} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-light lg:my-25 md:my-17.5 my-5 h-[1px]" />

        <div className="grid lg:grid-cols-3 md:grid-cols-3 lg:gap-12.5 md:gap-12.5 gap-5">
          <div>
            <h5 className="text-white mb-2.5 lg:text-4xl md:text-3xl text-xl font-bold">
              Everything you need to grow your visibility on Google Search and Maps
            </h5>
          </div>

          <div>
            <p className="text-light-200 mb-2.5">
              Gain the insights you need to make smarter decisions, understand your local performance,
              and uncover new opportunities to strengthen your presence where customers are searching.
            </p>
            <div className="text-white font-medium">Built for sustainable growth</div>
          </div>

          <div className="grid lg:grid-cols-2 items-center gap-2.5">
            <div className="text-white">
              <div className="text-6xl">{siteConfig.products.length}+</div>
              <div>Powerful tools</div>
            </div>
            <div className="text-white">
              <div className="text-6xl">24/7</div>
              <div>Visibility monitoring</div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default SalesSection;