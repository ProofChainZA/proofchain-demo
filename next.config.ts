import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Skip type checking during build - there's a React 19 type conflict with SDK
    ignoreBuildErrors: true,
  },
  output: 'standalone',
};

export default nextConfig;
