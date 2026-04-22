/**
 * POST /api/orders/create
 *
 * Creates a WooCommerce order for non-MercadoPago payment methods
 * (transferencia bancaria, efectivo en local).
 * Returns order ID for confirmation page.
 */

import { NextRequest, NextResponse } from "next/server";
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

interface OrderBody {
  items: { product_id: number; variation_id?: number; name: string; quantity: number; price: number }[];
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
  payment_method: "transferencia" | "efectivo";
  gclid?: string;
  coupon_code?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: OrderBody = await request.json();

    if (!body.items?.length) {
      return NextResponse.json({ error: "No hay productos" }, { status: 400 });
    }
    if (!body.billing?.email || !body.billing?.first_name) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const paymentTitles: Record<string, string> = {
      transferencia: "Transferencia Bancaria",
      efectivo: "Efectivo en Local",
    };

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

    const orderData: Record<string, unknown> = {
      status: body.payment_method === "efectivo" ? "on-hold" : "on-hold",
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
      line_items: body.items.map((item) => ({
        product_id: item.product_id,
        variation_id: item.variation_id || undefined,
        quantity: item.quantity,
      })),
      payment_method: body.payment_method,
      payment_method_title: paymentTitles[body.payment_method] || body.payment_method,
      set_paid: false,
      coupon_lines: body.coupon_code ? [{ code: body.coupon_code }] : [],
      meta_data: [
        ...(body.gclid ? [{ key: "_gclid", value: body.gclid }] : []),
        ...(body.paqar_agency_id ? [{ key: "_sc_paqar_agency_id", value: body.paqar_agency_id }] : []),
        ...(body.shipping_method ? [{ key: "_sc_shipping_method_id", value: body.shipping_method }] : []),
        ...(body.billing.dni_cuit ? [{ key: "_dni_cuit", value: body.billing.dni_cuit }] : []),
      ],
    };

    if (body.shipping_method && body.shipping_cost !== undefined) {
      orderData.shipping_lines = [
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

    // Sincronizar datos al perfil del customer (para auto-fill en próximas compras)
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

    // Auto-subscribe + mark cart recovered
    markCartRecovered(body.billing.email).catch(() => {});
    subscribeNewsletter(body.billing.email, `${body.billing.first_name} ${body.billing.last_name}`).catch(() => {});

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.number || String(order.id),
      paymentMethod: body.payment_method,
      total: order.total,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("Order create error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
