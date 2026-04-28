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
  /**
   * Peso máximo en gramos para consolidar items chicos en una misma caja.
   * 25kg deja un buffer de 5kg respecto al ABSOLUTE_MAX (30kg) para ítems con
   * peso real subestimado por _weight desactualizado o cajas pesando de más.
   * Decisión 2026-04-28: subir de 15kg a 25kg para reducir cantidad de bultos
   * por orden grande y bajar el costo logístico — el cliente aceptó cajas más
   * pesadas operativamente.
   */
  MAX_CONSOLIDATED_WEIGHT_G: 25000,
  /** Dimensión máxima (cualquier lado) en cm para consolidar. Correo acepta hasta 150cm por lado. */
  MAX_CONSOLIDATED_DIM_CM: 80,
  /** Volumen máximo por caja en cm³. Evita que productos "chatos y anchos" se separen innecesariamente. */
  MAX_CONSOLIDATED_VOLUME_CM3: 80000,
  /**
   * Tope ABSOLUTO por bulto del acuerdo PAQ.AR (30kg confirmado por el cliente
   * 2026-04-28). La API rechaza cualquier bulto por encima.
   * Override vía env `PAQAR_MAX_WEIGHT_GRAMS` si Correo cambia el contrato.
   */
  ABSOLUTE_MAX_WEIGHT_G: Number(process.env.PAQAR_MAX_WEIGHT_GRAMS) || 30000,
  /**
   * Dimensión mínima declarable (si el producto no tiene datos).
   * El API requiere dimensions obligatorias.
   */
  FALLBACK_DIM_CM: 10,
  /** Peso mínimo declarable si el producto no tiene datos. */
  FALLBACK_WEIGHT_G: 500,
};

/**
 * Error específico de split — cuando un ítem no puede ir por PAQ.AR.
 * El handler API lo convierte en un mensaje claro al admin.
 */
export class PaqarSplitError extends Error {
  constructor(message: string, public readonly code: 'item_too_heavy' | 'bundle_too_heavy') {
    super(message);
    this.name = 'PaqarSplitError';
  }
}

function maxDim(item: SplitItem): number {
  return Math.max(item.height || 0, item.width || 0, item.depth || 0);
}

function itemVolume(item: SplitItem): number {
  const h = item.height || SPLIT_RULES.FALLBACK_DIM_CM;
  const w = item.width  || SPLIT_RULES.FALLBACK_DIM_CM;
  const d = item.depth  || SPLIT_RULES.FALLBACK_DIM_CM;
  return h * w * d;
}

function isBulky(item: SplitItem): boolean {
  const weight = item.weight || SPLIT_RULES.FALLBACK_WEIGHT_G;
  if (weight > SPLIT_RULES.MAX_CONSOLIDATED_WEIGHT_G) return true;
  if (maxDim(item) > SPLIT_RULES.MAX_CONSOLIDATED_DIM_CM) return true;
  if (itemVolume(item) > SPLIT_RULES.MAX_CONSOLIDATED_VOLUME_CM3) return true;
  return false;
}

function makeBulkyBundle(item: SplitItem): Bundle {
  const weight = Math.max(item.weight || SPLIT_RULES.FALLBACK_WEIGHT_G, 1);
  if (weight > SPLIT_RULES.ABSOLUTE_MAX_WEIGHT_G) {
    throw new PaqarSplitError(
      `El producto "${item.name}" pesa ${(weight / 1000).toFixed(1)}kg y supera el máximo de ${SPLIT_RULES.ABSOLUTE_MAX_WEIGHT_G / 1000}kg por bulto del Correo Argentino. Despachalo por transporte al interior u otro método.`,
      'item_too_heavy'
    );
  }
  return {
    items: [{ id: item.id, name: item.name, quantity: 1 }],
    weightGrams: weight,
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
  // Nota: max() en cada eje subestima el alto real cuando apilás (ej: 3 resmas
  // apiladas tienen alto=6 pero acá reportamos 2). Trade-off aceptado: beneficia
  // la cotización; si un paquete real supera, ajustar manualmente. El control
  // de volumen acumulado en splitIntoBundles previene cajas físicamente
  // imposibles (ver MAX_CONSOLIDATED_VOLUME_CM3).
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
  let currentVolume = 0;
  for (const item of small) {
    const unitVolume = itemVolume(item);
    for (let i = 0; i < item.quantity; i++) {
      const unitWeight = item.weight || SPLIT_RULES.FALLBACK_WEIGHT_G;
      const wouldExceedWeight =
        current.weightGrams + unitWeight > SPLIT_RULES.MAX_CONSOLIDATED_WEIGHT_G;
      const wouldExceedVolume =
        currentVolume + unitVolume > SPLIT_RULES.MAX_CONSOLIDATED_VOLUME_CM3;

      if (current.items.length > 0 && (wouldExceedWeight || wouldExceedVolume)) {
        bundles.push(current);
        current = newEmptyBundle();
        currentVolume = 0;
      }
      addToConsolidated(current, item);
      currentVolume += unitVolume;
    }
  }
  if (current.items.length > 0) bundles.push(current);

  // Validación final: ningún bulto puede superar el tope absoluto.
  // Si un consolidate-bundle quedó por encima (por ejemplo varios fallbacks
  // sumaron mucho), cortar la creación: el flow está roto.
  for (const b of bundles) {
    if (b.weightGrams > SPLIT_RULES.ABSOLUTE_MAX_WEIGHT_G) {
      const itemList = b.items.map(i => `${i.quantity}x ${i.name}`).join(', ');
      throw new PaqarSplitError(
        `Bulto consolidado de ${(b.weightGrams / 1000).toFixed(1)}kg supera el máximo de ${SPLIT_RULES.ABSOLUTE_MAX_WEIGHT_G / 1000}kg de PAQ.AR. Contenido: ${itemList}.`,
        'bundle_too_heavy'
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
