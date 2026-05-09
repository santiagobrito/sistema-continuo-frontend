"use client";

import { useEffect, useRef } from "react";
import { useCart } from "@/components/cart/CartProvider";

interface Props {
  /**
   * true cuando el pedido es válido (pago aprobado, pendiente, transferencia o efectivo).
   * En esos casos vaciamos el carrito — la order ya existe en WC y tiene stock reservado.
   * No vaciar si el pago fue rechazado: el user puede querer reintentar.
   */
  shouldClear: boolean;
}

export function ClearCartOnSuccess({ shouldClear }: Props) {
  const { clearCart } = useCart();
  const done = useRef(false);

  useEffect(() => {
    if (!shouldClear || done.current) return;
    done.current = true;
    clearCart().catch(() => {
      // Silencioso — si falla no rompemos la UX de confirmación.
    });
    // Limpiar cache de initPoint MP — la compra ya cerró, próximo checkout
    // debe generar preference fresca (bug duplicados 2026-04-28 fix).
    try {
      sessionStorage.removeItem("sc_mp_pending");
      sessionStorage.removeItem("sc_last_submit_at");
    } catch {}
  }, [shouldClear, clearCart]);

  return null;
}
