import { notFound } from "next/navigation";
import { getBrands, getProductsByBrand } from "@/lib/wordpress/api";
import type { Metadata } from "next";
import Link from "next/link";
import ProductCard from "@/components/product/ProductCard";

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
    title: { absolute: `${brand.name} — Comprar Online | Sistema Continuo` },
    description: `Todos los productos ${brand.name} en Sistema Continuo. ${brand.count} productos disponibles. Envío a todo Argentina. Pagá con tarjeta vía MercadoPago.`,
    alternates: { canonical: `${siteUrl}/marca/${slug}` },
    openGraph: {
      title: `${brand.name} — Sistema Continuo`,
      description: `Productos ${brand.name}: ${brand.count} disponibles con envío a todo el país.`,
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
  const { page = "1", orderby = "popularity", order = "DESC" } = await searchParams;

  const brand = await findBrand(slug);
  if (!brand) notFound();

  const currentPage = parseInt(page);
  const result = await getProductsByBrand(brand.name, {
    page: currentPage,
    per_page: 24,
    orderby,
    order,
  });

  // Out of stock always last
  const products = [...result.data].sort((a, b) => {
    if (a.stock_status === "outofstock" && b.stock_status !== "outofstock") return 1;
    if (a.stock_status !== "outofstock" && b.stock_status === "outofstock") return -1;
    return 0;
  });
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
                    <ProductCard key={product.id} product={product} hideBrand />
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
