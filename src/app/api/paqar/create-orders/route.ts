/**
 * POST /api/paqar/create-orders
 *
 * Invocado cuando un pago se aprueba. Toma la WC order, la splitea en N bultos,
 * crea N órdenes en PAQ.AR y guarda el array de trackingNumbers en WC meta.
 *
 * Body:
 *   { orderId: number, deliveryType: "homeDelivery"|"agency"|"locker", agencyId?: string }
 *
 * Seguridad: llamar con header `x-internal-secret` === env.INTERNAL_API_SECRET.
 * NO exponer al frontend público directamente.
 */

import { NextRequest, NextResponse } from "next/server";
import { paqarClient } from "@/lib/paqar/client";
import { buildPaqarPayloads, type WcOrderLike } from "@/lib/paqar/adapter";
import type { DeliveryType } from "@/lib/paqar/types";

const WP_URL = process.env.WP_URL || process.env.NEXT_PUBLIC_WP_URL || "";
const WC_API_AUTH = process.env.WC_API_AUTH || "";
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || "";

async function fetchWcOrder(orderId: number): Promise<WcOrderLike> {
  const res = await fetch(`${WP_URL}/wp-json/wc/v3/orders/${orderId}`, {
    headers: { Authorization: `Basic ${WC_API_AUTH}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`WC order ${orderId} fetch fail: ${res.status}`);
  return res.json();
}

async function enrichWithProductDims(order: WcOrderLike): Promise<WcOrderLike> {
  const ids = [
    ...new Set(
      order.line_items.map((li) => li.variation_id || li.product_id).filter(Boolean)
    ),
  ];

  const products = await Promise.all(
    ids.map(async (id) => {
      const res = await fetch(`${WP_URL}/wp-json/wc/v3/products/${id}`, {
        headers: { Authorization: `Basic ${WC_API_AUTH}` },
        cache: "no-store",
      });
      if (!res.ok) return null;
      return res.json();
    })
  );

  const byId = new Map(products.filter(Boolean).map((p) => [p.id, p]));

  return {
    ...order,
    line_items: order.line_items.map((li) => {
      const pid = li.variation_id || li.product_id;
      const p = byId.get(pid);
      if (!p) return li;
      return {
        ...li,
        _weight: p.weight,
        _dimensions: p.dimensions,
        _category: p.categories?.[0]?.name,
      };
    }),
  };
}

async function saveTrackingsToWc(
  orderId: number,
  trackings: Array<{ trackingNumber: string; bundleIndex: number }>
): Promise<void> {
  await fetch(`${WP_URL}/wp-json/wc/v3/orders/${orderId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${WC_API_AUTH}`,
    },
    body: JSON.stringify({
      meta_data: [
        { key: "_sc_paqar_trackings", value: JSON.stringify(trackings) },
        { key: "_sc_paqar_created_at", value: new Date().toISOString() },
      ],
    }),
  });
}

export async function POST(request: NextRequest) {
  if (request.headers.get("x-internal-secret") !== INTERNAL_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    if (!paqarClient.isConfigured()) {
      return NextResponse.json(
        { error: "PAQ.AR no configurado (faltan credenciales)" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { orderId, deliveryType, agencyId } = body as {
      orderId: number;
      deliveryType: DeliveryType;
      agencyId?: string;
    };

    if (!orderId || !deliveryType) {
      return NextResponse.json(
        { error: "orderId y deliveryType son obligatorios" },
        { status: 400 }
      );
    }

    let order = await fetchWcOrder(orderId);
    order = await enrichWithProductDims(order);

    const payloads = buildPaqarPayloads(order, { deliveryType, agencyId });
    const responses = await paqarClient.createOrders(payloads);

    const trackings = responses.map((r, idx) => ({
      trackingNumber: r.trackingNumber,
      bundleIndex: idx,
    }));

    await saveTrackingsToWc(orderId, trackings);

    return NextResponse.json({
      ok: true,
      bundles: payloads.length,
      trackings,
    });
  } catch (err) {
    console.error("[paqar/create-orders]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "error" },
      { status: 500 }
    );
  }
}
