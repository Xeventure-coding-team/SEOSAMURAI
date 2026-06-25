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
    phone: "+1 (555) 000-0000",
    address: "San Francisco, CA",
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
      desc: "Monitor, respond to, and analyze customer reviews across locations",
      longDesc:
        "Monitor customer reviews from all connected locations in one centralized workspace. Read new feedback, respond to customers, identify recurring trends, and better understand customer sentiment across your business. Centralized review management helps businesses maintain engagement, improve customer satisfaction, and gain valuable insights without visiting individual profiles separately.",
      url: "/product/reviews",
      icon: Star,
    },
    {
      title: "Review Poster",
      desc: "Turn your best reviews into shareable social media graphics",
      longDesc:
        "Convert positive customer reviews into professional graphics that can be shared across social media platforms, websites, and marketing campaigns. Highlight authentic customer experiences, build trust with potential customers, and maximize the value of positive feedback by transforming reviews into engaging visual content suitable for multiple channels.",
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
        "Understand how your business performs in local search results by monitoring ranking positions for important keywords. Track changes over time, compare performance across locations, and identify opportunities to improve local visibility. Historical ranking data provides valuable insights into SEO progress and helps businesses measure the impact of optimization efforts.",
      url: "/product/keyword-tracking",
      icon: Search,
    },
    {
      title: "Competitor Tracking",
      desc: "Benchmark your local SEO performance against nearby competitors",
      longDesc:
        "Compare your business against other businesses competing in the same local market. Monitor relative visibility, discover competitive strengths and weaknesses, and gain insights into how competitors perform in local search. These comparisons can help prioritize optimization efforts and provide a clearer understanding of your position within the local landscape.",
      url: "/product/competitor-tracking",
      icon: Users,
    },
    {
      title: "Websites",
      desc: "Build fast, SEO-optimized local landing pages for each location",
      longDesc:
        "Create dedicated location pages designed to showcase business information, services, contact details, and local relevance. Location-focused websites can help customers find accurate information quickly while supporting broader local marketing efforts. Manage multiple landing pages efficiently and maintain a consistent online presence across all business locations.",
      url: "/product/websites",
      icon: Globe,
    },
    {
      title: "Geo-Grid Scan",
      desc: "Visualize your true map pack visibility across a geographic grid",
      longDesc:
        "Gain a deeper understanding of local search visibility by analyzing rankings across multiple points within a geographic area. Geo-Grid Scans provide a visual representation of where your business appears in map results, helping identify strong and weak coverage areas. This broader view of local performance can reveal opportunities that may not be visible through traditional rank tracking alone.",
      url: "/product/geo-grid-scan",
      icon: ScanLine,
    }
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