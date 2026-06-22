/**
 * MercadoPago server-side SDK
 */

const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || "";
const MP_BASE_URL = "https://api.mercadopago.com";

export interface MPPreferenceItem {
  title: string;
  quantity: number;
  unit_price: number;
  currency_id?: string;
  picture_url?: string;
}

export interface MPPreference {
  id: string;
  init_point: string;
  sandbox_init_point: string;
}

export async function createPreference(options: {
  items: MPPreferenceItem[];
  payer?: { name?: string; email?: string; phone?: { number?: string } };
  external_reference: string;
  back_urls: { success: string; failure: string; pending: string };
  notification_url?: string;
  auto_return?: "approved" | "all";
  statement_descriptor?: string;
  /**
   * Si se pasa, MP solo ofrece hasta este número de cuotas para este carrito.
   * Combinado con el plan "Cuotas sin interés" activado en panel MP a nivel cuenta,
   * permite ofrecer N cuotas sin interés solo cuando los items del carrito lo permiten.
   * Ej: installments=3 + plan 3 SI activado → "3 cuotas sin interés" disponible.
   * Si NO se quiere ofrecer cuotas SI para este carrito, pasar el N - 1 del plan global
   * (ej. si plan global = 3 SI, pasar installments=2 → no aparece la promo, máx 2 cuotas).
   */
  installments?: number;
}): Promise<MPPreference> {
  const res = await fetch(`${MP_BASE_URL}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...options,
      items: options.items.map((item) => ({
        ...item,
        currency_id: item.currency_id || "ARS",
      })),
      auto_return: options.auto_return || "approved",
      statement_descriptor: options.statement_descriptor || "SISTEMA CONTINUO",
      // payment_methods.installments limita el máximo de cuotas ofrecidas.
      // Si está activado el plan "Cuotas sin interés" en panel MP, MP las ofrece
      // automáticamente para los carritos donde installments >= N del plan.
      ...(options.installments && options.installments > 0
        ? { payment_methods: { installments: options.installments } }
        : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`MercadoPago error ${res.status}: ${err}`);
  }

  return res.json();
}

export interface MPPayment {
  id: number;
  status: string;
  status_detail?: string;
  external_reference?: string;
  payment_method_id?: string;
  payment_type_id?: string;
  operation_type?: string;
  installments?: number;
  transaction_amount?: number;
  net_amount?: number;
  currency_id?: string;
  date_created?: string;
  date_approved?: string;
  date_last_updated?: string;
  authorization_code?: string;
  statement_descriptor?: string;
  card?: {
    first_six_digits?: string;
    last_four_digits?: string;
    cardholder?: {
      name?: string;
      identification?: { type?: string; number?: string };
    };
    expiration_month?: number;
    expiration_year?: number;
  };
  payer?: {
    id?: string | number;
    email?: string;
    first_name?: string;
    last_name?: string;
    identification?: { type?: string; number?: string };
  };
  fee_details?: Array<{ type?: string; amount?: number }>;
  transaction_details?: {
    total_paid_amount?: number;
    net_received_amount?: number;
    installment_amount?: number;
  };
}

export async function getPayment(paymentId: string): Promise<MPPayment> {
  const res = await fetch(`${MP_BASE_URL}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
  });
  if (!res.ok) throw new Error(`MP payment error ${res.status}`);
  return res.json();
}

/**
 * Crea un pago directo vía /v1/payments (flujo Bricks inline).
 *
 * A diferencia de createPreference (Checkout Pro / redirect), acá el frontend
 * tokeniza la tarjeta con el Payment Brick y nos manda el `token` + método +
 * cuotas. Nosotros cobramos server-side con ESTE endpoint y MP devuelve el
 * status del pago de forma SÍNCRONA (approved / rejected / in_process).
 *
 * El `transaction_amount` NUNCA se toma del cliente — el caller lo lee del total
 * de la orden en WC. Acá solo se reenvía lo que el caller decidió.
 *
 * `idempotencyKey` (X-Idempotency-Key) evita doble cobro si el cliente reintenta
 * el submit del brick o hay un retry de red. MP devuelve el mismo pago.
 */
export async function createPayment(
  options: {
    transaction_amount: number;
    token: string;
    description?: string;
    installments: number;
    payment_method_id: string;
    issuer_id?: string | number;
    external_reference: string;
    notification_url?: string;
    statement_descriptor?: string;
    payer: {
      email: string;
      identification?: { type?: string; number?: string };
    };
  },
  idempotencyKey: string
): Promise<MPPayment> {
  const res = await fetch(`${MP_BASE_URL}/v1/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      transaction_amount: options.transaction_amount,
      token: options.token,
      description: options.description,
      installments: options.installments,
      payment_method_id: options.payment_method_id,
      ...(options.issuer_id ? { issuer_id: options.issuer_id } : {}),
      external_reference: options.external_reference,
      ...(options.notification_url ? { notification_url: options.notification_url } : {}),
      statement_descriptor: options.statement_descriptor || "SISTEMA CONTINUO",
      payer: options.payer,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // MP devuelve { message, cause: [{ code, description }] } en errores.
    const cause = Array.isArray(data?.cause) && data.cause[0]?.description
      ? data.cause[0].description
      : data?.message;
    throw new Error(`MP payment error ${res.status}: ${cause || JSON.stringify(data).slice(0, 200)}`);
  }
  return data;
}
