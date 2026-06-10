/**
 * ProductCard — tarjeta de producto compartida.
 *
 * Una sola fuente de verdad para listados (home, categoría, marca, ofertas, búsqueda,
 * relacionados). Antes había duplicación entre páginas y la mayoría no mostraba el
 * estado de promo (precio tachado + badge -X%). Reportado 2026-04-27.
 *
 * Server async: lee la campaña activa via React-cache (1 fetch por request) y
 * añade automáticamente badge top-right si el producto está adherido.
 */

import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/utils/format";
import { getActiveCampaign, getProductUrl } from "@/lib/wordpress/api";
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

export default async function ProductCard({ product, hideBrand, hideOutOfStockBadge }: ProductCardProps) {
  const onSale =
    product.on_sale &&
    product.regular_price &&
    Number(product.regular_price) > Number(product.price);

  const discountPct = onSale
    ? Math.round((1 - Number(product.price) / Number(product.regular_price)) * 100)
    : 0;

  const showCatalog = isCatalogOnly(product);

  const campaign = product.in_active_campaign ? await getActiveCampaign({ withProducts: false }) : null;
  const showCampaignBadge = Boolean(campaign && product.in_active_campaign);
  const isOutOfStock = product.stock_status === "outofstock";

  const maxQtyDiscount = product.quantity_discounts?.length
    ? Math.max(...product.quantity_discounts.map((d) => Number(d.discount_percent)))
    : 0;
  const hasQtyDiscount = maxQtyDiscount > 0 && !showCatalog;

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
            quality={65}
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
        {product.envio_gratis && product.stock_status !== "outofstock" && (
          <span className={`absolute ${onSale ? "top-9" : "top-2"} left-2 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1`}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
            </svg>
            Envío gratis
          </span>
        )}
        {!hideOutOfStockBadge && isOutOfStock && (
          <span className="absolute top-2 right-2 bg-gray-800/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            Sin stock
          </span>
        )}
        {hasQtyDiscount && !isOutOfStock && (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8 10-4-5M4 7l4 5" />
            </svg>
            Por cantidad -{maxQtyDiscount}%
          </span>
        )}
        {product.is_pinned && !isOutOfStock && !showCampaignBadge && (
          <span className="absolute top-2 right-2 inline-flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M12 17.27l5.18 3.13-1.37-5.91L20.5 9.71l-6.08-.52L12 3.5 9.58 9.19 3.5 9.71l4.69 4.78-1.37 5.91L12 17.27z" />
            </svg>
            Destacado
          </span>
        )}
        {showCampaignBadge && campaign && !isOutOfStock && (
          <span
            className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded-full shadow-md"
            style={{ backgroundColor: campaign.primary_color, color: campaign.text_color }}
            title={campaign.name}
          >
            {campaign.logo?.url && (
              <Image
                src={campaign.logo.url}
                alt={campaign.logo.alt || campaign.name}
                width={campaign.logo.width || 40}
                height={campaign.logo.height || 14}
                className="h-3.5 w-auto object-contain"
                unoptimized
              />
            )}
            {campaign.badge_label && (
              <span className="text-[10px] font-extrabold uppercase tracking-wide">
                {campaign.badge_label}
              </span>
            )}
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
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-base font-bold text-gray-900">{formatPrice(product.price)}</span>
              {product.unidad_venta && <span className="text-xs text-gray-500">/{product.unidad_venta}</span>}
              {onSale && (
                <span className="text-xs text-gray-400 line-through">{formatPrice(product.regular_price)}</span>
              )}
            </div>
            {onSale && (
              <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/>
                </svg>
                En oferta
              </span>
            )}
          </div>
        ) : showCatalog ? (
          <span className="text-sm text-[#013d5a] font-semibold">Consultar</span>
        ) : null}
      </div>
    </Link>
  );
}
