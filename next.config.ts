import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    esmExternals: 'loose', // This might help with ESM/CJS conflicts
  },
};

export default nextConfig;
