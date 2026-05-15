import { safeEqual } from "@/lib/auth/timing-safe";
/**
 * POST /api/mercadopago/regenerate-preference
 *
 * Regenera la preference MP de una orden WC pending existente. Usado por el
 * recovery cron del plugin WP para mandar al cliente un link nuevo cuando
 * abandonó el flujo de pago original.
 *
 * Auth: header `x-internal-secret` (mismo patrón que /api/paqar/create-orders).
 *
 * NO crea órdenes nuevas — la orden debe existir y estar en pending.
 */

import { NextRequest, NextResponse } from "next/server";
import { createPreference } from "@/lib/mercadopago/sdk";

const WP_URL = process.env.WP_URL || process.env.NEXT_PUBLIC_WP_URL || "";
const WC_API_AUTH = process.env.WC_API_AUTH || "";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "";
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || "";

const MP_WEBHOOK_URL = SITE_URL ? `${SITE_URL}/api/mercadopago/webhook` : "";

interface WcOrder {
  id: number;
  status: string;
  payment_method: string;
  line_items: Array<{ name: string; quantity: number; price: string | number }>;
  shipping_lines?: Array<{ total: string | number; method_id: string }>;
  billing: { first_name?: string; last_name?: string; email?: string; phone?: string };
}

export async function POST(request: NextRequest) {
  const auth = request.headers.get("x-internal-secret");
  if (!safeEqual(auth, INTERNAL_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const orderId = Number(body.orderId);
    if (!orderId || Number.isNaN(orderId)) {
      return NextResponse.json({ error: "orderId required" }, { status: 400 });
    }

    const r = await fetch(`${WP_URL}/wp-json/wc/v3/orders/${orderId}`, {
      headers: { Authorization: `Basic ${WC_API_AUTH}` },
      cache: "no-store",
    });
    if (!r.ok) {
      return NextResponse.json({ error: `wc fetch ${r.status}` }, { status: 502 });
    }
    const order: WcOrder = await r.json();

    if (order.status !== "pending") {
      return NextResponse.json({ error: `order_status=${order.status}` }, { status: 409 });
    }
    if (order.payment_method !== "mercadopago") {
      return NextResponse.json({ error: `payment_method=${order.payment_method}` }, { status: 400 });
    }

    // Reconstruir items + envío como hace /create-preference.
    const items = order.line_items.map((li) => ({
      title: String(li.name).slice(0, 255),
      quantity: Number(li.quantity),
      unit_price: Math.round(Number(li.price)),
      currency_id: "ARS",
    }));
    if (Array.isArray(order.shipping_lines)) {
      for (const sl of order.shipping_lines) {
        const shipTotal = Number(sl.total) || 0;
        if (shipTotal > 0) {
          items.push({
            title: "Envio",
            quantity: 1,
            unit_price: Math.round(shipTotal),
            currency_id: "ARS",
          });
        }
      }
    }

    const billing = order.billing || {};
    const preference = await createPreference({
      items,
      payer: {
        name: `${billing.first_name || ""} ${billing.last_name || ""}`.trim(),
        email: billing.email,
        phone: billing.phone ? { number: billing.phone } : undefined,
      },
      external_reference: String(order.id),
      back_urls: {
        success: `${SITE_URL}/pedido-confirmado?order=${order.id}&status=approved&email=${encodeURIComponent(billing.email || "")}`,
        failure: `${SITE_URL}/checkout?order=${order.id}&status=rejected`,
        pending: `${SITE_URL}/pedido-confirmado?order=${order.id}&status=pending&email=${encodeURIComponent(billing.email || "")}`,
      },
      notification_url: MP_WEBHOOK_URL || undefined,
    });

    // Guardar preference_id como meta de la orden (best-effort).
    fetch(`${WP_URL}/wp-json/wc/v3/orders/${orderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${WC_API_AUTH}` },
      body: JSON.stringify({
        meta_data: [{ key: "_mp_preference_id", value: preference.id }],
      }),
    }).catch(() => {});

    return NextResponse.json({
      orderId: order.id,
      preferenceId: preference.id,
      initPoint: preference.init_point,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
