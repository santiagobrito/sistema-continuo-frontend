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
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`MercadoPago error ${res.status}: ${err}`);
  }

  return res.json();
}

export async function getPayment(paymentId: string) {
  const res = await fetch(`${MP_BASE_URL}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
  });
  if (!res.ok) throw new Error(`MP payment error ${res.status}`);
  return res.json();
}
