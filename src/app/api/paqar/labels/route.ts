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

    const { trackingNumbers, labelFormat } = await request.json();

    if (!Array.isArray(trackingNumbers) || trackingNumbers.length === 0) {
      return NextResponse.json(
        { error: "trackingNumbers[] requerido" },
        { status: 400 }
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

    return NextResponse.json({ ok: true, labels });
  } catch (err) {
    console.error("[paqar/labels]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "error" },
      { status: 500 }
    );
  }
}
