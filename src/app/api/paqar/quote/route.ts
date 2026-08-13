/**
 * POST /api/paqar/quote
 *
 * Cotización de envío para el checkout. Público.
 * Usa grilla local (lib/paqar/rates-grid.ts) — NO llama al API de CA.
 * Precio devuelto YA incluye IVA 21%, sin desglose.
 *
 * Si el carrito lleva productos con envío gratis, `total` viene con el crédito
 * ya descontado y se informa el desglose (`gross` / `credit`) para poder
 * mostrarle al cliente qué parte se bonificó. El crédito se calcula acá contra
 * WP: el browser no decide qué producto tiene envío gratis.
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
 *     bundles: number,
 *     gridVersion: string,
 *     hasFreeShipping: boolean,
 *     allFreeShipping: boolean,
 *     options: [
 *       { deliveryType, total, gross, credit, zone, warning? }, ...
 *     ]
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { quoteWithCredit } from "@/lib/paqar/quote-service";
import { isValidProvinceCode } from "@/lib/paqar/provinces";
import type { SplitItem } from "@/lib/paqar/split";
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

    const quote = await quoteWithCredit({
      items,
      destState: destState as ProvinceCode,
      destZip,
      deliveryTypes,
    });

    return NextResponse.json({
      ok: true,
      tier: quote.tier,
      service: quote.service,
      gridVersion: quote.gridVersion,
      bundles: quote.bundles,
      hasZeroWeight: quote.hasZeroWeight,
      zeroWeightIds: quote.zeroWeightIds,
      hasFreeShipping: quote.hasFreeShipping,
      allFreeShipping: quote.allFreeShipping,
      options: quote.options,
    });
  } catch (err) {
    console.error("[paqar/quote]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "error" },
      { status: 500 }
    );
  }
}
