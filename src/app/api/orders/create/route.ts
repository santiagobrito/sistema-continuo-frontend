/**
 * POST /api/orders/create
 *
 * Creates a WooCommerce order for non-MercadoPago payment methods
 * (transferencia bancaria, efectivo en local).
 * Returns order ID for confirmation page.
 */

import { NextRequest, NextResponse } from "next/server";
import { markCartRecovered, subscribeNewsletter } from "@/lib/brevo/client";

const WP_URL = process.env.WP_URL || process.env.NEXT_PUBLIC_WP_URL || "";
const WC_API_AUTH = process.env.WC_API_AUTH || "";

interface OrderBody {
  items: { product_id: number; variation_id?: number; name: string; quantity: number; price: number }[];
  billing: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    address_1?: string;
    city?: string;
    state?: string;
    postcode?: string;
  };
  shipping_method?: string;
  shipping_cost?: number;
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

    const orderData: Record<string, unknown> = {
      status: body.payment_method === "efectivo" ? "on-hold" : "on-hold",
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
      ],
    };

    if (body.shipping_method && body.shipping_cost !== undefined) {
      orderData.shipping_lines = [
        {
          method_id: body.shipping_method,
          method_title: body.shipping_method === "local_pickup" ? "Retiro en local" : "Envio",
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
