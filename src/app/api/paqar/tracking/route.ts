/**
 * POST /api/paqar/tracking
 *
 * Consulta historial de uno o más trackingNumbers.
 * Público (cliente final en /mi-cuenta/pedidos/[id] llama aquí).
 *
 * Body: { trackingNumbers: string[] }
 *
 * Nota: no exponemos headers de auth al frontend. El cliente manda
 * trackingNumbers, el server llama al API interno con la API key.
 */

import { NextRequest, NextResponse } from "next/server";
import { paqarClient } from "@/lib/paqar/client";

export async function POST(request: NextRequest) {
  try {
    if (!paqarClient.isConfigured()) {
      return NextResponse.json(
        { error: "PAQ.AR no configurado" },
        { status: 503 }
      );
    }

    const { trackingNumbers } = await request.json();

    if (!Array.isArray(trackingNumbers) || trackingNumbers.length === 0) {
      return NextResponse.json(
        { error: "trackingNumbers[] requerido" },
        { status: 400 }
      );
    }

    if (trackingNumbers.length > 20) {
      return NextResponse.json(
        { error: "máximo 20 trackings por consulta" },
        { status: 400 }
      );
    }

    const tracking = await paqarClient.getTracking(trackingNumbers);

    return NextResponse.json({ ok: true, tracking });
  } catch (err) {
    console.error("[paqar/tracking]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "error" },
      { status: 500 }
    );
  }
}
