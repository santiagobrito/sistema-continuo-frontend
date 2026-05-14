import type { Product } from "@/lib/wordpress/types";
import type { Metadata } from "next";
import Link from "next/link";
import ProductCard from "@/components/product/ProductCard";

export const dynamic = "force-dynamic";

const WP_URL = process.env.WP_URL || process.env.NEXT_PUBLIC_WP_URL || "";
const API_BASE = `${WP_URL}/wp-json/sistema-continuo/v1`;

interface Props {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: q ? `Buscar: ${q}` : "Buscar productos" };
}

/**
 * Server-side search with same relevance logic as /api/search
 */
async function searchWithRelevance(q: string, page: number, perPage: number) {
  const res = await fetch(`${API_BASE}/products?search=${encodeURIComponent(q)}&per_page=100`, {
    next: { revalidate: 60 },
  });

  if (!res.ok) return { data: [], total: 0, pages: 0 };

  const data = await res.json();
  const qLower = q.toLowerCase();

  // Para queries con dígitos ("8 en 1", "papel a4"), también probamos un
  // match "sin separadores" — así "8 en 1" matchea "(8en1)" y viceversa.
  const qHasDigit = /\d/.test(qLower);
  const qCompact = qHasDigit ? qLower.replace(/[^a-z0-9áéíóúñü]/gi, "") : "";

  // Score and filter
  const scored = (data.data || []).map((p: Product) => {
    const name = p.name.toLowerCase();
    const words = name.split(/[\s\-–,]+/);
    let relevance = 0;

    const firstWords = words.slice(0, 4).join(" ");
    if (firstWords.includes(qLower)) relevance += 150;
    else if (name.startsWith(qLower)) relevance += 120;
    else if (name.includes(qLower)) {
      const idx = name.indexOf(qLower);
      const before = name.slice(Math.max(0, idx - 6), idx).trim();
      if (before.endsWith("para") || before.endsWith("de") || before.endsWith("con")) {
        relevance += 5;
      } else {
        relevance += 80;
      }
    } else if (qCompact && qCompact.length >= 3) {
      const nameCompact = name.replace(/[^a-z0-9áéíóúñü]/gi, "");
      if (nameCompact.includes(qCompact)) relevance += 70;
    }

    const catMatch = (p.categories || []).some((c: { name: string }) => c.name.toLowerCase().includes(qLower));
    if (catMatch) relevance += 40;
    if (p.marca?.toLowerCase().includes(qLower)) relevance += 30;

    return { ...p, _relevance: relevance };
  });

  const filtered = scored
    .filter((p: { _relevance: number }) => p._relevance >= 20)
    .sort((a: { _relevance: number }, b: { _relevance: number }) => b._relevance - a._relevance);

  const total = filtered.length;
  const pages = Math.ceil(total / perPage);
  const offset = (page - 1) * perPage;
  const paged = filtered.slice(offset, offset + perPage);

  return { data: paged, total, pages };
}

export default async function SearchPage({ searchParams }: Props) {
  const { q = "", page = "1" } = await searchParams;
  const currentPage = parseInt(page);

  const results = q.length >= 2
    ? await searchWithRelevance(q, currentPage, 24)
    : { data: [], total: 0, pages: 0 };

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
                {results.data.map((product: Product) => (
                  <ProductCard key={product.id} product={product} />
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

            {results.pages > 1 && (
              <div className="flex justify-center gap-2 mt-10">
                {currentPage > 1 && (
                  <Link href={`/buscar?q=${encodeURIComponent(q)}&page=${currentPage - 1}`} className="px-4 py-2 bg-white border rounded-lg text-sm font-medium hover:border-[#013d5a] cursor-pointer">Anterior</Link>
                )}
                <span className="px-4 py-2 text-sm text-gray-500">{currentPage} / {results.pages}</span>
                {currentPage < results.pages && (
                  <Link href={`/buscar?q=${encodeURIComponent(q)}&page=${currentPage + 1}`} className="px-4 py-2 bg-white border rounded-lg text-sm font-medium hover:border-[#013d5a] cursor-pointer">Siguiente</Link>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Buscar productos</h1>
            <p className="text-gray-500">Usa la barra de búsqueda para encontrar lo que necesitas.</p>
          </div>
        )}
      </div>
    </main>
  );
}
