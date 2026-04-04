/**
 * POST /api/auth/google
 *
 * Handles Google Sign-In. Receives the credential (ID token) from
 * Google's client-side library, verifies it, and creates/finds a
 * WooCommerce customer. Creates session.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth/session";
import { getCustomerByEmail, createCustomer } from "@/lib/auth/wc-api";
import { subscribeNewsletter } from "@/lib/brevo/client";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";

interface GooglePayload {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
}

async function verifyGoogleToken(credential: string): Promise<GooglePayload | null> {
  // Verify the JWT with Google's tokeninfo endpoint
  // This is simpler than importing google-auth-library and works server-side
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    if (!res.ok) return null;

    const payload = await res.json();

    // Verify audience matches our client ID
    if (payload.aud !== GOOGLE_CLIENT_ID) return null;
    if (!payload.email_verified) return null;

    return payload as GooglePayload;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  if (!GOOGLE_CLIENT_ID) {
    return NextResponse.json(
      { error: "Google login no configurado" },
      { status: 501 }
    );
  }

  try {
    const { credential } = await request.json();
    if (!credential) {
      return NextResponse.json({ error: "Falta credential" }, { status: 400 });
    }

    const payload = await verifyGoogleToken(credential);
    if (!payload) {
      return NextResponse.json({ error: "Token de Google invalido" }, { status: 401 });
    }

    // Find or create WC customer
    let customer = await getCustomerByEmail(payload.email);

    if (!customer) {
      customer = await createCustomer({
        email: payload.email,
        first_name: payload.given_name || payload.name?.split(" ")[0] || "",
        last_name: payload.family_name || payload.name?.split(" ").slice(1).join(" ") || "",
      });

      if (!customer) {
        return NextResponse.json({ error: "No se pudo crear la cuenta" }, { status: 500 });
      }

      // Auto-subscribe to newsletter (new customer)
      subscribeNewsletter(payload.email, payload.name).catch(() => {});
    }

    // Create session
    await createSession({
      id: customer.id,
      email: customer.email,
      name: `${customer.first_name} ${customer.last_name}`.trim(),
      role: customer.role || "customer",
    });

    return NextResponse.json({
      user: {
        id: customer.id,
        email: customer.email,
        name: `${customer.first_name} ${customer.last_name}`.trim(),
      },
    });
  } catch {
    return NextResponse.json({ error: "Error en login con Google" }, { status: 500 });
  }
}
