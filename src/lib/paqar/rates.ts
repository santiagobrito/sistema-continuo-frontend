/**
 * Cotización de envío contra el endpoint /v1/rates de PAQ.AR.
 *
 * IMPORTANTE — background sobre /v1/rates:
 * Este endpoint NO está documentado en el manual oficial PAQ.AR v2 (2023-04).
 * Fue descubierto por ingeniería inversa el 2026-04-20 probando rutas
 * alternativas contra la API de producción. Ver docs/paqar-integration.md §Rates.
 *
 * - NO depende de una grilla local — Correo calcula el precio online
 *   según peso + destino + acuerdo comercial cargado de su lado.
 * - El payload aceptado fue inferido de los mensajes de error del API,
 *   los campos válidos del root son: agreement, senderData ({zipCode}),
 *   shippingData ({zipCode}), parcels, deliveryType, serviceType.
 *
 * Estrategia TIER:
 * - "cheap" (default): devuelve, por cada `deliveryType` solicitado, la rate
 *   más barata de las que devuelva el API.
 * - "premium": devuelve la rate más cara (mayor SLA, p.ej. Correo Argentino 01).
 * Controlado por env `PAQAR_TIER`. Permite cambiar de nivel sin redeploy.
 *
 * FALLBACK: si el endpoint falla (timeout, 5xx), usa una estimación conservadora
 * basada en peso + zona para no romper el checkout. Se loguea la caída para
 * revisión. El fallback NO refleja precios reales del acuerdo — es un "piso".
 */

import type { Bundle } from "./split";
import type { ProvinceCode, DeliveryType, PaqarRate } from "./types";
import { paqarClient } from "./client";

export interface QuoteInput {
  bundles: Bundle[];
  destState: ProvinceCode;
  destZip: string;
  /** Qué tipos queremos cotizar. Default: ambos (para mostrar 2 opciones en checkout). */
  deliveryTypes?: DeliveryType[];
}

export interface QuoteOption {
  deliveryType: DeliveryType;
  /** Total ARS sumando los N bultos. */
  total: number;
  /** Detalle por bulto (debug interno, no mostrar al cliente). */
  breakdown: Array<{ bundleIndex: number; weightGrams: number; price: number; rate: PaqarRate }>;
  /** "rates-api" | "fallback" — para distinguir cotización real de estimada. */
  source: "rates-api" | "fallback";
  /** Descripción legible del servicio elegido (p.ej. "Correo Argentino 03"). */
  serviceName: string;
  serviceCode: string;
}

export interface QuoteOutput {
  options: QuoteOption[];
  /** Tier aplicado (cheap/premium). */
  tier: "cheap" | "premium";
}

const FALLBACK_BASE_PRICE = 3500;
const FALLBACK_PRICE_PER_KG = 450;

const FALLBACK_ZONE_MULTIPLIER: Record<ProvinceCode, number> = {
  C: 1.0,
  B: 1.1,
  S: 1.3, E: 1.3, X: 1.3, L: 1.3,
  M: 1.5, J: 1.5, D: 1.5, F: 1.5, K: 1.5, G: 1.5, T: 1.5, H: 1.5, P: 1.5, N: 1.5, W: 1.5, Y: 1.5, A: 1.5,
  R: 1.7, Q: 1.7, U: 1.7,
  Z: 2.0, V: 2.0,
};

const FALLBACK_AGENCY_DISCOUNT = 0.85;

function fallbackPerBundle(
  bundle: Bundle,
  destState: ProvinceCode,
  deliveryType: DeliveryType
): number {
  const kg = Math.max(bundle.weightGrams / 1000, 0.1);
  const zoneMult = FALLBACK_ZONE_MULTIPLIER[destState] ?? 1.5;
  let price = (FALLBACK_BASE_PRICE + kg * FALLBACK_PRICE_PER_KG) * zoneMult;
  if (deliveryType === "agency" || deliveryType === "locker") {
    price *= FALLBACK_AGENCY_DISCOUNT;
  }
  return Math.round(price);
}

function pickRate(rates: PaqarRate[], tier: "cheap" | "premium"): PaqarRate | null {
  if (rates.length === 0) return null;
  const sorted = [...rates].sort((a, b) => Number(a.totalPrice) - Number(b.totalPrice));
  return tier === "cheap" ? sorted[0] : sorted[sorted.length - 1];
}

async function quoteBundle(
  bundle: Bundle,
  destZip: string,
  deliveryType: DeliveryType,
  serviceType: string,
  tier: "cheap" | "premium"
): Promise<{ price: number; rate: PaqarRate; source: "rates-api" }> {
  const rates = await paqarClient.getRates({
    senderData: { zipCode: process.env.PAQAR_SENDER_ZIP || "1706" },
    shippingData: { zipCode: destZip },
    parcels: [
      {
        weight: bundle.weightGrams,
        dimensions: {
          height: Math.min(Math.max(Math.round(bundle.height), 1), 999),
          width: Math.min(Math.max(Math.round(bundle.width), 1), 999),
          depth: Math.min(Math.max(Math.round(bundle.depth), 1), 999),
        },
        declaredValue: Math.max(Math.round(bundle.declaredValue), 1),
      },
    ],
    deliveryType,
    serviceType,
  });

  const filtered = deliveryType === "homeDelivery"
    ? rates.filter((r) => /domicilio/i.test(r.description))
    : rates.filter((r) => /sucursal/i.test(r.description));

  const pool = filtered.length > 0 ? filtered : rates;
  const chosen = pickRate(pool, tier);
  if (!chosen) throw new Error(`Sin rates para deliveryType=${deliveryType}`);
  return { price: Number(chosen.totalPrice), rate: chosen, source: "rates-api" };
}

export async function quoteShipment(input: QuoteInput): Promise<QuoteOutput> {
  const tier: "cheap" | "premium" =
    process.env.PAQAR_TIER === "premium" ? "premium" : "cheap";
  const serviceType = process.env.PAQAR_SERVICE_TYPE || "EP";
  const deliveryTypes: DeliveryType[] =
    input.deliveryTypes && input.deliveryTypes.length > 0
      ? input.deliveryTypes
      : ["homeDelivery", "agency"];

  const options: QuoteOption[] = [];

  for (const dt of deliveryTypes) {
    const breakdown: QuoteOption["breakdown"] = [];
    let total = 0;
    let usedFallback = false;
    let serviceName = "";
    let serviceCode = "";

    for (let i = 0; i < input.bundles.length; i++) {
      const b = input.bundles[i];
      try {
        const { price, rate } = await quoteBundle(b, input.destZip, dt, serviceType, tier);
        breakdown.push({ bundleIndex: i, weightGrams: b.weightGrams, price, rate });
        total += price;
        serviceName = rate.serviceName;
        serviceCode = rate.serviceCode;
      } catch (err) {
        console.warn(
          `[paqar/rates] fallback para bulto ${i} (dt=${dt}): ${(err as Error).message}`
        );
        usedFallback = true;
        const price = fallbackPerBundle(b, input.destState, dt);
        breakdown.push({
          bundleIndex: i,
          weightGrams: b.weightGrams,
          price,
          rate: {
            serviceName: "Estimado",
            description: dt === "homeDelivery" ? "Envío a domicilio" : "Envío a sucursal",
            serviceCode: "FALLBACK",
            currency: "ARS",
            totalPrice: String(price),
          },
        });
        total += price;
      }
    }

    options.push({
      deliveryType: dt,
      total,
      breakdown,
      source: usedFallback ? "fallback" : "rates-api",
      serviceName: serviceName || "Estimado",
      serviceCode: serviceCode || "FALLBACK",
    });
  }

  return { options, tier };
}
