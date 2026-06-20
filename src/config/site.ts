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
      url: "/product/locations",
      icon: MapPin,
    },
    {
      title: "Bulk Posting",
      desc: "Publish multiple posts to a single location with one click",
      url: "/product/bulk-posting",
      icon: Share2,
    },
    {
      title: "Scheduled Posts",
      desc: "Plan your content calendar and automate GMB post delivery",
      url: "/product/scheduled-posts",
      icon: CalendarClock,
    },
    {
      title: "Reviews",
      desc: "Monitor, respond to, and analyze customer reviews across locations",
      url: "/product/reviews",
      icon: Star,
    },
    {
      title: "Review Poster",
      desc: "Turn your best reviews into shareable social media graphics",
      url: "/product/review-poster",
      icon: Megaphone,
    },
    {
      title: "Tracked Reviews",
      desc: "Track deleted and removed reviews",
      url: "/product/tracked-reviews",
      icon: Eye,
    },
    {
      title: "Keyword Tracking",
      desc: "Track how your business ranks for the keywords that matter most",
      url: "/product/keyword-tracking",
      icon: Search,
    },
    {
      title: "Competitor Tracking",
      desc: "Benchmark your local SEO performance against nearby competitors",
      url: "/product/competitor-tracking",
      icon: Users,
    },
    {
      title: "Websites",
      desc: "Build fast, SEO-optimized local landing pages for each location",
      url: "/product/websites",
      icon: Globe,
    },
    {
      title: "Geo-Grid Scan",
      desc: "Visualize your true map pack visibility across a geographic grid",
      url: "/product/geo-grid-scan",
      icon: ScanLine,
    },
  ] satisfies { title: string; desc: string; url: string; icon: LucideIcon }[],

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