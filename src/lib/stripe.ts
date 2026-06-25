import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set in .env.local");
    _stripe = new Stripe(key, { typescript: true });
  }
  return _stripe;
}

// ─── Supported currencies ─────────────────────────────────────────────────────
export type SupportedCurrency = "inr" | "usd" | "eur" | "gbp" | "aud" | "cad" | "aed";

export type PriceByCurrency = Record<SupportedCurrency, number>;

export const CURRENCY_CONFIG: Record<
  SupportedCurrency,
  { symbol: string; locale: string; code: string }
> = {
  inr: { symbol: "₹", locale: "en-IN", code: "INR" },
  usd: { symbol: "$", locale: "en-US", code: "USD" },
  eur: { symbol: "€", locale: "de-DE", code: "EUR" },
  gbp: { symbol: "£", locale: "en-GB", code: "GBP" },
  aud: { symbol: "A$", locale: "en-AU", code: "AUD" },
  cad: { symbol: "CA$", locale: "en-CA", code: "CAD" },
  aed: { symbol: "د.إ", locale: "en-AE", code: "AED" },
};

// ─── Plan types ───────────────────────────────────────────────────────────────
export type PlanId = "starter" | "growth" | "pro";

export interface PlanLimits {
  aiImage: number
  locations: number;
  postsPerMonth: number;
  aiReviewReplies: number;
  scheduledPosts: number;
  bulkPosts: boolean;
  geoGridScans: number;
  keywordTracking: number;
  competitorInsights: boolean;
  tasks: boolean;
  taskAchievements: boolean;
  taskMilestones: boolean;
  analytics: boolean;
  mediaUpload: boolean;
  reviewTracking: boolean;
  reviewPoster: number;
  websites: number;
  health: boolean
}

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  description: string;
  priceIds: Record<SupportedCurrency, string>;
  prices: PriceByCurrency;
  price: number;
  interval: "month" | "year";
  limits: PlanLimits;
  features: string[];
  highlight?: boolean;
  cta: string;
}

// ─── Plans ────────────────────────────────────────────────────────────────────
export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Perfect to get started",
    description: "Ideal for small businesses managing a single location.",
    priceIds: {
      inr: process.env.STRIPE_STARTER_INR_PRICE_ID!,
      usd: process.env.STRIPE_STARTER_USD_PRICE_ID!,
      eur: process.env.STRIPE_STARTER_EUR_PRICE_ID!,
      gbp: process.env.STRIPE_STARTER_GBP_PRICE_ID!,
      aud: process.env.STRIPE_STARTER_AUD_PRICE_ID!,
      cad: process.env.STRIPE_STARTER_CAD_PRICE_ID!,
      aed: process.env.STRIPE_STARTER_AED_PRICE_ID!,
    },
    prices: { inr: 129900, usd: 2400, eur: 2200, gbp: 1900, aud: 3600, cad: 3200, aed: 8800 },
    price: 129900,
    interval: "month",
    limits: {
      aiImage: 5,
      locations: 1,
      postsPerMonth: 8,
      aiReviewReplies: 500,
      scheduledPosts: 5,
      bulkPosts: false,
      geoGridScans: 2,
      keywordTracking: 10,
      competitorInsights: false,
      tasks: true,
      taskAchievements: false,
      taskMilestones: false,
      analytics: false,
      mediaUpload: true,
      reviewTracking: false,
      health: true,
      reviewPoster: 5,
      websites: 1,
    },
    features: [
      "1 Location",
      "8 Posts/month",
      "2x AI Review Replies",
      "5 AI Poster/month",
      "5 Scheduled Posts/month",
      "2 Geo Grid Scans/month",
      "10 Keywords per Location",
      "5 Review Posters",
      "Basic Weekly Tasks",
      "1 Website",
      "Media Upload",
      "Email Support",
    ],
    cta: "Get Started",
  },
  {
    id: "growth",
    name: "Growth",
    tagline: "Best for growing businesses",
    description: "For businesses scaling across multiple locations.",
    priceIds: {
      inr: process.env.STRIPE_GROWTH_INR_PRICE_ID!,
      usd: process.env.STRIPE_GROWTH_USD_PRICE_ID!,
      eur: process.env.STRIPE_GROWTH_EUR_PRICE_ID!,
      gbp: process.env.STRIPE_GROWTH_GBP_PRICE_ID!,
      aud: process.env.STRIPE_GROWTH_AUD_PRICE_ID!,
      cad: process.env.STRIPE_GROWTH_CAD_PRICE_ID!,
      aed: process.env.STRIPE_GROWTH_AED_PRICE_ID!,
    },
    prices: { inr: 399900, usd: 5900, eur: 5400, gbp: 4900, aud: 8900, cad: 7900, aed: 21700 },
    price: 399900,
    interval: "month",
    highlight: true,
    limits: {
      aiImage: 10,
      locations: 3,
      postsPerMonth: 30,
      aiReviewReplies: 500,
      scheduledPosts: 15,
      bulkPosts: false,
      geoGridScans: 5,
      keywordTracking: 20,
      competitorInsights: false,
      tasks: true,
      taskAchievements: true,
      taskMilestones: false,
      analytics: true,
      mediaUpload: true,
      reviewTracking: true,
      health: true,
      reviewPoster: 20,
      websites: 3,
    },
    features: [
      "3 Locations",
      "30 Posts/month",
      "5x AI Review Replies",
      "10 AI Poster/month",
      "15 Scheduled Posts/month",
      "5 Geo Grid Scans/month",
      "20 Keywords per Location",
      "20 Review Posters",
      "Task Dashboard + Achievements",
      "Basic Analytics",
      "Review Tracking",
      "Media Upload",
      "3 Websites",
      "Priority Email Support",
    ],
    cta: "Start Growing",
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For agencies & power users",
    description: "Unlimited power for agencies and high-growth businesses.",
    priceIds: {
      inr: process.env.STRIPE_PRO_INR_PRICE_ID!,
      usd: process.env.STRIPE_PRO_USD_PRICE_ID!,
      eur: process.env.STRIPE_PRO_EUR_PRICE_ID!,
      gbp: process.env.STRIPE_PRO_GBP_PRICE_ID!,
      aud: process.env.STRIPE_PRO_AUD_PRICE_ID!,
      cad: process.env.STRIPE_PRO_CAD_PRICE_ID!,
      aed: process.env.STRIPE_PRO_AED_PRICE_ID!,
    },
    prices: { inr: 899900, usd: 12900, eur: 11900, gbp: 10900, aud: 19500, cad: 17300, aed: 47400 },
    price: 899900,
    interval: "month",
    limits: {
      aiImage: 15,
      locations: 10,
      postsPerMonth: 100,
      aiReviewReplies: 500,
      scheduledPosts: 50,
      bulkPosts: true,
      geoGridScans: 10,
      keywordTracking: 30,
      competitorInsights: true,
      tasks: true,
      taskAchievements: true,
      taskMilestones: true,
      analytics: true,
      mediaUpload: true,
      reviewTracking: true,
      health: true,
      reviewPoster: 100,
      websites: 10,
    },
    features: [
      "10 Locations",
      "100 Posts/month",
      "10x AI Review Replies",
      "15 AI Poster/month",
      "50 Scheduled Posts/month",
      "Bulk Posting",
      "10 Geo Grid Scans/month",
      "30 Keywords per Location",
      "100 Review Posters",
      "Competitor Insights",
      "Task Dashboard + Achievements + Milestones",
      "Advanced Analytics",
      "Review Tracking",
      "Media Upload",
      "10 Websites",
      "Priority Support",
    ],
    cta: "Go Pro",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function getPlanByPriceId(priceId: string): Plan | undefined {
  return PLANS.find((p) => Object.values(p.priceIds).includes(priceId));
}

export function getCurrencyByPriceId(priceId: string): SupportedCurrency | undefined {
  for (const plan of PLANS) {
    for (const [currency, id] of Object.entries(plan.priceIds)) {
      if (id === priceId) return currency as SupportedCurrency;
    }
  }
}

export function getPlanLimits(planId: PlanId): PlanLimits {
  return PLANS.find((p) => p.id === planId)!.limits;
}

export function formatPrice(
  amount: number,
  currency: SupportedCurrency = "inr"
): string {
  const { locale, code } = CURRENCY_CONFIG[currency];
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

export function detectCurrency(): SupportedCurrency {
  if (typeof navigator === "undefined") return "inr";
  const langs = navigator.languages ?? [navigator.language ?? "en-IN"];
  const lang = langs.find(l => l.includes("-")) ?? langs[0];
  if (lang.includes("IN") || lang === "hi") return "inr";
  if (lang.includes("GB")) return "gbp";
  if (["de", "fr", "es", "it", "nl", "pt-PT"].some((l) => lang.startsWith(l))) return "eur";
  return "usd";
}