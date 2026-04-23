"use client";

import { useEffect } from "react";

/**
 * Captura de atribución para WooCommerce Order Attribution.
 *
 * Al primer landing del usuario (o cuando aterriza con UTMs nuevos), guarda
 * en cookie `sc_attribution` los datos que populan los `_wc_order_attribution_*`
 * del pedido. Esto hace que en WC Analytics las ventas dejen de aparecer como
 * "Origin: Desconocido" y se pueda segmentar por canal, campaña, device, etc.
 *
 * TTL cookie: 1 año. La primera visita se considera la fuente canónica
 * (modelo first-touch). Si llega con UTM nuevo, pisa lo anterior (last-touch).
 */

const COOKIE_NAME = "sc_attribution";
const COOKIE_TTL_SECONDS = 365 * 24 * 60 * 60;

export interface AttributionData {
  source_type: "utm" | "organic" | "referral" | "typein" | "admin";
  source: string;          // utm_source, o dominio referrer, o "(direct)"
  medium: string;          // utm_medium, o "referral"/"organic"/"none"
  campaign: string;
  content: string;
  term: string;
  referrer: string;
  landing_page: string;
  user_agent: string;
  device_type: "Mobile" | "Tablet" | "Desktop";
  session_entry: string;
  first_seen_at: number;   // epoch ms
}

function detectDevice(ua: string): "Mobile" | "Tablet" | "Desktop" {
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "Tablet";
  if (/mobile|iphone|ipod|android|blackberry|iemobile|opera mini/i.test(ua)) return "Mobile";
  return "Desktop";
}

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function buildAttribution(): AttributionData {
  const params = new URLSearchParams(window.location.search);
  const referrer = document.referrer || "";
  const referrerHost = hostnameFromUrl(referrer);
  const currentHost = window.location.hostname;

  const utm_source = params.get("utm_source") || "";
  const utm_medium = params.get("utm_medium") || "";
  const utm_campaign = params.get("utm_campaign") || "";
  const utm_content = params.get("utm_content") || "";
  const utm_term = params.get("utm_term") || "";
  const gclid = params.get("gclid");
  const fbclid = params.get("fbclid");

  let source_type: AttributionData["source_type"] = "typein";
  let source = "(direct)";
  let medium = "(none)";

  if (utm_source || utm_medium || gclid || fbclid) {
    source_type = "utm";
    if (gclid && !utm_source) {
      source = "google";
      medium = "cpc";
    } else if (fbclid && !utm_source) {
      source = "facebook";
      medium = utm_medium || "paid";
    } else {
      source = utm_source || "unknown";
      medium = utm_medium || "unknown";
    }
  } else if (referrer && referrerHost && referrerHost !== currentHost) {
    const searchEngines = /google\.|bing\.|duckduckgo\.|yahoo\.|yandex\./i;
    if (searchEngines.test(referrerHost)) {
      source_type = "organic";
      source = referrerHost.replace(/^www\./, "").split(".")[0];
      medium = "organic";
    } else {
      source_type = "referral";
      source = referrerHost.replace(/^www\./, "");
      medium = "referral";
    }
  }

  return {
    source_type,
    source,
    medium,
    campaign: utm_campaign,
    content: utm_content,
    term: utm_term,
    referrer,
    landing_page: window.location.pathname + window.location.search,
    user_agent: navigator.userAgent.slice(0, 300),
    device_type: detectDevice(navigator.userAgent),
    session_entry: window.location.pathname,
    first_seen_at: Date.now(),
  };
}

function readCookie(name: string): AttributionData | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

function writeCookie(name: string, value: AttributionData) {
  const serialized = encodeURIComponent(JSON.stringify(value));
  document.cookie = `${name}=${serialized}; path=/; max-age=${COOKIE_TTL_SECONDS}; SameSite=Lax`;
}

export function AttributionCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasUtm =
      params.has("utm_source") ||
      params.has("utm_medium") ||
      params.has("utm_campaign") ||
      params.has("gclid") ||
      params.has("fbclid");

    const existing = readCookie(COOKIE_NAME);

    // Primera visita, o nueva fuente UTM/click → overwrite (last-touch model)
    if (!existing || hasUtm) {
      writeCookie(COOKIE_NAME, buildAttribution());
    }
  }, []);

  return null;
}

/**
 * Lee la cookie de atribución. Usado en el checkout para adjuntar al pedido.
 * Si no hay cookie (JS off, blocker, etc.), construye una mínima tipo "direct".
 */
export function getAttribution(): AttributionData {
  if (typeof window === "undefined") {
    return {
      source_type: "typein",
      source: "(direct)",
      medium: "(none)",
      campaign: "",
      content: "",
      term: "",
      referrer: "",
      landing_page: "",
      user_agent: "",
      device_type: "Desktop",
      session_entry: "",
      first_seen_at: Date.now(),
    };
  }

  const existing = readCookie(COOKIE_NAME);
  if (existing) return existing;

  const fresh = buildAttribution();
  writeCookie(COOKIE_NAME, fresh);
  return fresh;
}
