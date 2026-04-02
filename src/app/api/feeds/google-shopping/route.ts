/**
 * GET /api/feeds/google-shopping
 *
 * Proxies the Google Shopping XML feed from the WP plugin.
 * Cached for 1 hour. Submit this URL to Google Merchant Center.
 */

import { NextResponse } from "next/server";

const WP_URL = process.env.WP_URL || process.env.NEXT_PUBLIC_WP_URL || "";

export async function GET() {
  try {
    const res = await fetch(`${WP_URL}/wp-json/sistema-continuo/v1/feeds/google-shopping`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return new NextResponse("Feed unavailable", { status: 502 });
    }

    const xml = await res.text();

    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("Feed error", { status: 500 });
  }
}
