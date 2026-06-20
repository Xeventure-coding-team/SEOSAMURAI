import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
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
};

export default withSentryConfig(nextConfig, {
  org: "rankerly",
  project: "javascript-nextjs",
  silent: true,
});