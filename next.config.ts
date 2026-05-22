import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Suporta upload de fotos de até 5 MB (+ overhead do multipart)
      bodySizeLimit: '6mb',
    },
  },
};

export default nextConfig;
