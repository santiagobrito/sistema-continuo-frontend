/**
 * POST /api/paqar/tracking
 *
 * Consulta historial de uno o más trackingNumbers.
 * - Llamado por el plugin WP admin (necesita CORS porque el header
 *   Content-Type custom ya dispara preflight OPTIONS).
 * - También llamado por /mi-cuenta/pedidos/[id] (mismo origen, sin CORS).
 */

import { NextRequest, NextResponse } from "next/server";
import { paqarClient } from "@/lib/paqar/client";

const ALLOWED_ORIGINS = new Set([
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

  try {
    if (!paqarClient.isConfigured()) {
      return NextResponse.json(
        { error: "PAQ.AR no configurado" },
        { status: 503, headers: cors }
      );
    }

    const { trackingNumbers } = await request.json();

    if (!Array.isArray(trackingNumbers) || trackingNumbers.length === 0) {
      return NextResponse.json(
        { error: "trackingNumbers[] requerido" },
        { status: 400, headers: cors }
      );
    }

    if (trackingNumbers.length > 20) {
      return NextResponse.json(
        { error: "máximo 20 trackings por consulta" },
        { status: 400, headers: cors }
      );
    }

    const tracking = await paqarClient.getTracking(trackingNumbers);

    return NextResponse.json({ ok: true, tracking }, { headers: cors });
  } catch (err) {
    console.error("[paqar/tracking]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "error" },
      { status: 500, headers: cors }
    );
  }
}
