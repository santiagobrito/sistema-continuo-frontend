/**
 * /api/review-photo/[token]
 *
 * GET  → estado de la sesión de handoff (poll desde la compu + carga inicial del
 *        móvil): producto + fotos ya subidas.
 * POST → subida de foto(s) desde el móvil. SIN login: el token es la capability
 *        (patrón verify-id). El backend valida token, tipo/tamaño y tope de 3.
 *
 * Ambos métodos son públicos a propósito (el celular no tiene sesión). El token
 * de 40 hex no es adivinable y expira en 2h.
 */

import { NextRequest, NextResponse } from "next/server";

const WP_URL = process.env.WP_URL || process.env.NEXT_PUBLIC_WP_URL || "";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_IMAGES = 3;

const TOKEN_RE = /^[a-f0-9]{40}$/;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!TOKEN_RE.test(token)) {
    return NextResponse.json({ error: "Token inválido" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${WP_URL}/wp-json/sistema-continuo/v1/review-photo/${token}`,
      { cache: "no-store" },
    );
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data.message || "Sesión expirada" },
        { status: res.status },
      );
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Error de conexion" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!TOKEN_RE.test(token)) {
    return NextResponse.json({ error: "Token inválido" }, { status: 400 });
  }

  try {
    const inbound = await request.formData();
    const outbound = new FormData();

    let n = 0;
    for (const value of inbound.getAll("photos")) {
      if (n >= MAX_IMAGES) break;
      if (
        value instanceof File &&
        value.size > 0 &&
        value.size <= MAX_IMAGE_BYTES &&
        ALLOWED_IMAGE_TYPES.includes(value.type)
      ) {
        outbound.append(`photo_${n}`, value, value.name || `review_${n}.jpg`);
        n++;
      }
    }
    if (n === 0) {
      return NextResponse.json({ error: "No hay foto válida" }, { status: 400 });
    }

    const res = await fetch(
      `${WP_URL}/wp-json/sistema-continuo/v1/review-photo/${token}`,
      { method: "POST", body: outbound },
    );
    const data = await res.json();
    if (!res.ok) {
      const messages: Record<string, string> = {
        expired: "El código expiró. Volvé a escanear desde la compu.",
        full: "Ya subiste el máximo de 3 fotos.",
      };
      return NextResponse.json(
        { error: messages[data.code] || data.message || "No se pudo subir" },
        { status: res.status },
      );
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Error de conexion" }, { status: 500 });
  }
}
