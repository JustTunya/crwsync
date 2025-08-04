const exp = require("constants");

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@crwsync/types"],
  output: "standalone",
};

module.exports = nextConfig;