/**
 * WooCommerce Store API Proxy
 *
 * Proxies requests from /api/store/* to WP's /wp-json/wc/store/v1/*
 * Handles Cart-Token forwarding for session persistence.
 */

import { NextRequest, NextResponse } from "next/server";

// Fuerza handler dinámico — sin esto Next.js puede cachear respuestas GET.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const WP_URL = process.env.WP_URL || process.env.NEXT_PUBLIC_WP_URL || "";
const STORE_API_BASE = `${WP_URL}/wp-json/wc/store/v1`;
const DECODE_VERSION = "v1-2026-04-22";

// WC Store API devuelve títulos con HTML entities sin decodificar (ej "40&#215;60"
// en nombres de productos). El sidecart y otros consumers los muestran tal cual.
// Decodificamos acá para normalizar antes de que lleguen al cliente.
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  laquo: "«",
  raquo: "»",
  copy: "©",
  reg: "®",
  trade: "™",
  times: "×",
  divide: "÷",
  deg: "°",
};

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-zA-Z]+);/g, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m);
}

// Campos de texto legible donde las entities molestan visualmente.
// No tocamos HTML real (descriptions largas en body) salvo en short_description
// y name/title que son plain-text para el UI.
const DECODE_FIELDS = new Set([
  "name",
  "title",
  "label",
  "sku",
  "short_description",
  "permalink",
]);

function decodeInPlace(node: unknown): unknown {
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) node[i] = decodeInPlace(node[i]);
    return node;
  }
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (typeof v === "string" && DECODE_FIELDS.has(k)) {
        obj[k] = decodeHtmlEntities(v);
      } else if (v && typeof v === "object") {
        obj[k] = decodeInPlace(v);
      }
    }
    return obj;
  }
  return node;
}

async function proxyRequest(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const targetPath = path.join("/");
  const targetUrl = `${STORE_API_BASE}/${targetPath}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Forward Cart-Token
  const cartToken = request.headers.get("Cart-Token");
  if (cartToken) {
    headers["Cart-Token"] = cartToken;
  }

  // Forward Nonce
  const nonce = request.headers.get("Nonce") || request.headers.get("X-WC-Store-API-Nonce");
  if (nonce) {
    headers["Nonce"] = nonce;
  }

  const fetchOptions: RequestInit = {
    method: request.method,
    headers,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    const body = await request.text();
    if (body) {
      fetchOptions.body = body;
    }
  }

  const res = await fetch(targetUrl, fetchOptions);
  let data = await res.text();

  // Decodificar HTML entities en fields de texto legible antes de responder.
  // Solo intentamos parsear/decodificar si parece JSON (content-type o primer char).
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json") || data.trim().startsWith("{") || data.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(data);
      data = JSON.stringify(decodeInPlace(parsed));
    } catch {
      // Si no es JSON válido, devolver el body crudo intacto.
    }
  }

  const responseHeaders = new Headers();

  // Forward Cart-Token back to client
  const responseCartToken = res.headers.get("Cart-Token");
  if (responseCartToken) {
    responseHeaders.set("Cart-Token", responseCartToken);
  }

  // Forward Nonce
  const responseNonce = res.headers.get("Nonce");
  if (responseNonce) {
    responseHeaders.set("Nonce", responseNonce);
  }

  responseHeaders.set("Content-Type", "application/json");
  responseHeaders.set("X-SC-Decode", DECODE_VERSION);

  return new NextResponse(data, {
    status: res.status,
    headers: responseHeaders,
  });
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
