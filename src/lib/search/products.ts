/**
 * Shared product search — used by both /api/search (live dropdown) and
 * /buscar (full results page) so they always return the same set.
 *
 * Pipeline:
 * 1. Typo fix (misspellings dict + Levenshtein) — skipped for SKU-like queries
 * 2. Synonym expansion (gorra → cap, trucker, visera, …)
 * 3. Multi-query: hit WP /products?search= for up to 4 terms in parallel
 * 4. Merge + dedupe by product id
 * 5. Score each product (SKU, name, words, category, brand, stock)
 * 6. Filter by threshold and sort by score
 *
 * Callers paginate/slice as needed.
 */

import type { Product } from "@/lib/wordpress/types";
import { processSearchQuery, stripAccents, normalizeDimensions } from "@/lib/search/synonyms";

const WP_URL = process.env.WP_URL || process.env.NEXT_PUBLIC_WP_URL || "";
const API_BASE = `${WP_URL}/wp-json/sistema-continuo/v1`;

// Normalizamos también dimensiones aquí para que el scoring de nombres
// matchee "38x38" del query con productos cuyo nombre tenga "38 x 38" o
// "38×38". Sin esto el backend devolvía el producto OK pero el frontend
// lo descartaba por score bajo (no había substring match).
const norm = (s: string) => normalizeDimensions(stripAccents(s.toLowerCase()));

export type ScoredProduct = Product & { _score: number };

export interface SearchResult {
  products: ScoredProduct[];
  corrected: string;
  wasCorrected: boolean;
  /** True if the original (uncorrected) query matched at least one result name. */
  originalMatched: boolean;
}

// SKU-like queries (digits/dashes, no spaces, 3-30 chars) skip synonyms/fuzzy.
function looksLikeSku(q: string): boolean {
  const s = q.trim();
  if (s.length < 3 || s.length > 30) return false;
  if (/\s/.test(s)) return false;
  return /\d/.test(s) || /-/.test(s);
}

async function searchWP(term: string): Promise<Product[]> {
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
  product: Product,
  originalQuery: string,
  allQueryWords: string[],
  originalQueryWords: string[],
): number {
  const nameNorm = norm(product.name);
  const marcaNorm = norm(product.marca || "");
  const skuNorm = norm(product.sku || "");
  const qNorm = norm(originalQuery);
  const wordsNorm = allQueryWords.map(norm);
  const originalWordsNorm = originalQueryWords.map(norm);

  let score = 0;

  // SKU exact/partial — strongest signal
  if (skuNorm && qNorm) {
    if (skuNorm === qNorm) score += 500;
    else if (skuNorm.includes(qNorm) || qNorm.includes(skuNorm)) score += 250;
  }

  // Full phrase in name
  if (nameNorm.includes(qNorm)) score += 200;

  // Word coverage
  const nameMatches = wordsNorm.filter((w) => nameNorm.includes(w)).length;
  const totalWords = wordsNorm.length;

  if (totalWords > 0 && nameMatches === totalWords) {
    score += 150;
  } else if (nameMatches > 0) {
    score += Math.round((nameMatches / totalWords) * 100);

    // Penalize contextual mentions ("tinta PARA impresoras" buscando "impresora")
    const primaryWord = wordsNorm[0];
    if (primaryWord && nameNorm.includes(primaryWord)) {
      const idx = nameNorm.indexOf(primaryWord);
      const before = nameNorm.slice(Math.max(0, idx - 6), idx).trim();
      if (before.endsWith("para") || before.endsWith("de") || before.endsWith("con")) {
        score -= 60;
      }
    }
  }

  // Boost when the user's ORIGINAL (uncorrected) words all match the name.
  // Without this, fuzzy correction can let near-typo products (e.g. tintas
  // for a "cinta" query) crowd out the actual matches that contain the
  // original spelling.
  if (originalWordsNorm.length > 0 && originalWordsNorm.every((w) => nameNorm.includes(w))) {
    score += 80;
  }

  // Category match
  const catMatch = (product.categories || []).some((c) =>
    wordsNorm.some((w) => norm(c.name).includes(w)),
  );
  if (catMatch) score += 30;

  // Brand match
  if (wordsNorm.some((w) => marcaNorm.includes(w))) score += 25;

  // In stock bonus
  if (product.stock_status === "instock") score += 5;

  return score;
}

/**
 * Score threshold below which we drop products. 15 keeps weak word-coverage
 * hits (e.g. 1 out of 3 query words) while filtering out pure noise.
 */
const MIN_SCORE = 15;

export async function searchProducts(query: string): Promise<SearchResult> {
  // Pre-normalize dimensions BEFORE trim/tokenize/scoring para garantizar que
  // "38 x 38" se trate como "38x38" en todos los pasos (tokens, score, etc).
  const q = normalizeDimensions(query.trim());
  if (q.length < 2) {
    return { products: [], corrected: q, wasCorrected: false, originalMatched: false };
  }

  const isSkuQuery = looksLikeSku(q);

  const { corrected, variants, wasCorrected } = isSkuQuery
    ? { corrected: q.toLowerCase(), variants: [q.toLowerCase()], wasCorrected: false }
    : processSearchQuery(q);

  // Build the set of WP search terms.
  // Always include the original query words (accent-insensitive WP search
  // matches with/without diacritics, so the user's literal term is the
  // safest bet even when fuzzy correction picks a different word).
  const searchTerms = new Set<string>();
  for (const w of q.toLowerCase().split(/\s+/).filter((w) => w.length >= 2)) {
    searchTerms.add(w);
  }
  for (const variant of variants) {
    const words = variant.split(/\s+/).filter((w) => w.length >= 2);
    if (words.length > 1) {
      const sorted = [...words].sort((a, b) => b.length - a.length);
      searchTerms.add(sorted[0]);
      if (sorted[1] && sorted[1].length >= 3) searchTerms.add(sorted[1]);
    } else if (words.length === 1) {
      searchTerms.add(words[0]);
    }
  }

  const allQueryWords = corrected.toLowerCase().split(/\s+/).filter((w) => w.length >= 2);
  const originalWords = q.toLowerCase().split(/\s+/).filter((w) => w.length >= 2);
  const scoringWords = [...new Set([...allQueryWords, ...originalWords])];

  const productResults = await Promise.all(
    Array.from(searchTerms).slice(0, 4).map((term) => searchWP(term)),
  );

  // Merge + dedupe
  const seen = new Set<number>();
  const out: ScoredProduct[] = [];
  for (const batch of productResults) {
    for (const product of batch) {
      if (seen.has(product.id)) continue;
      seen.add(product.id);
      const score = scoreProduct(product, corrected, scoringWords, originalWords);
      if (score >= MIN_SCORE) out.push({ ...product, _score: score });
    }
  }

  out.sort((a, b) => b._score - a._score);

  const qOriginalNorm = norm(q);
  const originalMatched =
    qOriginalNorm.length >= 3 &&
    out.some((p) => norm(p.name).includes(qOriginalNorm));

  return { products: out, corrected, wasCorrected, originalMatched };
}
