import {
  MapPin, Share2, CalendarClock, Star, Megaphone,
  Eye, Search, Users, Globe, ScanLine,
  Twitter, Linkedin, Facebook, Github,
  type LucideIcon,
} from "lucide-react";



export const siteConfig = {

  // ── Brand ──────────────────────────────────────────────
  name: "Rankerly",
  tagline: "Automate local SEO growth for every Google Business Profile location.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://rankerly.app",
  logo: "/logo.svg",

  // ── Contact ────────────────────────────────────────────
  contact: {
    email: "info@rankerly.app",
    phone: "",
    address: "",
  },

  // ── Products ───────────────────────────────────────────
  products: [
    {
      title: "Locations",
      desc: "Add and manage all your Google Business Profile locations in one place",
      longDesc:
        "Manage all of your Google Business Profile locations from a centralized dashboard designed for businesses, agencies, and multi-location brands. Access location information, monitor activity, review performance metrics, and keep business details organized without switching between multiple Google accounts. Whether you operate a handful of locations or hundreds, the Locations dashboard helps simplify day-to-day management and provides a clearer overview of your local presence.",
      url: "/product/locations",
      icon: MapPin,
    },
    {
      title: "Bulk Posting",
      desc: "Publish multiple posts to a single location with one click",
      longDesc:
        "Create and distribute Google Business Profile posts more efficiently with bulk publishing tools. Instead of creating the same content repeatedly, businesses can prepare updates, promotions, events, and announcements once and publish them across selected locations from a single interface. This helps reduce repetitive work, maintain consistent messaging, and keep business profiles active while saving valuable time.",
      url: "/product/bulk-posting",
      icon: Share2,
    },
    {
      title: "Scheduled Posts",
      desc: "Plan your content calendar and automate GMB post delivery",
      longDesc:
        "Maintain a consistent publishing schedule without manually creating posts every day. Scheduled Posts allows businesses to plan content in advance, organize campaigns, and automatically publish updates at the desired time. Whether promoting special offers, seasonal campaigns, events, or company announcements, scheduling helps ensure locations remain active and customers always see fresh content.",
      url: "/product/scheduled-posts",
      icon: CalendarClock,
    },
    {
      title: "Reviews",
      desc: "Manage customer reviews, AI replies, and review insights from one place",
      longDesc:
        "Manage customer reviews across all your connected Google Business Profile locations from one centralized workspace. Quickly identify unreplied reviews, generate AI-powered responses, and reply without switching between Business Profiles. Dive deeper into each location to view its complete review history, track rating trends, analyze customer sentiment, and gain valuable insights that help strengthen your online reputation and improve customer engagement.",
      url: "/product/reviews",
      icon: Star,
    },
    {
      title: "Review Poster",
      desc: "Create QR code posters that make it easy for customers to leave reviews",
      longDesc:
        "Generate professional review request posters with built-in QR codes that take customers directly to your Google Business Profile review page. Print them for your storefront, reception, checkout counter, or share them digitally to encourage more customer reviews. Review Poster helps businesses simplify the review collection process, increase review volume, and strengthen their online reputation by making it effortless for customers to leave feedback.",
      url: "/product/review-poster",
      icon: Megaphone,
    },
    {
      title: "Tracked Reviews",
      desc: "Track deleted and removed reviews",
      longDesc:
        "Keep visibility into review history by monitoring reviews that are no longer publicly visible. Track review changes over time, maintain historical records, and identify situations where reviews have been removed or deleted. This additional layer of monitoring helps businesses maintain a more complete understanding of customer feedback activity.",
      url: "/product/tracked-reviews",
      icon: Eye,
    },
    {
      title: "Keyword Tracking",
      desc: "Track how your business ranks for the keywords that matter most",
      longDesc:
        "Monitor how your Google Business Profile ranks for the keywords that matter most to your business. Track ranking changes over time, review previous ranking positions, and measure the impact of your local SEO efforts. Keyword Tracking helps you understand your local search visibility and identify opportunities to improve your Business Profile's performance.",
      url: "/product/keyword-tracking",
      icon: Search,
    },
    {
      title: "Competitor Tracking",
      desc: "Monitor how your business compares with local competitors",
      longDesc:
        "Compare your Google Business Profile with competing businesses in the same local market. Understand your position among nearby competitors, identify strengths and opportunities for improvement, and gain valuable insights that can help guide your local SEO and Business Profile optimization efforts.",
      url: "/product/competitor-tracking",
      icon: Users,
    },
    {
      title: "Websites",
      desc: "Create SEO-friendly websites for every Google Business Profile location",
      longDesc:
        "Build professional websites connected to your Google Business Profile locations. Showcase business information, services, contact details, and location-specific content while creating a stronger local online presence. Easily manage multiple websites from one platform and keep every location represented with an optimized, easy-to-maintain website.",
      url: "/product/websites",
      icon: Globe,
    },
    {
      title: "Geo-Grid Scan",
      desc: "Visualize your Google Maps rankings across your entire service area",
      longDesc:
        "See how your Google Business Profile ranks from multiple search locations with interactive Geo-Grid Scans. Identify areas where your business performs well, uncover gaps in local visibility, compare historical scans, and gain deeper insights into your Google Maps performance beyond traditional keyword tracking.",
      url: "/product/geo-grid-scan",
      icon: ScanLine,
    },
  ] satisfies { title: string; desc: string; url: string; longDesc: string; icon: LucideIcon }[],

  // ── Main Nav ───────────────────────────────────────────
  navLinks: [
    { title: "Pricing", url: "/pricing" },
    { title: "Blog", url: "/blog" },
    { title: "About", url: "/about" },
    { title: "Changelog", url: "/changelog" },
  ],

  // ── Footer Links ───────────────────────────────────────
  footerLinks: {
    company: [
      { title: "About", url: "/about" },
      { title: "Blog", url: "/blog" },
      { title: "Pricing", url: "/pricing" },
      { title: "Changelog", url: "/changelog" },
      { title: "Contact", url: "/contact" },
    ],
    legal: [
      { title: "Privacy Policy", url: "/privacy" },
      { title: "Terms of Service", url: "/terms" },
      { title: "Cookie Policy", url: "/cookies" },
    ],
  },

  // ── Social ─────────────────────────────────────────────
  social: [
    { label: "Twitter", url: "https://twitter.com/rankerly", icon: Twitter },
    { label: "LinkedIn", url: "https://linkedin.com/company/rankerly", icon: Linkedin },
    { label: "Facebook", url: "https://facebook.com/rankerly", icon: Facebook },
    { label: "GitHub", url: "https://github.com/rankerly", icon: Github },
  ] satisfies { label: string; url: string; icon: LucideIcon }[],

};

export type SiteConfig = typeof siteConfig;

export function getProductBySlug(slug: string) {
  return siteConfig.products.find((p) => p.url.endsWith(slug));
}

export function getSlug(p: { url: string }) {
  return p.url.split("/").pop()!;
}