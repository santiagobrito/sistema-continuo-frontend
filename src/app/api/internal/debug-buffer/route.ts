/**
 * Endpoint para leer el debug buffer en memoria. Solo para troubleshoot
 * temporal. Removerlo cuando termine el bug actual de MP webhook signature.
 *
 * Auth: header `x-internal-secret` con INTERNAL_API_SECRET.
 *
 * GET /api/_debug/buffer?ns=mp-webhook-mismatch
 */
import { NextRequest, NextResponse } from "next/server";
import { dump, listNamespaces, clear } from "@/lib/_debug-buffer";
import { safeEqual } from "@/lib/auth/timing-safe";

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || "";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("x-internal-secret");
  if (!safeEqual(auth, INTERNAL_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const ns = request.nextUrl.searchParams.get("ns");
  if (!ns) {
    return NextResponse.json({ namespaces: listNamespaces() });
  }
  return NextResponse.json({ ns, events: dump(ns) });
}

export async function DELETE(request: NextRequest) {
  const auth = request.headers.get("x-internal-secret");
  if (!safeEqual(auth, INTERNAL_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const ns = request.nextUrl.searchParams.get("ns");
  if (ns) clear(ns);
  return NextResponse.json({ ok: true, cleared: ns ?? "all" });
}
