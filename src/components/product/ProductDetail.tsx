"use client";

import { useState, useEffect, useRef } from "react";
import { ProductGallery } from "./ProductGallery";
import { ProductActions } from "./ProductActions";
import { ShortDescription } from "./ShortDescription";
import type { Product, ProductVariation, SCImage } from "@/lib/wordpress/types";
import Link from "next/link";
import { fbPixelTrack } from "@/lib/fbpixel/client";
import { trackViewItem } from "@/lib/analytics/gtm";

/**
 * Client wrapper that connects the gallery and variation selector.
 * When a variation with its own image is selected, the gallery
 * switches to show that image first.
 */
export function ProductDetail({
  product,
  productUrl,
}: {
  product: Product;
  productUrl: string;
}) {
  const [variationImage, setVariationImage] = useState<SCImage | null>(null);
  // El envío gratis puede estar marcado en una variación puntual, así que el
  // cartel de arriba tiene que seguir a la opción elegida.
  const [selectedVariation, setSelectedVariation] = useState<ProductVariation | null>(null);
  // El feed de Google Shopping lista las VARIACIONES (g:id = id de variación),
  // no el padre. Sin este view_item por variación, el remarketing dinámico no
  // puede matchear los productos variables (tintas individuales, sobre todo).
  const trackedVariations = useRef<Set<number>>(new Set());

  const freeShipping: "yes" | "some" | "no" = product.envio_gratis
    ? "yes"
    : product.type === "variable"
      ? selectedVariation
        ? (selectedVariation.envio_gratis ? "yes" : "no")
        : (product.envio_gratis_parcial ? "some" : "no")
      : "no";

  useEffect(() => {
    const price = Number(product.price) || 0;
    fbPixelTrack("ViewContent", {
      content_ids: [String(product.id)],
      content_name: product.name,
      content_type: "product",
      value: price,
      currency: "ARS",
    });
    trackViewItem({
      item_id: String(product.id),
      item_name: product.name,
      item_brand: product.marca,
      price,
      quantity: 1,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  function handleVariationChange(variation: ProductVariation | null) {
    setSelectedVariation(variation);
    if (variation?.image) {
      setVariationImage(variation.image);
    } else {
      setVariationImage(null);
    }

    if (variation && !trackedVariations.current.has(variation.id)) {
      trackedVariations.current.add(variation.id);
      trackViewItem({
        item_id: String(variation.id),
        item_name: product.name,
        item_brand: product.marca,
        item_variant: Object.values(variation.attributes).join(" / "),
        price: Number(variation.price) || 0,
        quantity: 1,
      });
    }
  }

  // Build gallery images: if a variation image is selected, put it first
  const galleryImages = variationImage
    ? [variationImage, ...product.images.filter((img) => img.id !== variationImage.id)]
    : product.images;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2">
      {/* Gallery */}
      <div className="p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-gray-100">
        <ProductGallery
          images={galleryImages}
          productName={product.name}
          videoUrl={product.url_video_youtube}
          key={variationImage?.id || "default"}
        />
      </div>

      {/* Product info */}
      <div className="p-6 lg:p-8">
        {product.marca && (
          <Link href={`/marca/${product.marca.toLowerCase().replace(/\s+/g, "-")}`}>
            <p className="text-xs font-semibold text-[#013d5a]/50 uppercase tracking-widest mb-1 hover:text-[#013d5a] transition-colors cursor-pointer">
              {product.marca}
            </p>
          </Link>
        )}
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 leading-tight mb-3">
          {product.name}
        </h1>

        {freeShipping !== "no" && product.stock_status !== "outofstock" && (
          <div className="mb-3 inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 rounded-lg px-3 py-2">
            <svg className="w-5 h-5 text-green-700 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
            </svg>
            <div className="text-sm">
              {freeShipping === "some" ? (
                <>
                  <span className="font-bold">Envío gratis en opciones seleccionadas</span>
                  <span className="text-green-700/80"> — elegí una opción para ver si tiene el envío bonificado.</span>
                </>
              ) : (
                <>
                  <span className="font-bold">Envío gratis</span>
                  <span className="text-green-700/80"> — si sumás otros productos al carrito, pagás solo la diferencia del envío.</span>
                </>
              )}
            </div>
          </div>
        )}

        {product.short_description && (
          <ShortDescription html={product.short_description} />
        )}

        {product.review_count > 0 && (
          <button
            type="button"
            onClick={() => {
              if (window.location.hash !== "#reviews") {
                window.location.hash = "reviews";
              } else {
                // Hash ya está — re-disparar para que ProductTabs reaccione si ya estaba abierto
                window.dispatchEvent(new HashChangeEvent("hashchange"));
                document.getElementById("reviews")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            }}
            className="flex items-center gap-2 mb-5 cursor-pointer group/rating"
            aria-label={`Ver ${product.review_count} opiniones`}
          >
            <div className="flex text-yellow-400">
              {[1, 2, 3, 4, 5].map((s) => (
                <svg
                  key={s}
                  className={`w-4 h-4 ${s <= Math.round(product.average_rating) ? "fill-current" : "text-gray-200 fill-current"}`}
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-sm text-gray-500 group-hover/rating:text-[#013d5a] group-hover/rating:underline transition-colors">
              ({product.review_count} {product.review_count === 1 ? "opinión" : "opiniones"})
            </span>
          </button>
        )}

        <ProductActions
          product={product}
          onVariationChange={handleVariationChange}
        />

        {/* WhatsApp link */}
        {!product.is_catalog_only && (
          <a
            href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "5491133466497"}?text=${encodeURIComponent(`Hola, me interesa ${product.name} — ${productUrl}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-green-600 hover:text-green-700 text-sm font-medium cursor-pointer"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            </svg>
            Dudas? Consultanos por WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}
