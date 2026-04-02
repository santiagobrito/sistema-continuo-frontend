import { notFound } from "next/navigation";
import { getProduct, getCategory, getProductUrl } from "@/lib/wordpress/api";
import { formatPrice } from "@/lib/utils/format";
import { getWhatsAppUrl } from "@/lib/utils/format";
import type { Metadata } from "next";
import type { Product, Category } from "@/lib/wordpress/types";
import Image from "next/image";
import Link from "next/link";

interface Props {
  params: Promise<{ category: string; slug: string[] }>;
}

/**
 * Resolve the slug array to either a product or a subcategory.
 * URL patterns:
 *   /estampadoras/estampadora-40x60          → product
 *   /estampadoras/senko-red-premium          → subcategory
 *   /estampadoras/senko-red-premium/manuales → subcategory
 *   /estampadoras/senko-red-premium/manuales/estampadora-x → product
 *
 * Strategy: try the last segment as a product first. If not found, try as a category.
 */
async function resolveRoute(
  category: string,
  slugParts: string[]
): Promise<{ type: "product"; data: Product } | { type: "category"; data: Category } | null> {
  const lastSlug = slugParts[slugParts.length - 1];

  // Try as product first
  try {
    const product = await getProduct(lastSlug);
    if (product) return { type: "product", data: product };
  } catch {
    // Not a product
  }

  // Try as category
  try {
    const cat = await getCategory(lastSlug);
    if (cat) return { type: "category", data: cat };
  } catch {
    // Not a category either
  }

  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, slug } = await params;
  const resolved = await resolveRoute(category, slug);

  if (!resolved) return { title: "No encontrado" };

  if (resolved.type === "product") {
    const p = resolved.data as Product;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
    return {
      title: p.seo?.title || p.name,
      description: p.seo?.description || p.short_description?.replace(/<[^>]*>/g, "").slice(0, 160) || "",
      openGraph: {
        title: p.name,
        images: p.images[0] ? [{ url: p.images[0].url }] : [],
        type: "website",
        url: `${siteUrl}${getProductUrl(p)}`,
      },
    };
  }

  const c = resolved.data as Category;
  return {
    title: c.seo_title || c.name,
    description: c.seo_description || c.description || "",
  };
}

export default async function CatchAllPage({ params }: Props) {
  const { category, slug } = await params;
  const resolved = await resolveRoute(category, slug);

  if (!resolved) notFound();

  if (resolved.type === "category") {
    return <SubcategoryView category={resolved.data as Category} parentSlug={category} />;
  }

  return <ProductView product={resolved.data as Product} />;
}

// === Subcategory View ===

function SubcategoryView({ category, parentSlug }: { category: Category; parentSlug: string }) {
  const products = category.products?.data ?? [];

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-blue-600">Inicio</Link>
        <span className="mx-2">/</span>
        <Link href={`/${parentSlug}`} className="hover:text-blue-600 capitalize">{parentSlug.replace(/-/g, " ")}</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{category.name}</span>
      </nav>

      <h1 className="text-3xl font-bold mb-6">{category.name}</h1>

      {category.seo_content && (
        <div className="prose max-w-none mb-8" dangerouslySetInnerHTML={{ __html: category.seo_content }} />
      )}

      {/* Subcategories */}
      {category.children && category.children.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-3">
          {category.children.map((sub) => (
            <Link
              key={sub.id}
              href={`/${sub.path}`}
              className="px-4 py-2 bg-gray-100 hover:bg-blue-50 hover:text-blue-700 rounded-lg text-sm transition-colors"
            >
              {sub.name} ({sub.count})
            </Link>
          ))}
        </div>
      )}

      {/* Products */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {products.map((product) => (
          <Link
            key={product.id}
            href={getProductUrl(product)}
            className="group block bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow overflow-hidden"
          >
            <div className="aspect-square relative bg-gray-50">
              {product.images[0] ? (
                <Image
                  src={product.images[0].url}
                  alt={product.images[0].alt || product.name}
                  fill
                  className="object-contain p-2 group-hover:scale-105 transition-transform"
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">Sin imagen</div>
              )}
            </div>
            <div className="p-3">
              {product.marca && (
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{product.marca}</p>
              )}
              <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">{product.name}</h3>
              {product.price && !product.is_catalog_only ? (
                <span className="text-lg font-bold">{formatPrice(product.price)}</span>
              ) : product.is_catalog_only ? (
                <span className="text-sm text-blue-600 font-medium">Consultar precio</span>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}

// === Product View ===

function ProductView({ product }: { product: Product }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const productUrl = `${siteUrl}${getProductUrl(product)}`;

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-blue-600">Inicio</Link>
        {product.categories[0] && (
          <>
            {product.categories[0].path.split("/").map((seg, i, arr) => (
              <span key={seg}>
                <span className="mx-2">/</span>
                <Link
                  href={`/${arr.slice(0, i + 1).join("/")}`}
                  className="hover:text-blue-600 capitalize"
                >
                  {seg.replace(/-/g, " ")}
                </Link>
              </span>
            ))}
          </>
        )}
        <span className="mx-2">/</span>
        <span className="text-gray-900">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* Gallery */}
        <div>
          {product.images.length > 0 ? (
            <div className="space-y-4">
              <div className="aspect-square relative bg-gray-50 rounded-lg overflow-hidden">
                <Image
                  src={product.images[0].url}
                  alt={product.images[0].alt || product.name}
                  fill
                  className="object-contain p-4"
                  preload
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              {product.images.length > 1 && (
                <div className="grid grid-cols-5 gap-2">
                  {product.images.slice(1, 6).map((img) => (
                    <div key={img.id} className="aspect-square relative bg-gray-50 rounded border">
                      <Image
                        src={img.url}
                        alt={img.alt || product.name}
                        fill
                        className="object-contain p-1"
                        sizes="10vw"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
              Sin imagen
            </div>
          )}
        </div>

        {/* Product info */}
        <div>
          {product.marca && (
            <p className="text-sm text-gray-500 uppercase tracking-wider mb-1">{product.marca}</p>
          )}
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>

          {/* Rating */}
          {product.review_count > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-yellow-500">{"★".repeat(Math.round(product.average_rating))}</span>
              <span className="text-sm text-gray-500">({product.review_count} reseñas)</span>
            </div>
          )}

          {/* Price / Catalog mode */}
          {product.is_catalog_only ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800 font-medium mb-2">
                {product.catalog_contact_message || "Para consultar precio y disponibilidad, contactá con nuestro equipo de ventas."}
              </p>
              <a
                href={getWhatsAppUrl(product.name, productUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Contactar ejecutivo
              </a>
            </div>
          ) : (
            <div className="mb-6">
              {product.price ? (
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-3xl font-bold text-gray-900">
                    {formatPrice(product.price)}
                  </span>
                  {product.on_sale && product.regular_price && (
                    <span className="text-xl text-gray-400 line-through">
                      {formatPrice(product.regular_price)}
                    </span>
                  )}
                </div>
              ) : null}

              {/* Quantity discounts */}
              {product.quantity_discounts && product.quantity_discounts.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                  <p className="text-sm font-medium text-green-800 mb-2">Descuentos por cantidad:</p>
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    {product.quantity_discounts.map((tier, i) => (
                      <div key={i} className="flex justify-between">
                        <span>{tier.min_qty}+ unidades:</span>
                        <span className="font-medium text-green-700">{tier.discount_percent}% off</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stock */}
              {product.stock_status === "outofstock" ? (
                <p className="text-red-500 font-medium mb-4">Sin stock</p>
              ) : product.stock_status === "instock" ? (
                <p className="text-green-600 text-sm mb-4">En stock</p>
              ) : null}

              {/* Add to cart button - client component needed */}
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                Agregar al carrito
              </button>
            </div>
          )}

          {/* SKU / Meta */}
          <div className="border-t pt-4 space-y-1 text-sm text-gray-500">
            {product.sku && <p>SKU: {product.sku}</p>}
            {product.barcode && <p>EAN: {product.barcode}</p>}
            {product.weight && <p>Peso: {product.weight} kg</p>}
            {product.categories.length > 0 && (
              <p>
                Categoría:{" "}
                {product.categories.map((c, i) => (
                  <span key={c.id}>
                    {i > 0 && ", "}
                    <Link href={`/${c.path}`} className="text-blue-600 hover:underline">
                      {c.name}
                    </Link>
                  </span>
                ))}
              </p>
            )}
          </div>

          {/* WhatsApp */}
          {!product.is_catalog_only && (
            <a
              href={getWhatsAppUrl(product.name, productUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-green-600 hover:text-green-700 text-sm"
            >
              ¿Tenés dudas? Consultanos por WhatsApp
            </a>
          )}
        </div>
      </div>

      {/* Description tabs */}
      {(product.description || product.url_video_youtube) && (
        <div className="mt-12 border-t pt-8">
          {product.description && (
            <div className="mb-8">
              <h2 className="text-xl font-bold mb-4">Descripción</h2>
              <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            </div>
          )}

          {product.url_video_youtube && (
            <div className="mb-8">
              <h2 className="text-xl font-bold mb-4">Video</h2>
              <div className="aspect-video">
                <iframe
                  src={product.url_video_youtube.replace("watch?v=", "embed/")}
                  className="w-full h-full rounded-lg"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Related products */}
      {product.related && product.related.length > 0 && (
        <div className="mt-12 border-t pt-8">
          <h2 className="text-xl font-bold mb-6">Productos relacionados</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {product.related.slice(0, 6).map((rel) => (
              <Link
                key={rel.id}
                href={getProductUrl(rel)}
                className="group block bg-white rounded-lg border hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="aspect-square relative bg-gray-50">
                  {rel.images[0] && (
                    <Image
                      src={rel.images[0].url}
                      alt={rel.name}
                      fill
                      className="object-contain p-2"
                      sizes="16vw"
                    />
                  )}
                </div>
                <div className="p-2">
                  <h3 className="text-xs font-medium line-clamp-2">{rel.name}</h3>
                  {rel.price && <p className="text-sm font-bold mt-1">{formatPrice(rel.price)}</p>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
