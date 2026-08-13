"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "./CartProvider";
import { formatStorePrice } from "@/lib/utils/format";
import { cartFreeShippingState } from "@/lib/woocommerce/cart";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: Props) {
  const { cart, loading, updateItem, removeItem } = useCart();

  // Close on escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const items = cart?.items || [];
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const freeShippingState = cartFreeShippingState(cart);
  const freeShipping = freeShippingState === "all";
  const partialFreeShipping = freeShippingState === "some";

  // Cuotas sin interés disponibles para el carrito = mínimo de los items.
  // Si algún item tiene 0, no se ofrecen cuotas SI (cualquier carrito mixto degrada al mínimo).
  const cuotasSinInteresMax = items.length > 0
    ? Math.min(...items.map((i) => Number(i.extensions?.["sistema-continuo-core"]?.cuotas_sin_interes_max ?? 0)))
    : 0;
  const cartTotalNumber = parseInt(cart?.totals?.total_price ?? "0", 10);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-50 transition-opacity" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-50 shadow-2xl flex flex-col animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">
            Carrito {totalItems > 0 && <span className="text-gray-400 font-normal text-sm">({totalItems})</span>}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors" aria-label="Cerrar">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Free shipping banners */}
        {freeShipping && (
          <div className="px-5 py-2.5 bg-green-50 border-b border-green-100 flex items-center gap-2 text-green-800">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-xs font-semibold">¡Tu carrito tiene envío gratis!</p>
          </div>
        )}
        {partialFreeShipping && (
          <div className="px-5 py-2.5 bg-green-50 border-b border-green-100 flex items-start gap-2 text-green-800">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-xs">
              <span className="font-semibold">Envío gratis en parte de tu carrito.</span> En el checkout se descuenta:
              pagás solo la diferencia.
            </p>
          </div>
        )}

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-200 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
              <p className="text-gray-500 text-sm">Tu carrito esta vacio</p>
              <button onClick={onClose} className="mt-4 text-sm text-[#013d5a] font-semibold hover:underline cursor-pointer">
                Seguir comprando
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.key} className="flex gap-3">
                  <div className="w-16 h-16 relative flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden">
                    {item.images[0] ? (
                      <Image src={item.images[0].src} alt={item.name} fill className="object-contain p-1" sizes="64px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-200">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">{item.name}</p>
                    {item.variation.length > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">{item.variation.map(v => v.value).join(" / ")}</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-gray-200 rounded">
                        <button onClick={() => updateItem(item.key, Math.max(1, item.quantity - 1))} disabled={loading} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-900 cursor-pointer text-xs">−</button>
                        <span className="w-6 text-center text-xs font-medium">{item.quantity}</span>
                        <button onClick={() => updateItem(item.key, item.quantity + 1)} disabled={loading} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-900 cursor-pointer text-xs">+</button>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{formatStorePrice(item.totals.line_total)}</p>
                        {parseInt(item.prices.regular_price) > parseInt(item.prices.price) && (
                          <p className="text-[10px] text-green-600 font-medium">
                            <span className="text-gray-400 line-through">{formatStorePrice(item.prices.regular_price)}</span> {formatStorePrice(item.prices.price)} c/u
                          </p>
                        )}
                        <button onClick={() => removeItem(item.key)} disabled={loading} className="text-[10px] text-red-400 hover:text-red-600 cursor-pointer">Eliminar</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && cart && (
          <div className="border-t border-gray-100 px-5 py-4 space-y-3 bg-gray-50/50">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-bold text-gray-900 text-lg">{formatStorePrice(cart.totals.total_price)}</span>
            </div>
            {cuotasSinInteresMax > 0 && cartTotalNumber > 0 && (
              <p className="text-xs text-green-700">
                <span className="font-semibold">{cuotasSinInteresMax} cuotas sin interés</span>
                {" "}de {formatStorePrice(String(Math.round(cartTotalNumber / cuotasSinInteresMax)))}
              </p>
            )}
            <p className={`text-xs ${freeShipping || partialFreeShipping ? "text-green-700 font-semibold" : "text-gray-400"}`}>
              {freeShipping
                ? "Envío gratis incluido"
                : partialFreeShipping
                ? "Envío bonificado en parte, pagás solo la diferencia"
                : "Envío se calcula en el checkout"}
            </p>
            <Link
              href="/checkout"
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 bg-[#013d5a] text-white py-3.5 rounded-xl font-semibold hover:bg-[#01567a] transition-colors cursor-pointer"
            >
              Finalizar compra
            </Link>
            <button onClick={onClose} className="w-full text-center text-sm text-[#013d5a] hover:underline cursor-pointer py-1">
              Seguir comprando
            </button>
          </div>
        )}
      </div>
    </>
  );
}
