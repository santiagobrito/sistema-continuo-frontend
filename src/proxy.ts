import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proxy — handles:
 * 1. Category redirects (reorganized categories)
 * 2. Old WordPress URL redirects
 * 3. Trailing slash removal
 */

// Category redirects from optimization (old top-level → new nested paths)
const CATEGORY_REDIRECTS: Record<string, string> = {
  "/tintas-ocp-para-epson": "/tintas/tintas-ocp-para-epson",
  "/tintas-ocp-para-hp": "/tintas/tintas-ocp-para-hp",
  "/tintas-ocp-para-canon": "/tintas/tintas-ocp-para-canon",
  "/matte-2": "/papel/papeles-fotograficos/matte-2",
  "/glossy": "/papel/papeles-fotograficos/glossy",
  "/resinado": "/sublimables/resinado",
  "/impresoras-y-plotters": "/impresoras",
};

// Old WP URL patterns
const OLD_URL_PATTERNS = [
  { match: /^\/(?:producto|product)\/([^/]+)\/?$/, redirect: "/$1" },
  { match: /^\/producto-cat\/([^/]+)\/?$/, redirect: "/$1" },
  { match: /^\/cart\/?$/, redirect: "/carrito" },
  { match: /^\/contactanos\/?$/, redirect: "/contacto" },
  { match: /^\/preguntas-frecuentes\/?$/, redirect: "/faq" },
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes, static files
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/static/") ||
    pathname.startsWith("/admin/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Normalize: remove trailing slash for comparison
  const cleanPath = pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

  // Category redirects (301 permanent)
  if (CATEGORY_REDIRECTS[cleanPath]) {
    const url = new URL(CATEGORY_REDIRECTS[cleanPath], request.url);
    return NextResponse.redirect(url, 301);
  }

  // Old URL pattern redirects
  for (const pattern of OLD_URL_PATTERNS) {
    const match = cleanPath.match(pattern.match);
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
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
