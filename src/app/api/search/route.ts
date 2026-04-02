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
    const [productsRes, categoriesRes] = await Promise.allSettled([
      fetch(`${API_BASE}/products?search=${encodeURIComponent(q)}&per_page=30`, {
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

        // Relevance score: primary title match > category match > secondary title match > brand
        let relevance = 0;
        const nameLower = name.toLowerCase();
        const words = nameLower.split(/[\s\-–,]+/);

        // Strong match: query appears as one of the first 3 words of the title
        const firstWords = words.slice(0, 4).join(" ");
        if (firstWords.includes(qLower)) relevance += 150;
        // Medium match: title starts with query
        else if (nameLower.startsWith(qLower)) relevance += 120;
        // Weak title match: query is in title but NOT preceded by "para" or "de" (contextual mention)
        else if (nameLower.includes(qLower)) {
          const idx = nameLower.indexOf(qLower);
          const before = nameLower.slice(Math.max(0, idx - 6), idx).trim();
          if (before.endsWith("para") || before.endsWith("de") || before.endsWith("con")) {
            relevance += 5; // Very low — "Tinta Para Impresoras" is not about impresoras
          } else {
            relevance += 80;
          }
        }

        // Category match (strong signal)
        const catMatch = cats.some((c: { name: string }) => c.name.toLowerCase().includes(qLower));
        if (catMatch) relevance += 40;

        // Brand match
        if (marca.toLowerCase().includes(qLower)) relevance += 30;

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
