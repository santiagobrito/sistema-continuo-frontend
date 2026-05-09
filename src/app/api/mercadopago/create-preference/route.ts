/**
 * POST /api/mercadopago/create-preference
 *
 * Creates a WooCommerce order (pending) and a MercadoPago preference.
 * Returns the preference init_point URL for redirect checkout.
 */

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createPreference } from "@/lib/mercadopago/sdk";
import { markCartRecovered, subscribeNewsletter } from "@/lib/brevo/client";
import { getSession } from "@/lib/auth/session";
import { getCustomerByEmail, createCustomer, syncCustomerFromCheckout } from "@/lib/auth/wc-api";
import {
  attributionToOrderMeta,
  type OrderAttributionInput,
} from "@/lib/wordpress/order-attribution";

/**
 * Lock atómico via WP transient (Redis backend) para evitar race condition.
 * Intenta adquirir el lock; si está tomado, reintenta cada 200ms hasta 3s.
 * Devuelve null si el lock se adquirió (caller debe liberar al final),
 * o un Response con 409 para devolver al cliente.
 */
async function acquireCheckoutLock(key: string, maxRetries = 15): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const lockUrl = `${WP_URL}/wp-json/sistema-continuo/v1/checkout-lock`;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const r = await fetch(lockUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, ttl: 30 }),
        cache: "no-store",
      });
      if (r.ok) {
        const j = await r.json();
        if (j.acquired) return { ok: true };
      }
    } catch (err) {
      console.warn("[checkout-lock] error, continuando sin lock:", err);
      // Fallback: si el lock endpoint falla (ej. WP caído), no bloqueamos checkout.
      // El dedup por hash sigue funcionando aunque haya race posible.
      return { ok: true };
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  // No pudimos adquirir el lock en 3s — otro request del mismo cliente está en curso.
  return {
    ok: false,
    response: NextResponse.json(
      { error: "Procesando otra solicitud, por favor esperá un momento e intentá de nuevo" },
      { status: 409 }
    ),
  };
}

async function releaseCheckoutLock(key: string): Promise<void> {
  try {
    await fetch(`${WP_URL}/wp-json/sistema-continuo/v1/checkout-lock?key=${encodeURIComponent(key)}`, {
      method: "DELETE",
    });
  } catch {
    // No-op — el lock expira solo en 30s.
  }
}

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
    // variation_id puede venir undefined / null / 0. Normalizamos siempre a 0.
    // Antes el hash difería entre {variation_id: undefined} y {variation_id: 0} aunque eran lo mismo.
    .map((i) => `${i.product_id}:${Number(i.variation_id) || 0}:${i.quantity}:${Math.round(i.price)}`)
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
  date_created: string;       // hora local del site, SIN marcador de zona ("2026-04-27T10:22:11")
  date_created_gmt: string;   // UTC, también sin Z pero realmente es UTC — usar este para cálculos.
  total: string;
  payment_method: string;
  line_items: Array<{ product_id: number; variation_id: number; quantity: number; price: string }>;
  shipping_lines?: Array<{ method_id: string; total: string }>;
  coupon_lines?: Array<{ code: string }>;
  meta_data?: Array<{ key: string; value: string }>;
}

function hashFromExistingOrder(order: WcOrderMin): string {
  const items = (order.line_items || [])
    // Misma normalización que computeCartHash — variation_id puede ser null/undefined/0/string.
    .map((i) => `${i.product_id}:${Number(i.variation_id) || 0}:${i.quantity}:${Math.round(parseFloat(String(i.price)))}`)
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
  customerId?: number
): Promise<WcOrderMin | null> {
  const WINDOW_LONG_MS = 96 * 60 * 60 * 1000;
  // WC degrada órdenes creadas vía REST a `checkout-draft` cuando vienen sin
  // marcadores Blocks Checkout. Si el dedup solo busca `pending`, las drafts
  // quedan invisibles y cada retry crea una nueva orden — bug 2026-04-28
  // (#14904-14911, 8 drafts del mismo cliente en 2min).
  const params = new URLSearchParams({
    per_page: "10",
    orderby: "date",
    order: "desc",
    after: new Date(Date.now() - WINDOW_LONG_MS).toISOString(),
  });
  params.append("status[]", "pending");
  params.append("status[]", "checkout-draft");
  if (customerId) {
    params.set("customer", String(customerId));
  } else {
    params.set("billing_email", body.billing.email);
  }
  // Nota: WC ignora `billing_email` como filtro en /wc/v3/orders (verificado
  // 2026-05-02 con #15028/15029). Si caemos a esa rama, devuelve TODAS las
  // pendings sin filtrar y la dedup se vuelve a ciegas. Por eso los logs de
  // abajo registran el modo de filtro real.
  const filterMode = customerId ? `customer=${customerId}` : `email=${body.billing.email}(unfiltered)`;

  let r: Response;
  try {
    r = await fetch(`${WP_URL}/wp-json/wc/v3/orders?${params}`, {
      headers: { Authorization: `Basic ${WC_API_AUTH}` },
      cache: "no-store",
    });
  } catch (e) {
    console.warn("[dedup] WC fetch threw — creando nueva orden", { filterMode, err: String(e) });
    return null;
  }
  if (!r.ok) {
    console.warn("[dedup] WC fetch !ok — creando nueva orden", { filterMode, status: r.status });
    return null;
  }
  const orders: WcOrderMin[] = await r.json();
  if (!Array.isArray(orders) || orders.length === 0) {
    console.log("[dedup] sin candidatos pending", { filterMode });
    return null;
  }

  const targetHash = computeCartHash(body);
  const now = Date.now();
  const SHORT_WINDOW_MS = 2 * 60 * 60 * 1000;
  const considered: Array<{ id: number; reason: string; ageMin?: number }> = [];

  for (const o of orders) {
    if (o.payment_method !== "mercadopago") {
      considered.push({ id: o.id, reason: `pm=${o.payment_method}` });
      continue;
    }
    const oHash = hashFromExistingOrder(o);
    if (oHash !== targetHash) {
      considered.push({ id: o.id, reason: "hash_mismatch" });
      continue;
    }

    // WC devuelve date_created en hora local del site (sin "Z"); para no caer en
    // bug de zona horaria usar date_created_gmt + "Z" para forzar parseo UTC.
    const dateStr = o.date_created_gmt
      ? `${o.date_created_gmt}Z`
      : o.date_created;
    const ageMs = now - new Date(dateStr).getTime();
    const ageMin = Math.round(ageMs / 60000);
    const paymentType = getMeta(o, "_mp_payment_type");
    const mpStatus = getMeta(o, "_mp_status");
    const isOfflineLive =
      ["ticket", "atm", "bank_transfer"].includes(paymentType || "") &&
      ["pending", "in_process"].includes(mpStatus || "");

    // Reutilizar si: dentro de 2h, o si hay pago offline vivo dentro de 96h.
    if (ageMs <= SHORT_WINDOW_MS) {
      console.log("[dedup] HIT — reusando orden", { filterMode, orderId: o.id, ageMin });
      return o;
    }
    if (isOfflineLive && ageMs <= WINDOW_LONG_MS) {
      console.log("[dedup] HIT offline — reusando orden", { filterMode, orderId: o.id, ageMin });
      return o;
    }
    considered.push({ id: o.id, reason: "out_of_window", ageMin });
  }
  console.log("[dedup] MISS — creando nueva orden", { filterMode, candidates: orders.length, targetHash, considered });
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
    // Defensa en profundidad: el frontend ya valida estos campos en el botón disabled,
    // pero alguien podría POSTear directo a este endpoint. Sin estos datos no podemos
    // facturar ni despachar. Pedido #14676 (2026-04-24) llegó sin address_1 ni postcode
    // porque la validación del frontend solo cubría método de envío.
    const b = body.billing || ({} as CheckoutBody["billing"]);
    const requiredAlways: Array<keyof CheckoutBody["billing"]> = ["first_name", "last_name", "email", "phone", "dni_cuit", "city", "state"];
    const missing: string[] = requiredAlways.filter((k) => !String(b[k] || "").trim());
    // address_1 y postcode SIEMPRE requeridos para facturación AFIP, sin
    // importar el método de envío (incluyendo correo_sucursal y local_pickup).
    // El destino del envío puede ser sucursal o local, pero los datos de
    // facturación son del comprador.
    if (!String(b.address_1 || "").trim()) missing.push("address_1");
    if (!String(b.postcode || "").trim()) missing.push("postcode");
    if (missing.length > 0) {
      return NextResponse.json(
        { error: "Faltan datos requeridos", missing },
        { status: 400 }
      );
    }

    // Lock atómico: previene race condition cuando el cliente apreta "Pagar" dos veces
    // o mandan dos requests simultáneas. La key es sha256(email + cart_hash) — única por
    // intento de checkout. El lock dura 30s, suficiente para que la primera request termine.
    const cartHash = computeCartHash(body);
    const lockKey = createHash("sha256")
      .update(`${body.billing.email.toLowerCase()}|${cartHash}`)
      .digest("hex")
      .slice(0, 32);
    const lockResult = await acquireCheckoutLock(lockKey);
    if (!lockResult.ok) {
      return lockResult.response;
    }

    try {
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
    let order: { id: number; number: string };
    let reused = false;
    const reusable = await findReusablePendingOrder(body, customerId);
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
    });
    } finally {
      // Liberar el lock haya éxito o no — si falla, expira solo en 30s.
      releaseCheckoutLock(lockKey).catch(() => {});
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("Checkout error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
