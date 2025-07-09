import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable static exports for Electron
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
