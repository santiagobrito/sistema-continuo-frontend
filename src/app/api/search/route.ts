/**
 * GET /api/search?q=estampadora&limit=8
 *
 * Live search: queries WP custom API for products + categories.
 * Returns grouped results with images, prices, categories.
 */

import { NextRequest, NextResponse } from "next/server";

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
}

interface SearchCategory {
  id: number;
  name: string;
  slug: string;
  count: number;
  path: string;
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() || "";
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "8");

  if (q.length < 2) {
    return NextResponse.json({ products: [], categories: [], query: q });
  }

  try {
    // Fetch products and categories in parallel
    // For multi-word queries, search the most distinctive word to get broader results
    // then rank by full query match in JS
    const queryWords = q.split(/\s+/).filter((w) => w.length >= 2);
    const searchTerm = queryWords.length > 1
      ? queryWords.sort((a, b) => b.length - a.length)[0] // longest word = most distinctive
      : q;

    const [productsRes, categoriesRes] = await Promise.allSettled([
      fetch(`${API_BASE}/products?search=${encodeURIComponent(searchTerm)}&per_page=100`, {
        next: { revalidate: 60 },
      }),
      fetch(`${API_BASE}/categories`, {
        next: { revalidate: 3600 },
      }),
    ]);

    // Parse products
    let products: SearchProduct[] = [];
    if (productsRes.status === "fulfilled" && productsRes.value.ok) {
      const data = await productsRes.value.json();
      const qLower = q.toLowerCase();

      products = (data.data || []).map((p: Record<string, unknown>) => {
        const cats = (p.categories as { name: string; slug: string; path: string }[]) || [];
        const deepest = cats.reduce((best: { path: string } | null, c: { path: string }) => {
          return !best || c.path.split("/").length > best.path.split("/").length ? c : best;
        }, null);

        const name = String(p.name || "");
        const marca = String(p.marca || "");

        // Relevance score: word-by-word matching
        let relevance = 0;
        const nameLower = name.toLowerCase();
        const marcaLower = marca.toLowerCase();
        const searchWords = qLower.split(/\s+/).filter((w: string) => w.length >= 2);

        // Count how many query words appear in the product name
        const nameMatches = searchWords.filter((w: string) => nameLower.includes(w)).length;
        const totalWords = searchWords.length;

        if (totalWords > 0 && nameMatches === totalWords) {
          // All words match — strong result
          relevance += 150;
          // Bonus if full phrase matches
          if (nameLower.includes(qLower)) relevance += 50;
        } else if (nameMatches > 0) {
          // Partial match — score proportionally
          relevance += Math.round((nameMatches / totalWords) * 100);
          // Penalize if matched word is after "para"/"de"/"con" (contextual)
          const primaryWord = searchWords[0];
          if (primaryWord && nameLower.includes(primaryWord)) {
            const idx = nameLower.indexOf(primaryWord);
            const before = nameLower.slice(Math.max(0, idx - 6), idx).trim();
            if (before.endsWith("para") || before.endsWith("de") || before.endsWith("con")) {
              relevance -= 60;
            }
          }
        }

        // Category match
        const cats_arr = (p.categories as { name: string }[]) || [];
        const catMatch = cats_arr.some((c: { name: string }) =>
          searchWords.some((w: string) => c.name.toLowerCase().includes(w))
        );
        if (catMatch) relevance += 30;

        // Brand match
        const brandMatch = searchWords.some((w: string) => marcaLower.includes(w));
        if (brandMatch) relevance += 25;

        return {
          id: p.id,
          name,
          slug: p.slug,
          price: p.price || "",
          regular_price: p.regular_price || "",
          on_sale: p.on_sale,
          image: (p.images as { url: string }[])?.[0]?.url || null,
          marca,
          categories: cats.map((c: { name: string; slug: string; path: string }) => ({
            name: c.name,
            slug: c.slug,
            path: c.path,
          })),
          is_catalog: !p.price && !p.purchasable,
          url: deepest ? `/${deepest.path}/${p.slug}` : `/${p.slug}`,
          _relevance: relevance,
        };
      });

      // Sort by relevance (title matches first)
      products.sort((a, b) => (b as SearchProduct & { _relevance: number })._relevance - (a as SearchProduct & { _relevance: number })._relevance);

      // Filter OUT low-relevance results (description-only or contextual title mentions like "para impresoras")
      // But keep products in matching categories (relevance >= 40 from catMatch)
      products = products.filter((p) => (p as SearchProduct & { _relevance: number })._relevance >= 20);

      // Keep only top results by relevance, then remove internal field
      products = products.slice(0, limit).map(({ ...p }) => {
        delete (p as Record<string, unknown>)._relevance;
        return p;
      });
    }

    // Filter categories by search query
    let categories: SearchCategory[] = [];
    if (categoriesRes.status === "fulfilled" && categoriesRes.value.ok) {
      const catData = await categoriesRes.value.json();
      const flat = catData.flat || [];
      const qLower = q.toLowerCase();
      categories = flat
        .filter((c: { name: string; count: number }) =>
          c.name.toLowerCase().includes(qLower) && c.count > 0
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
      total_products: products.length,
    });
  } catch {
    return NextResponse.json({ products: [], categories: [], query: q });
  }
}
