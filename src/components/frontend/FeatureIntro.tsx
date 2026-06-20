import React from "react";
import {
  MapPin,
  Star,
  Megaphone,
  Share2,
  CalendarClock,
  Eye,
  Search,
  Users,
  Globe,
  ScanLine,
} from "lucide-react";

const features = [
  {
    icon: MapPin,
    title: "Location Management",
    desc: "Manage all your business locations from a single dashboard with full control and visibility.",
  },
  {
    icon: Share2,
    title: "Bulk Posting",
    desc: "Create and publish multiple posts for a single Google Business Profile in one streamlined flow.",
  },
  {
    icon: CalendarClock,
    title: "Scheduled Posts",
    desc: "Plan your content calendar and automate post delivery for your Google Business Profile with ease.",
  },
  {
    icon: Star,
    title: "Review Management",
    desc: "Monitor, respond to, and analyze customer reviews from all locations in one unified inbox.",
  },
  {
    icon: Megaphone,
    title: "Review Poster",
    desc: "Turn your best customer reviews into shareable social media graphics in seconds.",
  },
  {
    icon: Eye,
    title: "Tracked Reviews",
    desc: "Detect and track deleted Google reviews in real time to protect your reputation.",
  },
  {
    icon: Search,
    title: "Keyword Tracking",
    desc: "Track local keyword rankings and monitor visibility trends across search results.",
  },
  {
    icon: Users,
    title: "Competitor Tracking",
    desc: "Compare your local SEO performance with competitors and uncover growth opportunities.",
  },
  {
    icon: Globe,
    title: "Websites",
    desc: "Build fast, SEO-optimized landing pages for each location with consistent branding.",
  },
  {
    icon: ScanLine,
    title: "Geo-Grid Scan",
    desc: "Visualize your Google Map Pack rankings across a grid to find visibility gaps.",
  },
];

export default function FeatureIntro() {
  return (
    <section className="lg:pb-32.5 md:pb-22.5 pb-7.5">
      <div className="container">

        <div className="mb-20 lg:w-5xl">
          <h3 className="lg:text-6xl md:text-[55px] text-3xl mb-2.5 font-bold text-gray-900 dark:text-white">
            Everything you need to manage local growth at scale
          </h3>

          <p className="mb-2.5 font-normal text-gray-600 dark:text-gray-400">
            Rankerly helps businesses manage rankings, locations, reviews, and
            Google Business profiles with automation, AI, and geo-based insights.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 lg:grid-rows-3 md:grid-cols-3 md:grid-rows-3 lg:gap-15 md:gap-7.5 gap-y-10">

          {features.map((item, i) => {
            const Icon = item.icon;

            return (
              <div
                key={i}
                className="lg:p-7.5 md:p-5 p-4 border-2 border-light-400 dark:border-white/10 rounded lg:h-full"
              >
                <div className="size-12.5 bg-primary rounded lg:-mt-12.5 md:-mt-12.5 -mt-7.5 flex justify-center items-center">
                  <Icon className="w-5 h-5 text-white" />
                </div>

                <div className="lg:pt-7.5 md:pt-5 pt-4">
                  <h6 className="text-2xl mb-2.5 font-bold text-gray-900 dark:text-white">
                    {item.title}
                  </h6>

                  <p className="mb-2.5 font-normal text-gray-600 dark:text-gray-400">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}

        </div>

      </div>
    </section>
  );
}