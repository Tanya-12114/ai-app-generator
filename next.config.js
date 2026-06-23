/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produces a minimal, self-contained server bundle (.next/standalone)
  // with only the node_modules actually needed at runtime — keeps the
  // final Docker image small instead of shipping the whole node_modules.
  output: "standalone",
  productionBrowserSourceMaps: true,
};

module.exports = nextConfig;