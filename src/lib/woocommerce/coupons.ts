/**
 * Validación y aplicación de cupones para el flujo headless de checkout.
 *
 * Contexto: WC REST API NO recalcula totales cuando se manda `coupon_lines` en
 * `POST /wp-json/wc/v3/orders` — el frontend tiene que aplicar el descuento él
 * mismo, prorratearlo sobre los line_items y enviar `subtotal`/`total` explícitos.
 * También hay que descontar a MercadoPago, sino el cliente paga el precio sin
 * descuento aunque el frontend lo muestre aplicado.
 */
export interface CheckoutItem {
  product_id: number;
  variation_id?: number;
  name: string;
  quantity: number;
  price: number;
  image?: string;
}

export interface ValidatedCoupon {
  code: string;
  discount_type: "percent" | "fixed_cart" | "fixed_product" | string;
  amount: string;
  discount_amount: number;
  free_shipping: boolean;
  label?: string;
}

const WP_URL = process.env.WP_URL || process.env.NEXT_PUBLIC_WP_URL || "";
const WC_API_AUTH = process.env.WC_API_AUTH || "";

/**
 * Resuelve un código de cupón contra WC y devuelve discount_amount aplicable
 * al subtotal. Si el código es inválido / expiró / no cumple mínimo, devuelve null.
 * No tira excepción para que el caller pueda seguir el flow sin cupón.
 */
export async function resolveCoupon(
  code: string,
  subtotal: number,
  customerEmail?: string,
): Promise<ValidatedCoupon | null> {
  if (!code || subtotal <= 0) return null;
  try {
    const res = await fetch(
      `${WP_URL}/wp-json/wc/v3/coupons?code=${encodeURIComponent(code.trim())}`,
      {
        headers: { Authorization: `Basic ${WC_API_AUTH}` },
        cache: "no-store",
      },
    );
    if (!res.ok) return null;
    const coupons = await res.json();
    if (!Array.isArray(coupons) || coupons.length === 0) return null;
    const c = coupons[0];

    if (c.date_expires) {
      const exp = new Date(c.date_expires);
      if (exp < new Date()) return null;
    }
    if (c.usage_limit && c.usage_count >= c.usage_limit) return null;
    if (c.minimum_amount && parseFloat(c.minimum_amount) > 0) {
      if (subtotal < parseFloat(c.minimum_amount)) return null;
    }
    // Restricción por email: SC-AB-* tienen email_restrictions setado al email del
    // carrito original. Si el comprador usa otro email, el cupón no aplica.
    if (Array.isArray(c.email_restrictions) && c.email_restrictions.length > 0) {
      const allowed = c.email_restrictions.map((e: string) => e.toLowerCase().trim());
      const provided = (customerEmail || "").toLowerCase().trim();
      if (!provided || !allowed.includes(provided)) return null;
    }

    let discount = 0;
    if (c.discount_type === "percent") {
      discount = Math.round((subtotal * parseFloat(c.amount)) / 100);
      if (c.maximum_amount && parseFloat(c.maximum_amount) > 0) {
        discount = Math.min(discount, Math.round(parseFloat(c.maximum_amount)));
      }
    } else if (c.discount_type === "fixed_cart" || c.discount_type === "fixed_product") {
      discount = Math.round(parseFloat(c.amount));
    }
    discount = Math.min(discount, subtotal);

    return {
      code: c.code,
      discount_type: c.discount_type,
      amount: c.amount,
      discount_amount: discount,
      free_shipping: !!c.free_shipping,
    };
  } catch {
    return null;
  }
}

/**
 * Prorratea un discount_amount sobre los line_items proporcional al subtotal de
 * cada línea. Devuelve array nuevo con `unit_price_after` (precio descontado por
 * unidad redondeado al entero más cercano — ARS no usa decimales) y
 * `line_discount` (descuento total de la línea). Se preserva la suma del
 * descuento total exactamente, asignando el residuo al item más caro.
 */
export interface ItemWithDiscount extends CheckoutItem {
  unit_price_after: number;
  line_subtotal_original: number;
  line_total_after: number;
  line_discount: number;
}

export function applyDiscountToItems(
  items: CheckoutItem[],
  discountAmount: number,
): ItemWithDiscount[] {
  if (!items.length) return [];
  if (discountAmount <= 0) {
    return items.map((it) => ({
      ...it,
      unit_price_after: it.price,
      line_subtotal_original: it.price * it.quantity,
      line_total_after: it.price * it.quantity,
      line_discount: 0,
    }));
  }

  const lineSubtotals = items.map((it) => it.price * it.quantity);
  const subtotal = lineSubtotals.reduce((a, b) => a + b, 0);
  if (subtotal <= 0) {
    return items.map((it) => ({
      ...it,
      unit_price_after: it.price,
      line_subtotal_original: 0,
      line_total_after: 0,
      line_discount: 0,
    }));
  }

  const cappedDiscount = Math.min(discountAmount, subtotal);
  // Reparto proporcional con Math.floor para no pasarse; el residuo va al item
  // con mayor line_subtotal (suficiente para 2 dígitos).
  const lineDiscounts = lineSubtotals.map((ls) =>
    Math.floor((ls * cappedDiscount) / subtotal),
  );
  const distributed = lineDiscounts.reduce((a, b) => a + b, 0);
  const residue = cappedDiscount - distributed;
  if (residue > 0) {
    let maxIdx = 0;
    for (let i = 1; i < lineSubtotals.length; i++) {
      if (lineSubtotals[i] > lineSubtotals[maxIdx]) maxIdx = i;
    }
    lineDiscounts[maxIdx] += residue;
  }

  return items.map((it, idx) => {
    const lineSubtotal = lineSubtotals[idx];
    const lineDiscount = lineDiscounts[idx];
    const lineTotalAfter = Math.max(0, lineSubtotal - lineDiscount);
    // unit_price_after: dividir el total descontado por la cantidad. Puede
    // perder 1 ARS por redondeo a entero pero no afecta el total porque WC usa
    // el `total` del line_item, no recalcula desde unit_price.
    const unitAfter = it.quantity > 0 ? Math.round(lineTotalAfter / it.quantity) : it.price;
    return {
      ...it,
      unit_price_after: unitAfter,
      line_subtotal_original: lineSubtotal,
      line_total_after: lineTotalAfter,
      line_discount: lineDiscount,
    };
  });
}
