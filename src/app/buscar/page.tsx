import { getProducts, getProductUrl } from "@/lib/wordpress/api";
import { formatPrice } from "@/lib/utils/format";
import { isCatalogProduct } from "@/lib/wordpress/types";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: q ? `Buscar: ${q}` : "Buscar productos" };
}

export default async function SearchPage({ searchParams }: Props) {
  const { q = "", page = "1" } = await searchParams;

  const results = q.length >= 2
    ? await getProducts({ search: q, per_page: 24, page: parseInt(page) }).catch(() => ({ data: [], total: 0, pages: 0, page: 1 }))
    : { data: [], total: 0, pages: 0, page: 1 };

  return (
    <main className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {q ? (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">
                Resultados para &ldquo;{q}&rdquo;
              </h1>
              <p className="text-gray-500 mt-1">{results.total} productos encontrados</p>
            </div>

            {results.data.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {results.data.map((product) => (
                  <Link
                    key={product.id}
                    href={getProductUrl(product)}
                    className="group bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all overflow-hidden cursor-pointer"
                  >
                    <div className="aspect-square relative bg-gray-50/50 p-3">
                      {product.images[0] ? (
                        <Image src={product.images[0].url} alt={product.name} fill className="object-contain p-1 group-hover:scale-105 transition-transform duration-300" sizes="(max-width: 768px) 50vw, 25vw" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-12 h-12 text-gray-200" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                      )}
                    </div>
                    <div className="p-3.5 pt-2">
                      {product.marca && (
                        <p className="text-[10px] font-semibold text-[#013d5a]/50 uppercase tracking-widest mb-0.5">{product.marca}</p>
                      )}
                      <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug mb-2 group-hover:text-[#013d5a] transition-colors">{product.name}</h3>
                      {isCatalogProduct(product) ? (
                        <span className="text-sm text-[#013d5a] font-semibold">Solicitar cotizacion</span>
                      ) : product.price ? (
                        <span className="text-base font-bold text-gray-900">{formatPrice(product.price)}</span>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <svg className="w-16 h-16 text-gray-200 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-gray-500 text-lg mb-2">No encontramos productos para &ldquo;{q}&rdquo;</p>
                <p className="text-gray-400 text-sm">Proba con otro termino o navega las categorias</p>
              </div>
            )}

            {/* Pagination */}
            {results.pages > 1 && (
              <div className="flex justify-center gap-2 mt-10">
                {parseInt(page) > 1 && (
                  <Link href={`/buscar?q=${encodeURIComponent(q)}&page=${parseInt(page) - 1}`} className="px-4 py-2 bg-white border rounded-lg text-sm font-medium hover:border-[#013d5a] cursor-pointer">Anterior</Link>
                )}
                <span className="px-4 py-2 text-sm text-gray-500">{page} / {results.pages}</span>
                {parseInt(page) < results.pages && (
                  <Link href={`/buscar?q=${encodeURIComponent(q)}&page=${parseInt(page) + 1}`} className="px-4 py-2 bg-white border rounded-lg text-sm font-medium hover:border-[#013d5a] cursor-pointer">Siguiente</Link>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Buscar productos</h1>
            <p className="text-gray-500">Usa la barra de busqueda para encontrar lo que necesitas.</p>
          </div>
        )}
      </div>
    </main>
  );
}
