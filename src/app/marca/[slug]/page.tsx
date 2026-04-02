import { notFound } from "next/navigation";
import { getBrands, getProductsByBrand, getProductUrl } from "@/lib/wordpress/api";
import { formatPrice } from "@/lib/utils/format";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; orderby?: string; order?: string }>;
}

async function findBrand(slug: string) {
  const brands = await getBrands();
  return brands.find((b) => b.slug === slug) || null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const brand = await findBrand(slug);
  if (!brand) return { title: "Marca no encontrada" };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  return {
    title: `${brand.name} — Comprar Online en Sistema Continuo`,
    description: `Todos los productos ${brand.name} en Sistema Continuo. ${brand.count} productos disponibles. Envio a todo Argentina. Hasta 12 cuotas con MercadoPago.`,
    alternates: { canonical: `${siteUrl}/marca/${slug}` },
    openGraph: {
      title: `${brand.name} — Sistema Continuo`,
      description: `Productos ${brand.name}: ${brand.count} disponibles con envio a todo el pais.`,
    },
  };
}

export async function generateStaticParams() {
  try {
    const brands = await getBrands();
    return brands.map((b) => ({ slug: b.slug }));
  } catch {
    return [];
  }
}

export default async function BrandPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page = "1", orderby = "date", order = "DESC" } = await searchParams;

  const brand = await findBrand(slug);
  if (!brand) notFound();

  const currentPage = parseInt(page);
  const result = await getProductsByBrand(brand.name, {
    page: currentPage,
    per_page: 24,
    orderby,
    order,
  });

  const products = result.data;
  const totalPages = result.pages;

  return (
    <main className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Breadcrumbs */}
        <nav className="text-sm text-gray-500 mb-5">
          <Link href="/" className="hover:text-[#013d5a]">
            Inicio
          </Link>
          <span className="mx-2 text-gray-300">/</span>
          <Link href="/marca" className="hover:text-[#013d5a]">
            Marcas
          </Link>
          <span className="mx-2 text-gray-300">/</span>
          <span className="text-gray-900 font-medium">{brand.name}</span>
        </nav>

        {/* Brand header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{brand.name}</h1>
          <p className="text-gray-500">
            {result.total} {result.total === 1 ? "producto" : "productos"}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <aside className="lg:w-56 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-100 p-5 sticky top-28">
              <h3 className="font-semibold text-gray-900 text-sm mb-4">
                Ordenar por
              </h3>
              <div className="space-y-1.5">
                {[
                  { label: "Mas recientes", val: "date", ord: "DESC" },
                  { label: "Menor precio", val: "price", ord: "ASC" },
                  { label: "Mayor precio", val: "price", ord: "DESC" },
                  { label: "Mas vendidos", val: "popularity", ord: "DESC" },
                ].map((opt) => (
                  <Link
                    key={opt.val + opt.ord}
                    href={`/marca/${slug}?orderby=${opt.val}&order=${opt.ord}`}
                    className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                      orderby === opt.val && order === opt.ord
                        ? "bg-[#013d5a] text-white font-medium"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {opt.label}
                  </Link>
                ))}
              </div>
            </div>
          </aside>

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
                            <svg
                              className="w-12 h-12 text-gray-200"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={1}
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        )}
                        {product.on_sale && (
                          <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            OFERTA
                          </span>
                        )}
                        {product.is_catalog_only && (
                          <span className="absolute top-2 right-2 bg-[#013d5a] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            CONSULTAR
                          </span>
                        )}
                        {product.stock_status === "outofstock" && (
                          <span className="absolute top-2 right-2 bg-gray-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            SIN STOCK
                          </span>
                        )}
                      </div>
                      <div className="p-3.5 pt-2">
                        {product.marca && (
                          <p className="text-[10px] font-semibold text-[#013d5a]/50 uppercase tracking-widest mb-0.5">
                            {product.marca}
                          </p>
                        )}
                        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug mb-2 group-hover:text-[#013d5a] transition-colors">
                          {product.name}
                        </h3>
                        {product.is_catalog_only ? (
                          <span className="text-sm text-[#013d5a] font-semibold">
                            Consultar precio
                          </span>
                        ) : product.price ? (
                          <div className="flex items-baseline gap-2">
                            <span className="text-base font-bold text-gray-900">
                              {formatPrice(product.price)}
                            </span>
                            {product.on_sale && product.regular_price && (
                              <span className="text-xs text-gray-400 line-through">
                                {formatPrice(product.regular_price)}
                              </span>
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
                      <Link
                        href={`/marca/${slug}?page=${currentPage - 1}&orderby=${orderby}&order=${order}`}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:border-[#013d5a] hover:text-[#013d5a] transition-colors"
                      >
                        Anterior
                      </Link>
                    )}
                    <span className="px-4 py-2 text-sm text-gray-500">
                      {currentPage} / {totalPages}
                    </span>
                    {currentPage < totalPages && (
                      <Link
                        href={`/marca/${slug}?page=${currentPage + 1}&orderby=${orderby}&order=${order}`}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:border-[#013d5a] hover:text-[#013d5a] transition-colors"
                      >
                        Siguiente
                      </Link>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20">
                <p className="text-gray-400 text-lg">
                  No hay productos de esta marca.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
