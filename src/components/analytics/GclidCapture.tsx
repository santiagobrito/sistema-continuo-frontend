"use client";

import { useEffect } from "react";

/**
 * Captures gclid (Google Click ID) from URL params and stores in cookie.
 * Used for offline conversion tracking — when a transfer/cash order is
 * later marked as paid, the gclid links it back to the Google Ads click.
 *
 * Cookie lasts 90 days (Google Ads attribution window).
 */
export function GclidCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gclid = params.get("gclid");
    if (gclid) {
      document.cookie = `_gclid=${gclid}; path=/; max-age=${90 * 24 * 60 * 60}; SameSite=Lax`;
    }
  }, []);

  return null;
}

/**
 * Read gclid from cookie (client-side helper)
 */
export function getGclid(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)_gclid=([^;]+)/);
  return match ? match[1] : null;
}
