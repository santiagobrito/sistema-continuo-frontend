import { safeEqual } from "@/lib/auth/timing-safe";
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

/**
 * Cajas de apilado de los productos, desde el mismo endpoint que usa la
 * cotización del checkout (`sc/v1/product-dims`).
 *
 * Se lee de ahí y no de `wc/v3/products/{id}` a propósito: en una variación el
 * meta ACF vive en el producto padre y `wc/v3` devuelve `meta_data: []`. Si la
 * etiqueta usara otra fuente que la cotización, cobraríamos una caja y
 * despacharíamos otra.
 */
async function fetchPackBoxes(
  ids: number[]
): Promise<Map<number, { qty: number; length: number; width: number; height: number }>> {
  const out = new Map<number, { qty: number; length: number; width: number; height: number }>();
  if (ids.length === 0) return out;

  try {
    const res = await fetch(
      `${WP_URL}/wp-json/sc/v1/product-dims?ids=${ids.join(",")}`,
      { cache: "no-store" }
    );
    if (!res.ok) {
      console.warn("[paqar/create-orders] product-dims fail:", res.status);
      return out;
    }
    const data = (await res.json()) as {
      dims?: Record<string, { pack?: { qty: number; length: number; width: number; height: number } | null }>;
    };
    for (const [id, d] of Object.entries(data.dims || {})) {
      if (d?.pack) out.set(Number(id), d.pack);
    }
  } catch (err) {
    console.warn("[paqar/create-orders] product-dims error:", err);
  }
  return out;
}

async function enrichWithProductDims(order: WcOrderLike): Promise<WcOrderLike> {
  const ids = [
    ...new Set(
      order.line_items.map((li) => li.variation_id || li.product_id).filter(Boolean)
    ),
  ];

  const [products, packs] = await Promise.all([
    Promise.all(
      ids.map(async (id) => {
        const res = await fetch(`${WP_URL}/wp-json/wc/v3/products/${id}`, {
          headers: { Authorization: `Basic ${WC_API_AUTH}` },
          cache: "no-store",
        });
        if (!res.ok) return null;
        return res.json();
      })
    ),
    fetchPackBoxes(ids),
  ]);

  const byId = new Map(products.filter(Boolean).map((p) => [p.id, p]));

  return {
    ...order,
    line_items: order.line_items.map((li) => {
      const pid = li.variation_id || li.product_id;
      const p = byId.get(pid);
      const pack = packs.get(pid);
      if (!p) return pack ? { ...li, _pack: pack } : li;
      return {
        ...li,
        _weight: p.weight,
        _dimensions: p.dimensions,
        _category: p.categories?.[0]?.name,
        _pack: pack,
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
        // Sale de la cola del cron de reintento (`paqar-retry-pendientes`).
        { key: "_sc_paqar_autocreate_failed_at", value: "" },
        { key: "_sc_paqar_autocreate_error", value: "" },
      ],
    }),
  });
}

export async function POST(request: NextRequest) {
  if (!safeEqual(request.headers.get("x-internal-secret"), INTERNAL_SECRET)) {
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
    const { orderId, deliveryType, agencyId, forceSingleBundle } = body as {
      orderId: number;
      deliveryType: DeliveryType;
      agencyId?: string;
      forceSingleBundle?: boolean;
    };

    if (!orderId || !deliveryType) {
      return NextResponse.json(
        { error: "orderId y deliveryType son obligatorios" },
        { status: 400 }
      );
    }

    let order = await fetchWcOrder(orderId);
    order = await enrichWithProductDims(order);

    const payloads = buildPaqarPayloads(order, {
      deliveryType,
      agencyId,
      forceSingleBundle: !!forceSingleBundle,
    });

    // Antes usábamos Promise.all. Si TN1 se creaba OK pero TN2 fallaba, Promise.all
    // rechazaba con el error de TN2 → no se guardaba nada → TN1 quedaba huérfano en
    // PAQ.AR (creado allá, sin registro acá).
    // Ahora usamos allSettled: guardamos los TNs que sí se crearon, dejamos rastro
    // de los que fallaron, y si hay parciales devolvemos 207 para que el webhook MP
    // dispare la alerta admin.
    const settled = await Promise.allSettled(
      payloads.map((p) => paqarClient.createOrder(p))
    );

    const trackings: Array<{ trackingNumber: string; bundleIndex: number }> = [];
    const failed: Array<{ bundleIndex: number; error: string }> = [];
    settled.forEach((r, idx) => {
      if (r.status === "fulfilled") {
        trackings.push({ trackingNumber: r.value.trackingNumber, bundleIndex: idx });
      } else {
        const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
        failed.push({ bundleIndex: idx, error: msg.slice(0, 300) });
        console.error(`[paqar/create-orders] bundle ${idx} fail:`, msg);
      }
    });

    // Si TODOS fallaron, no guardamos nada y devolvemos 500.
    if (trackings.length === 0) {
      return NextResponse.json(
        { error: "Todos los bultos fallaron", failed, bundles: payloads.length },
        { status: 500 }
      );
    }

    // Aunque sea parcial, guardamos los TNs exitosos. Mejor tener los buenos en WC
    // que perderlos por un error parcial.
    await saveTrackingsToWc(orderId, trackings);

    if (failed.length > 0) {
      // Parcial: 207 Multi-Status. El webhook MP lo trata como error y dispara alerta admin.
      return NextResponse.json(
        {
          ok: false,
          partial: true,
          bundles: payloads.length,
          trackings,
          failed,
        },
        { status: 207 }
      );
    }

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
