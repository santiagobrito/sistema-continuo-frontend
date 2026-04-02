import { notFound } from "next/navigation";
import { getProduct, getCategory, getProductUrl, getCategoryUrl } from "@/lib/wordpress/api";
import { formatPrice, getWhatsAppUrl } from "@/lib/utils/format";
import type { Metadata } from "next";
import type { Product, Category } from "@/lib/wordpress/types";
import { isCatalogProduct } from "@/lib/wordpress/types";
import Image from "next/image";
import Link from "next/link";
import { ProductActions } from "@/components/product/ProductActions";
import { ProductTabs } from "@/components/product/ProductTabs";
import { ProductGallery } from "@/components/product/ProductGallery";

interface Props {
  params: Promise<{ category: string; slug: string[] }>;
}

async function resolveRoute(
  category: string,
  slugParts: string[]
): Promise<{ type: "product"; data: Product } | { type: "category"; data: Category } | null> {
  const lastSlug = slugParts[slugParts.length - 1];
  try {
    const product = await getProduct(lastSlug);
    if (product) return { type: "product", data: product };
  } catch {}
  try {
    const cat = await getCategory(lastSlug);
    if (cat) return { type: "category", data: cat };
  } catch {}
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, slug } = await params;
  const resolved = await resolveRoute(category, slug);
  if (!resolved) return { title: "No encontrado" };

  if (resolved.type === "product") {
    const p = resolved.data as Product;
    return {
      title: p.seo?.title || p.name,
      description: p.seo?.description || p.short_description?.replace(/<[^>]*>/g, "").slice(0, 160) || "",
      openGraph: {
        title: p.name,
        images: p.images[0] ? [{ url: p.images[0].url }] : [],
      },
    };
  }
  const c = resolved.data as Category;
  return { title: c.seo_title || c.name, description: c.seo_description || "" };
}

export default async function CatchAllPage({ params }: Props) {
  const { category, slug } = await params;
  const resolved = await resolveRoute(category, slug);
  if (!resolved) notFound();

  if (resolved.type === "category") {
    return <SubcategoryView category={resolved.data as Category} parentSlug={category} />;
  }
  return <ProductView product={resolved.data as Product} parentSlug={category} />;
}

// === Subcategory ===

function SubcategoryView({ category, parentSlug }: { category: Category; parentSlug: string }) {
  const products = category.products?.data ?? [];
  return (
    <main className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <nav className="text-sm text-gray-500 mb-5">
          <Link href="/" className="hover:text-[#013d5a]">Inicio</Link>
          <span className="mx-2 text-gray-300">/</span>
          <Link href={`/${parentSlug}`} className="hover:text-[#013d5a] capitalize">{parentSlug.replace(/-/g, " ")}</Link>
          <span className="mx-2 text-gray-300">/</span>
          <span className="text-gray-900 font-medium">{category.name}</span>
        </nav>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">{category.name}</h1>
        <p className="text-gray-500 mb-8">{category.products?.total || 0} productos</p>

        {category.children && category.children.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            {category.children.map((sub) => (
              <Link key={sub.id} href={`/${sub.path}`} className="px-4 py-2 bg-white border border-gray-200 hover:border-[#013d5a] rounded-full text-sm font-medium transition-all">
                {sub.name} <span className="text-gray-400 text-xs ml-1">{sub.count}</span>
              </Link>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {products.map((product) => (
            <Link key={product.id} href={getProductUrl(product)} className="group bg-white rounded-xl border border-gray-100 hover:shadow-lg transition-all overflow-hidden">
              <div className="aspect-square relative bg-gray-50/50 p-3">
                {product.images[0] ? (
                  <Image src={product.images[0].url} alt={product.name} fill className="object-contain p-1 group-hover:scale-105 transition-transform duration-300" sizes="25vw" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><svg className="w-12 h-12 text-gray-200" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>
                )}
              </div>
              <div className="p-3.5 pt-2">
                <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2 group-hover:text-[#013d5a]">{product.name}</h3>
                {product.price && !isCatalogProduct(product) ? (
                  <span className="text-base font-bold text-gray-900">{formatPrice(product.price)}</span>
                ) : isCatalogProduct(product) ? (
                  <span className="text-sm text-[#013d5a] font-semibold">Solicitar cotizacion</span>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

// === Product ===

function ProductView({ product, parentSlug }: { product: Product; parentSlug: string }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const productUrl = `${siteUrl}${getProductUrl(product)}`;

  const tabs = [
    {
      id: "description",
      label: "Descripcion",
      content: product.description ? (
        <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-600" dangerouslySetInnerHTML={{ __html: product.description }} />
      ) : null,
    },
    {
      id: "specs",
      label: "Especificaciones",
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {product.sku && <div className="flex justify-between py-2.5 px-3 bg-gray-50 rounded-lg"><span className="text-sm text-gray-500">SKU</span><span className="text-sm font-medium text-gray-900">{product.sku}</span></div>}
          {product.barcode && <div className="flex justify-between py-2.5 px-3 bg-gray-50 rounded-lg"><span className="text-sm text-gray-500">EAN</span><span className="text-sm font-medium text-gray-900">{product.barcode}</span></div>}
          {product.marca && <div className="flex justify-between py-2.5 px-3 bg-gray-50 rounded-lg"><span className="text-sm text-gray-500">Marca</span><span className="text-sm font-medium text-gray-900">{product.marca}</span></div>}
          {product.weight && <div className="flex justify-between py-2.5 px-3 bg-gray-50 rounded-lg"><span className="text-sm text-gray-500">Peso</span><span className="text-sm font-medium text-gray-900">{product.weight} kg</span></div>}
          {product.dimensions?.length && <div className="flex justify-between py-2.5 px-3 bg-gray-50 rounded-lg"><span className="text-sm text-gray-500">Dimensiones</span><span className="text-sm font-medium text-gray-900">{product.dimensions.length} x {product.dimensions.width} x {product.dimensions.height} cm</span></div>}
          {product.attributes?.filter(a => !a.variation).map((attr) => (
            <div key={attr.slug} className="flex justify-between py-2.5 px-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-500">{attr.name}</span>
              <span className="text-sm font-medium text-gray-900">{attr.options.join(", ")}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "video",
      label: "Video",
      content: product.url_video_youtube ? (
        <div className="aspect-video rounded-xl overflow-hidden">
          <iframe src={product.url_video_youtube.replace("watch?v=", "embed/").replace("shorts/", "embed/")} className="w-full h-full" allowFullScreen loading="lazy" />
        </div>
      ) : null,
    },
    {
      id: "reviews",
      label: "Opiniones",
      count: product.review_count,
      content: (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">
            {product.review_count > 0
              ? `${product.review_count} opiniones — promedio ${product.average_rating}/5`
              : "Aun no hay opiniones. Se el primero en opinar."}
          </p>
        </div>
      ),
    },
  ];

  return (
    <main className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Breadcrumbs */}
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-[#013d5a]">Inicio</Link>
          {product.categories[0] && (
            <>
              {product.categories[0].path.split("/").map((seg, i, arr) => (
                <span key={seg}>
                  <span className="mx-2 text-gray-300">/</span>
                  <Link href={`/${arr.slice(0, i + 1).join("/")}`} className="hover:text-[#013d5a] capitalize">{seg.replace(/-/g, " ")}</Link>
                </span>
              ))}
            </>
          )}
          <span className="mx-2 text-gray-300">/</span>
          <span className="text-gray-700 font-medium line-clamp-1">{product.name}</span>
        </nav>

        {/* Product layout */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Gallery */}
            <div className="p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-gray-100">
              <ProductGallery images={product.images} productName={product.name} />
            </div>

            {/* Product info */}
            <div className="p-6 lg:p-8">
              {product.marca && (
                <p className="text-xs font-semibold text-[#013d5a]/50 uppercase tracking-widest mb-1">{product.marca}</p>
              )}
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 leading-tight mb-3">{product.name}</h1>

              {product.short_description && (
                <div className="text-sm text-gray-500 leading-relaxed mb-4 line-clamp-3" dangerouslySetInnerHTML={{ __html: product.short_description }} />
              )}

              {product.review_count > 0 && (
                <div className="flex items-center gap-2 mb-5">
                  <div className="flex text-yellow-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <svg key={s} className={`w-4 h-4 ${s <= Math.round(product.average_rating) ? "fill-current" : "text-gray-200 fill-current"}`} viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-sm text-gray-500">({product.review_count})</span>
                </div>
              )}

              {/* Catalog only CTA — Gran Formato or products without price */}
              {isCatalogProduct(product) ? (
                <CatalogCTA productName={product.name} productUrl={productUrl} />
              ) : (
                <>
                  <ProductActions product={product} />
                  <a
                    href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "5491130793862"}?text=${encodeURIComponent(`Hola, me interesa ${product.name} — ${productUrl}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-green-600 hover:text-green-700 text-sm font-medium cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
                    Dudas? Consultanos por WhatsApp
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="border-t border-gray-100 px-6 lg:px-8">
            <ProductTabs tabs={tabs} />
          </div>
        </div>

        {/* Related */}
        {product.related && product.related.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Productos relacionados</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {product.related.slice(0, 6).map((rel) => (
                <Link key={rel.id} href={getProductUrl(rel)} className="group bg-white rounded-xl border border-gray-100 hover:shadow-md transition-all overflow-hidden">
                  <div className="aspect-square relative bg-gray-50/50 p-2">
                    {rel.images[0] && <Image src={rel.images[0].url} alt={rel.name} fill className="object-contain p-1" sizes="16vw" />}
                  </div>
                  <div className="p-2.5">
                    <h3 className="text-xs font-medium line-clamp-2 text-gray-700 group-hover:text-[#013d5a]">{rel.name}</h3>
                    {rel.price && <p className="text-sm font-bold mt-1 text-gray-900">{formatPrice(rel.price)}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// === Catalog CTA for Gran Formato / products without online sale ===

const WHATSAPP_GRAN_FORMATO = process.env.NEXT_PUBLIC_WHATSAPP_GRAN_FORMATO || "5491130793862";

function CatalogCTA({ productName, productUrl }: { productName: string; productUrl: string }) {
  const message = encodeURIComponent(
    `Hola, estoy interesado en ${productName}. Me gustaria recibir una cotizacion. ${productUrl}`
  );

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-[#013d5a] rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-[#013d5a] text-lg">Equipo de gran formato</h3>
            <p className="text-sm text-gray-600 mt-1 leading-relaxed">
              Este equipo requiere una cotizacion personalizada. Por sus caracteristicas
              de tamanio y configuracion, nuestro equipo de ejecutivos te asesora para
              encontrar la mejor solucion para tu negocio, incluyendo instalacion,
              capacitacion y soporte tecnico.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            href={`https://wa.me/${WHATSAPP_GRAN_FORMATO}?text=${message}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-3.5 rounded-xl font-semibold text-sm transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
            Hablar con ejecutivo
          </a>
          <a
            href={`mailto:ventas@sistemacontinuo.com.ar?subject=Cotizacion: ${encodeURIComponent(productName)}&body=${encodeURIComponent(`Hola, me interesa recibir cotizacion por: ${productName}\n\n${productUrl}`)}`}
            className="flex items-center justify-center gap-2 bg-white border border-[#013d5a]/20 text-[#013d5a] py-3.5 rounded-xl font-semibold text-sm hover:bg-[#013d5a]/5 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
            Solicitar cotizacion por email
          </a>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-white rounded-xl border border-gray-100 p-3">
          <p className="text-xs font-semibold text-gray-900">Asesoramiento</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Tecnico especializado</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-3">
          <p className="text-xs font-semibold text-gray-900">Instalacion</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Opcional con capacitacion</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-3">
          <p className="text-xs font-semibold text-gray-900">Financiacion</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Planes a medida</p>
        </div>
      </div>
    </div>
  );
}
