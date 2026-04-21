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
  experimental: {
    optimizePackageImports: ["@/components", "@/lib"],
  },
  // Páginas con UI que depende de cookies/auth NO deben cachearse en CDN.
  // Sin esto, Cloudflare cachea el HTML estático (build-time) del checkout
  // y los users ven la versión vieja durante hasta 1 año (s-maxage default de Next).
  async headers() {
    const noCache = [
      { key: "Cache-Control", value: "private, no-store, no-cache, must-revalidate, max-age=0" },
    ];
    return [
      { source: "/checkout", headers: noCache },
      { source: "/mi-cuenta/:path*", headers: noCache },
      { source: "/iniciar-sesion", headers: noCache },
      { source: "/registro", headers: noCache },
      { source: "/pedido-confirmado", headers: noCache },
    ];
  },
};

export default nextConfig;
