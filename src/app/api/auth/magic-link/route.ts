/**
 * GET /api/auth/magic-link?token=XXX&redirect=/mi-cuenta/pedidos/123
 *
 * Verifica el token contra el backend WP (POST sc/v1/magic-link/verify).
 * Si es válido, crea sesión y redirige. Tokens one-time, 30d expiry.
 *
 * Generado por el plugin SC cuando se manda un email transaccional a un cliente
 * que compró como guest (caso típico: WC creó el customer automáticamente al
 * checkout, pero sin password — magic-link permite acceso sin password).
 */

import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth/session";

const WP_URL = process.env.WP_URL || process.env.NEXT_PUBLIC_WP_URL || "";
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || "";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const redirect = request.nextUrl.searchParams.get("redirect") || "/mi-cuenta";

  // Safety: solo redirigir a paths relativos del propio sitio
  const safeRedirect = redirect.startsWith("/") ? redirect : "/mi-cuenta";

  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    return NextResponse.redirect(
      new URL("/iniciar-sesion?error=invalid_link", request.url)
    );
  }

  if (!WP_URL || !INTERNAL_SECRET) {
    console.error("[magic-link] WP_URL o INTERNAL_API_SECRET no configurados");
    return NextResponse.redirect(
      new URL("/iniciar-sesion?error=config", request.url)
    );
  }

  try {
    const res = await fetch(`${WP_URL}/wp-json/sc/v1/magic-link/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-SC-Internal-Secret": INTERNAL_SECRET,
      },
      body: JSON.stringify({ token }),
      cache: "no-store",
    });

    if (!res.ok) {
      // 410 = expired/used. 404 = not found. Mostrar mensaje específico.
      const errorCode = res.status === 410 ? "expired" : "invalid_link";
      return NextResponse.redirect(
        new URL(`/iniciar-sesion?error=${errorCode}`, request.url)
      );
    }

    const data = await res.json();
    if (!data.valid || !data.user_id) {
      return NextResponse.redirect(
        new URL("/iniciar-sesion?error=invalid_link", request.url)
      );
    }

    await createSession({
      id: data.user_id,
      email: data.email,
      name: data.name || data.email,
      role: "customer",
    });

    return NextResponse.redirect(new URL(safeRedirect, request.url));
  } catch (err) {
    console.error("[magic-link] verify error:", err);
    return NextResponse.redirect(
      new URL("/iniciar-sesion?error=server", request.url)
    );
  }
}
