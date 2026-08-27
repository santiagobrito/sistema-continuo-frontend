/**
 * GET /api/order-access/[key]
 *
 * Estado del pedido para la página pública /pedido/[key]. La `order_key` de
 * WooCommerce es la capability, igual que en la pantalla nativa de
 * order-received: no hace falta login (la mitad de las compras son de invitados).
 */

import { NextRequest, NextResponse } from "next/server";

const WP_URL = process.env.WP_URL || process.env.NEXT_PUBLIC_WP_URL || "";

export const KEY_RE = /^wc_order_[A-Za-z0-9]+$/;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  if (!KEY_RE.test(key)) {
    return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${WP_URL}/wp-json/sistema-continuo/v1/order-access/${key}`,
      { cache: "no-store" },
    );
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data.error === "not_found" ? "No encontramos ese pedido" : "No se pudo cargar" },
        { status: res.status },
      );
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Error de conexion" }, { status: 500 });
  }
}
