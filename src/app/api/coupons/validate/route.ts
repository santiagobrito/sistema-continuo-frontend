/**
 * POST /api/coupons/validate
 *
 * Valida un cupón contra el carrito y devuelve el descuento. No aplica nada:
 * la orden lo vuelve a resolver en el server con la misma función
 * (resolveCoupon), así lo que ve el cliente y lo que se cobra no pueden
 * divergir. Body: { code, email?, items: [{ product_id, variation_id?, name, quantity }] }.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { resolveCoupon, type CheckoutItem } from "@/lib/woocommerce/coupons";

export async function POST(request: NextRequest) {
  try {
    const { code, email, items } = await request.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Ingresá un código" }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No hay productos en el carrito" }, { status: 400 });
    }

    const cartItems: CheckoutItem[] = items.map((it: Partial<CheckoutItem>) => ({
      product_id: Number(it.product_id),
      variation_id: it.variation_id ? Number(it.variation_id) : undefined,
      name: String(it.name || ""),
      quantity: Math.max(1, Math.floor(Number(it.quantity) || 1)),
      price: 0, // se ignora: resolveCoupon usa el precio de WC
    }));

    const session = await getSession().catch(() => null);
    const result = await resolveCoupon(code, cartItems, {
      email: typeof email === "string" ? email : undefined,
      customerId: session?.id,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const c = result.coupon;
    return NextResponse.json({
      valid: true,
      code: c.code,
      discount_type: c.discount_type,
      amount: c.amount,
      discount_amount: c.discount_amount,
      label: c.label,
      description: c.description,
      free_shipping: c.free_shipping,
    });
  } catch {
    return NextResponse.json({ error: "Error al validar el cupón" }, { status: 500 });
  }
}
