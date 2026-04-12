import { notFound } from "next/navigation";
import { getCategory, getCategories, getCategoryUrl, getProductUrl } from "@/lib/wordpress/api";
import { formatPrice } from "@/lib/utils/format";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FilterSidebar } from "@/components/shop/FilterSidebar";

interface Props {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ page?: string; orderby?: string; order?: string; brand?: string; in_stock?: string; on_sale?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category: slug } = await params;
  try {
    const category = await getCategory(slug);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
    const desc = category.seo_description || `Compra ${category.name} online en Sistema Continuo. ${category.count} productos disponibles. Envío a todo Argentina. Hasta 12 cuotas con MercadoPago.`;
    return {
      title: (category.seo_title && category.seo_title.includes("Sistema Continuo")) ? { absolute: category.seo_title } : (category.seo_title || `${category.name} — Comprar Online`),
      description: desc,
      alternates: { canonical: `${siteUrl}/${slug}` },
      openGraph: {
        title: `${category.name} — Sistema Continuo`,
        description: desc,
      },
    };
  } catch {
    return { title: "Categoria no encontrada" };
  }
}

export async function generateStaticParams() {
  try {
    const { flat } = await getCategories();
    return flat
      .filter((c) => c.parent === 0)
      .map((c) => ({ category: c.slug }));
  } catch {
    return [];
  }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { category: slug } = await params;
  const { page = "1", orderby = "date", order = "DESC", brand, in_stock, on_sale } = await searchParams;

  let category;
  try {
    category = await getCategory(slug, {
      page: parseInt(page),
      per_page: 24,
      orderby,
      order,
    });
  } catch {
    notFound();
  }

  const allProducts = category.products?.data ?? [];

  // Apply client-side filters from URL
  const brandFilter = brand?.split(",").filter(Boolean) || [];
  let filteredProducts = allProducts;
  if (brandFilter.length > 0) {
    filteredProducts = filteredProducts.filter((p) => brandFilter.includes(p.marca));
  }
  if (in_stock === "1") {
    filteredProducts = filteredProducts.filter((p) => p.stock_status === "instock");
  }
  if (on_sale === "1") {
    filteredProducts = filteredProducts.filter((p) => p.on_sale);
  }

  // Out of stock always last
  const products = [...filteredProducts].sort((a, b) => {
    if (a.stock_status === "outofstock" && b.stock_status !== "outofstock") return 1;
    if (a.stock_status !== "outofstock" && b.stock_status === "outofstock") return -1;
    return 0;
  });
  const totalPages = category.products?.pages ?? 1;
  const currentPage = parseInt(page);

  return (
    <main className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Breadcrumbs */}
        <nav className="text-sm text-gray-500 mb-5">
          <Link href="/" className="hover:text-[#013d5a]">Inicio</Link>
          <span className="mx-2 text-gray-300">/</span>
          <span className="text-gray-900 font-medium">{category.name}</span>
        </nav>

        {/* Category header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{category.name}</h1>
          <p className="text-gray-500">
            {products.length !== allProducts.length
              ? `${products.length} de ${allProducts.length} productos`
              : `${category.products?.total || 0} productos`}
          </p>
        </div>

        {/* Subcategories */}
        {category.children && category.children.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            {category.children.map((sub) => (
              <Link
                key={sub.id}
                href={getCategoryUrl(sub)}
                className="px-4 py-2 bg-white border border-gray-200 hover:border-[#013d5a] hover:text-[#013d5a] rounded-full text-sm font-medium transition-all"
              >
                {sub.name}
                <span className="ml-1.5 text-gray-400 text-xs">{sub.count}</span>
              </Link>
            ))}
          </div>
        )}

        {/* SEO Content */}
        {category.seo_content && (
          <div className="prose prose-sm max-w-none mb-8 bg-white rounded-xl p-6 border border-gray-100" dangerouslySetInnerHTML={{ __html: category.seo_content }} />
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar filters */}
          <FilterSidebar slug={slug} products={allProducts} />

          {/* Product grid */}
          <div className="flex-1">
            {products.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                  {products.map((product) => (
                    <Link
                      key={product.id}
                      href={getProductUrl(product)}
                      className="group bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all overflow-hidden"
                    >
                      <div className="aspect-square relative bg-gray-50/50 p-3">
                        {product.images[0] ? (
                          <Image
                            src={product.images[0].url}
                            alt={product.images[0].alt || product.name}
                            fill
                            className="object-contain p-1 group-hover:scale-105 transition-transform duration-300"
                            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-12 h-12 text-gray-200" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        {product.on_sale && (
                          <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">OFERTA</span>
                        )}
                        {product.is_catalog_only && (
                          <span className="absolute top-2 right-2 bg-[#013d5a] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">CONSULTAR</span>
                        )}
                        {product.stock_status === "outofstock" && (
                          <span className="absolute top-2 right-2 bg-gray-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">SIN STOCK</span>
                        )}
                      </div>
                      <div className="p-3.5 pt-2">
                        {product.marca && (
                          <p className="text-[10px] font-semibold text-[#013d5a]/50 uppercase tracking-widest mb-0.5">{product.marca}</p>
                        )}
                        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug mb-2 group-hover:text-[#013d5a] transition-colors">
                          {product.name}
                        </h3>
                        {product.is_catalog_only ? (
                          <span className="text-sm text-[#013d5a] font-semibold">Consultar precio</span>
                        ) : product.price ? (
                          <div className="flex items-baseline gap-2">
                            <span className="text-base font-bold text-gray-900">{formatPrice(product.price)}</span>
                            {product.unidad_venta && <span className="text-xs text-gray-500">/{product.unidad_venta}</span>}
                            {product.on_sale && product.regular_price && (
                              <span className="text-xs text-gray-400 line-through">{formatPrice(product.regular_price)}</span>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-10">
                    {currentPage > 1 && (
                      <Link href={`/${slug}?page=${currentPage - 1}&orderby=${orderby}&order=${order}`} className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:border-[#013d5a] hover:text-[#013d5a] transition-colors">
                        Anterior
                      </Link>
                    )}
                    <span className="px-4 py-2 text-sm text-gray-500">
                      {currentPage} / {totalPages}
                    </span>
                    {currentPage < totalPages && (
                      <Link href={`/${slug}?page=${currentPage + 1}&orderby=${orderby}&order=${order}`} className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:border-[#013d5a] hover:text-[#013d5a] transition-colors">
                        Siguiente
                      </Link>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20">
                <p className="text-gray-400 text-lg">No hay productos en esta categoría.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
