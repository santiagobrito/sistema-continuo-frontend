import type { Product, Category } from "@/lib/wordpress/types";
import type { Metadata } from "next";
import Link from "next/link";
import ProductCard from "@/components/product/ProductCard";
import { getCategories, getCategory, getProducts, getCategoryUrl } from "@/lib/wordpress/api";

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

type ScoredProduct = Product & { _relevance: number };

/**
 * Server-side search with same relevance logic as /api/search
 */
async function searchWithRelevance(q: string, page: number, perPage: number) {
  const res = await fetch(`${API_BASE}/products?search=${encodeURIComponent(q)}&per_page=100`, {
    next: { revalidate: 60 },
  });

  if (!res.ok) return { data: [] as ScoredProduct[], total: 0, pages: 0 };

  const data = await res.json();
  const qLower = q.toLowerCase();

  // Para queries con dígitos ("8 en 1", "papel a4"), también probamos un
  // match "sin separadores" — así "8 en 1" matchea "(8en1)" y viceversa.
  const qHasDigit = /\d/.test(qLower);
  const qCompact = qHasDigit ? qLower.replace(/[^a-z0-9áéíóúñü]/gi, "") : "";

  const scored: ScoredProduct[] = (data.data || []).map((p: Product) => {
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
    .filter((p) => p._relevance >= 20)
    .sort((a, b) => b._relevance - a._relevance);

  const total = filtered.length;
  const pages = Math.ceil(total / perPage);
  const offset = (page - 1) * perPage;
  const paged = filtered.slice(offset, offset + perPage);

  return { data: paged, total, pages };
}

/**
 * Saca las categorías más relevantes para el query — preferentemente las que
 * aparecen en los productos resultantes; si no hay, las que matcheen el query
 * por nombre. Devuelve hasta `limit` categorías ordenadas por frecuencia.
 */
function pickRelatedCategories(
  results: Product[],
  qLower: string,
  allCategories: Category[],
  limit = 6,
): Category[] {
  // Map slug -> Category (flatten árbol)
  const flat = new Map<string, Category>();
  const walk = (cats: Category[]) => {
    for (const c of cats) {
      flat.set(c.slug, c);
      if (c.children?.length) walk(c.children);
    }
  };
  walk(allCategories);

  // Conteo de apariciones en resultados
  const counts = new Map<string, number>();
  for (const p of results) {
    for (const c of p.categories || []) {
      counts.set(c.slug, (counts.get(c.slug) || 0) + 1);
    }
  }

  const fromResults = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([slug]) => flat.get(slug))
    .filter((c): c is Category => Boolean(c));

  if (fromResults.length >= limit) return fromResults.slice(0, limit);

  // Completar con cats cuyo nombre matchee el query
  if (qLower.length >= 3) {
    for (const c of flat.values()) {
      if (fromResults.includes(c)) continue;
      if (c.name.toLowerCase().includes(qLower)) {
        fromResults.push(c);
        if (fromResults.length >= limit) break;
      }
    }
  }
  return fromResults;
}

async function fetchPopularInCategory(slug: string, exclude: Set<number>, limit: number): Promise<Product[]> {
  try {
    const cat = await getCategory(slug, { per_page: limit + exclude.size, orderby: "popularity", order: "DESC" });
    return (cat.products?.data || []).filter((p) => !exclude.has(p.id)).slice(0, limit);
  } catch {
    return [];
  }
}

async function fetchPopularGlobal(limit: number): Promise<Product[]> {
  try {
    const r = await getProducts({ per_page: limit, orderby: "popularity", order: "DESC" });
    return r.data || [];
  } catch {
    return [];
  }
}

export default async function SearchPage({ searchParams }: Props) {
  const { q = "", page = "1" } = await searchParams;
  const currentPage = parseInt(page);
  const qLower = q.toLowerCase();

  const results = q.length >= 2
    ? await searchWithRelevance(q, currentPage, 24)
    : { data: [] as ScoredProduct[], total: 0, pages: 0 };

  // Sugerencias: si hay 0 resultados o pocos (< 8), traemos categorías relacionadas + populares.
  const wantsSuggestions = q && results.total < 8;
  let related: Category[] = [];
  let suggested: Product[] = [];

  if (wantsSuggestions) {
    const allCats = await getCategories();
    related = pickRelatedCategories(results.data, qLower, allCats.data || [], 6);

    const exclude = new Set(results.data.map((p) => p.id));
    if (related.length > 0) {
      // Tomamos la categoría más relevante y traemos sus populares
      suggested = await fetchPopularInCategory(related[0].slug, exclude, 8);
    } else if (results.total === 0) {
      // Sin pistas → populares globales
      suggested = await fetchPopularGlobal(8);
    }
  }

  return (
    <main className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {q ? (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                Resultados para &ldquo;{q}&rdquo;
              </h1>
              <p className="text-gray-500 mt-1">
                {results.total > 0
                  ? `${results.total} ${results.total === 1 ? "producto" : "productos"} encontrados`
                  : "No encontramos productos exactos"}
              </p>
            </div>

            {/* Chips de categorías relacionadas */}
            {related.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {results.total > 0 ? "También en estas categorías" : "Quizás te interesen estas categorías"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {related.map((c) => (
                    <Link
                      key={c.id}
                      href={getCategoryUrl(c)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:border-[#013d5a] hover:text-[#013d5a] rounded-full text-sm font-medium transition-all"
                    >
                      {c.name}
                      <span className="text-gray-400 text-xs">{c.count}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {results.data.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {results.data.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-100 mb-8">
                <svg className="w-14 h-14 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-gray-600 text-lg mb-1">No encontramos productos para &ldquo;{q}&rdquo;</p>
                <p className="text-gray-400 text-sm">Probá con otro término o explorá las categorías de arriba.</p>
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

            {/* Sugeridos */}
            {suggested.length > 0 && (
              <section className="mt-12">
                <div className="flex items-baseline justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">
                    {related.length > 0
                      ? `Te puede interesar de ${related[0].name}`
                      : "Productos populares"}
                  </h2>
                  {related.length > 0 && (
                    <Link href={getCategoryUrl(related[0])} className="text-sm text-[#013d5a] font-medium hover:underline">
                      Ver todo →
                    </Link>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {suggested.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Buscar productos</h1>
            <p className="text-gray-500">Usá la barra de búsqueda para encontrar lo que necesitás.</p>
          </div>
        )}
      </div>
    </main>
  );
}
