/**
 * POST /api/reviews
 *
 * Submit a product review. Requires authenticated session.
 * The backend (WP) verifies the user has purchased the product.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

const WP_URL = process.env.WP_URL || process.env.NEXT_PUBLIC_WP_URL || "";

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Inicia sesion para opinar" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const res = await fetch(
      `${WP_URL}/wp-json/sistema-continuo/v1/products/${encodeURIComponent(body.product_slug)}/reviews`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author_name: user.name,
          author_email: user.email,
          rating: body.rating,
          content: body.content,
        }),
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
