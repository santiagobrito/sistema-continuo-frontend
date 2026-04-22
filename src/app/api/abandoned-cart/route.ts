/**
 * POST /api/abandoned-cart
 *
 * Se llama cuando el usuario pone el email en el checkout pero no termina la compra.
 * Flow:
 *  1. Persistir carrito en WP (plugin) → devuelve recovery_token único.
 *  2. Construir URL de recuperación: /recuperar-carrito?t=<token>.
 *  3. Subir contacto a Brevo Lista 10 con CART_TOTAL, CART_ITEMS, CART_DAT, CART_URL.
 *  4. El cron del WP se encarga de disparar la secuencia de emails vía Brevo transactional.
 */

import { NextRequest, NextResponse } from "next/server";
import { trackAbandonedCart } from "@/lib/brevo/client";

const WP_URL = process.env.WP_URL || process.env.NEXT_PUBLIC_WP_URL || "";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sistemacontinuo.com.ar";
const WC_API_AUTH = process.env.WC_API_AUTH || "";

async function persistInWP(payload: {
  email: string;
  name: string;
  phone: string;
  items: unknown;
  total: number;
}): Promise<string | null> {
  if (!WP_URL) return null;
  try {
    const res = await fetch(`${WP_URL}/wp-json/sistema-continuo/v1/abandoned-cart`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${WC_API_AUTH}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { success?: boolean; token?: string };
    return data.token || null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, name, phone, items, total } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const token = await persistInWP({
      email,
      name: name || "",
      phone: phone || "",
      items: items || [],
      total: total || 0,
    });

    const cartUrl = token ? `${SITE_URL}/recuperar-carrito?t=${token}` : undefined;

    await trackAbandonedCart(
      email,
      name || "",
      phone || "",
      items || [],
      total || 0,
      cartUrl,
    );
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true }); // Non-critical, don't block
  }
}
