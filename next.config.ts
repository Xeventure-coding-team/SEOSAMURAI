import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "off",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // NOTE: geolocation removed — you use it for Geo-Grid Scan feature
    // NOTE: payment removed — may interfere with Stripe checkout iframe
    key: "Permissions-Policy",
    value: "camera=(), microphone=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
].filter(h => h.key); // strip placeholder comment entries

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "mdx"],

  reactStrictMode: true,

  poweredByHeader: false,

  compress: true,

  devIndicators: false,

  experimental: {
    mdxRs: true,
  },

  turbopack: {},

  images: {
    dangerouslyAllowSVG: false,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: "rankerly",
  project: "javascript-nextjs",
  silent: true,
  disableLogger: true,
  widenClientFileUpload: false,
  tunnelRoute: "/monitoring",
});