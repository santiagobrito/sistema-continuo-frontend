import { notFound, permanentRedirect } from "next/navigation";
import { getProduct, getCategory, getProductUrl, getSettings } from "@/lib/wordpress/api";
import type { Metadata } from "next";
import type { Product, Category } from "@/lib/wordpress/types";
import { isCatalogProduct } from "@/lib/wordpress/types";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ProductActions } from "@/components/product/ProductActions";
import ProductCard from "@/components/product/ProductCard";
import { JsonLd } from "@/components/seo/JsonLd";
import { queryString, shouldRedirect } from "@/lib/seo/canonical-redirect";
import { generateProductSchema, generateBreadcrumbSchema } from "@/lib/seo/structured-data";
import { getProductReviews } from "@/lib/wordpress/api";
import { ProductDetail } from "@/components/product/ProductDetail";
import { ProductGallery } from "@/components/product/ProductGallery";
import { CatalogCTA } from "@/components/product/CatalogCTA";

const ProductTabs = dynamic(() => import("@/components/product/ProductTabs").then(m => m.ProductTabs));
const FrequentlyBoughtTogether = dynamic(() => import("@/components/product/FrequentlyBoughtTogether").then(m => m.FrequentlyBoughtTogether));
const ReviewSection = dynamic(() => import("@/components/product/ReviewSection").then(m => m.ReviewSection));

export const revalidate = 3600;

interface Props {
  params: Promise<{ category: string; slug: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

    // Auto-generate description if no custom SEO desc
    const autoDesc = [
      p.name,
      p.marca ? `Marca ${p.marca}.` : "",
      p.price && !isCatalogProduct(p) ? `$${Number(p.price).toLocaleString("es-AR")}.` : "",
      "Envío a todo Argentina.",
      "Producto con Garantía.",
      "Compra online en Sistema Continuo.",
    ].filter(Boolean).join(" ").slice(0, 160);

    const desc = p.seo?.description
      || p.short_description?.replace(/<[^>]*>/g, "").trim().slice(0, 160)
      || autoDesc;

    const productUrl = getProductUrl(p);

    const seoTitle = p.seo?.title || p.name;
    return {
      title: seoTitle.includes("Sistema Continuo") ? { absolute: seoTitle } : seoTitle,
      description: desc,
      alternates: { canonical: `${siteUrl}${productUrl}` },
      openGraph: {
        title: p.name,
        description: desc,
        images: p.images[0] ? [{ url: p.images[0].url, width: 800, height: 800 }] : [],
        type: "website",
        url: `${siteUrl}${productUrl}`,
      },
      twitter: {
        card: "summary_large_image",
        title: p.name,
        description: desc,
        images: p.images[0] ? [p.images[0].url] : [],
      },
    };
  }
  const c = resolved.data as Category;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const catDesc = c.seo_description || `Compra ${c.name} online en Sistema Continuo. ${c.count} productos disponibles. Envío a todo Argentina. Pagá con tarjeta vía MercadoPago.`;
  return {
    title: (c.seo_title && c.seo_title.includes("Sistema Continuo")) ? { absolute: c.seo_title } : (c.seo_title || c.name),
    description: catDesc,
    alternates: { canonical: `${siteUrl}/${c.path}` },
  };
}

export default async function CatchAllPage({ params, searchParams }: Props) {
  const { category, slug } = await params;
  const resolved = await resolveRoute(category, slug);
  if (!resolved) notFound();

  // `resolveRoute` mira solo el último segmento, así que cualquier prefijo llega
  // hasta acá con un 200. Si la ruta pedida no es la canónica, se redirige.
  const requested = `/${[category, ...slug].join("/")}`;
  const isProduct = resolved.type === "product";
  const canonical = isProduct
    ? getProductUrl(resolved.data as Product)
    : `/${(resolved.data as Category).path}`;
  if (shouldRedirect(requested, canonical, isProduct ? 2 : 1)) {
    permanentRedirect(`${canonical}${queryString(await searchParams)}`);
  }

  if (resolved.type === "category") {
    return <SubcategoryView category={resolved.data as Category} parentSlug={category} />;
  }
  return <ProductView product={resolved.data as Product} parentSlug={category} />;
}

// === Subcategory ===

function SubcategoryView({ category, parentSlug }: { category: Category; parentSlug: string }) {
  const rawProducts = category.products?.data ?? [];
  const products = [...rawProducts].sort((a, b) => {
    if (a.stock_status === "outofstock" && b.stock_status !== "outofstock") return 1;
    if (a.stock_status !== "outofstock" && b.stock_status === "outofstock") return -1;
    return 0;
  });
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
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </main>
  );
}

// === Product ===

async function ProductView({ product, parentSlug }: { product: Product; parentSlug: string }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const productUrl = `${siteUrl}${getProductUrl(product)}`;

  // Fetch reviews + settings in parallel
  const [reviewsData, settings] = await Promise.all([
    getProductReviews(product.slug, { per_page: 10 }).catch(() => ({ data: [], total: 0, pages: 0, page: 1 })),
    getSettings().catch(() => ({ whatsapp_ventas: "5491133466497", whatsapp_gran_formato: "5491130793862", telefono_fijo: "01146501592", email_ventas: "ventas@sistemacontinuo.com.ar" })),
  ]);

  const tabs = [
    {
      id: "description",
      label: "Descripción",
      content: product.description ? (
        <div className="prose prose-base max-w-none prose-headings:text-gray-900 prose-headings:font-semibold prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3 prose-h2:pb-2 prose-h2:border-b prose-h2:border-gray-100 prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-2 prose-p:text-gray-600 prose-p:leading-relaxed prose-p:mb-4 prose-ul:my-4 prose-ul:pl-5 prose-li:text-gray-600 prose-li:leading-relaxed prose-li:mb-1.5 prose-li:marker:text-[#013d5a] prose-strong:text-gray-800 prose-a:text-[#013d5a] prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl prose-img:my-6 prose-img:shadow-sm prose-table:text-sm prose-th:bg-gray-50 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2" dangerouslySetInnerHTML={{ __html: product.description }} />
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
          {(() => {
            const w = Number(product.weight || 0);
            return (
              <div className="flex justify-between py-2.5 px-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-500">Peso</span>
                <span className="text-sm font-medium text-gray-900">{w > 0 ? `${product.weight} kg` : "Sin especificar"}</span>
              </div>
            );
          })()}
          {(() => {
            const l = Number(product.dimensions?.length || 0);
            const w = Number(product.dimensions?.width  || 0);
            const h = Number(product.dimensions?.height || 0);
            const allSet = l > 0 && w > 0 && h > 0;
            return (
              <div className="flex justify-between py-2.5 px-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-500">Dimensiones</span>
                <span className="text-sm font-medium text-gray-900">{allSet ? `${l} x ${w} x ${h} cm` : "Sin especificar"}</span>
              </div>
            );
          })()}
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
        <ReviewSection
          reviews={reviewsData.data}
          totalReviews={product.review_count}
          averageRating={product.average_rating}
          productSlug={product.slug}
        />
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

        {/* Schema.org structured data */}
        <JsonLd data={[
          generateProductSchema(product, getProductUrl(product)),
          generateBreadcrumbSchema([
            { name: "Inicio", url: "/" },
            ...(product.categories[0]?.path.split("/").map((seg, i, arr) => ({
              name: seg.replace(/-/g, " "),
              url: `/${arr.slice(0, i + 1).join("/")}`,
            })) || []),
            { name: product.name, url: getProductUrl(product) },
          ]),
        ]} />

        {/* Product layout */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {isCatalogProduct(product) ? (
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-gray-100">
                <ProductGallery images={product.images} productName={product.name} videoUrl={product.url_video_youtube} />
              </div>
              <div className="p-6 lg:p-8">
                {product.marca && <p className="text-xs font-semibold text-[#013d5a]/50 uppercase tracking-widest mb-1">{product.marca}</p>}
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 leading-tight mb-3">{product.name}</h1>
                <CatalogCTA productId={product.id} productName={product.name} productCategory={product.categories[0]?.name} productUrl={productUrl} whatsapp={settings.whatsapp_gran_formato} email={settings.email_ventas} />
              </div>
            </div>
          ) : (
            <ProductDetail product={product} productUrl={productUrl} />
          )}

          {/* Tabs — id="reviews" es el ancla del scroll cuando se clickean las estrellas en ProductDetail */}
          <div id="reviews" className="border-t border-gray-100 px-6 lg:px-8 scroll-mt-24">
            <ProductTabs tabs={tabs} />
          </div>
        </div>

        {/* Frequently Bought Together — cross-sells manuales (wp-admin) si los hay,
            fallback a related auto (por taxonomía). */}
        {(() => {
          if (isCatalogProduct(product)) return null;
          const manual = product.cross_sells?.filter(r => r.price && !isCatalogProduct(r)) ?? [];
          const auto = product.related?.filter(r => r.price && !isCatalogProduct(r)) ?? [];
          const picks = (manual.length > 0 ? manual : auto).slice(0, 3);
          if (picks.length === 0) return null;
          return (
            <div className="mt-10">
              <FrequentlyBoughtTogether
                currentProduct={product}
                crossSells={picks}
              />
            </div>
          );
        })()}

        {/* Related */}
        {product.related && product.related.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Productos relacionados</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {product.related.slice(0, 6).map((rel) => (
                <ProductCard key={rel.id} product={rel} />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
