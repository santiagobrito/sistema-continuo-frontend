/**
 * Mappea el objeto Attribution del cliente a los meta keys que espera
 * WooCommerce para Order Attribution (`_wc_order_attribution_*`).
 *
 * Una vez populado, en WC Admin / WooCommerce → Analytics las ventas dejan de
 * aparecer como "Origin: Desconocido" y se pueden segmentar por fuente, medio,
 * campaña, device, etc.
 *
 * WC populate este mismo schema desde su checkout clásico via el script
 * `wc-order-attribution.min.js`. Acá lo replicamos para el checkout headless.
 */

export interface OrderAttributionInput {
  source_type?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  referrer?: string;
  landing_page?: string;
  user_agent?: string;
  device_type?: string;
  session_entry?: string;
  first_seen_at?: number;
}

export function attributionToOrderMeta(attr: OrderAttributionInput | null | undefined) {
  if (!attr) return [];

  // WC acepta `source_type` con valores: utm, organic, referral, typein, admin, mobile_app
  const sourceType = attr.source_type || "typein";

  const meta: Array<{ key: string; value: string }> = [
    { key: "_wc_order_attribution_source_type", value: sourceType },
    { key: "_wc_order_attribution_referrer", value: attr.referrer || "" },
    { key: "_wc_order_attribution_utm_source", value: attr.source || "" },
    { key: "_wc_order_attribution_utm_medium", value: attr.medium || "" },
    { key: "_wc_order_attribution_utm_campaign", value: attr.campaign || "" },
    { key: "_wc_order_attribution_utm_content", value: attr.content || "" },
    { key: "_wc_order_attribution_utm_term", value: attr.term || "" },
    { key: "_wc_order_attribution_session_entry", value: attr.session_entry || "" },
    { key: "_wc_order_attribution_user_agent", value: attr.user_agent || "" },
    { key: "_wc_order_attribution_device_type", value: attr.device_type || "Desktop" },
  ];

  if (attr.first_seen_at) {
    meta.push({
      key: "_wc_order_attribution_session_start_time",
      value: new Date(attr.first_seen_at).toISOString().replace("T", " ").slice(0, 19),
    });
  }

  // Filtrar claves con valor vacío para no ensuciar postmeta.
  return meta.filter((m) => m.value !== "");
}
