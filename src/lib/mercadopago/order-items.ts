/**
 * Construye los items de una preferencia de MercadoPago A PARTIR DE LA ORDEN
 * de WooCommerce (releída de la WC REST), nunca de datos del navegador.
 *
 * Por qué existe (2026-09-01): /create-preference armaba los items con los
 * precios que mandaba el body del checkout. Una petición manipulada declaraba
 * el precio que quería, MP lo cobraba, el webhook marcaba la orden pagada y
 * salía la etiqueta de despacho. El importe autoritativo es el que calculó
 * WooCommerce (precios de catálogo + descuentos por cantidad del plugin +
 * envío recalculado server-side), o sea el `total` de la orden.
 *
 * Invariante: la suma de unit_price * quantity de los items devueltos tiene
 * que dar EXACTO el `total` de la orden, porque el webhook concilia el
 * `transaction_amount` de MP contra ese total antes de dar el pago por bueno.
 * Para garantizarlo, una línea cuyo total no divide exacto por unidad (p. ej.
 * descuento por cantidad con porcentaje que deja decimales) se manda como un
 * solo bulto con el total exacto de la línea.
 */

import type { MPPreferenceItem } from "./sdk";

export interface WcOrderForPreference {
  id: number;
  /** Total de la orden como lo reporta WC (string con 2 decimales). */
  total: string;
  total_tax?: string;
  line_items: Array<{
    name: string;
    quantity: number;
    /** Total de la línea, ya con descuentos aplicados. */
    total: string;
    image?: { src?: string };
  }>;
  shipping_lines?: Array<{ total: string }>;
  fee_lines?: Array<{ name?: string; total: string }>;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface MpItemsFromOrder {
  items: MPPreferenceItem[];
  /** Suma de unit_price * quantity de los items (lo que MP va a cobrar). */
  itemsTotal: number;
  /** parseFloat(order.total) — el número contra el que concilia el webhook. */
  orderTotal: number;
  /** true si itemsTotal == orderTotal (con margen de 1 centavo por floats). */
  matches: boolean;
}

export function buildMpItemsFromOrder(order: WcOrderForPreference): MpItemsFromOrder {
  const items: MPPreferenceItem[] = [];

  for (const li of order.line_items || []) {
    const qty = Number(li.quantity) || 0;
    const lineTotal = round2(parseFloat(String(li.total)) || 0);
    if (qty <= 0 || lineTotal <= 0) continue;
    const unit = round2(lineTotal / qty);
    if (round2(unit * qty) === lineTotal) {
      items.push({
        title: String(li.name).slice(0, 255),
        quantity: qty,
        unit_price: unit,
        picture_url: li.image?.src,
      });
    } else {
      // No divide exacto: colapsar a 1 bulto con el total exacto de la línea.
      items.push({
        title: `${String(li.name).slice(0, 240)} (x${qty})`,
        quantity: 1,
        unit_price: lineTotal,
        picture_url: li.image?.src,
      });
    }
  }

  for (const fl of order.fee_lines || []) {
    const feeTotal = round2(parseFloat(String(fl.total)) || 0);
    // Un fee negativo no se puede representar en MP (unit_price >= 0): si algún
    // día aparece uno, itemsTotal != orderTotal y el caller loguea el desvío.
    if (feeTotal > 0) {
      items.push({ title: String(fl.name || "Cargo").slice(0, 255), quantity: 1, unit_price: feeTotal });
    }
  }

  const shippingTotal = round2(
    (order.shipping_lines || []).reduce((s, sl) => s + (parseFloat(String(sl.total)) || 0), 0)
  );
  if (shippingTotal > 0) {
    items.push({ title: "Envio", quantity: 1, unit_price: shippingTotal });
  }

  // AR: la tienda opera sin IVA desglosado (total_tax siempre 0), pero si
  // algún día aparece, va como item para que la suma siga cerrando.
  const tax = round2(parseFloat(String(order.total_tax ?? "0")) || 0);
  if (tax > 0) {
    items.push({ title: "Impuestos", quantity: 1, unit_price: tax });
  }

  const itemsTotal = round2(items.reduce((s, it) => s + it.unit_price * it.quantity, 0));
  const orderTotal = round2(parseFloat(String(order.total)) || 0);
  return { items, itemsTotal, orderTotal, matches: Math.abs(itemsTotal - orderTotal) <= 0.01 };
}
