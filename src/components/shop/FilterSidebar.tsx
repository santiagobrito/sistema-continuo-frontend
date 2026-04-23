"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Product } from "@/lib/wordpress/types";
import { formatPrice } from "@/lib/utils/format";

interface Props {
  slug: string;
  products: Product[];
}

export function FilterSidebar({ slug, products }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Current filter state from URL
  const currentOrderby = searchParams.get("orderby") || "popularity";
  const currentOrder = searchParams.get("order") || "DESC";
  const currentBrands = searchParams.get("brand")?.split(",").filter(Boolean) || [];
  const currentInStock = searchParams.get("in_stock") === "1";
  const currentOnSale = searchParams.get("on_sale") === "1";

  // Mobile filter drawer
  const [mobileOpen, setMobileOpen] = useState(false);

  // Compute available brands from products
  const brands = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      if (p.marca) {
        map.set(p.marca, (map.get(p.marca) || 0) + 1);
      }
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [products]);

  // Price range from products
  const priceRange = useMemo(() => {
    const prices = products.map((p) => Number(p.price)).filter((p) => p > 0);
    return { min: Math.min(...prices, 0), max: Math.max(...prices, 0) };
  }, [products]);

  // Counts
  const inStockCount = products.filter((p) => p.stock_status === "instock").length;
  const onSaleCount = products.filter((p) => p.on_sale).length;

  function buildUrl(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    // Reset page when filters change
    params.delete("page");
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    return `/${slug}?${params.toString()}`;
  }

  function toggleBrand(brand: string) {
    const next = currentBrands.includes(brand)
      ? currentBrands.filter((b) => b !== brand)
      : [...currentBrands, brand];
    router.push(buildUrl({ brand: next.length > 0 ? next.join(",") : null }));
  }

  function setSort(orderby: string, order: string) {
    router.push(buildUrl({ orderby, order }));
  }

  function toggleStock() {
    router.push(buildUrl({ in_stock: currentInStock ? null : "1" }));
  }

  function toggleSale() {
    router.push(buildUrl({ on_sale: currentOnSale ? null : "1" }));
  }

  function clearAll() {
    router.push(`/${slug}`);
  }

  const hasActiveFilters = currentBrands.length > 0 || currentInStock || currentOnSale;

  const filterContent = (
    <>
      {/* Sort */}
      <div className="mb-5">
        <h3 className="font-semibold text-gray-900 text-sm mb-3">Ordenar por</h3>
        <div className="space-y-1">
          {[
            { label: "Mas vendidos", val: "popularity", ord: "DESC" },
            { label: "Menor precio", val: "price", ord: "ASC" },
            { label: "Mayor precio", val: "price", ord: "DESC" },
            { label: "Mas recientes", val: "date", ord: "DESC" },
          ].map((opt) => (
            <button
              key={opt.val + opt.ord}
              onClick={() => setSort(opt.val, opt.ord)}
              className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                currentOrderby === opt.val && currentOrder === opt.ord
                  ? "bg-[#013d5a] text-white font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Price range info */}
      {priceRange.max > 0 && (
        <div className="mb-5 pb-5 border-t border-gray-100 pt-5">
          <h3 className="font-semibold text-gray-900 text-sm mb-2">Precio</h3>
          <p className="text-xs text-gray-500">
            {formatPrice(priceRange.min)} — {formatPrice(priceRange.max)}
          </p>
        </div>
      )}

      {/* Brand filter */}
      {brands.length > 1 && (
        <div className="mb-5 pb-5 border-t border-gray-100 pt-5">
          <h3 className="font-semibold text-gray-900 text-sm mb-3">Marca</h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {brands.map((brand) => (
              <label
                key={brand.name}
                className="flex items-center gap-2.5 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={currentBrands.includes(brand.name)}
                  onChange={() => toggleBrand(brand.name)}
                  className="w-4 h-4 rounded border-gray-300 text-[#013d5a] focus:ring-[#013d5a]/20 cursor-pointer"
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900 flex-1">
                  {brand.name}
                </span>
                <span className="text-xs text-gray-400">{brand.count}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Toggles */}
      <div className="space-y-3 pb-5 border-t border-gray-100 pt-5">
        {inStockCount < products.length && (
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={currentInStock}
              onChange={toggleStock}
              className="w-4 h-4 rounded border-gray-300 text-[#013d5a] focus:ring-[#013d5a]/20 cursor-pointer"
            />
            <span className="text-sm text-gray-700">Solo en stock</span>
            <span className="text-xs text-gray-400">({inStockCount})</span>
          </label>
        )}
        {onSaleCount > 0 && (
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={currentOnSale}
              onChange={toggleSale}
              className="w-4 h-4 rounded border-gray-300 text-[#013d5a] focus:ring-[#013d5a]/20 cursor-pointer"
            />
            <span className="text-sm text-gray-700">Solo ofertas</span>
            <span className="text-xs text-red-500 font-medium">({onSaleCount})</span>
          </label>
        )}
      </div>

      {/* Clear */}
      {hasActiveFilters && (
        <button
          onClick={clearAll}
          className="w-full text-center text-xs text-[#013d5a] hover:underline cursor-pointer pt-3 border-t border-gray-100"
        >
          Limpiar filtros
        </button>
      )}
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="lg:w-60 flex-shrink-0 hidden lg:block">
        <div className="bg-white rounded-xl border border-gray-100 p-5 sticky top-28">
          {filterContent}
        </div>
      </aside>

      {/* Mobile filter button */}
      <div className="lg:hidden fixed bottom-20 right-4 z-40">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex items-center gap-2 bg-[#013d5a] text-white px-5 py-3 rounded-full shadow-lg font-medium text-sm cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
          </svg>
          Filtrar
          {hasActiveFilters && (
            <span className="w-5 h-5 bg-white text-[#013d5a] rounded-full text-[10px] flex items-center justify-center font-bold">
              {(currentBrands.length > 0 ? 1 : 0) + (currentInStock ? 1 : 0) + (currentOnSale ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[80vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">Filtros</h2>
              <button onClick={() => setMobileOpen(false)} className="text-gray-400 hover:text-gray-900 cursor-pointer">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {filterContent}
            <button
              onClick={() => setMobileOpen(false)}
              className="w-full mt-4 bg-[#013d5a] text-white py-3.5 rounded-xl font-semibold text-sm cursor-pointer"
            >
              Ver resultados
            </button>
          </div>
        </div>
      )}
    </>
  );
}
