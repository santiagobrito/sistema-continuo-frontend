/**
 * POST /api/abandoned-cart
 *
 * Track abandoned cart in Brevo when user fills email in checkout.
 * Called automatically when the user moves to step 2 (shipping).
 */

import { NextRequest, NextResponse } from "next/server";
import { trackAbandonedCart } from "@/lib/brevo/client";

export async function POST(request: NextRequest) {
  try {
    const { email, name, phone, items, total } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    await trackAbandonedCart(email, name || "", phone || "", items || [], total || 0);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true }); // Non-critical, don't block
  }
}
