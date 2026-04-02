import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "sistema-continuo-wp.a7lflv.easypanel.host",
      },
      {
        protocol: "https",
        hostname: "api.sistemacontinuo.com.ar",
      },
      {
        protocol: "https",
        hostname: "*.sistemacontinuo.com.ar",
      },
      {
        protocol: "https",
        hostname: "sistemacontinuo.com.ar",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
    ],
  },
  compress: true,
  poweredByHeader: false,
};

export default nextConfig;
