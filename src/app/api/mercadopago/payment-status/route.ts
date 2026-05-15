import { safeEqual } from "@/lib/auth/timing-safe";
/**
 * GET /api/mercadopago/payment-status?orderId=<id>
 *
 * Devuelve el status del pago MP más relevante asociado a una orden WC.
 * Usado por el recovery cron del plugin para detectar webhooks perdidos:
 * si MP reporta `approved` pero la orden sigue pending, mover a processing.
 *
 * Auth: header `x-internal-secret`.
 *
 * Lógica de status:
 *  - approved   → si CUALQUIER pago de la orden está approved.
 *  - in_process → si hay alguno in_process y ninguno approved.
 *  - pending    → si hay alguno pending y ninguno superior.
 *  - rejected   → si todos están rejected.
 *  - null       → si no hay pagos asociados.
 */

import { NextRequest, NextResponse } from "next/server";

const MP_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || "";
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || "";

interface MpPaymentLite {
  id: number;
  status: string;
  status_detail?: string;
  external_reference?: string;
  date_created?: string;
}

const PRIORITY: Record<string, number> = {
  approved: 5,
  authorized: 4,
  in_process: 3,
  pending: 2,
  rejected: 1,
  cancelled: 0,
  refunded: 0,
};

export async function GET(request: NextRequest) {
  const auth = request.headers.get("x-internal-secret");
  if (!safeEqual(auth, INTERNAL_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const orderId = request.nextUrl.searchParams.get("orderId");
  if (!orderId) {
    return NextResponse.json({ error: "orderId required" }, { status: 400 });
  }
  if (!MP_TOKEN) {
    return NextResponse.json({ error: "mp_token_missing" }, { status: 500 });
  }

  try {
    const r = await fetch(
      `https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(orderId)}&limit=20`,
      { headers: { Authorization: `Bearer ${MP_TOKEN}` }, cache: "no-store" }
    );
    if (!r.ok) {
      return NextResponse.json({ error: `mp_${r.status}` }, { status: 502 });
    }
    const body = await r.json();
    const results: MpPaymentLite[] = Array.isArray(body?.results) ? body.results : [];
    if (results.length === 0) {
      return NextResponse.json({ status: null, payments: 0 });
    }

    let best = results[0];
    for (const p of results) {
      if ((PRIORITY[p.status] ?? 0) > (PRIORITY[best.status] ?? 0)) best = p;
    }

    return NextResponse.json({
      status: best.status,
      paymentId: best.id,
      detail: best.status_detail,
      payments: results.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
