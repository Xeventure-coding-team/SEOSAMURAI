import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  pageExtensions: ['ts', 'tsx', 'mdx'],
  reactStrictMode: true,
  devIndicators: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
    dirs: [],
  },
  turbopack: {},
  experimental: {
    mdxRs: true,
  }
};

export default withSentryConfig(nextConfig, {
  org: "rankerly",
  project: "javascript-nextjs",
  silent: true,
});