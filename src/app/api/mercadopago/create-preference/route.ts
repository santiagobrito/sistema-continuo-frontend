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

    // 1. Create WC order
    const order = await createWCOrder(body, customerId);

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
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("Checkout error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
