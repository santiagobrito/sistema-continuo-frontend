/**
 * GET /api/abandoned-cart/recover?t=<token>
 *
 * Devuelve los datos del carrito abandonado asociados al token.
 * Usado por la página /recuperar-carrito para reconstruir el cart en el frontend.
 */

import { NextRequest, NextResponse } from "next/server";

const WP_URL = process.env.WP_URL || process.env.NEXT_PUBLIC_WP_URL || "";
const WC_API_AUTH = process.env.WC_API_AUTH || "";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t");
  if (!token) {
    return NextResponse.json({ success: false, error: "missing_token" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${WP_URL}/wp-json/sistema-continuo/v1/abandoned-cart/recover?token=${encodeURIComponent(token)}`,
      { headers: { Authorization: `Basic ${WC_API_AUTH}` } },
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, error: "fetch_failed" }, { status: 500 });
  }
}
