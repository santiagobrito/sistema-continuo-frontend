/**
 * GET /api/search?q=estampadora+de+mano&limit=8
 *
 * Smart search with:
 * - Synonym expansion ("manual" → "mano", "portatil")
 * - Fuzzy typo correction ("estampadra" → "estampadora")
 * - Multi-query: tries original + variants, merges + deduplicates
 * - Relevance ranking: word-by-word scoring
 */

import { NextRequest, NextResponse } from "next/server";
import { processSearchQuery } from "@/lib/search/synonyms";

const WP_URL = process.env.WP_URL || process.env.NEXT_PUBLIC_WP_URL || "";
const API_BASE = `${WP_URL}/wp-json/sistema-continuo/v1`;

interface SearchProduct {
  id: number;
  name: string;
  slug: string;
  price: string;
  regular_price: string;
  on_sale: boolean;
  image: string | null;
  marca: string;
  categories: { name: string; slug: string; path: string }[];
  is_catalog: boolean;
  url: string;
  unidad_venta: string;
  envio_gratis: boolean;
}

interface SearchCategory {
  id: number;
  name: string;
  slug: string;
  count: number;
  path: string;
}

interface RawProduct {
  id: number;
  name: string;
  slug: string;
  price: string;
  regular_price: string;
  on_sale: boolean;
  images: { url: string }[];
  marca: string;
  categories: { name: string; slug: string; path: string }[];
  purchasable: boolean;
  stock_status: string;
  unidad_venta: string;
  sku: string;
  envio_gratis: boolean;
}

// Heurística simple: una búsqueda parece SKU si tiene dígitos o guiones,
// no contiene espacios y mide entre 3 y 30 chars. Saltea synonyms/typo fix
// (rompen códigos como "ASD-123") y boostea match exacto.
function looksLikeSku(q: string): boolean {
  const s = q.trim();
  if (s.length < 3 || s.length > 30) return false;
  if (/\s/.test(s)) return false;
  return /\d/.test(s) || /-/.test(s);
}

async function searchWP(term: string): Promise<RawProduct[]> {
  try {
    const res = await fetch(
      `${API_BASE}/products?search=${encodeURIComponent(term)}&per_page=100`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch {
    return [];
  }
}

function scoreProduct(
  product: RawProduct,
  originalQuery: string,
  allQueryWords: string[],
): number {
  const nameLower = product.name.toLowerCase();
  const marcaLower = (product.marca || "").toLowerCase();
  const skuLower = (product.sku || "").toLowerCase();
  const qLower = originalQuery.toLowerCase();

  let score = 0;

  // Match por SKU — señal muy fuerte. Coincidencia exacta = top.
  if (skuLower && qLower) {
    if (skuLower === qLower) {
      score += 500;
    } else if (skuLower.includes(qLower) || qLower.includes(skuLower)) {
      score += 250;
    }
  }

  // Full phrase match in name — strongest signal
  if (nameLower.includes(qLower)) {
    score += 200;
  }

  // Word-by-word matching against original query
  const nameMatches = allQueryWords.filter((w) => nameLower.includes(w)).length;
  const totalWords = allQueryWords.length;

  if (totalWords > 0 && nameMatches === totalWords) {
    score += 150;
  } else if (nameMatches > 0) {
    score += Math.round((nameMatches / totalWords) * 100);

    // Penalize contextual mentions ("tinta PARA impresoras" when searching "impresora")
    const primaryWord = allQueryWords[0];
    if (primaryWord && nameLower.includes(primaryWord)) {
      const idx = nameLower.indexOf(primaryWord);
      const before = nameLower.slice(Math.max(0, idx - 6), idx).trim();
      if (before.endsWith("para") || before.endsWith("de") || before.endsWith("con")) {
        score -= 60;
      }
    }
  }

  // Category match
  const catMatch = (product.categories || []).some((c) =>
    allQueryWords.some((w) => c.name.toLowerCase().includes(w)),
  );
  if (catMatch) score += 30;

  // Brand match
  if (allQueryWords.some((w) => marcaLower.includes(w))) {
    score += 25;
  }

  // In stock bonus
  if (product.stock_status === "instock") {
    score += 5;
  }

  return score;
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() || "";
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "8");

  if (q.length < 2) {
    return NextResponse.json({ products: [], categories: [], query: q });
  }

  try {
    // Si el query parece un SKU (sin espacios, con dígitos o guiones), saltamos
    // synonyms/fuzzy — destrozarían el código. Lo pasamos crudo a WP.
    const isSkuQuery = looksLikeSku(q);

    // Process query: fix typos + expand synonyms (skip for SKU-like queries)
    const { corrected, variants, wasCorrected } = isSkuQuery
      ? { corrected: q.toLowerCase(), variants: [q.toLowerCase()], wasCorrected: false }
      : processSearchQuery(q);

    // Build list of WP search terms to try
    // For each variant, pick the longest word (most distinctive) for WP search
    const searchTerms = new Set<string>();
    for (const variant of variants) {
      const words = variant.split(/\s+/).filter((w) => w.length >= 2);
      // Add the longest word
      if (words.length > 1) {
        searchTerms.add(words.sort((a, b) => b.length - a.length)[0]);
      }
      // Also add second-longest if available (catches "mano" when longest is "estampadora")
      if (words.length > 1) {
        const sorted = [...words].sort((a, b) => b.length - a.length);
        if (sorted[1] && sorted[1].length >= 3) {
          searchTerms.add(sorted[1]);
        }
      }
      // For single-word queries, add the word itself
      if (words.length === 1) {
        searchTerms.add(words[0]);
      }
    }

    // Fetch products from WP for each search term (parallel, deduplicate)
    const allQueryWords = corrected.toLowerCase().split(/\s+/).filter((w) => w.length >= 2);
    // Also include original query words for scoring
    const originalWords = q.toLowerCase().split(/\s+/).filter((w) => w.length >= 2);
    const scoringWords = [...new Set([...allQueryWords, ...originalWords])];

    const [productResults, categoriesRes] = await Promise.all([
      Promise.all(
        Array.from(searchTerms).slice(0, 4).map((term) => searchWP(term)),
      ),
      fetch(`${API_BASE}/categories`, { next: { revalidate: 3600 } }),
    ]);

    // Merge + deduplicate products
    const seen = new Set<number>();
    const allProducts: (RawProduct & { _score: number })[] = [];

    for (const batch of productResults) {
      for (const product of batch) {
        if (seen.has(product.id)) continue;
        seen.add(product.id);

        const score = scoreProduct(product, corrected, scoringWords);
        if (score >= 15) {
          allProducts.push({ ...product, _score: score });
        }
      }
    }

    // Sort by score
    allProducts.sort((a, b) => b._score - a._score);

    // Format output
    const products: SearchProduct[] = allProducts.slice(0, limit).map((p) => {
      const cats = p.categories || [];
      const deepest = cats.reduce(
        (best: { path: string } | null, c: { path: string }) =>
          !best || c.path.split("/").length > best.path.split("/").length ? c : best,
        null,
      );

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price || "",
        regular_price: p.regular_price || "",
        on_sale: p.on_sale,
        image: p.images?.[0]?.url || null,
        marca: p.marca || "",
        categories: cats.map((c) => ({ name: c.name, slug: c.slug, path: c.path })),
        is_catalog: !p.price && !p.purchasable,
        url: deepest ? `/${deepest.path}/${p.slug}` : `/${p.slug}`,
        unidad_venta: p.unidad_venta || "",
        envio_gratis: !!p.envio_gratis,
      };
    });

    // Filter categories
    let categories: SearchCategory[] = [];
    if (categoriesRes.ok) {
      const catData = await categoriesRes.json();
      const flat = catData.flat || [];
      const qLower = corrected.toLowerCase();
      // Match categories against original + corrected query
      categories = flat
        .filter(
          (c: { name: string; count: number }) =>
            c.count > 0 &&
            (c.name.toLowerCase().includes(qLower) ||
              scoringWords.some((w) => c.name.toLowerCase().includes(w))),
        )
        .slice(0, 4)
        .map((c: { id: number; name: string; slug: string; count: number; path: string }) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          count: c.count,
          path: c.path,
        }));
    }

    return NextResponse.json({
      products,
      categories,
      query: q,
      corrected_query: wasCorrected ? corrected : undefined,
      total_products: products.length,
    });
  } catch {
    return NextResponse.json({ products: [], categories: [], query: q });
  }
}
