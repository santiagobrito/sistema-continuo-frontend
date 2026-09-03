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
   * TOPE DURO del total de cuotas ofrecidas en el checkout (con y sin interés).
   * NO es un umbral del plan "Cuotas sin interés": pasar N-1 para "evitar la promo"
   * capa TODAS las cuotas a N-1 (bug 17/6→2/7: todos los clientes veían máx 2 cuotas).
   * Omitir el campo = MP ofrece su default (hasta el máximo de la cuenta, con interés).
   * Usar solo cuando el carrito tiene cuotas SI reales (installments = N del plan).
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
  /** Merchant order a la que pertenece el pago. Es lo que agrupa los pagos de
   *  un mismo checkout cuando el cliente paga con dos medios (ver getMerchantOrder). */
  order?: { id?: string | number; type?: string };
}

/**
 * Una compra de Checkout Pro puede resolverse con MAS DE UN pago: MercadoPago
 * deja combinar dinero en cuenta + tarjeta, y entonces ningun pago individual
 * iguala el total. La merchant_order es la que agrupa esos pagos y trae el
 * `paid_amount` acumulado, que es contra lo que hay que conciliar.
 *
 * Incidente que lo motivo (orden #18398, 24-8-2026): pago dividido en $46.000
 * de dinero en cuenta + $21.264 de Mastercard = $67.264, el total exacto. La
 * conciliacion miraba solo el segundo pago y la dio por impaga.
 */
export interface MPMerchantOrder {
  id: number;
  status?: string;
  order_status?: string;
  external_reference?: string;
  total_amount?: number;
  paid_amount?: number;
  refunded_amount?: number;
  payments?: Array<{
    id?: number;
    status?: string;
    status_detail?: string;
    transaction_amount?: number;
  }>;
}

export async function getMerchantOrder(orderId: string): Promise<MPMerchantOrder | null> {
  try {
    const res = await fetch(`${MP_BASE_URL}/merchant_orders/${orderId}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as MPMerchantOrder;
  } catch {
    // El que llama decide que hacer sin este dato. Nunca tumbar el webhook por esto.
    return null;
  }
}

export async function getPayment(paymentId: string): Promise<MPPayment> {
  const res = await fetch(`${MP_BASE_URL}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
  });
  if (!res.ok) throw new Error(`MP payment error ${res.status}`);
  return res.json();
}
