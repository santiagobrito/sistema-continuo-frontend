"use client";

import { useEffect } from "react";
import { fbPixelTrack } from "@/lib/fbpixel/client";

interface Props {
  orderId: string;
  total: number;
  items: { id: number; quantity: number; price: number; name: string }[];
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

/**
 * Fire-once Meta Pixel Purchase event.
 * Usa localStorage para dedupe entre recargas (si el user refresca la confirmación
 * dos veces, no disparamos dos Purchases por el mismo order).
 */
export function PurchaseTracker(props: Props) {
  useEffect(() => {
    if (!props.orderId || props.total <= 0) return;
    const key = `fb_purchase_${props.orderId}`;
    try {
      if (typeof window !== "undefined" && window.localStorage.getItem(key)) return;
      window.localStorage.setItem(key, "1");
    } catch {
      // si localStorage falla, seguimos igual
    }

    fbPixelTrack(
      "Purchase",
      {
        content_ids: props.items.map((i) => String(i.id)),
        content_type: "product",
        num_items: props.items.reduce((s, i) => s + i.quantity, 0),
        value: props.total,
        currency: "ARS",
        contents: props.items.map((i) => ({
          id: i.id,
          quantity: i.quantity,
          item_price: i.price,
        })),
      },
      {
        email: props.email,
        phone: props.phone,
        first_name: props.firstName,
        last_name: props.lastName,
      },
    );
  }, [props.orderId, props.total, props.items, props.email, props.phone, props.firstName, props.lastName]);

  return null;
}
