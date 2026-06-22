/**
 * POST /api/mercadopago/process-payment
 *
 * Flujo Bricks inline (flag NEXT_PUBLIC_MP_INLINE). El Payment Brick tokeniza la
 * tarjeta en el cliente y nos manda { orderId, token, payment_method_id,
 * installments, issuer_id, payer }. Acá cobramos server-side vía /v1/payments.
 *
 * Seguridad:
 *  - El `transaction_amount` se RE-LEE del total de la orden en WC, nunca del
 *    cliente. Así nadie puede pagar $1 una orden de $100.000.
 *  - Solo se cobra sobre órdenes en estado `pending`/`checkout-draft`. Si la
 *    orden ya está paga/processing, se rechaza (evita doble cobro).
 *
 * La transición de estado de la orden (pending → processing, disparo PAQ.AR,
 * notas) la hace el WEBHOOK de MP igual que en el flujo redirect: pasamos
 * notification_url al crear el pago. Acá solo devolvemos el status al cliente
 * para que /pedido-confirmado muestre el resultado.
 */

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createPayment } from "@/lib/mercadopago/sdk";

const WP_URL = process.env.WP_URL || process.env.NEXT_PUBLIC_WP_URL || "";
const WC_API_AUTH = process.env.WC_API_AUTH || "";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "";
const MP_WEBHOOK_URL = SITE_URL ? `${SITE_URL}/api/mercadopago/webhook` : "";

// Estados de orden sobre los que es válido cobrar. WC degrada órdenes creadas
// vía REST a `checkout-draft`; el flujo redirect ya las trata como pending.
const PAYABLE_STATUSES = new Set(["pending", "checkout-draft"]);

interface ProcessPaymentBody {
  orderId: number | string;
  token: string;
  payment_method_id: string;
  installments: number;
  issuer_id?: string | number;
  payer?: {
    email?: string;
    identification?: { type?: string; number?: string };
  };
}

interface WcOrderForPayment {
  id: number;
  number: string;
  status: string;
  total: string;
  billing?: { email?: string };
}

export async function POST(request: NextRequest) {
  try {
    const body: ProcessPaymentBody = await request.json();

    if (!body.orderId || !body.token || !body.payment_method_id) {
      return NextResponse.json({ error: "Faltan datos del pago" }, { status: 400 });
    }

    // 1. Leer la orden de WC para obtener el monto autoritativo + validar estado.
    const orderRes = await fetch(`${WP_URL}/wp-json/wc/v3/orders/${body.orderId}`, {
      headers: { Authorization: `Basic ${WC_API_AUTH}` },
      cache: "no-store",
    });
    if (!orderRes.ok) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }
    const order: WcOrderForPayment = await orderRes.json();

    if (!PAYABLE_STATUSES.has(order.status)) {
      // Ya está paga / cancelada / en proceso → no recobrar.
      return NextResponse.json(
        { error: `La orden ya no admite pago (estado: ${order.status})`, orderStatus: order.status },
        { status: 409 }
      );
    }

    const amount = Math.round(parseFloat(order.total));
    if (!(amount > 0)) {
      return NextResponse.json({ error: "Monto de orden inválido" }, { status: 400 });
    }

    const payerEmail = body.payer?.email || order.billing?.email || "";
    if (!payerEmail) {
      return NextResponse.json({ error: "Falta email del pagador" }, { status: 400 });
    }

    // 2. Idempotency key determinístico: orden + monto + método. Si el cliente
    //    reintenta el mismo pago, MP devuelve el mismo resultado en vez de cobrar
    //    dos veces. El token cambia por intento, pero la clave la fijamos nosotros.
    const idempotencyKey = createHash("sha256")
      .update(`sc-pay|${order.id}|${amount}|${body.payment_method_id}|${body.installments}`)
      .digest("hex");

    // 3. Cobrar. transaction_amount = total de la orden (server-side, no del cliente).
    const payment = await createPayment(
      {
        transaction_amount: amount,
        token: body.token,
        description: `Sistema Continuo — Orden #${order.number}`,
        installments: Number(body.installments) || 1,
        payment_method_id: body.payment_method_id,
        issuer_id: body.issuer_id,
        external_reference: String(order.id),
        notification_url: MP_WEBHOOK_URL || undefined,
        payer: {
          email: payerEmail,
          identification: body.payer?.identification,
        },
      },
      idempotencyKey
    );

    // La actualización de la orden la hace el webhook (notification_url). Acá solo
    // reportamos el resultado para el redirect del cliente a /pedido-confirmado.
    return NextResponse.json({
      paymentId: payment.id,
      status: payment.status,             // approved | in_process | rejected | ...
      statusDetail: payment.status_detail,
      orderId: order.id,
      orderNumber: order.number,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("[process-payment] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
