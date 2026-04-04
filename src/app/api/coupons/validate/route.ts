/**
 * POST /api/coupons/validate
 *
 * Validates a WooCommerce coupon code and returns discount info.
 * Does NOT apply the coupon — just checks if it's valid and what discount it gives.
 */

import { NextRequest, NextResponse } from "next/server";

const WP_URL = process.env.WP_URL || process.env.NEXT_PUBLIC_WP_URL || "";
const WC_AUTH = process.env.WC_API_AUTH || "";

export async function POST(request: NextRequest) {
  try {
    const { code, subtotal } = await request.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Ingresa un codigo" }, { status: 400 });
    }

    // Fetch coupon from WC
    const res = await fetch(
      `${WP_URL}/wp-json/wc/v3/coupons?code=${encodeURIComponent(code.trim())}`,
      {
        headers: {
          Authorization: `Basic ${WC_AUTH}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Error al verificar cupon" }, { status: 500 });
    }

    const coupons = await res.json();
    if (coupons.length === 0) {
      return NextResponse.json({ error: "Cupon no valido" }, { status: 404 });
    }

    const coupon = coupons[0];

    // Check if expired
    if (coupon.date_expires) {
      const expires = new Date(coupon.date_expires);
      if (expires < new Date()) {
        return NextResponse.json({ error: "Este cupon ya expiro" }, { status: 410 });
      }
    }

    // Check usage limit
    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      return NextResponse.json({ error: "Este cupon ya fue usado el maximo de veces" }, { status: 410 });
    }

    // Check minimum amount
    if (coupon.minimum_amount && parseFloat(coupon.minimum_amount) > 0) {
      if (subtotal < parseFloat(coupon.minimum_amount)) {
        return NextResponse.json({
          error: `Compra minima de $${Math.round(parseFloat(coupon.minimum_amount)).toLocaleString("es-AR")} para este cupon`,
        }, { status: 400 });
      }
    }

    // Calculate discount
    let discountAmount = 0;
    let discountLabel = "";

    if (coupon.discount_type === "percent") {
      discountAmount = Math.round(subtotal * parseFloat(coupon.amount) / 100);
      discountLabel = `${coupon.amount}% de descuento`;

      // Cap at maximum discount if set
      if (coupon.maximum_amount && parseFloat(coupon.maximum_amount) > 0) {
        const max = parseFloat(coupon.maximum_amount);
        if (discountAmount > max) {
          discountAmount = Math.round(max);
        }
      }
    } else if (coupon.discount_type === "fixed_cart") {
      discountAmount = Math.round(parseFloat(coupon.amount));
      discountLabel = `$${discountAmount.toLocaleString("es-AR")} de descuento`;
    } else if (coupon.discount_type === "fixed_product") {
      discountAmount = Math.round(parseFloat(coupon.amount));
      discountLabel = `$${discountAmount.toLocaleString("es-AR")} por producto`;
    }

    // Don't let discount exceed subtotal
    if (discountAmount > subtotal) {
      discountAmount = subtotal;
    }

    return NextResponse.json({
      valid: true,
      code: coupon.code,
      discount_type: coupon.discount_type,
      amount: coupon.amount,
      discount_amount: discountAmount,
      label: discountLabel,
      description: coupon.description || "",
      free_shipping: coupon.free_shipping || false,
    });
  } catch {
    return NextResponse.json({ error: "Error al validar cupon" }, { status: 500 });
  }
}
