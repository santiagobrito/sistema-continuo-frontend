/**
 * Cotización de envío contra grilla local PAQ.AR.
 *
 * Fuente de tarifas: rates-grid.ts (del PDF del acuerdo 20105, vigente 2026-04-01).
 *
 * ¿Por qué grilla local y no /v1/rates?
 * Probado 2026-04-20: el endpoint /v1/rates del acuerdo 20105 devuelve
 * tarifas dummy (500/400/300/200 ARS) independientes de peso y destino —
 * Correo no carga la grilla comercial en su API. La grilla real viene en PDF.
 * Por eso cotizamos local y solo usamos el API para crear órdenes + rótulos.
 *
 * Estrategia TIER (controlada por PAQAR_TIER):
 * - "cheap" (default): CLASICO. Más barato, despacho 3-7 días.
 * - "premium": EXPRESO. Más caro, despacho prioritario.
 * Ambos se facturan a Correo con su serviceCode correspondiente: CP / EP.
 *
 * Precio al cliente: SIEMPRE con IVA incluido (21%), sin desglose.
 *
 * Peso volumétrico: se compara peso_real vs peso_volumétrico (cm³/VOLUMETRIC_COEFFICIENT)
 * y se usa el mayor para elegir bracket (regla del tarifario, pág 3).
 */

import type { Bundle } from "./split";
import type { ProvinceCode, DeliveryType } from "./types";
import {
  lookupPrice,
  IVA_RATE,
  VOLUMETRIC_COEFFICIENT,
  RATES_GRID_VERSION,
  type PaqarRatesService,
  type PaqarRatesMode,
} from "./rates-grid";
import { resolveZone } from "./zone-resolver";

export interface QuoteInput {
  bundles: Bundle[];
  destState: ProvinceCode;
  destZip: string;
  /** Default: ["homeDelivery", "agency"] — devuelve las 2 opciones para el checkout. */
  deliveryTypes?: DeliveryType[];
}

export interface QuoteOption {
  deliveryType: DeliveryType;
  /** Total ARS con IVA incluido, sumando los N bultos. */
  total: number;
  /** Servicio usado: clasico | expreso (según PAQAR_TIER). */
  service: PaqarRatesService;
  /** Zona de facturación 1-4. */
  zone: number;
  /** Detalle por bulto — interno, no mostrar al cliente. */
  breakdown: Array<{
    bundleIndex: number;
    weightGrams: number;
    chargeableWeightGrams: number; // el mayor entre real y volumétrico
    priceNoIva: number;
    priceWithIva: number;
  }>;
  /** Advertencia si algún bulto supera el máximo del tarifario (50kg). */
  warning?: string;
}

export interface QuoteOutput {
  options: QuoteOption[];
  tier: "cheap" | "premium";
  service: PaqarRatesService;
  gridVersion: string;
}

function volumetricGrams(b: Bundle): number {
  const cm3 = (b.height || 10) * (b.width || 10) * (b.depth || 10);
  return Math.round((cm3 / VOLUMETRIC_COEFFICIENT) * 1000);
}

function chargeableGrams(b: Bundle): number {
  return Math.max(b.weightGrams || 0, volumetricGrams(b));
}

function toMode(dt: DeliveryType): PaqarRatesMode {
  return dt === "homeDelivery" ? "homeDelivery" : "agency";
}

function withIva(price: number): number {
  return Math.round(price * (1 + IVA_RATE));
}

const SENDER_CP = process.env.PAQAR_SENDER_ZIP || "1706";
const SENDER_STATE = (process.env.PAQAR_SENDER_STATE || "B") as ProvinceCode;

export function quoteShipment(input: QuoteInput): QuoteOutput {
  const tier: "cheap" | "premium" =
    process.env.PAQAR_TIER === "premium" ? "premium" : "cheap";
  const service: PaqarRatesService = tier === "premium" ? "expreso" : "clasico";

  const zone = resolveZone({
    originCp: SENDER_CP,
    originState: SENDER_STATE,
    destCp: input.destZip,
    destState: input.destState,
  });

  const deliveryTypes: DeliveryType[] =
    input.deliveryTypes && input.deliveryTypes.length > 0
      ? input.deliveryTypes
      : ["homeDelivery", "agency"];

  const options: QuoteOption[] = [];

  for (const dt of deliveryTypes) {
    const mode = toMode(dt);
    const breakdown: QuoteOption["breakdown"] = [];
    let total = 0;
    let warning: string | undefined;

    if (!zone) {
      warning = `No se pudo resolver zona para destino ${input.destState} ${input.destZip}`;
      options.push({ deliveryType: dt, total: 0, service, zone: 0, breakdown: [], warning });
      continue;
    }

    for (let i = 0; i < input.bundles.length; i++) {
      const b = input.bundles[i];
      const chargeable = chargeableGrams(b);
      const noIva = lookupPrice(service, mode, zone, chargeable);

      if (noIva === null) {
        warning = `Bulto ${i + 1} (${(chargeable / 1000).toFixed(1)}kg) supera el máximo 50kg del tarifario`;
        continue;
      }

      const ivaPrice = withIva(noIva);
      breakdown.push({
        bundleIndex: i,
        weightGrams: b.weightGrams,
        chargeableWeightGrams: chargeable,
        priceNoIva: noIva,
        priceWithIva: ivaPrice,
      });
      total += ivaPrice;
    }

    options.push({
      deliveryType: dt,
      total,
      service,
      zone,
      breakdown,
      warning,
    });
  }

  return { options, tier, service, gridVersion: RATES_GRID_VERSION };
}
