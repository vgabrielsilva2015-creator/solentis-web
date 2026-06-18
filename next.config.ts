import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  // Desativa o PWA no modo de desenvolvimento para não bugar o cache local (F5)
  disable: process.env.NODE_ENV === "development",
  register: true,
});

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Suporta upload de fotos de até 5 MB (+ overhead do multipart)
      bodySizeLimit: '6mb',
    },
  },
};

export default withPWA(nextConfig);
