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
  }, [shouldClear, clearCart]);

  return null;
}
