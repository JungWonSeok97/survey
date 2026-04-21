import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  compress: true,
  productionBrowserSourceMaps: false,
};

export default nextConfig;
