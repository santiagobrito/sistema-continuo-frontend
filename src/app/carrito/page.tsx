"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/components/cart/CartProvider";
import { formatStorePrice } from "@/lib/utils/format";

export default function CartPage() {
  const { cart, loading, updateItem, removeItem } = useCart();

  if (!cart || cart.items.length === 0) {
    return (
      <main className="bg-gray-50 min-h-screen">
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <svg className="w-20 h-20 text-gray-200 mx-auto mb-6" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
          </svg>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Tu carrito esta vacio</h1>
          <p className="text-gray-500 mb-8">Agrega productos para comenzar tu compra.</p>
          <Link href="/" className="inline-flex items-center gap-2 bg-[#013d5a] text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-[#01567a] transition-colors cursor-pointer">
            Ver productos
          </Link>
        </div>
      </main>
    );
  }

  const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <main className="bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Tu carrito</h1>
        <p className="text-gray-500 text-sm mb-8">{totalItems} {totalItems === 1 ? "producto" : "productos"}</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Items */}
          <div className="lg:col-span-2 space-y-3">
            {cart.items.map((item) => (
              <div key={item.key} className="bg-white rounded-xl border border-gray-100 p-4 flex gap-4">
                {/* Image */}
                <div className="w-20 h-20 relative flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden">
                  {item.images[0] ? (
                    <Image src={item.images[0].src} alt={item.name} fill className="object-contain p-1" sizes="80px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-200">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 line-clamp-2">{item.name}</h3>
                  {item.variation.length > 0 && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {item.variation.map((v) => v.value).join(" / ")}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg">
                      <button
                        onClick={() => updateItem(item.key, Math.max(1, item.quantity - 1))}
                        disabled={loading}
                        className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 cursor-pointer transition-colors"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateItem(item.key, item.quantity + 1)}
                        disabled={loading}
                        className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 cursor-pointer transition-colors"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.key)}
                      disabled={loading}
                      className="text-xs text-red-500 hover:text-red-700 cursor-pointer transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                {/* Price */}
                <div className="text-right flex-shrink-0">
                  <p className="text-base font-bold text-gray-900">{formatStorePrice(item.totals.line_total)}</p>
                  {parseInt(item.prices.regular_price) > parseInt(item.prices.price) ? (
                    <div>
                      <p className="text-xs text-gray-400 line-through">{formatStorePrice(item.prices.regular_price)} c/u</p>
                      <p className="text-xs text-green-600 font-medium">{formatStorePrice(item.prices.price)} c/u</p>
                    </div>
                  ) : item.quantity > 1 ? (
                    <p className="text-xs text-gray-400">{formatStorePrice(item.prices.price)} c/u</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-100 p-6 sticky top-28">
              <h2 className="font-bold text-gray-900 mb-4">Resumen del pedido</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal ({totalItems} productos)</span>
                  <span className="font-medium">{formatStorePrice(cart.totals.total_items)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Envio</span>
                  <span className="text-gray-400 text-xs">Se calcula en checkout</span>
                </div>
                <div className="border-t border-gray-100 pt-3 flex justify-between">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="text-xl font-bold text-gray-900">{formatStorePrice(cart.totals.total_price)}</span>
                </div>
              </div>

              <Link
                href="/checkout"
                className="mt-6 w-full flex items-center justify-center gap-2 bg-[#013d5a] text-white py-3.5 rounded-xl font-semibold hover:bg-[#01567a] transition-colors cursor-pointer"
              >
                Finalizar compra
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>

              <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-gray-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                Compra segura con MercadoPago
              </div>

              <Link href="/" className="mt-3 block text-center text-sm text-[#013d5a] hover:underline cursor-pointer">
                Seguir comprando
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
