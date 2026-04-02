import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proxy (formerly middleware) — handles:
 * 1. Redirect old WordPress URLs to new structure
 * 2. Canonical URL enforcement (trailing slash consistency)
 */

// Old WP URL patterns that need redirecting
const OLD_URL_PATTERNS = [
  // Old product URLs: /producto/slug/ or /product/slug/
  { match: /^\/(?:producto|product)\/([^/]+)\/?$/, redirect: "/$1" },
  // Old category with /producto-cat/
  { match: /^\/producto-cat\/([^/]+)\/?$/, redirect: "/$1" },
  // Old WooCommerce cart/checkout
  { match: /^\/cart\/?$/, redirect: "/carrito" },
  { match: /^\/mi-cuenta\/?$/, redirect: "/mi-cuenta" },
  // Old pages
  { match: /^\/contactanos\/?$/, redirect: "/contacto" },
  { match: /^\/preguntas-frecuentes\/?$/, redirect: "/faq" },
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes, static files, images
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/static/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check old URL patterns
  for (const pattern of OLD_URL_PATTERNS) {
    const match = pathname.match(pattern.match);
    if (match) {
      const newPath = pattern.redirect.replace(
        /\$(\d+)/g,
        (_, i) => match[parseInt(i)] || ""
      );
      const url = new URL(newPath, request.url);
      return NextResponse.redirect(url, 301);
    }
  }

  // Remove trailing slash (except root)
  if (pathname !== "/" && pathname.endsWith("/")) {
    const url = new URL(pathname.slice(0, -1), request.url);
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files and API
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
