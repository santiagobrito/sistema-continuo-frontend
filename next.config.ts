import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    // Next 16: por defecto solo permite quality=75 (rechaza q=60/65 con 400).
    // Listar los valores permitidos para que los <Image quality={N}> funcionen.
    qualities: [50, 60, 65, 72, 75, 85],
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
    // Inlinear CSS en <head> elimina request render-blocking (~430ms en mobile).
    // Recomendado para Tailwind (atomic CSS, ~21 KiB). Tradeoff: returning
    // visitors re-descargan styles con cada HTML; aceptable porque el HTML está
    // cached en CF edge y los styles totales son pequeños.
    inlineCss: true,
  },
  // Compat: emails antiguos del plugin SC enviaban la magic-link a /auth/magic-link
  // en lugar de /api/auth/magic-link. El plugin ya está corregido a partir de
  // v1.7.75, pero los links ya enviados deben seguir funcionando los 30d de TTL.
  async rewrites() {
    return [
      { source: "/auth/magic-link", destination: "/api/auth/magic-link" },
    ];
  },
  // Canonical = sin-www. www.* → 301 a apex para evitar duplicate content.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.sistemacontinuo.com.ar" }],
        destination: "https://sistemacontinuo.com.ar/:path*",
        permanent: true,
      },
    ];
  },
  // Páginas con UI que depende de cookies/auth NO deben cachearse en CDN.
  // Sin esto, Cloudflare cachea el HTML estático (build-time) del checkout
  // y los users ven la versión vieja durante hasta 1 año (s-maxage default de Next).
  async headers() {
    const noCache = [
      { key: "Cache-Control", value: "private, no-store, no-cache, must-revalidate, max-age=0" },
    ];
    // Security headers globales. CSP arranca permissive (report-only style) para
    // no romper GTM/MP/YouTube embeds; tighten en pasada siguiente cuando se
    // releve el inventario completo de scripts third-party.
    const security = [
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
      // CSP permissive: permite scripts/styles inline (Next.js + GTM) y dominios
      // de terceros que ya usamos. Endurecer en sprint siguiente.
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://www.googletagmanager.com https://www.google-analytics.com https://sdk.mercadopago.com https://connect.facebook.net https://www.googleadservices.com https://googleads.g.doubleclick.net https://*.googletagmanager.com https://apis.google.com https://www.gstatic.com https://*.gstatic.com https://www.clarity.ms https://*.clarity.ms",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
          "img-src 'self' data: blob: https: http://localhost",
          "font-src 'self' data: https://fonts.gstatic.com",
          "connect-src 'self' https://api.sistemacontinuo.com.ar https://sistema-continuo-wp.a7lflv.easypanel.host https://*.mercadopago.com https://api.mercadopago.com https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com https://*.googletagmanager.com https://stats.g.doubleclick.net https://www.facebook.com https://connect.facebook.net https://accounts.google.com https://oauth2.googleapis.com https://*.clarity.ms",
          "frame-src 'self' https://www.youtube.com https://*.mercadopago.com https://accounts.google.com",
          "frame-ancestors 'self'",
          "form-action 'self' https://*.mercadopago.com",
          "base-uri 'self'",
          "object-src 'none'",
        ].join("; "),
      },
    ];
    return [
      { source: "/:path*", headers: security },
      { source: "/checkout", headers: noCache },
      { source: "/mi-cuenta/:path*", headers: noCache },
      { source: "/iniciar-sesion", headers: noCache },
      { source: "/registro", headers: noCache },
      { source: "/pedido-confirmado", headers: noCache },
    ];
  },
};

export default nextConfig;
