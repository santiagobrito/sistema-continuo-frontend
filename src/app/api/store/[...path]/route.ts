/**
 * WooCommerce Store API Proxy
 *
 * Proxies requests from /api/store/* to WP's /wp-json/wc/store/v1/*
 * Handles Cart-Token forwarding for session persistence.
 */

import { NextRequest, NextResponse } from "next/server";

const WP_URL = process.env.WP_URL || process.env.NEXT_PUBLIC_WP_URL || "";
const STORE_API_BASE = `${WP_URL}/wp-json/wc/store/v1`;

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
  const data = await res.text();

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

  return new NextResponse(data, {
    status: res.status,
    headers: responseHeaders,
  });
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
