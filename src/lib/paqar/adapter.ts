/**
 * Adaptador: una orden de WooCommerce → N payloads POST /v1/orders de PAQ.AR.
 *
 * Uso típico:
 *   const payloads = buildPaqarPayloads({ wcOrder, deliveryType, agencyId });
 *   const responses = await paqarClient.createOrders(payloads);
 *   // responses[i].trackingNumber va guardado en WC meta
 */

import type {
  PaqarCreateOrderPayload,
  PaqarPerson,
  DeliveryType,
} from "./types";
import { splitIntoBundles, bundleToParcel, type SplitItem } from "./split";
import { provinceNameToCode } from "./provinces";
import { getSenderData } from "./sender";
import { paqarClient } from "./client";

/**
 * Subset de la WC Order que necesitamos. Campos tomados del WC REST API v3.
 * Si el frontend usa Store API o una representación custom, mapear en el caller.
 */
export interface WcOrderLike {
  id: number;
  line_items: Array<{
    id?: number;
    product_id: number;
    variation_id?: number;
    name: string;
    sku?: string;
    quantity: number;
    price?: string | number;
    meta_data?: Array<{ key: string; value: unknown }>;
    /** Extendido: algunos endpoints inyectan dimensiones/peso resueltos. */
    _dimensions?: { length?: string; width?: string; height?: string };
    _weight?: string;
    _category?: string;
  }>;
  shipping: {
    first_name: string;
    last_name: string;
    address_1: string;
    address_2?: string;
    city: string;
    state: string;
    postcode: string;
    country?: string;
    phone?: string;
  };
  billing: {
    email?: string;
    phone?: string;
  };
  meta_data?: Array<{ key: string; value: unknown }>;
}

export interface BuildOptions {
  deliveryType: DeliveryType;
  /** Obligatorio si deliveryType != "homeDelivery". */
  agencyId?: string;
  /** Override del serviceType (default toma del client config). */
  serviceType?: string;
  /** Para logs / idempotencia. */
  shipmentClientId?: string;
}

/**
 * Divide la dirección en streetName + streetNumber.
 * WC suele guardar "Av. Rivadavia 17002 depto 4B" en address_1.
 */
function splitStreetAndNumber(address: string): {
  streetName: string;
  streetNumber: string;
} {
  if (!address) return { streetName: "", streetNumber: "" };
  const match = address.match(/^(.*?)\s+(\d+[A-Za-z]?)(?:\s|$|,)/);
  if (match) {
    return {
      streetName: match[1].trim(),
      streetNumber: match[2].trim(),
    };
  }
  return { streetName: address.trim(), streetNumber: "S/N" };
}

/** Separa áreaCódigo del teléfono (formato AR). */
function splitPhone(phone?: string): { area: string; number: string } {
  if (!phone) return { area: "", number: "" };
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length <= 8) return { area: "", number: cleaned };
  if (cleaned.startsWith("54") && cleaned.length > 10) {
    const rest = cleaned.substring(2);
    return { area: rest.substring(0, rest.length - 8), number: rest.substring(rest.length - 8) };
  }
  return {
    area: cleaned.substring(0, cleaned.length - 8),
    number: cleaned.substring(cleaned.length - 8),
  };
}

/**
 * Construye el shippingData para el payload a partir del shipping de WC.
 */
export function buildShippingData(
  order: WcOrderLike,
  deliveryType: DeliveryType
): PaqarPerson {
  const phone = splitPhone(order.shipping.phone || order.billing.phone);

  // shippingData NO acepta businessName ni id — solo name.
  const base: PaqarPerson = {
    name: `${order.shipping.first_name} ${order.shipping.last_name}`.trim(),
    email: order.billing.email || "",
    areaCodePhone: phone.area,
    phoneNumber: phone.number,
    areaCodeCellphone: phone.area,
    cellphoneNumber: phone.number,
    // Evitar que CA renderice literal "null" debajo del destinatario.
    observation: "",
  };

  // Cuando el envío es a sucursal/locker, el manual dice que solo se requieren
  // los datos personales del destinatario. Omitir address evita conflicto entre
  // "ir a sucursal X" vs "dirección del cliente Y", que CA marca como inválido.
  if (deliveryType !== "homeDelivery") {
    return base;
  }

  const stateCode = provinceNameToCode(order.shipping.state);
  if (!stateCode) {
    throw new Error(
      `PAQ.AR: provincia inválida "${order.shipping.state}" en orden #${order.id}`
    );
  }

  const { streetName, streetNumber } = splitStreetAndNumber(order.shipping.address_1);
  base.address = {
    streetName,
    streetNumber,
    cityName: order.shipping.city,
    state: stateCode,
    // PAQ.AR exige zipCode numérico de 4 dígitos. Si el cliente cargó el CPA
    // (formato "X5000XXX": letra de provincia + 4 dígitos + 3 letras de manzana),
    // PAQ.AR responde 400 "Conversion failed... value 'X5000' to data type int".
    // Detectado por orden #14805 (2026-04-27, Córdoba "X5000").
    // Normalizamos: extraemos los primeros 4 dígitos consecutivos del string.
    zipCode: normalizeZipCode(order.shipping.postcode),
    // CA renderiza literal "null" en el rótulo cuando floor/department vienen
    // ausentes — mandamos string vacío explícito para evitarlo.
    floor: "",
    department: order.shipping.address_2 || "",
  };
  return base;
}

/**
 * Normaliza un código postal argentino al formato numérico de 4 dígitos que
 * PAQ.AR requiere. Acepta: "5000", "X5000", "X5000XXX", " 5000 ", etc.
 * Si no se puede extraer 4 dígitos consecutivos, devuelve el original (que PAQ.AR
 * va a rechazar igual, pero al menos el error queda en su lado y diagnosticable).
 */
function normalizeZipCode(raw: string | undefined | null): string {
  const s = String(raw || "").trim();
  const m = s.match(/\d{4}/);
  return m ? m[0] : s;
}

/**
 * Convierte line_items de WC a SplitItem[] normalizados.
 */
export function wcItemsToSplitItems(order: WcOrderLike): SplitItem[] {
  return order.line_items.map((li) => {
    const dims = li._dimensions || {};
    return {
      id: String(li.variation_id || li.product_id),
      name: li.name,
      quantity: li.quantity,
      weight: li._weight ? Number(li._weight) * 1000 : 0,
      height: Number(dims.height || 0),
      width: Number(dims.width || 0),
      depth: Number(dims.length || 0),
      price: Number(li.price || 0),
      category: li._category,
    };
  });
}

/**
 * Entrada única: recibe una orden WC + opciones y devuelve N payloads
 * listos para POSTear a /v1/orders.
 */
export function buildPaqarPayloads(
  order: WcOrderLike,
  opts: BuildOptions
): PaqarCreateOrderPayload[] {
  if (opts.deliveryType !== "homeDelivery" && !opts.agencyId) {
    throw new Error(
      `PAQ.AR: agencyId es obligatorio cuando deliveryType="${opts.deliveryType}"`
    );
  }

  const senderData = getSenderData();
  const shippingData = buildShippingData(order, opts.deliveryType);
  const bundles = splitIntoBundles(wcItemsToSplitItems(order));

  if (bundles.length === 0) {
    throw new Error(`PAQ.AR: orden #${order.id} sin ítems despachables`);
  }

  const saleDate = new Date().toISOString().replace(/\.\d{3}Z$/, "-03:00");
  const serviceType = opts.serviceType || paqarClient.serviceType;
  const sellerId = paqarClient.sellerId;

  return bundles.map((bundle, idx) => ({
    sellerId,
    order: {
      senderData,
      shippingData,
      parcels: [bundleToParcel(bundle)],
      deliveryType: opts.deliveryType,
      agencyId: opts.agencyId || "",
      saleDate,
      serviceType,
      shipmentClientId: opts.shipmentClientId
        ? `${opts.shipmentClientId}-${idx + 1}`
        : `WC${order.id}-${idx + 1}`,
    },
  }));
}
