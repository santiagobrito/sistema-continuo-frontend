/**
 * POST /api/review-photo/session
 *
 * Crea una sesión de handoff QR (desktop→móvil) para subir la foto de la reseña
 * desde el celular. Requiere sesión: solo un comprador logueado en la compu puede
 * iniciar el handoff. Devuelve el token, la URL de subida y un QR (data URI) que
 * la compu muestra para escanear.
 */

import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { getSession } from "@/lib/auth/session";

const WP_URL = process.env.WP_URL || process.env.NEXT_PUBLIC_WP_URL || "";
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://sistemacontinuo.com.ar";

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Inicia sesion para opinar" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const productSlug = String(body.product_slug || "");
    if (!productSlug) {
      return NextResponse.json({ error: "Falta el producto" }, { status: 400 });
    }

    const res = await fetch(`${WP_URL}/wp-json/sistema-continuo/v1/review-photo-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: productSlug }),
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data.message || "No se pudo iniciar" },
        { status: res.status },
      );
    }

    const uploadUrl = `${SITE_URL}/subir-foto/${data.token}`;
    const qr = await QRCode.toDataURL(uploadUrl, {
      margin: 1,
      width: 220,
      color: { dark: "#013d5a", light: "#ffffff" },
    });

    return NextResponse.json({
      token: data.token,
      upload_url: uploadUrl,
      qr,
    });
  } catch {
    return NextResponse.json({ error: "Error de conexion" }, { status: 500 });
  }
}
