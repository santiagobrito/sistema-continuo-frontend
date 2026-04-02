/**
 * GET /api/feeds/meta
 * Meta/Facebook catalog feed (JSON)
 */

import { NextResponse } from "next/server";

const WP_URL = process.env.WP_URL || process.env.NEXT_PUBLIC_WP_URL || "";

export async function GET() {
  try {
    const res = await fetch(`${WP_URL}/wp-json/sistema-continuo/v1/feeds/meta`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return new NextResponse("Feed unavailable", { status: 502 });
    const data = await res.json();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  } catch {
    return new NextResponse("Feed error", { status: 500 });
  }
}
