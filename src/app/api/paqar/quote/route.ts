/**
 * POST /api/paqar/quote
 *
 * Cotización de envío para el checkout. Público.
 * Llama al endpoint /v1/rates de PAQ.AR (online) y devuelve las 2 opciones
 * consolidadas (domicilio + sucursal), cada una con el precio del acuerdo.
 *
 * Si el API falla, cae a un estimado conservador (lib/paqar/rates.ts fallback).
 *
 * Body:
 *   {
 *     items: SplitItem[],           // line items del carrito
 *     destState: ProvinceCode,      // "B", "C", ...
 *     destZip: string,              // CP destino
 *     deliveryTypes?: DeliveryType[]  // opcional; default ["homeDelivery","agency"]
 *   }
 *
 * Response:
 *   {
 *     ok: true,
 *     tier: "cheap" | "premium",
 *     bundles: number,
 *     options: [
 *       { deliveryType, total, source, serviceName, serviceCode }, ...
 *     ]
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { splitIntoBundles, type SplitItem } from "@/lib/paqar/split";
import { quoteShipment } from "@/lib/paqar/rates";
import { isValidProvinceCode } from "@/lib/paqar/provinces";
import type { DeliveryType, ProvinceCode } from "@/lib/paqar/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      items,
      destState,
      destZip,
      deliveryTypes,
    } = body as {
      items: SplitItem[];
      destState: string;
      destZip: string;
      deliveryTypes?: DeliveryType[];
    };

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "items[] requerido" }, { status: 400 });
    }

    if (!isValidProvinceCode(destState)) {
      return NextResponse.json(
        { error: `provincia inválida: ${destState}` },
        { status: 400 }
      );
    }

    if (!destZip || destZip.length < 4) {
      return NextResponse.json(
        { error: "destZip requerido (CP destino)" },
        { status: 400 }
      );
    }

    const bundles = splitIntoBundles(items);
    const quote = await quoteShipment({
      bundles,
      destState: destState as ProvinceCode,
      destZip,
      deliveryTypes,
    });

    return NextResponse.json({
      ok: true,
      tier: quote.tier,
      bundles: bundles.length,
      options: quote.options.map((o) => ({
        deliveryType: o.deliveryType,
        total: o.total,
        source: o.source,
        serviceName: o.serviceName,
        serviceCode: o.serviceCode,
      })),
    });
  } catch (err) {
    console.error("[paqar/quote]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "error" },
      { status: 500 }
    );
  }
}
