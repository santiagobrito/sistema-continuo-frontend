/**
 * Validación y aplicación de cupones para el flujo headless de checkout.
 *
 * Contexto: WC REST API NO recalcula totales cuando se manda `coupon_lines` en
 * `POST /wp-json/wc/v3/orders` — el frontend tiene que aplicar el descuento él
 * mismo, prorratearlo sobre los line_items y enviar `subtotal`/`total` explícitos.
 * También hay que descontar a MercadoPago, sino el cliente paga el precio sin
 * descuento aunque el frontend lo muestre aplicado.
 *
 * Como WC no valida nada al crear la orden por REST, TODAS las reglas del cupón
 * se aplican acá. Hasta el 2026-09-18 solo se miraban vencimiento, usos, mínimo
 * y email: las restricciones de producto/categoría se ignoraban y un cupón que
 * excluía Impresoras y Estampadoras se aplicaba igual sobre una F170. Las reglas
 * replican WC_Discounts:
 *  - fixed_cart (cupón de carrito): si el carrito tiene UN producto excluido
 *    (producto, categoría u oferta con exclude_sale_items), el cupón se rechaza.
 *  - percent / fixed_product (cupones de producto): los excluidos no reciben
 *    descuento; se rechaza solo si ningún producto del carrito es elegible.
 *  - product_ids / product_categories: el descuento cae solo sobre esos productos.
 *  - minimum_amount / maximum_amount: gasto mínimo y MÁXIMO del carrito (no es
 *    un tope de descuento, como se asumía antes).
 *  - usage_limit_per_user contra used_by (emails e IDs de customer).
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
  description?: string;
  /** Descuento por línea, mismo orden que los items recibidos. */
  line_discounts: number[];
}

export type CouponResult =
  | { ok: true; coupon: ValidatedCoupon }
  | { ok: false; error: string; status: number };

const WP_URL = process.env.WP_URL || process.env.NEXT_PUBLIC_WP_URL || "";
const WC_API_AUTH = process.env.WC_API_AUTH || "";

interface WcCoupon {
  code: string;
  amount: string;
  discount_type: string;
  description?: string;
  date_expires: string | null;
  usage_count: number;
  usage_limit: number | null;
  usage_limit_per_user: number | null;
  limit_usage_to_x_items: number | null;
  free_shipping: boolean;
  product_ids: number[];
  excluded_product_ids: number[];
  product_categories: number[];
  excluded_product_categories: number[];
  exclude_sale_items: boolean;
  minimum_amount: string;
  maximum_amount: string;
  email_restrictions: string[];
  used_by: string[];
}

interface ProductFacts {
  /** ID pedido (producto o variación). */
  id: number;
  /** Producto padre si es variación; si no, el mismo id. */
  parentId: number;
  price: number;
  onSale: boolean;
  categoryIds: number[];
}

async function wcGet(path: string): Promise<Response> {
  return fetch(`${WP_URL}/wp-json/wc/v3/${path}`, {
    headers: { Authorization: `Basic ${WC_API_AUTH}` },
    cache: "no-store",
  });
}

/**
 * Precio, oferta y categorías de cada item, leídos de WC (nunca del navegador).
 * `GET /products/{id}` sirve también para IDs de variación; las categorías de
 * una variación vienen vacías, así que se leen del padre.
 * Si algo no se puede leer → throw (fail closed).
 */
async function fetchProductFacts(items: CheckoutItem[]): Promise<ProductFacts[]> {
  const cache = new Map<number, Promise<Record<string, unknown>>>();
  const load = (id: number) => {
    if (!cache.has(id)) {
      cache.set(
        id,
        wcGet(`products/${id}`).then(async (r) => {
          if (!r.ok) throw new Error(`No se pudo verificar el producto ${id} (HTTP ${r.status})`);
          return r.json();
        }),
      );
    }
    return cache.get(id)!;
  };

  return Promise.all(
    items.map(async (item) => {
      const id = item.variation_id || item.product_id;
      const p = await load(id);
      const price = parseFloat(String(p.price));
      if (!Number.isFinite(price) || price < 0) throw new Error(`Precio ilegible para el producto ${id}`);
      const parentId = Number(p.parent_id) > 0 ? Number(p.parent_id) : id;
      const catSource = parentId !== id ? await load(parentId) : p;
      const cats = Array.isArray(catSource.categories) ? (catSource.categories as { id: number }[]) : [];
      return {
        id,
        parentId,
        price,
        onSale: !!p.on_sale,
        categoryIds: cats.map((c) => Number(c.id)),
      };
    }),
  );
}

/**
 * Reemplaza item.price (que viene del NAVEGADOR) por el precio real del
 * producto/variación en WC. Solo hace falta en el camino con cupón: sin cupón
 * la orden se crea con product_id+quantity y WC pone los precios él solo, pero
 * con cupón mandamos subtotal/total explícitos y esos números no pueden salir
 * del body (2026-09-01: una petición manipulada pagaba el importe que declaraba).
 *
 * Nota: el precio de catálogo no incluye los descuentos por cantidad; esos los
 * aplica el plugin al crear la orden (apply_qty_discounts_to_rest_order) y
 * pisan la línea.
 */
export async function withServerPrices(items: CheckoutItem[]): Promise<CheckoutItem[]> {
  const facts = await fetchProductFacts(items);
  return items.map((item, i) => {
    if (facts[i].price !== item.price) {
      console.warn(
        `[coupons] precio del navegador (${item.price}) != precio WC (${facts[i].price}) para producto ${facts[i].id} — se usa el de WC`,
      );
    }
    return { ...item, price: facts[i].price };
  });
}

const fmt = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;
const fail = (error: string, status = 400): CouponResult => ({ ok: false, error, status });

/**
 * Valida un cupón contra el carrito y calcula el descuento por línea.
 * Los items que recibe se re-preciarán con los precios de WC: el `price` que
 * traigan se ignora. Devuelve un error legible para mostrar en el checkout.
 */
export async function resolveCoupon(
  code: string,
  items: CheckoutItem[],
  opts: { email?: string; customerId?: number } = {},
): Promise<CouponResult> {
  const trimmed = (code || "").trim();
  if (!trimmed) return fail("Ingresá un código");
  if (!items.length) return fail("No hay productos en el carrito");

  let c: WcCoupon;
  let facts: ProductFacts[];
  try {
    const res = await wcGet(`coupons?code=${encodeURIComponent(trimmed)}`);
    if (!res.ok) return fail("Error al verificar el cupón", 500);
    const list = await res.json();
    if (!Array.isArray(list) || list.length === 0) return fail("Cupón no válido", 404);
    c = list[0];
    facts = await fetchProductFacts(items);
  } catch (err) {
    console.error("[coupons] error resolviendo cupón:", err);
    return fail("Error al verificar el cupón", 500);
  }

  if (c.date_expires && new Date(c.date_expires) < new Date()) {
    return fail("Este cupón ya venció", 410);
  }
  if (c.usage_limit && c.usage_count >= c.usage_limit) {
    return fail("Este cupón ya fue usado el máximo de veces", 410);
  }

  const email = (opts.email || "").toLowerCase().trim();
  if (Array.isArray(c.email_restrictions) && c.email_restrictions.length > 0) {
    // SC-AB-* son personales (email del carrito abandonado).
    if (!email) return fail("Este cupón es personal: completá tu email primero");
    const allowed = c.email_restrictions.map((e) => String(e).toLowerCase().trim());
    if (!allowed.includes(email)) return fail("Este cupón está asociado a otra dirección de email");
  }

  if (c.usage_limit_per_user && c.usage_limit_per_user > 0 && Array.isArray(c.used_by)) {
    const ids = new Set([email, opts.customerId ? String(opts.customerId) : ""].filter(Boolean));
    const uses = c.used_by.filter((u) => ids.has(String(u).toLowerCase().trim())).length;
    if (uses >= c.usage_limit_per_user) return fail("Ya usaste este cupón");
  }

  const lineTotals = items.map((it, i) => facts[i].price * it.quantity);
  const subtotal = lineTotals.reduce((a, b) => a + b, 0);

  const min = parseFloat(c.minimum_amount || "0");
  if (min > 0 && subtotal < min) return fail(`Compra mínima de ${fmt(min)} para este cupón`);
  const max = parseFloat(c.maximum_amount || "0");
  if (max > 0 && subtotal > max) return fail(`Este cupón vale para compras de hasta ${fmt(max)}`);

  // Elegibilidad por item (WC_Coupon::is_valid_for_product).
  const inIds = (f: ProductFacts, ids: number[]) => ids.includes(f.id) || ids.includes(f.parentId);
  const inCats = (f: ProductFacts, cats: number[]) => f.categoryIds.some((id) => cats.includes(id));
  const isExcluded = facts.map(
    (f) =>
      inIds(f, c.excluded_product_ids || []) ||
      inCats(f, c.excluded_product_categories || []) ||
      (c.exclude_sale_items && f.onSale),
  );
  const isIncluded = facts.map((f) => {
    const hasIds = (c.product_ids || []).length > 0;
    const hasCats = (c.product_categories || []).length > 0;
    if (!hasIds && !hasCats) return true;
    return (hasIds && inIds(f, c.product_ids)) || (hasCats && inCats(f, c.product_categories));
  });
  const eligible = facts.map((_, i) => isIncluded[i] && !isExcluded[i]);

  if (!isIncluded.some(Boolean)) {
    return fail("Este cupón no aplica a los productos de tu carrito");
  }

  const isCartCoupon = c.discount_type === "fixed_cart";
  if (isCartCoupon) {
    const blocked = items.filter((_, i) => isExcluded[i]).map((it) => it.name);
    if (blocked.length) {
      return fail(`Este cupón no se puede usar con: ${blocked.join(", ")}. Quitalo del carrito para aplicarlo.`);
    }
  } else if (!eligible.some(Boolean)) {
    return fail("Este cupón no aplica a los productos de tu carrito");
  }

  const amount = parseFloat(c.amount || "0");
  let lineDiscounts: number[];
  let label: string;

  if (c.discount_type === "percent") {
    lineDiscounts = lineTotals.map((lt, i) => (eligible[i] ? Math.round((lt * amount) / 100) : 0));
    label = `${amount}% de descuento`;
  } else if (c.discount_type === "fixed_product") {
    let remainingUnits = c.limit_usage_to_x_items && c.limit_usage_to_x_items > 0 ? c.limit_usage_to_x_items : Infinity;
    lineDiscounts = items.map((it, i) => {
      if (!eligible[i] || remainingUnits <= 0) return 0;
      const units = Math.min(it.quantity, remainingUnits);
      remainingUnits -= units;
      return Math.round(Math.min(amount, facts[i].price) * units);
    });
    label = `${fmt(amount)} por producto`;
  } else if (isCartCoupon) {
    const eligibleTotal = lineTotals.reduce((a, lt, i) => a + (eligible[i] ? lt : 0), 0);
    const discount = Math.min(Math.round(amount), eligibleTotal);
    lineDiscounts = prorate(lineTotals.map((lt, i) => (eligible[i] ? lt : 0)), discount);
    label = `${fmt(amount)} de descuento`;
  } else {
    return fail("Tipo de cupón no soportado");
  }

  lineDiscounts = lineDiscounts.map((d, i) => Math.min(d, lineTotals[i]));
  const discountAmount = lineDiscounts.reduce((a, b) => a + b, 0);

  return {
    ok: true,
    coupon: {
      code: c.code,
      discount_type: c.discount_type,
      amount: c.amount,
      discount_amount: discountAmount,
      free_shipping: !!c.free_shipping,
      label,
      description: c.description || "",
      line_discounts: lineDiscounts,
    },
  };
}

/**
 * Reparte `discount` proporcional a `bases` con Math.floor; el residuo va a la
 * base más grande. La suma del resultado es exactamente `discount`.
 */
function prorate(bases: number[], discount: number): number[] {
  const total = bases.reduce((a, b) => a + b, 0);
  if (total <= 0 || discount <= 0) return bases.map(() => 0);
  const capped = Math.min(discount, total);
  const out = bases.map((b) => Math.floor((b * capped) / total));
  const residue = capped - out.reduce((a, b) => a + b, 0);
  if (residue > 0) {
    let maxIdx = 0;
    for (let i = 1; i < bases.length; i++) if (bases[i] > bases[maxIdx]) maxIdx = i;
    out[maxIdx] += residue;
  }
  return out;
}

export interface ItemWithDiscount extends CheckoutItem {
  unit_price_after: number;
  line_subtotal_original: number;
  line_total_after: number;
  line_discount: number;
}

/**
 * Aplica el descuento por línea que devolvió resolveCoupon() sobre items con
 * precios del servidor. `unit_price_after` se redondea a entero (ARS sin
 * decimales); WC usa el `total` de la línea, no recalcula desde el unitario.
 */
export function applyDiscountToItems(
  items: CheckoutItem[],
  lineDiscounts: number[],
): ItemWithDiscount[] {
  return items.map((it, idx) => {
    const lineSubtotal = it.price * it.quantity;
    const lineDiscount = Math.min(lineDiscounts[idx] || 0, lineSubtotal);
    const lineTotalAfter = Math.max(0, lineSubtotal - lineDiscount);
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
