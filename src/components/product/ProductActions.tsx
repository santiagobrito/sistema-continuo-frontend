"use client";

import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { VariationSelector } from "./VariationSelector";
import { formatPrice } from "@/lib/utils/format";
import type { Product, ProductVariation } from "@/lib/wordpress/types";

export function ProductActions({ product }: { product: Product }) {
  const { addToCart, loading } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedVariation, setSelectedVariation] = useState<ProductVariation | null>(null);
  const [added, setAdded] = useState(false);

  const isVariable = product.type === "variable";
  const activePrice = isVariable && selectedVariation ? String(selectedVariation.price) : product.price;
  const activeRegularPrice = isVariable && selectedVariation ? String(selectedVariation.regular_price) : product.regular_price;
  const isOnSale = isVariable && selectedVariation ? selectedVariation.on_sale : product.on_sale;
  const inStock = isVariable
    ? selectedVariation ? selectedVariation.stock_status === "instock" : true
    : product.stock_status === "instock";

  async function handleAddToCart() {
    const productId = product.id;
    const variationId = selectedVariation?.id;
    const variation = selectedVariation?.attributes
      ? Object.fromEntries(
          Object.entries(selectedVariation.attributes).map(([k, v]) => [k, String(v)])
        )
      : undefined;

    await addToCart(productId, quantity, variationId, variation);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="space-y-5">
      {/* Price */}
      {activePrice && (
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold text-gray-900">{formatPrice(activePrice)}</span>
          {isOnSale && activeRegularPrice && (
            <span className="text-lg text-gray-400 line-through">{formatPrice(activeRegularPrice)}</span>
          )}
          <span className="text-xs text-gray-400">IVA incluido</span>
        </div>
      )}

      {/* Quantity discounts */}
      {product.quantity_discounts && product.quantity_discounts.length > 0 && (
        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
          <p className="text-sm font-semibold text-green-800 mb-2">Descuentos por cantidad</p>
          <div className="space-y-1">
            {product.quantity_discounts.map((tier, i) => (
              <div key={i} className="flex justify-between text-sm text-green-700">
                <span>{tier.min_qty}+ unidades</span>
                <span className="font-bold">{tier.discount_percent}% OFF</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Variations */}
      {isVariable && product.attributes && product.variations && (
        <VariationSelector
          attributes={product.attributes}
          variations={product.variations}
          defaultAttributes={product.default_attributes}
          onSelect={setSelectedVariation}
        />
      )}

      {/* Stock */}
      {inStock ? (
        <p className="flex items-center gap-1.5 text-sm text-green-600">
          <span className="w-2 h-2 bg-green-500 rounded-full" />
          En stock
        </p>
      ) : (
        <p className="flex items-center gap-1.5 text-sm text-red-500">
          <span className="w-2 h-2 bg-red-500 rounded-full" />
          Sin stock
        </p>
      )}

      {/* Quantity + Add to cart */}
      {!product.is_catalog_only && (
        <div className="flex items-center gap-3">
          <div className="flex items-center border border-gray-200 rounded-lg">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors"
            >
              -
            </button>
            <span className="w-10 text-center text-sm font-medium">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors"
            >
              +
            </button>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={loading || !inStock || (isVariable && !selectedVariation)}
            className={`flex-1 py-3 px-6 rounded-xl font-semibold text-sm transition-all ${
              added
                ? "bg-green-500 text-white"
                : "bg-[#013d5a] text-white hover:bg-[#01567a] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
            }`}
          >
            {loading ? "Agregando..." : added ? "Agregado al carrito" : isVariable && !selectedVariation ? "Selecciona una opcion" : "Agregar al carrito"}
          </button>
        </div>
      )}

      {/* Shipping & payment info */}
      <div className="border border-gray-100 rounded-xl divide-y divide-gray-100">
        <div className="flex items-center gap-3 px-4 py-3">
          <svg className="w-5 h-5 text-[#013d5a] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
          </svg>
          <div>
            <p className="text-sm font-medium text-gray-900">Envios a todo el pais</p>
            <p className="text-xs text-gray-500">Correo Argentino, moto CABA/GBA, transporte interior</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <svg className="w-5 h-5 text-[#013d5a] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-gray-900">MercadoPago, transferencia o efectivo</p>
            <p className="text-xs text-gray-500">Hasta 12 cuotas con tarjeta</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <svg className="w-5 h-5 text-[#013d5a] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-gray-900">Garantia 1 ano</p>
            <p className="text-xs text-gray-500">Soporte tecnico y post-venta</p>
          </div>
        </div>
      </div>
    </div>
  );
}
