import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
    dirs: [], // Don't lint any directories
  },
  experimental: {
    typedRoutes: false,
  },
};

export default nextConfig;