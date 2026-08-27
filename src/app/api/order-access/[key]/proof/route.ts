/**
 * POST /api/order-access/[key]/proof
 *
 * Sube el comprobante de pago. Proxy multipart al plugin, que valida de nuevo
 * server-side (tipo por sniff de mime, tamaño y tope) y lo adjunta a la orden.
 *
 * Subir el comprobante NO acredita el pago: la orden sigue esperando que
 * administración lo verifique contra el movimiento bancario.
 */

import { NextRequest, NextResponse } from "next/server";

const WP_URL = process.env.WP_URL || process.env.NEXT_PUBLIC_WP_URL || "";

const KEY_RE = /^wc_order_[A-Za-z0-9]+$/;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_FILES = 3;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  if (!KEY_RE.test(key)) {
    return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
  }

  try {
    const inbound = await request.formData();
    const outbound = new FormData();

    let n = 0;
    for (const value of inbound.getAll("files")) {
      if (n >= MAX_FILES) break;
      if (
        value instanceof File &&
        value.size > 0 &&
        value.size <= MAX_BYTES &&
        ALLOWED.includes(value.type)
      ) {
        outbound.append(`proof_${n}`, value, value.name || `comprobante_${n}`);
        n++;
      }
    }
    if (n === 0) {
      return NextResponse.json(
        { error: "Subí una imagen (JPG, PNG o WEBP) o un PDF de hasta 8 MB." },
        { status: 400 },
      );
    }

    const res = await fetch(
      `${WP_URL}/wp-json/sistema-continuo/v1/order-access/${key}/payment-proof`,
      { method: "POST", body: outbound },
    );
    const data = await res.json();

    if (!res.ok) {
      const messages: Record<string, string> = {
        not_found: "No encontramos ese pedido.",
        not_awaiting_payment: "Este pedido ya no está esperando pago.",
        max_files_reached: "Ya subiste el máximo de 3 archivos.",
        invalid_file: "No pudimos leer el archivo. Probá con una foto nítida o un PDF.",
      };
      return NextResponse.json(
        { error: messages[data.error] || "No se pudo subir el comprobante" },
        { status: res.status },
      );
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Error de conexion" }, { status: 500 });
  }
}
