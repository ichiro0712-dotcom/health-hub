import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  devIndicators: {
    position: 'top-right',
  },
};

export default nextConfig;
