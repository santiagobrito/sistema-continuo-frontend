"use client";

import { useState, useMemo } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { VariationSelector } from "./VariationSelector";
import { formatPrice } from "@/lib/utils/format";
import type { Product, ProductVariation } from "@/lib/wordpress/types";

export function ProductActions({
  product,
  onVariationChange,
}: {
  product: Product;
  onVariationChange?: (variation: ProductVariation | null) => void;
}) {
  const { addToCart, loading } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedVariation, setSelectedVariation] = useState<ProductVariation | null>(null);
  const [added, setAdded] = useState(false);

  const isVariable = product.type === "variable";
  const activePrice = isVariable && selectedVariation ? Number(selectedVariation.price) : Number(product.price);
  const activeRegularPrice = isVariable && selectedVariation ? Number(selectedVariation.regular_price) : Number(product.regular_price);
  const isOnSale = isVariable && selectedVariation ? selectedVariation.on_sale : product.on_sale;
  const inStock = isVariable
    ? selectedVariation ? selectedVariation.stock_status === "instock" : true
    : product.stock_status === "instock";

  // Calculate discount for current quantity
  const activeDiscount = useMemo(() => {
    if (!product.quantity_discounts?.length) return 0;
    const sorted = [...product.quantity_discounts].sort((a, b) => Number(b.min_qty) - Number(a.min_qty));
    const tier = sorted.find((t) => quantity >= Number(t.min_qty));
    return Number(tier?.discount_percent) || 0;
  }, [product.quantity_discounts, quantity]);

  const unitPrice = activeDiscount > 0 ? Math.round(activePrice * (1 - activeDiscount / 100)) : activePrice;
  const totalPrice = unitPrice * quantity;

  async function handleAddToCart() {
    const productId = product.id;
    const variationId = selectedVariation?.id;
    const variation = selectedVariation?.attributes
      ? Object.fromEntries(Object.entries(selectedVariation.attributes).map(([k, v]) => [k, String(v)]))
      : undefined;
    await addToCart(productId, quantity, variationId, variation);
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }

  // Don't show buy section for out of stock products
  if (!inStock && !isVariable) {
    return (
      <div className="space-y-5">
        {/* Price (show even if out of stock) */}
        {activePrice > 0 && (
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-gray-400 line-through">{formatPrice(activePrice)}</span>
          </div>
        )}
        <div className="bg-red-50 border border-red-100 rounded-xl p-5 text-center">
          <p className="flex items-center justify-center gap-2 text-red-600 font-semibold mb-2">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full" />
            Producto sin stock
          </p>
          <p className="text-sm text-red-500/80">Dejanos tu email y te avisamos cuando vuelva a estar disponible.</p>
          <form className="mt-3 flex gap-2">
            <input type="email" placeholder="tu@email.com" className="flex-1 px-4 py-2.5 border border-red-200 rounded-lg text-sm focus:outline-none focus:border-red-400" />
            <button type="submit" className="px-5 py-2.5 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors cursor-pointer">
              Avisarme
            </button>
          </form>
        </div>
        <ShippingPaymentInfo />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Price */}
      {activePrice > 0 && (
        <div>
          <div className="flex items-baseline gap-3">
            {activeDiscount > 0 ? (
              <>
                <span className="text-3xl font-bold text-green-600">{formatPrice(unitPrice)}</span>
                <span className="text-lg text-gray-400 line-through">{formatPrice(activePrice)}</span>
                <span className="text-sm font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">-{activeDiscount}%</span>
              </>
            ) : (
              <>
                <span className="text-3xl font-bold text-gray-900">{formatPrice(activePrice)}</span>
                {isOnSale && activeRegularPrice > activePrice && (
                  <span className="text-lg text-gray-400 line-through">{formatPrice(activeRegularPrice)}</span>
                )}
              </>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">IVA incluido</p>
        </div>
      )}

      {/* Quantity discounts table */}
      {product.quantity_discounts && product.quantity_discounts.length > 0 && (
        <div className="rounded-xl overflow-hidden border border-green-100">
          <div className="bg-green-50 px-4 py-2.5">
            <p className="text-sm font-semibold text-green-800">Compra mas, paga menos</p>
          </div>
          <table className="w-full">
            <tbody>
              {product.quantity_discounts.map((tier, i) => {
                const discountedPrice = Math.round(activePrice * (1 - Number(tier.discount_percent) / 100));
                const isActive = quantity >= Number(tier.min_qty) && (
                  i === product.quantity_discounts.length - 1 ||
                  quantity < Number(product.quantity_discounts[i + 1]?.min_qty)
                );
                return (
                  <tr
                    key={i}
                    className={`border-t border-green-50 transition-colors cursor-pointer ${
                      isActive ? "bg-green-50" : "hover:bg-gray-50"
                    }`}
                    onClick={() => setQuantity(Number(tier.min_qty))}
                  >
                    <td className="px-4 py-2.5 text-sm text-gray-700">
                      {isActive && <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full mr-2" />}
                      {tier.min_qty}+ unidades
                    </td>
                    <td className="px-4 py-2.5 text-sm text-right font-semibold text-green-700">
                      {tier.discount_percent}% OFF
                    </td>
                    <td className="px-4 py-2.5 text-sm text-right text-gray-500">
                      {formatPrice(discountedPrice)} c/u
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Variations */}
      {isVariable && product.variations && product.variations.length > 0 && (
        <VariationSelector
          variations={product.variations}
          onSelect={(v) => {
            setSelectedVariation(v);
            onVariationChange?.(v);
          }}
        />
      )}

      {/* Stock indicator */}
      {inStock ? (
        <p className="flex items-center gap-1.5 text-sm text-green-600">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          En stock — envio inmediato
        </p>
      ) : isVariable && !selectedVariation ? null : (
        <p className="flex items-center gap-1.5 text-sm text-amber-600">
          <span className="w-2 h-2 bg-amber-500 rounded-full" />
          Consultar disponibilidad
        </p>
      )}

      {/* Quantity + Add to cart */}
      {!product.is_catalog_only && (
        <div className="flex items-stretch gap-3">
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-11 h-full flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-l-xl transition-colors cursor-pointer text-lg"
            >
              −
            </button>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-12 text-center text-sm font-semibold bg-transparent border-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              min={1}
            />
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-11 h-full flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-r-xl transition-colors cursor-pointer text-lg"
            >
              +
            </button>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={loading || (isVariable && !selectedVariation)}
            className={`flex-1 py-3.5 px-6 rounded-xl font-semibold text-sm transition-all cursor-pointer ${
              added
                ? "bg-green-500 text-white"
                : "bg-[#013d5a] text-white hover:bg-[#01567a] active:scale-[0.98] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
            }`}
          >
            {loading ? (
              "Agregando..."
            ) : added ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                Agregado
              </span>
            ) : isVariable && !selectedVariation ? (
              "Selecciona una opcion"
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
                {quantity > 1 ? `Agregar ${quantity} un. — ${formatPrice(totalPrice)}` : "Agregar al carrito"}
              </span>
            )}
          </button>
        </div>
      )}

      <ShippingPaymentInfo />
    </div>
  );
}

function ShippingPaymentInfo() {
  return (
    <div className="border border-gray-100 rounded-xl divide-y divide-gray-100 bg-white">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-9 h-9 rounded-lg bg-[#013d5a]/5 flex items-center justify-center flex-shrink-0">
          <svg className="w-4.5 h-4.5 text-[#013d5a]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">Envios a todo el pais</p>
          <p className="text-xs text-gray-500">Correo Argentino, moto CABA/GBA, transporte</p>
        </div>
      </div>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-9 h-9 rounded-lg bg-[#013d5a]/5 flex items-center justify-center flex-shrink-0">
          <svg className="w-4.5 h-4.5 text-[#013d5a]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">Todos los medios de pago</p>
          <p className="text-xs text-gray-500">MercadoPago, tarjeta hasta 12 cuotas, transferencia, efectivo</p>
        </div>
      </div>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-9 h-9 rounded-lg bg-[#013d5a]/5 flex items-center justify-center flex-shrink-0">
          <svg className="w-4.5 h-4.5 text-[#013d5a]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">Garantia 1 ano</p>
          <p className="text-xs text-gray-500">Soporte tecnico y post-venta incluidos</p>
        </div>
      </div>
    </div>
  );
}
