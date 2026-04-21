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

const WP_URL = process.env.WP_URL || process.env.NEXT_PUBLIC_WP_URL || "";

interface DimsResponse {
  dims: Record<string, { weight: string | null; length: string | null; width: string | null; height: string | null }>;
}

/**
 * Trae peso (kg → g) y dimensiones (cm) reales de cada item desde el plugin WP
 * (endpoint sc/v1/product-dims, lee _weight/_length/_width/_height de postmeta —
 * funciona para productos simples Y variaciones).
 *
 * Si un item no tiene datos en WP (o el endpoint falla), se mantienen los
 * valores que vinieron del cliente (que normalmente son fallbacks).
 */
async function enrichItemsWithDims(items: SplitItem[]): Promise<SplitItem[]> {
  if (!WP_URL || items.length === 0) return items;

  const ids = Array.from(new Set(items.map((it) => it.id).filter(Boolean)));
  if (ids.length === 0) return items;

  try {
    const res = await fetch(
      `${WP_URL}/wp-json/sc/v1/product-dims?ids=${ids.join(",")}`,
      { cache: "no-store" }
    );
    if (!res.ok) {
      console.warn("[paqar/quote] product-dims fetch failed:", res.status);
      return items;
    }
    const data = (await res.json()) as DimsResponse;
    const dims = data.dims || {};

    return items.map((it) => {
      const d = dims[it.id];
      if (!d) return it;
      return {
        ...it,
        // WC guarda peso en kg → convertir a gramos. Si null/0, dejar fallback.
        weight: d.weight ? Number(d.weight) * 1000 : it.weight,
        height: d.height ? Number(d.height) : it.height,
        width:  d.width  ? Number(d.width)  : it.width,
        depth:  d.length ? Number(d.length) : it.depth,
      };
    });
  } catch (err) {
    console.warn("[paqar/quote] enrich error:", err);
    return items;
  }
}

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

    const enrichedItems = await enrichItemsWithDims(items);
    const bundles = splitIntoBundles(enrichedItems);
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
