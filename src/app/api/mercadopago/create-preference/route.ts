/**
 * POST /api/mercadopago/create-preference
 *
 * Creates a WooCommerce order (pending) and a MercadoPago preference.
 * Returns the preference init_point URL for redirect checkout.
 */

import { NextRequest, NextResponse } from "next/server";
import { createPreference } from "@/lib/mercadopago/sdk";
import { markCartRecovered, subscribeNewsletter } from "@/lib/brevo/client";
import { getSession } from "@/lib/auth/session";
import { getCustomerByEmail, createCustomer, syncCustomerFromCheckout } from "@/lib/auth/wc-api";
import {
  attributionToOrderMeta,
  type OrderAttributionInput,
} from "@/lib/wordpress/order-attribution";

const WP_URL = process.env.WP_URL || process.env.NEXT_PUBLIC_WP_URL || "";
const WC_API_AUTH = process.env.WC_API_AUTH || "";

function shippingMethodTitle(method: string | undefined): string {
  switch (method) {
    case "local_pickup":       return "Retiro en local";
    case "correo_domicilio":   return "Correo Argentino a domicilio";
    case "correo_sucursal":    return "Correo Argentino a sucursal";
    case "moto_caba":          return "Moto CABA";
    case "moto_gba1":          return "Moto GBA Zona 1";
    case "moto_gba2":          return "Moto GBA Zona 2";
    case "transporte":         return "Transporte al interior";
    default:                   return "Envío";
  }
}
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "";
const MP_WEBHOOK_URL = process.env.NEXT_PUBLIC_SITE_URL
  ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/mercadopago/webhook`
  : "";

interface CheckoutItem {
  product_id: number;
  variation_id?: number;
  name: string;
  quantity: number;
  price: number;
  image?: string;
}

interface CheckoutBody {
  items: CheckoutItem[];
  billing: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    dni_cuit?: string;
    address_1?: string;
    city?: string;
    state?: string;
    postcode?: string;
  };
  shipping_method?: string;
  shipping_cost?: number;
  paqar_agency_id?: string;
  gclid?: string;
  coupon_code?: string;
  attribution?: OrderAttributionInput;
}

/**
 * Hash determinístico del carrito + envío + cupón.
 * Si el hash coincide con el de una orden pending reciente del mismo email,
 * podemos reutilizarla en lugar de crear una orden duplicada.
 *
 * No incluye datos del billing porque pueden haber cambiado entre intentos
 * (ej. el usuario corrigió un dato y reintentó).
 */
function computeCartHash(body: CheckoutBody): string {
  const items = [...body.items]
    .map((i) => `${i.product_id}:${i.variation_id || 0}:${i.quantity}:${Math.round(i.price)}`)
    .sort()
    .join("|");
  const ship = `${body.shipping_method || ""}:${body.shipping_cost || 0}`;
  const coupon = body.coupon_code || "";
  return `${items}::${ship}::${coupon}`;
}

interface WcOrderMin {
  id: number;
  number: string;
  status: string;
  date_created: string;
  total: string;
  payment_method: string;
  line_items: Array<{ product_id: number; variation_id: number; quantity: number; price: string }>;
  shipping_lines?: Array<{ method_id: string; total: string }>;
  coupon_lines?: Array<{ code: string }>;
  meta_data?: Array<{ key: string; value: string }>;
}

function hashFromExistingOrder(order: WcOrderMin): string {
  const items = (order.line_items || [])
    .map((i) => `${i.product_id}:${i.variation_id || 0}:${i.quantity}:${Math.round(parseFloat(String(i.price)))}`)
    .sort()
    .join("|");
  const ship = order.shipping_lines?.[0]
    ? `${order.shipping_lines[0].method_id}:${Math.round(parseFloat(order.shipping_lines[0].total))}`
    : ":0";
  const coupon = order.coupon_lines?.[0]?.code || "";
  return `${items}::${ship}::${coupon}`;
}

function getMeta(order: WcOrderMin, key: string): string | undefined {
  return order.meta_data?.find((m) => m.key === key)?.value;
}

interface DedupDebug {
  customerId?: number;
  targetHash: string;
  candidates: Array<{ id: number; hash: string; match: boolean; payment_method: string; date: string }>;
  reason?: string;
}

/**
 * Busca una orden pending reciente del mismo customer/email cuyos items+envío+cupón
 * coincidan exactamente con el carrito actual. Si existe → reutilizable.
 *
 * Esto evita el patrón observado en producción (2026-04-27): cliente cierra el modal MP,
 * reintenta, y el frontend crea otra orden #X+1 idéntica. Resultado: 2-3 pendings huérfanos
 * por conversión real.
 *
 * Ventana de búsqueda:
 *  - Default 2h (reintento rápido del mismo flujo).
 *  - 96h si la orden tiene un pago MP offline vivo (ticket/atm/bank_transfer): el cliente
 *    pudo recibir un cupón Rapipago/Pago Fácil que vence en 1-3 días, y si vuelve a la web
 *    a pagarlo no queremos generar una orden nueva — reusamos la que ya tiene el ticket emitido.
 */
async function findReusablePendingOrder(
  body: CheckoutBody,
  customerId: number | undefined,
  debug?: DedupDebug
): Promise<WcOrderMin | null> {
  const WINDOW_LONG_MS = 96 * 60 * 60 * 1000;
  const params = new URLSearchParams({
    status: "pending",
    per_page: "10",
    orderby: "date",
    order: "desc",
    after: new Date(Date.now() - WINDOW_LONG_MS).toISOString(),
  });
  if (customerId) {
    params.set("customer", String(customerId));
  } else {
    params.set("billing_email", body.billing.email);
  }

  const r = await fetch(`${WP_URL}/wp-json/wc/v3/orders?${params}`, {
    headers: { Authorization: `Basic ${WC_API_AUTH}` },
    cache: "no-store",
  });
  if (!r.ok) {
    if (debug) debug.reason = `WC fetch failed: ${r.status}`;
    return null;
  }
  const orders: WcOrderMin[] = await r.json();
  if (!Array.isArray(orders) || orders.length === 0) {
    if (debug) debug.reason = "no pending orders found";
    return null;
  }

  const targetHash = computeCartHash(body);
  const now = Date.now();
  const SHORT_WINDOW_MS = 2 * 60 * 60 * 1000;

  if (debug) debug.targetHash = targetHash;
  for (const o of orders) {
    const candidateHash = hashFromExistingOrder(o);
    if (debug) {
      debug.candidates.push({
        id: o.id,
        hash: candidateHash,
        match: candidateHash === targetHash,
        payment_method: o.payment_method,
        date: o.date_created,
      });
    }
    if (o.payment_method !== "mercadopago") continue;
    if (candidateHash !== targetHash) continue;

    const ageMs = now - new Date(o.date_created).getTime();
    const paymentType = getMeta(o, "_mp_payment_type");
    const mpStatus = getMeta(o, "_mp_status");
    const isOfflineLive =
      ["ticket", "atm", "bank_transfer"].includes(paymentType || "") &&
      ["pending", "in_process"].includes(mpStatus || "");

    // Reutilizar si: dentro de 2h, o si hay pago offline vivo dentro de 96h.
    if (ageMs <= SHORT_WINDOW_MS) return o;
    if (isOfflineLive && ageMs <= WINDOW_LONG_MS) return o;
  }
  return null;
}

async function createWCOrder(body: CheckoutBody, customerId?: number): Promise<{ id: number; number: string }> {
  const lineItems = body.items.map((item) => ({
    product_id: item.product_id,
    variation_id: item.variation_id || undefined,
    quantity: item.quantity,
  }));

  const orderData: Record<string, unknown> = {
    status: "pending",
    customer_id: customerId || 0,
    billing: {
      first_name: body.billing.first_name,
      last_name: body.billing.last_name,
      email: body.billing.email,
      phone: body.billing.phone,
      address_1: body.billing.address_1 || "",
      city: body.billing.city || "",
      state: body.billing.state || "",
      postcode: body.billing.postcode || "",
      country: "AR",
    },
    shipping: {
      first_name: body.billing.first_name,
      last_name: body.billing.last_name,
      address_1: body.billing.address_1 || "",
      city: body.billing.city || "",
      state: body.billing.state || "",
      postcode: body.billing.postcode || "",
      country: "AR",
    },
    line_items: lineItems,
    payment_method: "mercadopago",
    payment_method_title: "MercadoPago",
    set_paid: false,
    coupon_lines: body.coupon_code ? [{ code: body.coupon_code }] : [],
    meta_data: [
      ...(body.gclid ? [{ key: "_gclid", value: body.gclid }] : []),
      ...(body.paqar_agency_id ? [{ key: "_sc_paqar_agency_id", value: body.paqar_agency_id }] : []),
      ...(body.shipping_method ? [{ key: "_sc_shipping_method_id", value: body.shipping_method }] : []),
      ...(body.billing.dni_cuit ? [{ key: "_dni_cuit", value: body.billing.dni_cuit }] : []),
      ...attributionToOrderMeta(body.attribution),
    ],
  };

  // Add shipping line if applicable
  if (body.shipping_method && body.shipping_cost !== undefined) {
    (orderData as Record<string, unknown>).shipping_lines = [
      {
        method_id: body.shipping_method,
        method_title: shippingMethodTitle(body.shipping_method),
        total: String(body.shipping_cost),
      },
    ];
  }

  const res = await fetch(`${WP_URL}/wp-json/wc/v3/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${WC_API_AUTH}`,
    },
    body: JSON.stringify(orderData),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`WC order error: ${err.slice(0, 200)}`);
  }

  const order = await res.json();
  return { id: order.id, number: order.number || String(order.id) };
}

export async function POST(request: NextRequest) {
  try {
    const body: CheckoutBody = await request.json();

    // Validate
    if (!body.items?.length) {
      return NextResponse.json({ error: "No hay productos" }, { status: 400 });
    }
    if (!body.billing?.email || !body.billing?.first_name) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    // Asociar al customer WC si hay sesión; sino buscar por email; sino crear uno.
    // Política: todo pedido debe quedar asociado a un customer, nada de guest orders.
    let customerId: number | undefined;
    const session = await getSession();
    if (session?.id) {
      customerId = session.id;
    } else if (body.billing?.email) {
      const existing = await getCustomerByEmail(body.billing.email);
      if (existing?.id) {
        customerId = existing.id;
      } else {
        const created = await createCustomer({
          email: body.billing.email,
          first_name: body.billing.first_name,
          last_name: body.billing.last_name,
        });
        if (created?.id) customerId = created.id;
      }
    }

    // 1. Reutilizar pending reciente con mismo carrito (anti-duplicado en reintentos MP).
    //    Si no existe, crear orden nueva.
    const wantDebug = request.nextUrl.searchParams.get("debug") === "1";
    const debug: DedupDebug | undefined = wantDebug
      ? { customerId, targetHash: "", candidates: [] }
      : undefined;
    let order: { id: number; number: string };
    let reused = false;
    const reusable = await findReusablePendingOrder(body, customerId, debug);
    if (reusable) {
      order = { id: reusable.id, number: reusable.number || String(reusable.id) };
      reused = true;
    } else {
      order = await createWCOrder(body, customerId);
    }

    // 1b. Sincronizar datos al perfil del customer (fire-and-forget, no bloquea pago)
    if (customerId) {
      syncCustomerFromCheckout(customerId, {
        first_name: body.billing.first_name,
        last_name: body.billing.last_name,
        email: body.billing.email,
        phone: body.billing.phone,
        dni_cuit: body.billing.dni_cuit,
        address_1: body.billing.address_1,
        city: body.billing.city,
        state: body.billing.state,
        postcode: body.billing.postcode,
      }).catch(() => {});
    }

    // Mark abandoned cart as recovered + auto-subscribe to newsletter
    markCartRecovered(body.billing.email).catch(() => {});
    subscribeNewsletter(body.billing.email, `${body.billing.first_name} ${body.billing.last_name}`).catch(() => {});

    // 2. Create MP preference
    const mpItems = body.items.map((item) => ({
      title: item.name,
      quantity: item.quantity,
      unit_price: Math.round(item.price),
      picture_url: item.image,
    }));

    // Add shipping as item if exists
    if (body.shipping_cost && body.shipping_cost > 0) {
      mpItems.push({
        title: "Envio",
        quantity: 1,
        unit_price: Math.round(body.shipping_cost),
        picture_url: undefined,
      });
    }

    const preference = await createPreference({
      items: mpItems,
      payer: {
        name: `${body.billing.first_name} ${body.billing.last_name}`,
        email: body.billing.email,
        phone: body.billing.phone ? { number: body.billing.phone } : undefined,
      },
      external_reference: String(order.id),
      back_urls: {
        success: `${SITE_URL}/pedido-confirmado?order=${order.id}&status=approved&email=${encodeURIComponent(body.billing.email || "")}`,
        failure: `${SITE_URL}/checkout?order=${order.id}&status=rejected`,
        pending: `${SITE_URL}/pedido-confirmado?order=${order.id}&status=pending&email=${encodeURIComponent(body.billing.email || "")}`,
      },
      notification_url: MP_WEBHOOK_URL || undefined,
    });

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.number,
      preferenceId: preference.id,
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point,
      reused,
      ...(debug ? { debug } : {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("Checkout error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
