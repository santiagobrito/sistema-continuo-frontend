/**
 * POST /api/reviews
 *
 * Submit a product review. Requires authenticated session.
 * The backend (WP) verifies the user has purchased the product.
 *
 * Body es multipart/form-data: product_slug, rating, content y hasta 3 fotos
 * opcionales bajo la clave "photos". Reenviamos las fotos re-keyeadas a
 * photo_0..photo_2 (el backend WP las lee vía $_FILES / get_file_params).
 * author_name/email salen de la sesión del servidor, nunca del cliente.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

const WP_URL = process.env.WP_URL || process.env.NEXT_PUBLIC_WP_URL || "";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_IMAGES = 3;

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Inicia sesion para opinar" }, { status: 401 });
  }

  try {
    const inbound = await request.formData();
    const productSlug = String(inbound.get("product_slug") || "");

    const outbound = new FormData();
    outbound.append("author_name", user.name);
    outbound.append("author_email", user.email);
    outbound.append("rating", String(inbound.get("rating") || ""));
    outbound.append("content", String(inbound.get("content") || ""));

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

    const res = await fetch(
      `${WP_URL}/wp-json/sistema-continuo/v1/products/${encodeURIComponent(productSlug)}/reviews`,
      {
        method: "POST",
        body: outbound,
      },
    );

    const data = await res.json();

    if (!res.ok) {
      const errorMessages: Record<string, string> = {
        not_buyer: "Solo los compradores de este producto pueden dejar una opinion",
        already_reviewed: "Ya dejaste una opinion para este producto",
      };
      const code = data.code || "";
      return NextResponse.json(
        { error: errorMessages[code] || data.message || "Error al enviar" },
        { status: res.status },
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Error de conexion" }, { status: 500 });
  }
}
