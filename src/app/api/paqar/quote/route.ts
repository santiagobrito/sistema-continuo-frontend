/**
 * POST /api/paqar/quote
 *
 * Cotización de envío para el checkout. Público.
 * Usa grilla local (lib/paqar/rates-grid.ts) — NO llama al API de CA.
 * Precio devuelto YA incluye IVA 21%, sin desglose.
 *
 * Body:
 *   {
 *     items: SplitItem[],
 *     destState: ProvinceCode,
 *     destZip: string,
 *     deliveryTypes?: DeliveryType[]
 *   }
 *
 * Response:
 *   {
 *     ok: true,
 *     tier: "cheap" | "premium",
 *     service: "clasico" | "expreso",
 *     zone: 1-4,
 *     bundles: number,
 *     gridVersion: string,
 *     options: [
 *       { deliveryType, total, warning? }, ...
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
    const quote = quoteShipment({
      bundles,
      destState: destState as ProvinceCode,
      destZip,
      deliveryTypes,
    });

    return NextResponse.json({
      ok: true,
      tier: quote.tier,
      service: quote.service,
      gridVersion: quote.gridVersion,
      bundles: bundles.length,
      options: quote.options.map((o) => ({
        deliveryType: o.deliveryType,
        total: o.total,
        zone: o.zone,
        warning: o.warning,
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
