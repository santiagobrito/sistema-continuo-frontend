/**
 * Formatting utilities — Sistema Continuo
 */

/**
 * Format price in ARS (no decimals)
 */
export function formatPrice(price: string | number): string {
  const num = typeof price === "string" ? parseFloat(price) : price;
  if (isNaN(num)) return "";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Format WooCommerce Store API price (comes as string in minor units, no decimals for ARS)
 */
export function formatStorePrice(price: string): string {
  const num = parseInt(price, 10);
  if (isNaN(num)) return "";
  return formatPrice(num);
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}

/**
 * Strip HTML tags from string
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

/**
 * Generate WhatsApp URL with pre-filled message
 */
export function getWhatsAppUrl(
  productName: string,
  productUrl: string
): string {
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "5491130793862";
  const message = encodeURIComponent(
    `Hola, me interesa ${productName} — ${productUrl}`
  );
  return `https://wa.me/${phone}?text=${message}`;
}
