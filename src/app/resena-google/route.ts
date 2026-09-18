/**
 * GET /resena-google?t=<token>
 *
 * Enlace del pedido de reseña en Google (email único y "gracias" de la reseña
 * de producto). Le avisa a WP del clic y redirige al formulario de Google.
 * Si WP no responde, redirige igual: el clic del cliente vale más que la métrica.
 */

import { NextRequest, NextResponse } from "next/server";

const WP_URL = process.env.WP_URL || process.env.NEXT_PUBLIC_WP_URL || "";
// Espejo de SC_Google_Review_Ask::DEFAULT_REVIEW_URL, solo como respaldo.
const FALLBACK_URL =
  "https://search.google.com/local/writereview?placeid=ChIJse6aGHjHvJURCbl2Hlg48X8";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = (request.nextUrl.searchParams.get("t") || "").replace(/[^a-f0-9]/g, "").slice(0, 32);
  let target = FALLBACK_URL;
  try {
    const res = await fetch(`${WP_URL}/wp-json/sistema-continuo/v1/gbp/click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      if (typeof data.url === "string" && data.url.startsWith("https://")) target = data.url;
    }
  } catch {
    // redirigimos igual
  }
  return NextResponse.redirect(target, 302);
}
