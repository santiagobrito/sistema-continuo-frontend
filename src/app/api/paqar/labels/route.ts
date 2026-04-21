/**
 * POST /api/paqar/labels
 *
 * Endpoint admin. Recibe lista de trackingNumbers y devuelve PDFs base64.
 * Usado por el plugin WP para imprimir los N rótulos de un pedido.
 *
 * Body: { trackingNumbers: string[], labelFormat?: "10x15"|"label" }
 *
 * Seguridad: header x-internal-secret.
 */

import { NextRequest, NextResponse } from "next/server";
import { paqarClient } from "@/lib/paqar/client";

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || "";

// Orígenes del WP admin que pueden invocar este endpoint desde el browser.
// El header x-internal-secret requiere preflight CORS; sin esto los botones
// "Imprimir rótulos" / "Actualizar estado" del metabox quedan colgados.
const ALLOWED_ORIGINS = new Set([
  "https://api.sistemacontinuo.com.ar",
  "https://sistema-continuo-wp.a7lflv.easypanel.host",
  "https://sistemacontinuo.com.ar",
  "https://www.sistemacontinuo.com.ar",
  "https://nueva.sistemacontinuo.com.ar",
]);

function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-internal-secret",
    "Access-Control-Max-Age": "3600",
    Vary: "Origin",
  };
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request.headers.get("origin")),
  });
}

export async function POST(request: NextRequest) {
  const cors = corsHeaders(request.headers.get("origin"));

  if (request.headers.get("x-internal-secret") !== INTERNAL_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403, headers: cors });
  }

  try {
    if (!paqarClient.isConfigured()) {
      return NextResponse.json(
        { error: "PAQ.AR no configurado" },
        { status: 503, headers: cors }
      );
    }

    const { trackingNumbers, labelFormat } = await request.json();

    if (!Array.isArray(trackingNumbers) || trackingNumbers.length === 0) {
      return NextResponse.json(
        { error: "trackingNumbers[] requerido" },
        { status: 400, headers: cors }
      );
    }

    const items = trackingNumbers.map((tn: string) => ({
      sellerId: paqarClient.sellerId || "",
      trackingNumber: tn,
    }));

    const labels = await paqarClient.getLabels(
      items,
      labelFormat === "10x15" || labelFormat === "label" ? labelFormat : undefined
    );

    return NextResponse.json({ ok: true, labels }, { headers: cors });
  } catch (err) {
    console.error("[paqar/labels]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "error" },
      { status: 500, headers: cors }
    );
  }
}
