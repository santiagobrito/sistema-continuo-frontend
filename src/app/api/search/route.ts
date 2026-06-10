/**
 * GET /api/search?q=estampadora+de+mano&limit=8
 *
 * Live search dropdown. The actual matching logic lives in
 * @/lib/search/products so /buscar (full results page) stays consistent.
 */

import { NextRequest, NextResponse } from "next/server";
import { searchProducts } from "@/lib/search/products";
import { stripAccents, normalizeDimensions } from "@/lib/search/synonyms";

const WP_URL = process.env.WP_URL || process.env.NEXT_PUBLIC_WP_URL || "";
const API_BASE = `${WP_URL}/wp-json/sistema-continuo/v1`;

const norm = (s: string) => normalizeDimensions(stripAccents(s.toLowerCase()));

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

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() || "";
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "8");

  if (q.length < 2) {
    return NextResponse.json({ products: [], categories: [], query: q });
  }

  try {
    const [{ products: scored, corrected, wasCorrected, originalMatched }, categoriesRes] =
      await Promise.all([
        searchProducts(q),
        fetch(`${API_BASE}/categories`, { next: { revalidate: 3600 } }),
      ]);

    const products: SearchProduct[] = scored.slice(0, limit).map((p) => {
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

    // Category chips
    const scoringWords = [
      ...new Set([
        ...corrected.toLowerCase().split(/\s+/).filter((w) => w.length >= 2),
        ...q.toLowerCase().split(/\s+/).filter((w) => w.length >= 2),
      ]),
    ];
    let categories: SearchCategory[] = [];
    if (categoriesRes.ok) {
      const catData = await categoriesRes.json();
      const flat = catData.flat || [];
      const qNorm = norm(corrected);
      const scoringNorm = scoringWords.map(norm);
      categories = flat
        .filter((c: { name: string; count: number }) => {
          if (!c.count || c.count <= 0) return false;
          const n = norm(c.name);
          return n.includes(qNorm) || scoringNorm.some((w) => n.includes(w));
        })
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
      corrected_query: wasCorrected && !originalMatched ? corrected : undefined,
      total_products: products.length,
    });
  } catch {
    return NextResponse.json({ products: [], categories: [], query: q });
  }
}
