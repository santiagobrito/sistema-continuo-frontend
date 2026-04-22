"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  getCart,
  addToCart as apiAddToCart,
  updateCartItem as apiUpdateCartItem,
  removeCartItem as apiRemoveCartItem,
  clearCart as apiClearCart,
  type Cart,
} from "@/lib/woocommerce/cart";
import { CartDrawer } from "./CartDrawer";
import { fbPixelTrack } from "@/lib/fbpixel/client";

interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  itemCount: number;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  addToCart: (
    productId: number,
    quantity?: number,
    variationId?: number,
    variation?: Record<string, string>
  ) => Promise<void>;
  updateItem: (key: string, quantity: number) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const refreshCart = useCallback(async () => {
    try {
      const data = await getCart();
      setCart(data);
    } catch {
      // Cart might not exist yet
    }
  }, []);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addToCart = useCallback(
    async (
      productId: number,
      quantity: number = 1,
      variationId?: number,
      variation?: Record<string, string>
    ) => {
      setLoading(true);
      try {
        const data = await apiAddToCart(productId, quantity, variationId, variation);
        setCart(data);
        setDrawerOpen(true); // Auto-open drawer on add
        // Meta Pixel — AddToCart (el item recién agregado es el último en data.items)
        const added = data.items.find((i) => i.id === (variationId || productId)) || data.items[data.items.length - 1];
        if (added) {
          fbPixelTrack("AddToCart", {
            content_ids: [String(added.id)],
            content_name: added.name,
            content_type: variationId ? "product_group" : "product",
            value: Number(added.prices?.price || 0) * quantity,
            currency: "ARS",
            contents: [{ id: added.id, quantity, item_price: Number(added.prices?.price || 0) }],
          });
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const updateItem = useCallback(async (key: string, quantity: number) => {
    setLoading(true);
    try {
      const data = await apiUpdateCartItem(key, quantity);
      setCart(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const removeItem = useCallback(async (key: string) => {
    setLoading(true);
    try {
      const data = await apiRemoveCartItem(key);
      setCart(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearCart = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClearCart();
      setCart(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const itemCount = cart?.items_count ?? 0;

  return (
    <CartContext value={{
      cart,
      loading,
      itemCount,
      drawerOpen,
      openDrawer,
      closeDrawer,
      addToCart,
      updateItem,
      removeItem,
      clearCart,
      refreshCart,
    }}>
      {children}
      <CartDrawer open={drawerOpen} onClose={closeDrawer} />
    </CartContext>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
