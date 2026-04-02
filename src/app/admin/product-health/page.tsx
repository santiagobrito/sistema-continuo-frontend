"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || "";

interface HealthProduct {
  id: number;
  name: string;
  slug: string;
  type: string;
  score: number;
  color: "green" | "yellow" | "red";
  issues: string[];
  is_catalog: boolean;
  image_count: number;
  has_price: boolean;
}

interface HealthData {
  summary: {
    total: number;
    green: number;
    yellow: number;
    red: number;
    average: number;
  };
  issue_counts: Record<string, number>;
  products: HealthProduct[];
  page: number;
  pages: number;
}

const ISSUE_LABELS: Record<string, string> = {
  missing_weight: "Sin peso",
  missing_dimensions: "Sin dimensiones",
  missing_sku: "Sin SKU",
  duplicate_sku: "SKU duplicado",
  missing_barcode: "Sin codigo de barras",
  missing_brand: "Sin marca",
  missing_price: "Sin precio",
  sale_price_gte_regular: "Precio oferta >= regular",
  no_description: "Sin descripcion",
  short_description: "Descripcion corta",
  no_short_description: "Sin descripcion corta",
  no_images: "Sin imagenes",
  few_images: "Pocas imagenes (<3)",
  no_seo_title: "Sin SEO title",
  seo_title_long: "SEO title largo (>60)",
  seo_title_short: "SEO title corto (<30)",
  no_seo_description: "Sin meta description",
  seo_desc_long: "Meta desc larga (>160)",
  seo_desc_short: "Meta desc corta (<120)",
  no_category: "Sin categoria",
  uncategorized: "En 'Sin categorizar'",
  shallow_category: "Categoria sin profundidad",
  descriptions_inverted: "Descripcion corta/larga invertidas",
  short_desc_too_long: "Desc corta demasiado larga (>500)",
  short_desc_has_urls: "Desc corta contiene URLs",
  description_is_url: "Descripcion es solo una URL",
  short_desc_has_images: "Desc corta con imagenes",
  short_desc_has_headings: "Desc corta con titulos H1-H6",
  broken_images_in_desc: "Imagenes rotas en descripcion",
  unpriced_variations: "Variaciones sin precio",
};

export default function ProductHealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [issueFilter, setIssueFilter] = useState("");
  const [scoreFilter, setScoreFilter] = useState<"all" | "red" | "yellow" | "green">("all");
  const [apiKey, setApiKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);

  const fetchData = useCallback(async () => {
    if (!apiKey) return;
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        per_page: "50",
        page: String(page),
      });

      if (issueFilter) params.set("issue", issueFilter);
      if (scoreFilter === "red") { params.set("min_score", "0"); params.set("max_score", "39"); }
      if (scoreFilter === "yellow") { params.set("min_score", "40"); params.set("max_score", "69"); }
      if (scoreFilter === "green") { params.set("min_score", "70"); params.set("max_score", "100"); }

      const res = await fetch(
        `${WP_URL}/wp-json/sistema-continuo/v1/health-scores?${params}`,
        { headers: { Authorization: `Basic ${btoa(apiKey)}` } }
      );

      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          setError("Acceso denegado. Verifica las credenciales.");
          setAuthenticated(false);
        } else {
          setError(`Error ${res.status}`);
        }
        return;
      }

      const result: HealthData = await res.json();
      setData(result);
      setAuthenticated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexion");
    } finally {
      setLoading(false);
    }
  }, [apiKey, page, issueFilter, scoreFilter]);

  useEffect(() => {
    if (authenticated) fetchData();
  }, [fetchData, authenticated]);

  // Login form
  if (!authenticated) {
    return (
      <main className="bg-gray-50 min-h-screen">
        <div className="max-w-md mx-auto px-4 py-20">
          <div className="bg-white rounded-2xl border border-gray-100 p-8">
            <h1 className="text-xl font-bold text-gray-900 mb-2">Product Health Score</h1>
            <p className="text-sm text-gray-500 mb-6">Ingresa credenciales de admin de WordPress.</p>
            <form onSubmit={(e) => { e.preventDefault(); setAuthenticated(true); }}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Usuario:AppPassword</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="scadmin:Xjaq oYjh..."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm mb-4 focus:outline-none focus:border-[#013d5a]"
              />
              {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
              <button type="submit" className="w-full bg-[#013d5a] text-white py-3 rounded-xl font-semibold hover:bg-[#01567a] transition-colors cursor-pointer">
                Acceder
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Product Health Score</h1>
            <p className="text-gray-500 text-sm mt-1">Analisis de calidad de datos de {data?.summary.total || 0} productos</p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:border-[#013d5a] cursor-pointer disabled:opacity-50"
          >
            {loading ? "Analizando..." : "Actualizar"}
          </button>
        </div>

        {/* Summary cards */}
        {data?.summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-gray-100 p-5 text-center">
              <p className="text-3xl font-bold text-gray-900">{data.summary.average}</p>
              <p className="text-xs text-gray-500 mt-1">Score promedio</p>
              <div className="w-full bg-gray-100 rounded-full h-2 mt-3">
                <div className="h-2 rounded-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-500" style={{ width: `${data.summary.average}%` }} />
              </div>
            </div>
            <button onClick={() => { setScoreFilter("all"); setPage(1); }} className={`bg-white rounded-xl border p-5 text-center cursor-pointer transition-all ${scoreFilter === "all" ? "border-[#013d5a] ring-2 ring-[#013d5a]/10" : "border-gray-100 hover:border-gray-200"}`}>
              <p className="text-3xl font-bold text-gray-900">{data.summary.total}</p>
              <p className="text-xs text-gray-500 mt-1">Total productos</p>
            </button>
            <button onClick={() => { setScoreFilter("green"); setPage(1); }} className={`bg-white rounded-xl border p-5 text-center cursor-pointer transition-all ${scoreFilter === "green" ? "border-green-500 ring-2 ring-green-500/10" : "border-gray-100 hover:border-gray-200"}`}>
              <p className="text-3xl font-bold text-green-600">{data.summary.green}</p>
              <p className="text-xs text-gray-500 mt-1">Buenos (70-100)</p>
            </button>
            <button onClick={() => { setScoreFilter("yellow"); setPage(1); }} className={`bg-white rounded-xl border p-5 text-center cursor-pointer transition-all ${scoreFilter === "yellow" ? "border-yellow-500 ring-2 ring-yellow-500/10" : "border-gray-100 hover:border-gray-200"}`}>
              <p className="text-3xl font-bold text-yellow-600">{data.summary.yellow}</p>
              <p className="text-xs text-gray-500 mt-1">Mejorar (40-69)</p>
            </button>
            <button onClick={() => { setScoreFilter("red"); setPage(1); }} className={`bg-white rounded-xl border p-5 text-center cursor-pointer transition-all ${scoreFilter === "red" ? "border-red-500 ring-2 ring-red-500/10" : "border-gray-100 hover:border-gray-200"}`}>
              <p className="text-3xl font-bold text-red-600">{data.summary.red}</p>
              <p className="text-xs text-gray-500 mt-1">Criticos (0-39)</p>
            </button>
          </div>
        )}

        {/* Issue breakdown */}
        {data?.issue_counts && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 mb-8">
            <h2 className="font-bold text-gray-900 mb-4">Problemas detectados</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {Object.entries(data.issue_counts)
                .sort(([, a], [, b]) => b - a)
                .map(([issue, count]) => (
                  <button
                    key={issue}
                    onClick={() => { setIssueFilter(issueFilter === issue ? "" : issue); setPage(1); }}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-left cursor-pointer transition-all ${
                      issueFilter === issue
                        ? "bg-[#013d5a] text-white"
                        : "bg-gray-50 hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    <span className="text-xs font-medium truncate mr-2">{ISSUE_LABELS[issue] || issue}</span>
                    <span className={`text-xs font-bold flex-shrink-0 ${
                      issueFilter === issue ? "text-white/70" : "text-gray-400"
                    }`}>{count}</span>
                  </button>
                ))}
            </div>
            {issueFilter && (
              <button onClick={() => setIssueFilter("")} className="mt-3 text-xs text-[#013d5a] font-semibold hover:underline cursor-pointer">
                Limpiar filtro
              </button>
            )}
          </div>
        )}

        {/* Products table */}
        {data?.products && (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 w-16">Score</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Producto</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden md:table-cell">Tipo</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden lg:table-cell">Imgs</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Problemas</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700 w-20">Editar</th>
                  </tr>
                </thead>
                <tbody>
                  {data.products.map((product) => (
                    <tr key={product.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                            product.color === "green" ? "bg-green-500" :
                            product.color === "yellow" ? "bg-yellow-500" : "bg-red-500"
                          }`} />
                          <span className={`text-sm font-bold ${
                            product.color === "green" ? "text-green-700" :
                            product.color === "yellow" ? "text-yellow-700" : "text-red-700"
                          }`}>{product.score}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/${product.slug}`}
                          className="font-medium text-gray-900 hover:text-[#013d5a] cursor-pointer"
                          target="_blank"
                        >
                          {product.name.slice(0, 60)}{product.name.length > 60 ? "..." : ""}
                        </Link>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-gray-500">
                          {product.type === "simple" ? "Simple" : product.type === "variable" ? "Variable" : product.type}
                          {product.is_catalog && " (catalogo)"}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className={`text-xs font-medium ${product.image_count >= 3 ? "text-green-600" : product.image_count > 0 ? "text-yellow-600" : "text-red-600"}`}>
                          {product.image_count}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {product.issues.slice(0, 4).map((issue) => (
                            <span
                              key={issue}
                              onClick={() => { setIssueFilter(issue); setPage(1); }}
                              className="inline-block px-2 py-0.5 bg-red-50 text-red-700 text-[10px] font-medium rounded-full cursor-pointer hover:bg-red-100 transition-colors"
                            >
                              {ISSUE_LABELS[issue.replace(/:\d+$/, "")] || issue}
                            </span>
                          ))}
                          {product.issues.length > 4 && (
                            <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-medium rounded-full">
                              +{product.issues.length - 4}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={`${WP_URL}/wp-admin/post.php?post=${product.id}&action=edit`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-[#013d5a] font-semibold hover:underline cursor-pointer"
                        >
                          WP
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                          </svg>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Pagina {data.page} de {data.pages} ({data.summary.total} productos)
                </p>
                <div className="flex gap-2">
                  {page > 1 && (
                    <button onClick={() => setPage(page - 1)} className="px-3 py-1.5 bg-gray-50 border rounded-lg text-xs font-medium hover:border-[#013d5a] cursor-pointer">
                      Anterior
                    </button>
                  )}
                  {page < data.pages && (
                    <button onClick={() => setPage(page + 1)} className="px-3 py-1.5 bg-gray-50 border rounded-lg text-xs font-medium hover:border-[#013d5a] cursor-pointer">
                      Siguiente
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {loading && !data && (
          <div className="text-center py-20">
            <svg className="w-8 h-8 text-[#013d5a] animate-spin mx-auto mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-gray-500">Analizando productos...</p>
          </div>
        )}
      </div>
    </main>
  );
}
