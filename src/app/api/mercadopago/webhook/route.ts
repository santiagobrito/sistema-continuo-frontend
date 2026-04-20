/**
 * POST /api/mercadopago/webhook
 *
 * MercadoPago IPN webhook. Actualiza estado WC y, si el pago fue aprobado
 * y el método de envío es Correo Argentino, dispara la creación de N órdenes
 * en PAQ.AR vía /api/paqar/create-orders.
 *
 * Flujo para Correo:
 *   1. MP notifica pago aprobado → WC order pasa a "processing".
 *   2. Leemos la order para ver meta _sc_shipping_method_id y _sc_paqar_agency_id.
 *   3. Si es correo_domicilio o correo_sucursal, POST a /api/paqar/create-orders
 *      que crea N órdenes en Correo y guarda los trackingNumbers en WC meta.
 *
 * Idempotencia: /api/paqar/create-orders podría disparse dos veces si MP reenvía.
 * Futura mejora: chequear meta `_sc_paqar_created_at` antes de crear.
 */

import { NextRequest, NextResponse } from "next/server";
import { getPayment } from "@/lib/mercadopago/sdk";

const WP_URL = process.env.WP_URL || process.env.NEXT_PUBLIC_WP_URL || "";
const WC_API_AUTH = process.env.WC_API_AUTH || "";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "";
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || "";

async function updateOrderStatus(orderId: string, status: string, transactionId?: string) {
  const body: Record<string, unknown> = { status };
  if (transactionId) {
    body.transaction_id = transactionId;
    body.meta_data = [{ key: "_mp_payment_id", value: transactionId }];
  }

  await fetch(`${WP_URL}/wp-json/wc/v3/orders/${orderId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${WC_API_AUTH}`,
    },
    body: JSON.stringify(body),
  });
}

interface WcOrderMeta {
  id: number;
  meta_data?: Array<{ key: string; value: string }>;
}

async function getOrderMeta(orderId: string): Promise<WcOrderMeta | null> {
  const r = await fetch(`${WP_URL}/wp-json/wc/v3/orders/${orderId}`, {
    headers: { Authorization: `Basic ${WC_API_AUTH}` },
    cache: "no-store",
  });
  if (!r.ok) return null;
  return r.json();
}

function readMeta(meta: WcOrderMeta | null, key: string): string | undefined {
  return meta?.meta_data?.find((m) => m.key === key)?.value;
}

async function triggerPaqarCreate(orderId: string, shippingMethod: string, agencyId?: string) {
  if (!SITE_URL || !INTERNAL_SECRET) {
    console.warn("[MP webhook] Falta SITE_URL o INTERNAL_API_SECRET — skip PAQ.AR create");
    return;
  }

  const deliveryType = shippingMethod === "correo_sucursal" ? "agency" : "homeDelivery";

  try {
    const res = await fetch(`${SITE_URL}/api/paqar/create-orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": INTERNAL_SECRET,
      },
      body: JSON.stringify({ orderId: Number(orderId), deliveryType, agencyId }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error(`[MP webhook] PAQ.AR create fail ${res.status}:`, data);
    } else {
      console.log(`[MP webhook] PAQ.AR ok, ${data.bundles} bultos`, data.trackings);
    }
  } catch (err) {
    console.error("[MP webhook] PAQ.AR create error:", err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.type === "payment" && body.data?.id) {
      const payment = await getPayment(String(body.data.id));
      const orderId = payment.external_reference;

      if (!orderId) return NextResponse.json({ ok: true });

      switch (payment.status) {
        case "approved":
          await updateOrderStatus(orderId, "processing", String(payment.id));
          {
            const meta = await getOrderMeta(orderId);
            const shippingMethod = readMeta(meta, "_sc_shipping_method_id");
            const agencyId = readMeta(meta, "_sc_paqar_agency_id");
            const alreadyCreated = readMeta(meta, "_sc_paqar_created_at");
            if (
              !alreadyCreated &&
              shippingMethod &&
              (shippingMethod === "correo_domicilio" || shippingMethod === "correo_sucursal")
            ) {
              triggerPaqarCreate(orderId, shippingMethod, agencyId).catch(() => {});
            }
          }
          break;
        case "rejected":
          await updateOrderStatus(orderId, "failed", String(payment.id));
          break;
        case "pending":
        case "in_process":
          await updateOrderStatus(orderId, "on-hold", String(payment.id));
          break;
        case "refunded":
          await updateOrderStatus(orderId, "refunded", String(payment.id));
          break;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("MP webhook error:", err);
    return NextResponse.json({ ok: true }); // Always 200 to avoid MP retries
  }
}
