import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
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
        protocol: "http",
        hostname: "localhost",
      },
    ],
  },
};

export default nextConfig;
