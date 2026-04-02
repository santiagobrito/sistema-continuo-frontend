/**
 * WooCommerce Store API client — Cart operations
 *
 * Uses the WC Store API proxy at /api/store/ to avoid CORS issues.
 * Cart session persisted via Cart-Token in localStorage.
 */

const STORE_API_BASE = "/api/store";
const CART_TOKEN_KEY = "wc-cart-token";

function getCartToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CART_TOKEN_KEY);
}

function setCartToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(CART_TOKEN_KEY, token);
  }
}

async function storeApiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const token = getCartToken();
  if (token) {
    headers["Cart-Token"] = token;
  }

  const res = await fetch(`${STORE_API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // Save cart token from response
  const newToken = res.headers.get("Cart-Token");
  if (newToken) {
    setCartToken(newToken);
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Error desconocido" }));
    throw new Error(error.message || `Store API error ${res.status}`);
  }

  return res.json();
}

// === Cart Types ===

export interface CartItem {
  key: string;
  id: number;
  quantity: number;
  name: string;
  short_description: string;
  sku: string;
  images: { id: number; src: string; thumbnail: string; alt: string }[];
  variation: { attribute: string; value: string }[];
  prices: {
    price: string;
    regular_price: string;
    sale_price: string;
    currency_code: string;
  };
  totals: {
    line_subtotal: string;
    line_total: string;
    currency_code: string;
  };
}

export interface Cart {
  items: CartItem[];
  items_count: number;
  totals: {
    total_items: string;
    total_shipping: string;
    total_tax: string;
    total_price: string;
    currency_code: string;
  };
  shipping_address: Record<string, string>;
  billing_address: Record<string, string>;
}

// === Cart Operations ===

export async function getCart(): Promise<Cart> {
  return storeApiFetch<Cart>("/cart");
}

export async function addToCart(
  productId: number,
  quantity: number = 1,
  variationId?: number,
  variation?: Record<string, string>
): Promise<Cart> {
  const body: Record<string, unknown> = {
    id: productId,
    quantity,
  };

  if (variationId) {
    body.id = variationId;
    body.variation = variation
      ? Object.entries(variation).map(([attribute, value]) => ({
          attribute,
          value,
        }))
      : [];
  }

  return storeApiFetch<Cart>("/cart/add-item", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateCartItem(
  key: string,
  quantity: number
): Promise<Cart> {
  return storeApiFetch<Cart>("/cart/update-item", {
    method: "POST",
    body: JSON.stringify({ key, quantity }),
  });
}

export async function removeCartItem(key: string): Promise<Cart> {
  return storeApiFetch<Cart>("/cart/remove-item", {
    method: "POST",
    body: JSON.stringify({ key }),
  });
}

export async function clearCart(): Promise<Cart> {
  return storeApiFetch<Cart>("/cart/items", {
    method: "DELETE",
  });
}
