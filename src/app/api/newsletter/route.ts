/**
 * POST /api/newsletter
 *
 * Subscribe email to Brevo newsletter list.
 */

import { NextRequest, NextResponse } from "next/server";
import { subscribeNewsletter } from "@/lib/brevo/client";

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Email invalido" }, { status: 400 });
    }

    await subscribeNewsletter(email, name);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
