/**
 * POST /api/fb/conversions
 *
 * Reenvía eventos al Conversions API de Meta (Graph).
 * - Hashea PII (email, phone, name) con SHA-256 antes de enviar (requerido por Meta).
 * - Captura IP y user-agent del request para mejorar el match rate.
 * - Pasa event_id → permite deduplicación con el evento browser-side.
 *
 * Endpoint Graph v18: https://graph.facebook.com/v18.0/{PIXEL_ID}/events
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID || "";
const ACCESS_TOKEN = process.env.FB_CONVERSIONS_API_TOKEN || "";

function sha256(v?: string) {
  if (!v) return undefined;
  return crypto.createHash("sha256").update(v.trim().toLowerCase()).digest("hex");
}

interface Payload {
  event_name: string;
  event_id?: string;
  event_source_url?: string;
  custom_data?: Record<string, unknown>;
  user_data?: { email?: string; phone?: string; first_name?: string; last_name?: string };
}

export async function POST(request: NextRequest) {
  if (!PIXEL_ID || !ACCESS_TOKEN) {
    return NextResponse.json({ skipped: "not_configured" });
  }

  let body: Payload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    undefined;
  const userAgent = request.headers.get("user-agent") || undefined;
  const fbp = request.cookies.get("_fbp")?.value;
  const fbc = request.cookies.get("_fbc")?.value;

  const user_data: Record<string, string | undefined> = {
    client_ip_address: ip,
    client_user_agent: userAgent,
    fbp,
    fbc,
  };
  if (body.user_data?.email) user_data.em = sha256(body.user_data.email);
  if (body.user_data?.phone) user_data.ph = sha256(body.user_data.phone.replace(/\D/g, ""));
  if (body.user_data?.first_name) user_data.fn = sha256(body.user_data.first_name);
  if (body.user_data?.last_name) user_data.ln = sha256(body.user_data.last_name);

  const event = {
    event_name: body.event_name,
    event_time: Math.floor(Date.now() / 1000),
    event_id: body.event_id,
    event_source_url: body.event_source_url,
    action_source: "website",
    user_data,
    custom_data: body.custom_data,
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: [event] }),
      },
    );
    const data = await res.json();
    if (!res.ok) {
      console.warn("[FB CAPI]", res.status, data);
      return NextResponse.json({ error: "graph_error", status: res.status, data }, { status: 500 });
    }
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.warn("[FB CAPI] fetch failed", err);
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }
}
