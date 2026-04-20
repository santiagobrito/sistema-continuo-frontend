/**
 * POST /api/paqar/cancel
 *
 * Cancela una o más órdenes PAQ.AR (preimposiciones).
 * Se llama cuando el admin cancela una WC order antes de despachar.
 *
 * Body: { trackingNumbers: string[] }
 *
 * Seguridad: header x-internal-secret.
 */

import { NextRequest, NextResponse } from "next/server";
import { paqarClient } from "@/lib/paqar/client";

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || "";

export async function POST(request: NextRequest) {
  if (request.headers.get("x-internal-secret") !== INTERNAL_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

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

    const results = await Promise.allSettled(
      trackingNumbers.map((tn: string) => paqarClient.cancelOrder(tn))
    );

    const detail = results.map((r, i) => ({
      trackingNumber: trackingNumbers[i],
      ok: r.status === "fulfilled",
      message: r.status === "fulfilled" ? r.value.mensaje : (r.reason as Error).message,
    }));

    return NextResponse.json({ ok: true, detail });
  } catch (err) {
    console.error("[paqar/cancel]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "error" },
      { status: 500 }
    );
  }
}
