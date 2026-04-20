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
import crypto from "crypto";

const WP_URL = process.env.WP_URL || process.env.NEXT_PUBLIC_WP_URL || "";
const WC_API_AUTH = process.env.WC_API_AUTH || "";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "";
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || "";
const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET || "";

/**
 * Valida la firma HMAC del webhook de MercadoPago.
 *
 * MP manda dos headers:
 *   x-signature: "ts=<timestamp>,v1=<hash_hex>"
 *   x-request-id: <uuid>
 *
 * Template que firma MP (documentado en Checkout Pro → Webhooks):
 *   id:<data.id>;request-id:<x-request-id>;ts:<ts>;
 *
 * HMAC-SHA256(template, MP_WEBHOOK_SECRET).hex() === v1
 *
 * data.id viene del QUERY STRING de la request (MP siempre lo manda ahí para
 * este propósito), caemos al body si no está.
 *
 * Si MP_WEBHOOK_SECRET no está configurado, loguea warning y acepta (útil en
 * dev, pero en prod DEBE estar).
 */
function validateMpSignature(
  request: NextRequest,
  body: { data?: { id?: string | number } }
): { ok: boolean; reason?: string } {
  if (!MP_WEBHOOK_SECRET) {
    console.warn("[MP webhook] MP_WEBHOOK_SECRET no configurado — saltando validación");
    return { ok: true, reason: "no-secret" };
  }

  const xSignature = request.headers.get("x-signature") || "";
  const xRequestId = request.headers.get("x-request-id") || "";
  if (!xSignature || !xRequestId) {
    return { ok: false, reason: "missing-headers" };
  }

  let ts = "";
  let v1 = "";
  for (const part of xSignature.split(",")) {
    const [k, v] = part.split("=").map((s) => s.trim());
    if (k === "ts") ts = v;
    if (k === "v1") v1 = v;
  }
  if (!ts || !v1) return { ok: false, reason: "malformed-signature" };

  const dataId =
    request.nextUrl.searchParams.get("data.id") ||
    (body?.data?.id ? String(body.data.id) : "");

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const expected = crypto
    .createHmac("sha256", MP_WEBHOOK_SECRET)
    .update(manifest)
    .digest("hex");

  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(v1, "hex");
    if (a.length !== b.length) return { ok: false, reason: "length-mismatch" };
    return crypto.timingSafeEqual(a, b)
      ? { ok: true }
      : { ok: false, reason: "hmac-mismatch" };
  } catch {
    return { ok: false, reason: "hex-parse-error" };
  }
}

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

    const sig = validateMpSignature(request, body);
    if (!sig.ok) {
      console.warn(`[MP webhook] firma inválida (${sig.reason})`);
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }

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
