/**
 * POST /api/mercadopago/webhook
 *
 * MercadoPago IPN webhook. Updates WooCommerce order status.
 */

import { NextRequest, NextResponse } from "next/server";
import { getPayment } from "@/lib/mercadopago/sdk";

const WP_URL = process.env.WP_URL || process.env.NEXT_PUBLIC_WP_URL || "";
const WC_API_AUTH = process.env.WC_API_AUTH || "";

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
