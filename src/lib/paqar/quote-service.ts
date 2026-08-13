/**
 * Cotización de envío con crédito por envío gratis.
 *
 * Vive acá, y no en el route handler, porque la usan tres endpoints: el quote
 * del checkout (/api/paqar/quote), la creación de pedido (/api/orders/create) y
 * la preferencia de MercadoPago. Los tres tienen que llegar al mismo número: si
 * el crédito lo calculara el browser, cualquiera podría pedir el envío gratis
 * de un producto que no lo tiene.
 *
 * La regla: si el carrito lleva items con envío gratis, se cotiza el carrito
 * completo (bruto) y se cotiza aparte lo que costaría enviar SOLO esos items
 * (crédito). Se cobra la diferencia. Con el carrito entero bonificado, crédito
 * == bruto y el envío queda en 0, igual que antes.
 *
 * Se cotiza el incremental real, no "el envío del resto por separado": la
 * tarifa de Correo va por escalones de peso, así que sumar algo a una caja que
 * ya viaja casi nunca cuesta lo mismo que despacharlo solo.
 */

import { splitIntoBundles, type SplitItem } from "@/lib/paqar/split";
import { quoteShipment } from "@/lib/paqar/rates";
import type { DeliveryType, ProvinceCode } from "@/lib/paqar/types";

const WP_URL = process.env.WP_URL || process.env.NEXT_PUBLIC_WP_URL || "";

interface DimsResponse {
  dims: Record<
    string,
    {
      weight: string | null;
      length: string | null;
      width: string | null;
      height: string | null;
      /** Caja de apilado del producto (ACF `pack_*`). null si no está cargada. */
      pack?: { qty: number; length: number; width: number; height: number } | null;
      /** Resuelto por variación en el plugin (SC_Variation_Fields). */
      envio_gratis?: boolean;
    }
  >;
}

export interface EnrichedItems {
  items: SplitItem[];
  zeroWeightIds: string[];
  /** ids (product o variation) con envío gratis, según WP. */
  freeIds: string[];
}

/**
 * Trae peso (kg → g), dimensiones (cm) y el flag de envío gratis de cada item
 * desde el plugin WP (endpoint sc/v1/product-dims, que resuelve variaciones).
 *
 * Si un item no tiene datos en WP (o el endpoint falla), se mantienen los
 * valores que vinieron del cliente (que normalmente son fallbacks) y el item
 * NO cuenta como envío gratis: ante un fallo se cobra el envío normal, nunca
 * se regala.
 */
export async function enrichItemsWithDims(items: SplitItem[]): Promise<EnrichedItems> {
  if (!WP_URL || items.length === 0) return { items, zeroWeightIds: [], freeIds: [] };

  const ids = Array.from(new Set(items.map((it) => it.id).filter(Boolean)));
  if (ids.length === 0) return { items, zeroWeightIds: [], freeIds: [] };

  try {
    const res = await fetch(
      `${WP_URL}/wp-json/sc/v1/product-dims?ids=${ids.join(",")}`,
      { cache: "no-store" }
    );
    if (!res.ok) {
      console.warn("[paqar/quote] product-dims fetch failed:", res.status);
      return { items, zeroWeightIds: [], freeIds: [] };
    }
    const data = (await res.json()) as DimsResponse;
    const dims = data.dims || {};

    const zeroWeightIds: string[] = [];
    const freeIds: string[] = [];
    const enriched = items.map((it) => {
      const d = dims[it.id];
      if (!d) return it;
      const wp_weight_kg = Number(d.weight || 0);
      // Si WP no tiene peso cargado (null/0), marcamos el item — no podemos
      // enviar por Correo Argentino en esta condición.
      if (!wp_weight_kg) zeroWeightIds.push(it.id);
      if (d.envio_gratis) freeIds.push(it.id);
      return {
        ...it,
        // WC guarda peso en kg → convertir a gramos. Si null/0, dejar fallback
        // para que el resto del flow (moto, transporte) siga pudiendo cotizar.
        weight: wp_weight_kg ? wp_weight_kg * 1000 : it.weight,
        height: d.height ? Number(d.height) : it.height,
        width:  d.width  ? Number(d.width)  : it.width,
        depth:  d.length ? Number(d.length) : it.depth,
        // La caja de apilado sale SIEMPRE de WP, nunca de lo que manda el
        // browser: es lo que decide cuánto se le cobra de envío al cliente.
        packQty:    d.pack ? d.pack.qty    : undefined,
        packHeight: d.pack ? d.pack.height : undefined,
        packWidth:  d.pack ? d.pack.width  : undefined,
        packDepth:  d.pack ? d.pack.length : undefined,
      };
    });
    return { items: enriched, zeroWeightIds, freeIds };
  } catch (err) {
    console.warn("[paqar/quote] enrich error:", err);
    return { items, zeroWeightIds: [], freeIds: [] };
  }
}

/**
 * La caja de apilado nunca se acepta del browser: se resuelve contra WP en
 * enrichItemsWithDims. Si no, cualquiera podría mandar un pack inventado y
 * pagar menos envío del que sale.
 */
export function sanitizeItems(items: SplitItem[]): SplitItem[] {
  return items.map((it) => ({
    ...it,
    packQty: undefined,
    packHeight: undefined,
    packWidth: undefined,
    packDepth: undefined,
  }));
}

export interface QuoteWithCreditOption {
  deliveryType: DeliveryType;
  zone: number;
  /** Envío del carrito completo, sin bonificar. */
  gross: number;
  /** Lo que costaría enviar solo los items con envío gratis. */
  credit: number;
  /** Lo que se le cobra al cliente: gross - credit, nunca negativo. */
  total: number;
  warning?: string;
}

export interface QuoteWithCreditResult {
  tier: "cheap" | "premium";
  service: string;
  gridVersion: string;
  bundles: number;
  hasZeroWeight: boolean;
  zeroWeightIds: string[];
  /** El carrito lleva al menos un item con envío gratis. */
  hasFreeShipping: boolean;
  /** Todos los items del carrito tienen envío gratis. */
  allFreeShipping: boolean;
  options: QuoteWithCreditOption[];
}

export async function quoteWithCredit(params: {
  items: SplitItem[];
  destState: ProvinceCode;
  destZip: string;
  deliveryTypes?: DeliveryType[];
}): Promise<QuoteWithCreditResult> {
  const { destState, destZip, deliveryTypes } = params;

  const { items, zeroWeightIds, freeIds } = await enrichItemsWithDims(
    sanitizeItems(params.items)
  );

  const bundles = splitIntoBundles(items);
  const quote = quoteShipment({ bundles, destState, destZip, deliveryTypes });

  const freeSet = new Set(freeIds);
  const freeItems = items.filter((it) => freeSet.has(it.id));
  const hasFreeShipping = freeItems.length > 0;
  const allFreeShipping = hasFreeShipping && freeItems.length === items.length;

  // Crédito por tipo de entrega: el mismo producto no cuesta lo mismo a
  // domicilio que a sucursal, así que se cotiza cada uno con su propia grilla.
  const creditByType = new Map<DeliveryType, number>();
  if (hasFreeShipping) {
    const freeQuote = quoteShipment({
      bundles: splitIntoBundles(freeItems),
      destState,
      destZip,
      deliveryTypes,
    });
    for (const o of freeQuote.options) creditByType.set(o.deliveryType, o.total);
  }

  return {
    tier: quote.tier,
    service: quote.service,
    gridVersion: quote.gridVersion,
    bundles: bundles.length,
    hasZeroWeight: zeroWeightIds.length > 0,
    zeroWeightIds,
    hasFreeShipping,
    allFreeShipping,
    options: quote.options.map((o) => {
      // El crédito no puede superar el envío del carrito: si el subconjunto
      // bonificado cotiza más caro que el todo (posible con los escalones de
      // la grilla), el envío queda en 0 y ahí termina.
      const credit = Math.min(creditByType.get(o.deliveryType) ?? 0, o.total);
      return {
        deliveryType: o.deliveryType,
        zone: o.zone,
        gross: o.total,
        credit,
        total: Math.max(0, o.total - credit),
        warning: o.warning,
      };
    }),
  };
}

/**
 * Items de un pedido (product_id = variation_id cuando la hay) → SplitItem.
 *
 * Peso y medidas van con los mismos fallbacks que usa el checkout: los reales
 * los pone enrichItemsWithDims leyendo WP. El precio no interviene en la
 * tarifa (la grilla cobra por peso y volumen), así que se manda en 0.
 */
export function splitItemsFromOrder(
  items: { product_id: number; variation_id?: number; name: string; quantity: number }[]
): SplitItem[] {
  return items.map((it) => ({
    id: String(it.variation_id || it.product_id),
    name: it.name,
    quantity: it.quantity,
    weight: 500,
    height: 10,
    width: 10,
    depth: 10,
    price: 0,
    category: "general",
  }));
}

/**
 * El envío gratis se cotiza contra la grilla de Correo. Los métodos de precio
 * fijo (moto, transporte) no tienen grilla propia, así que se bonifican con lo
 * que habría costado mandar los productos bonificados a domicilio por Correo.
 */
function deliveryTypeForMethod(method: string): DeliveryType {
  return method === "correo_sucursal" ? "agency" : "homeDelivery";
}

/**
 * Envío a cobrar en un pedido que se está creando, con el envío gratis ya
 * aplicado. Se usa en /api/orders/create y en la preferencia de MercadoPago
 * para no confiar en el número que manda el browser.
 *
 * `grossCost` es el envío sin bonificar (lo que cotiza la grilla o la tabla de
 * precios fijos). Ante cualquier duda (sin destino, sin items, error de
 * cotización) se devuelve el bruto: el peor caso es cobrar el envío completo,
 * nunca regalarlo por un fallo.
 */
export async function computeShippingCost(params: {
  items: SplitItem[];
  destState: string;
  destZip: string;
  method: string;
  grossCost: number;
}): Promise<{ cost: number; credit: number }> {
  const { items, destState, destZip, method, grossCost } = params;

  if (grossCost <= 0) return { cost: 0, credit: 0 };
  if (method === "local_pickup") return { cost: 0, credit: 0 };
  if (!items.length || !destState || !destZip || destZip.length < 4) {
    return { cost: grossCost, credit: 0 };
  }

  const deliveryType = deliveryTypeForMethod(method);

  try {
    const quote = await quoteWithCredit({
      items,
      destState: destState as ProvinceCode,
      destZip,
      deliveryTypes: [deliveryType],
    });

    // Carrito entero bonificado: gratis con cualquier método, incluido moto y
    // transporte, aunque su precio fijo supere lo que cuesta el envío por
    // Correo. Es la promesa que ve el cliente en la ficha del producto.
    if (quote.allFreeShipping) return { cost: 0, credit: grossCost };

    const option = quote.options.find((o) => o.deliveryType === deliveryType);
    const credit = Math.min(option?.credit ?? 0, grossCost);
    return { cost: Math.max(0, grossCost - credit), credit };
  } catch (err) {
    console.warn("[paqar/quote] shipping cost error:", err);
    return { cost: grossCost, credit: 0 };
  }
}
