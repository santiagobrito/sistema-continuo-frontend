/**
 * ProductCard — tarjeta de producto compartida.
 *
 * Una sola fuente de verdad para listados (home, categoría, marca, ofertas, búsqueda,
 * relacionados). Antes había duplicación entre páginas y la mayoría no mostraba el
 * estado de promo (precio tachado + badge -X%). Reportado 2026-04-27.
 */

import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/utils/format";
import { getProductUrl } from "@/lib/wordpress/api";
import type { Product } from "@/lib/wordpress/types";

interface ProductCardProps {
  product: Product;
  /** Si es true, oculta la marca arriba del título (útil en /marca/[slug] donde es redundante). */
  hideBrand?: boolean;
  /** Si es true, oculta el badge "Sin stock" (útil en listados que ya filtran/ordenan por stock). */
  hideOutOfStockBadge?: boolean;
}

function isCatalogOnly(p: Product): boolean {
  return Boolean((p as Product & { is_catalog_only?: boolean }).is_catalog_only);
}

export default function ProductCard({ product, hideBrand, hideOutOfStockBadge }: ProductCardProps) {
  const onSale =
    product.on_sale &&
    product.regular_price &&
    Number(product.regular_price) > Number(product.price);

  const discountPct = onSale
    ? Math.round((1 - Number(product.price) / Number(product.regular_price)) * 100)
    : 0;

  const showCatalog = isCatalogOnly(product);

  return (
    <Link
      href={getProductUrl(product)}
      className="group bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all overflow-hidden"
    >
      <div className="aspect-square relative bg-gray-50/50 p-3">
        {product.images[0] ? (
          <Image
            src={product.images[0].url}
            alt={product.images[0].alt || product.name}
            fill
            className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-200" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        {onSale && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            -{discountPct}%
          </span>
        )}
        {!hideOutOfStockBadge && product.stock_status === "outofstock" && (
          <span className="absolute top-2 right-2 bg-gray-800/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            Sin stock
          </span>
        )}
      </div>
      <div className="p-3.5 pt-2.5">
        {!hideBrand && product.marca && (
          <p className="text-[10px] font-semibold text-[#013d5a]/60 uppercase tracking-widest mb-0.5">{product.marca}</p>
        )}
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug mb-2 group-hover:text-[#013d5a] transition-colors">
          {product.name}
        </h3>
        {product.price && !showCatalog ? (
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-base font-bold text-gray-900">{formatPrice(product.price)}</span>
            {product.unidad_venta && <span className="text-xs text-gray-500">/{product.unidad_venta}</span>}
            {onSale && (
              <span className="text-xs text-gray-400 line-through">{formatPrice(product.regular_price)}</span>
            )}
          </div>
        ) : showCatalog ? (
          <span className="text-sm text-[#013d5a] font-semibold">Consultar</span>
        ) : null}
      </div>
    </Link>
  );
}
