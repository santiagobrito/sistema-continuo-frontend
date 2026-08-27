/**
 * POST /api/order-access/[key]/pay-with-mp
 *
 * Cambio de medio de pago: genera un link de MercadoPago para un pedido que se
 * hizo por transferencia y todavía no se pagó.
 *
 * NO se cambia el `payment_method` de la orden. Dos razones: si el cliente abre
 * el link y no paga, la orden seguiría siendo de transferencia y conserva su
 * ventana de 96h (marcarla como MercadoPago la acortaría a 48h); y el webhook
 * resuelve la orden por `external_reference`, no por el método guardado.
 *
 * Costo a tener presente: MercadoPago se lleva ~8,2% (medido ago-2026) y la
 * transferencia no cuesta nada. Este botón existe por decisión de negocio del
 * 27-ago-2026, con ese número sobre la mesa.
 */

import { NextRequest, NextResponse } from "next/server";
import { createPreference } from "@/lib/mercadopago/sdk";

const WP_URL = process.env.WP_URL || process.env.NEXT_PUBLIC_WP_URL || "";
const WC_API_AUTH = process.env.WC_API_AUTH || "";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "";
const MP_WEBHOOK_URL = SITE_URL ? `${SITE_URL}/api/mercadopago/webhook` : "";

const KEY_RE = /^wc_order_[A-Za-z0-9]+$/;

interface WcOrder {
  id: number;
  status: string;
  line_items: Array<{ name: string; quantity: number; price: string | number }>;
  shipping_lines?: Array<{ total: string | number }>;
  billing: { first_name?: string; last_name?: string; email?: string; phone?: string };
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  if (!KEY_RE.test(key)) {
    return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
  }

  try {
    // 1. La key es la capability: se valida contra el plugin antes de tocar nada.
    const access = await fetch(
      `${WP_URL}/wp-json/sistema-continuo/v1/order-access/${key}`,
      { cache: "no-store" },
    );
    if (!access.ok) {
      return NextResponse.json({ error: "No encontramos ese pedido" }, { status: 404 });
    }
    const summary = await access.json();
    if (!summary.awaiting_payment) {
      return NextResponse.json(
        { error: "Este pedido ya no está esperando pago." },
        { status: 409 },
      );
    }

    // 2. Los items salen de la orden real, no de lo que mande el navegador.
    const r = await fetch(`${WP_URL}/wp-json/wc/v3/orders/${summary.id}`, {
      headers: { Authorization: `Basic ${WC_API_AUTH}` },
      cache: "no-store",
    });
    if (!r.ok) {
      return NextResponse.json({ error: `wc fetch ${r.status}` }, { status: 502 });
    }
    const order: WcOrder = await r.json();

    const items = order.line_items.map((li) => ({
      title: String(li.name).slice(0, 255),
      quantity: Number(li.quantity),
      unit_price: Math.round(Number(li.price)),
      currency_id: "ARS",
    }));
    for (const sl of order.shipping_lines || []) {
      const shipTotal = Number(sl.total) || 0;
      if (shipTotal > 0) {
        items.push({ title: "Envio", quantity: 1, unit_price: Math.round(shipTotal), currency_id: "ARS" });
      }
    }

    const billing = order.billing || {};
    // Sin `installments`: es un tope duro de TODAS las cuotas, no solo del plan
    // sin interés (incidente jun-2026, checkout capado a 2 cuotas para todos).
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
        failure: `${SITE_URL}/pedido/${key}?status=rejected`,
        pending: `${SITE_URL}/pedido-confirmado?order=${order.id}&status=pending&email=${encodeURIComponent(billing.email || "")}`,
      },
      notification_url: MP_WEBHOOK_URL || undefined,
    });

    fetch(`${WP_URL}/wp-json/wc/v3/orders/${order.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${WC_API_AUTH}` },
      body: JSON.stringify({ meta_data: [{ key: "_mp_preference_id", value: preference.id }] }),
    }).catch(() => {});

    return NextResponse.json({ initPoint: preference.init_point });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
