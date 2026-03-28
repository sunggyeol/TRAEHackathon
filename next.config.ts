import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  sassOptions: {
    silenceDeprecations: ['legacy-js-api'],
  },
  // Disable Turbopack for build (Carbon's font references use ~ which Turbopack doesn't resolve)
  experimental: {
  },
};

export default nextConfig;
