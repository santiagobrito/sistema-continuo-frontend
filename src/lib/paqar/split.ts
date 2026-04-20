/**
 * Split de un carrito en N bultos físicos para envío por PAQ.AR.
 *
 * Reglas (ajustables en SPLIT_RULES):
 * - Ítem > MAX_CONSOLIDATED_WEIGHT_G → bulto propio por cada unidad.
 * - Ítem con alguna dimensión > MAX_CONSOLIDATED_DIM_CM → bulto propio.
 * - Resto (ítems chicos) → consolidar hasta MAX_CONSOLIDATED_WEIGHT_G por caja.
 *
 * Input esperado: array de line items normalizados (ver `SplitItem`).
 * Output: array de `Bundle` con peso, dimensiones y valor declarado acumulados.
 *
 * No depende de Next.js ni WC — función pura, testeable.
 */

import type { PaqarParcel } from "./types";

export interface SplitItem {
  /** SKU / id único para logging. */
  id: string;
  /** Nombre para logging y categoría. */
  name: string;
  /** Cantidad de unidades de este ítem en el carrito. */
  quantity: number;
  /** Peso UNITARIO en gramos. */
  weight: number;
  /** Alto UNITARIO en cm. */
  height: number;
  /** Ancho UNITARIO en cm. */
  width: number;
  /** Largo UNITARIO en cm. */
  depth: number;
  /** Precio UNITARIO (ARS) — usado para declaredValue. */
  price: number;
  /** Categoría principal para `productCategory` del API. */
  category?: string;
}

export interface Bundle {
  /** Ítems contenidos (informativo, no se manda al API). */
  items: Array<{ id: string; name: string; quantity: number }>;
  /** Peso total del bulto en gramos. */
  weightGrams: number;
  /** Dimensiones del bulto (heurística: el ítem más grande contenido). */
  height: number;
  width: number;
  depth: number;
  /** Suma de precios × qty de los ítems contenidos (ARS). */
  declaredValue: number;
  /** Categoría dominante (primer bulky item, o la más frecuente entre los chicos). */
  category: string;
  /** Razón por la que se creó este bulto (debug). */
  reason: "bulky" | "consolidated";
}

export const SPLIT_RULES = {
  /** Peso máximo en gramos para consolidar en una misma caja. */
  MAX_CONSOLIDATED_WEIGHT_G: 5000,
  /** Dimensión máxima (cualquier lado) en cm para consolidar. */
  MAX_CONSOLIDATED_DIM_CM: 45,
  /**
   * Tope absoluto por bulto del acuerdo (API rechaza por encima).
   * Leer del env PAQAR_MAX_WEIGHT_GRAMS, default 25000.
   */
  ABSOLUTE_MAX_WEIGHT_G: Number(process.env.PAQAR_MAX_WEIGHT_GRAMS) || 25000,
  /**
   * Dimensión mínima declarable (si el producto no tiene datos).
   * El API requiere dimensions obligatorias.
   */
  FALLBACK_DIM_CM: 10,
  /** Peso mínimo declarable si el producto no tiene datos. */
  FALLBACK_WEIGHT_G: 500,
};

function maxDim(item: SplitItem): number {
  return Math.max(item.height || 0, item.width || 0, item.depth || 0);
}

function isBulky(item: SplitItem): boolean {
  const w = item.weight || SPLIT_RULES.FALLBACK_WEIGHT_G;
  if (w > SPLIT_RULES.MAX_CONSOLIDATED_WEIGHT_G) return true;
  if (maxDim(item) > SPLIT_RULES.MAX_CONSOLIDATED_DIM_CM) return true;
  return false;
}

function makeBulkyBundle(item: SplitItem): Bundle {
  return {
    items: [{ id: item.id, name: item.name, quantity: 1 }],
    weightGrams: Math.max(
      item.weight || SPLIT_RULES.FALLBACK_WEIGHT_G,
      1
    ),
    height: item.height || SPLIT_RULES.FALLBACK_DIM_CM,
    width: item.width || SPLIT_RULES.FALLBACK_DIM_CM,
    depth: item.depth || SPLIT_RULES.FALLBACK_DIM_CM,
    declaredValue: item.price,
    category: item.category || item.name || "general",
    reason: "bulky",
  };
}

function newEmptyBundle(): Bundle {
  return {
    items: [],
    weightGrams: 0,
    height: 0,
    width: 0,
    depth: 0,
    declaredValue: 0,
    category: "varios",
    reason: "consolidated",
  };
}

function addToConsolidated(bundle: Bundle, item: SplitItem): void {
  const unitWeight = item.weight || SPLIT_RULES.FALLBACK_WEIGHT_G;
  bundle.weightGrams += unitWeight;
  bundle.declaredValue += item.price;
  bundle.height = Math.max(bundle.height, item.height || SPLIT_RULES.FALLBACK_DIM_CM);
  bundle.width = Math.max(bundle.width, item.width || SPLIT_RULES.FALLBACK_DIM_CM);
  bundle.depth = Math.max(bundle.depth, item.depth || SPLIT_RULES.FALLBACK_DIM_CM);

  const existing = bundle.items.find((i) => i.id === item.id);
  if (existing) existing.quantity += 1;
  else bundle.items.push({ id: item.id, name: item.name, quantity: 1 });

  if (bundle.items.length === 1 && item.category) {
    bundle.category = item.category;
  }
}

/**
 * Algoritmo principal: divide los ítems del carrito en N bultos.
 */
export function splitIntoBundles(items: SplitItem[]): Bundle[] {
  const bundles: Bundle[] = [];

  const bulky: SplitItem[] = [];
  const small: SplitItem[] = [];

  for (const item of items) {
    if (isBulky(item)) bulky.push(item);
    else small.push(item);
  }

  for (const item of bulky) {
    for (let i = 0; i < item.quantity; i++) {
      bundles.push(makeBulkyBundle(item));
    }
  }

  let current = newEmptyBundle();
  for (const item of small) {
    for (let i = 0; i < item.quantity; i++) {
      const unitWeight = item.weight || SPLIT_RULES.FALLBACK_WEIGHT_G;
      if (
        current.items.length > 0 &&
        current.weightGrams + unitWeight > SPLIT_RULES.MAX_CONSOLIDATED_WEIGHT_G
      ) {
        bundles.push(current);
        current = newEmptyBundle();
      }
      addToConsolidated(current, item);
    }
  }
  if (current.items.length > 0) bundles.push(current);

  for (const b of bundles) {
    if (b.weightGrams > SPLIT_RULES.ABSOLUTE_MAX_WEIGHT_G) {
      console.warn(
        `[paqar/split] bulto de ${b.weightGrams}g supera ABSOLUTE_MAX_WEIGHT_G=${SPLIT_RULES.ABSOLUTE_MAX_WEIGHT_G}. Items:`,
        b.items
      );
    }
  }

  return bundles;
}

/**
 * Convierte un Bundle al formato `parcels[0]` del payload PAQ.AR.
 */
export function bundleToParcel(b: Bundle): PaqarParcel {
  const clamp3 = (n: number) => String(Math.min(Math.max(Math.round(n), 1), 999));
  return {
    dimensions: {
      height: clamp3(b.height),
      width: clamp3(b.width),
      depth: clamp3(b.depth),
    },
    productWeight: String(Math.max(Math.round(b.weightGrams), 1)),
    productCategory: b.category,
    declaredValue: String(Math.max(Math.round(b.declaredValue), 1)),
  };
}
