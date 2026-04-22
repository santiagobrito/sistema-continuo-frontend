/**
 * Meta (Facebook) Pixel — helpers para eventos browser + Conversions API.
 *
 * - `fbPixelTrack(event, data)`: fire browser-side via fbq + llama /api/fb/conversions
 *   para enviarlo server-side. Mandamos el mismo `event_id` en ambos lados para
 *   que Meta deduplique (event match rate sube con esto).
 */

type FBEventName =
  | "ViewContent"
  | "AddToCart"
  | "InitiateCheckout"
  | "Purchase"
  | "Lead"
  | "CompleteRegistration"
  | "Search";

interface FBEventData {
  content_ids?: (string | number)[];
  content_name?: string;
  content_type?: "product" | "product_group";
  contents?: { id: string | number; quantity: number; item_price?: number }[];
  currency?: string;
  value?: number;
  num_items?: number;
  search_string?: string;
}

interface UserData {
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
}

function newEventId() {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Dispara un evento standard de Meta. Fire-and-forget, no bloquea UX.
 * Si el pixel o el endpoint fallan, loggea warning y sigue.
 */
export function fbPixelTrack(event: FBEventName, data: FBEventData = {}, user?: UserData) {
  if (typeof window === "undefined") return;

  const eventId = newEventId();

  try {
    window.fbq?.("track", event, data, { eventID: eventId });
  } catch (err) {
    console.warn("[FBPixel] browser track failed", err);
  }

  // Server-side via Conversions API (deduplica con eventID)
  try {
    fetch("/api/fb/conversions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_name: event,
        event_id: eventId,
        event_source_url: window.location.href,
        custom_data: data,
        user_data: user,
      }),
      keepalive: true,
    }).catch(() => {}); // silent
  } catch {
    // silent
  }
}
