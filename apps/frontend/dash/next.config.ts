import type { NextConfig } from "next";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },

  devIndicators: false,

  compress: true,

  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    qualities: [75, 90],
    minimumCacheTTL: ONE_YEAR_SECONDS,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },

  async headers() {
    return [
      { source: "/icons/:path*", headers: [{ key: "Cache-Control", value: `public, max-age=${ONE_YEAR_SECONDS}, immutable` }] },
      { source: "/:path*.svg", headers: [{ key: "Cache-Control", value: `public, max-age=${ONE_YEAR_SECONDS}, immutable` }] },
      { source: "/:path*.png", headers: [{ key: "Cache-Control", value: `public, max-age=${ONE_YEAR_SECONDS}, immutable` }] }
    ];
  },
  
  // Standalone output symlinks node_modules, which needs Developer Mode on
  // Windows. NEXT_NO_STANDALONE=1 skips it for local production builds.
  output: process.env.NEXT_NO_STANDALONE ? undefined : 'standalone',
};

export default nextConfig;