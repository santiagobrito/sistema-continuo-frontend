/**
 * Google Tag Manager — dataLayer helpers
 *
 * Enhanced E-commerce events for GA4
 * https://developers.google.com/analytics/devguides/collection/ga4/ecommerce
 */

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
  }
}

function push(event: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ ecommerce: null }); // Clear previous ecommerce data
  window.dataLayer.push(event);
}

interface GTMItem {
  item_id: string;
  item_name: string;
  item_brand?: string;
  item_category?: string;
  price?: number;
  quantity?: number;
  item_variant?: string;
  discount?: number;
}

// --- E-commerce events ---

export function trackViewItemList(items: GTMItem[], listName: string) {
  push({
    event: "view_item_list",
    ecommerce: {
      item_list_id: listName,
      item_list_name: listName,
      items: items.map((item, i) => ({ ...item, index: i })),
    },
  });
}

export function trackViewItem(item: GTMItem) {
  push({
    event: "view_item",
    ecommerce: {
      currency: "ARS",
      value: item.price || 0,
      items: [item],
    },
  });
}

export function trackAddToCart(item: GTMItem) {
  push({
    event: "add_to_cart",
    ecommerce: {
      currency: "ARS",
      value: (item.price || 0) * (item.quantity || 1),
      items: [item],
    },
  });
}

export function trackRemoveFromCart(item: GTMItem) {
  push({
    event: "remove_from_cart",
    ecommerce: {
      currency: "ARS",
      value: (item.price || 0) * (item.quantity || 1),
      items: [item],
    },
  });
}

export function trackBeginCheckout(items: GTMItem[], value: number) {
  push({
    event: "begin_checkout",
    ecommerce: {
      currency: "ARS",
      value,
      items,
    },
  });
}

export function trackAddShippingInfo(items: GTMItem[], shippingTier: string, value: number) {
  push({
    event: "add_shipping_info",
    ecommerce: {
      currency: "ARS",
      value,
      shipping_tier: shippingTier,
      items,
    },
  });
}

export function trackPurchase(transactionId: string, items: GTMItem[], value: number, shipping: number) {
  push({
    event: "purchase",
    ecommerce: {
      transaction_id: transactionId,
      currency: "ARS",
      value,
      shipping,
      items,
    },
  });
}

// --- Custom events ---

export function trackWhatsAppClick(productName?: string) {
  push({ event: "whatsapp_click", product_name: productName });
}

export function trackContactExecutive(productName: string) {
  push({ event: "contact_executive", product_name: productName });
}

export function trackBackInStock(productId: number, email: string) {
  push({ event: "back_in_stock_subscribe", product_id: productId, email });
}

export function trackNewsletterSignup(email: string) {
  push({ event: "newsletter_signup", email });
}
