import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://rankerly.io";
const SITE_NAME = "Rankerly";
const DEFAULT_OG = `${BASE_URL}/og-default.png`;
const TWITTER_HANDLE = "@rankerly";

interface MetaOptions {
  title: string;
  description: string;
  slug?: string;
  ogImage?: string;
  noIndex?: boolean;
}

export function createMetadata({
  title,
  description,
  slug = "/",
  ogImage = DEFAULT_OG,
  noIndex = false,
}: MetaOptions): Metadata {
  const canonical = `${BASE_URL}${slug}`;
  const fullTitle = `${title} — ${SITE_NAME}`;

  return {
    title: fullTitle,
    description,
    metadataBase: new URL(BASE_URL),
    alternates: {
      canonical,
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      url: canonical,
      title: fullTitle,
      description,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      site: TWITTER_HANDLE,
      title: fullTitle,
      description,
      images: [ogImage],
    },
  };
}