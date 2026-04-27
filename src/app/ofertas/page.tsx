import { getProducts } from "@/lib/wordpress/api";
import type { Metadata } from "next";
import Link from "next/link";
import ProductCard from "@/components/product/ProductCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ofertas",
  description:
    "Productos en oferta en Sistema Continuo. Estampadoras, plotters, tintas y papeles con descuento. Envío a todo Argentina.",
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/ofertas`,
  },
};

interface Props {
  searchParams: Promise<{ page?: string; orderby?: string; order?: string }>;
}

export default async function OfertasPage({ searchParams }: Props) {
  const { page = "1", orderby = "popularity", order = "DESC" } = await searchParams;
  const currentPage = parseInt(page);

  const result = await getProducts({
    on_sale: "1",
    page: currentPage,
    per_page: 24,
    orderby: orderby as "date" | "price" | "popularity",
    order: order as "ASC" | "DESC",
  });

  const products = [...result.data].sort((a, b) => {
    if (a.stock_status === "outofstock" && b.stock_status !== "outofstock") return 1;
    if (a.stock_status !== "outofstock" && b.stock_status === "outofstock") return -1;
    return 0;
  });
  const totalPages = result.pages;

  return (
    <main className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <nav className="text-sm text-gray-500 mb-5">
          <Link href="/" className="hover:text-[#013d5a]">Inicio</Link>
          <span className="mx-2 text-gray-300">/</span>
          <span className="text-gray-900 font-medium">Ofertas</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Ofertas</h1>
          <p className="text-gray-500">{result.total} productos en oferta</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="lg:w-56 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-100 p-5 sticky top-28">
              <h3 className="font-semibold text-gray-900 text-sm mb-4">Ordenar por</h3>
              <div className="space-y-1.5">
                {[
                  { label: "Mas recientes", val: "date", ord: "DESC" },
                  { label: "Menor precio", val: "price", ord: "ASC" },
                  { label: "Mayor precio", val: "price", ord: "DESC" },
                  { label: "Mas vendidos", val: "popularity", ord: "DESC" },
                ].map((opt) => (
                  <Link
                    key={opt.val + opt.ord}
                    href={`/ofertas?orderby=${opt.val}&order=${opt.ord}`}
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

          <div className="flex-1">
            {products.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-10">
                    {currentPage > 1 && (
                      <Link href={`/ofertas?page=${currentPage - 1}&orderby=${orderby}&order=${order}`} className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:border-[#013d5a] hover:text-[#013d5a] transition-colors">
                        Anterior
                      </Link>
                    )}
                    <span className="px-4 py-2 text-sm text-gray-500">{currentPage} / {totalPages}</span>
                    {currentPage < totalPages && (
                      <Link href={`/ofertas?page=${currentPage + 1}&orderby=${orderby}&order=${order}`} className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:border-[#013d5a] hover:text-[#013d5a] transition-colors">
                        Siguiente
                      </Link>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20">
                <p className="text-gray-400 text-lg">No hay ofertas en este momento.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
