import type { NextConfig } from "next";
import path from "path";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: { ignoreBuildErrors: false },
  outputFileTracingRoot: path.join(__dirname, "../../.."),

  compress: true,

  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    qualities: [75, 90],
    minimumCacheTTL: ONE_YEAR_SECONDS,
  },

  async headers() {
    return [
      { source: "/icons/:path*", headers: [{ key: "Cache-Control", value: `public, max-age=${ONE_YEAR_SECONDS}, immutable` }] },
      { source: "/:path*.svg", headers: [{ key: "Cache-Control", value: `public, max-age=${ONE_YEAR_SECONDS}, immutable` }] },
      { source: "/:path*.png", headers: [{ key: "Cache-Control", value: `public, max-age=${ONE_YEAR_SECONDS}, immutable` }] }
    ];
  },
};

export default nextConfig;