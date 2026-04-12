"use client";

import { useState } from "react";
import Image from "next/image";
import { useCart } from "@/components/cart/CartProvider";
import { formatPrice } from "@/lib/utils/format";
import { getProductUrl } from "@/lib/wordpress/api";
import type { Product } from "@/lib/wordpress/types";
import Link from "next/link";

interface Props {
  currentProduct: Product;
  crossSells: Product[];
}

export function FrequentlyBoughtTogether({ currentProduct, crossSells }: Props) {
  const { addToCart, loading } = useCart();
  const [selected, setSelected] = useState<Set<number>>(
    new Set(crossSells.map((p) => p.id))
  );
  const [adding, setAdding] = useState(false);

  if (crossSells.length === 0) return null;

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const totalPrice =
    Number(currentProduct.price) +
    crossSells
      .filter((p) => selected.has(p.id))
      .reduce((sum, p) => sum + Number(p.price), 0);

  async function handleAddAll() {
    setAdding(true);
    // Add current product
    await addToCart(currentProduct.id, 1);
    // Add selected cross-sells
    for (const p of crossSells) {
      if (selected.has(p.id)) {
        await addToCart(p.id, 1);
      }
    }
    setAdding(false);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      <h3 className="font-bold text-gray-900 mb-4">Frecuentemente comprados juntos</h3>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Current product */}
        <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
          <div className="w-14 h-14 relative flex-shrink-0">
            {currentProduct.images[0] && (
              <Image src={currentProduct.images[0].url} alt={currentProduct.name} fill className="object-contain" sizes="56px" />
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-900 line-clamp-1">{currentProduct.name}</p>
            <p className="text-sm font-bold">
              {formatPrice(currentProduct.price)}
              {currentProduct.unidad_venta && <span className="text-xs text-gray-500 font-normal">/{currentProduct.unidad_venta}</span>}
            </p>
          </div>
        </div>

        {crossSells.map((product) => (
          <div key={product.id} className="flex items-center gap-2">
            <span className="text-gray-300 text-xl font-light">+</span>
            <label
              className={`flex items-center gap-3 rounded-xl p-3 cursor-pointer transition-all border ${
                selected.has(product.id)
                  ? "bg-[#013d5a]/5 border-[#013d5a]/20"
                  : "bg-gray-50 border-gray-100 opacity-50"
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(product.id)}
                onChange={() => toggle(product.id)}
                className="w-4 h-4 rounded text-[#013d5a] cursor-pointer"
              />
              <div className="w-14 h-14 relative flex-shrink-0">
                {product.images[0] && (
                  <Image src={product.images[0].url} alt={product.name} fill className="object-contain" sizes="56px" />
                )}
              </div>
              <div>
                <Link href={getProductUrl(product)} className="text-xs font-medium text-gray-900 line-clamp-1 hover:text-[#013d5a]">
                  {product.name}
                </Link>
                <p className="text-sm font-bold">
                  {formatPrice(product.price)}
                  {product.unidad_venta && <span className="text-xs text-gray-500 font-normal">/{product.unidad_venta}</span>}
                </p>
              </div>
            </label>
          </div>
        ))}
      </div>

      {/* Total + Add all button */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div>
          <p className="text-sm text-gray-500">Total por los {1 + selected.size} productos</p>
          <p className="text-xl font-bold text-gray-900">{formatPrice(totalPrice)}</p>
        </div>
        <button
          onClick={handleAddAll}
          disabled={loading || adding}
          className="px-6 py-3 bg-[#013d5a] text-white rounded-xl font-semibold text-sm hover:bg-[#01567a] transition-colors cursor-pointer disabled:opacity-50"
        >
          {adding ? "Agregando..." : "Agregar todos al carrito"}
        </button>
      </div>
    </div>
  );
}
