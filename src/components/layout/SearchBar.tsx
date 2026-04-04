"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/utils/format";

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

interface SearchResults {
  products: SearchProduct[];
  categories: SearchCategory[];
  query: string;
  corrected_query?: string;
}

export function SearchBar({ mobile = false }: { mobile?: boolean }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`);
      const data: SearchResults = await res.json();
      setResults(data);
      setOpen(true);
      setSelectedIndex(-1);
    } catch {
      setResults(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current !== null) clearTimeout(debounceRef.current as unknown as number);
    if (query.length >= 2) {
      debounceRef.current = setTimeout(() => search(query), 250);
    } else {
      setResults(null);
      setOpen(false);
    }
    return () => { if (debounceRef.current !== null) clearTimeout(debounceRef.current as unknown as number); };
  }, [query, search]);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // All navigable items for keyboard
  const allItems = [
    ...(results?.categories || []).map((c) => ({ type: "category" as const, url: `/${c.path}`, label: c.name })),
    ...(results?.products || []).map((p) => ({ type: "product" as const, url: p.url, label: p.name })),
  ];

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || !allItems.length) {
      if (e.key === "Enter" && query.length >= 2) {
        router.push(`/buscar?q=${encodeURIComponent(query)}`);
        setOpen(false);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, allItems.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && allItems[selectedIndex]) {
          router.push(allItems[selectedIndex].url);
          setOpen(false);
          setQuery("");
        } else {
          router.push(`/buscar?q=${encodeURIComponent(query)}`);
          setOpen(false);
        }
        break;
      case "Escape":
        setOpen(false);
        inputRef.current?.blur();
        break;
    }
  }

  function handleSelect(url: string) {
    router.push(url);
    setOpen(false);
    setQuery("");
  }

  const hasResults = results && (results.products.length > 0 || results.categories.length > 0);
  let itemIndex = -1;

  return (
    <div ref={containerRef} className={`relative ${mobile ? "w-full" : "flex-1 max-w-xl mx-4"}`}>
      {/* Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results) setOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder="Buscar estampadoras, tintas, papeles..."
          className="w-full bg-gray-50 border border-gray-200 rounded-full px-5 py-2.5 pr-11 text-sm placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-[#013d5a] focus:ring-2 focus:ring-[#013d5a]/10 transition-all"
          autoComplete="off"
        />
        {/* Search icon / spinner */}
        <div className="absolute right-1 top-1/2 -translate-y-1/2 p-2">
          {loading ? (
            <svg className="w-4 h-4 text-[#013d5a] animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>
      </div>

      {/* Dropdown results */}
      {open && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 max-h-[70vh] overflow-y-auto">
          {hasResults ? (
            <>
              {/* Did you mean? */}
              {results.corrected_query && (
                <div className="px-4 pt-3 pb-1">
                  <p className="text-xs text-gray-500">
                    Mostrando resultados para <button onClick={() => setQuery(results.corrected_query!)} className="font-semibold text-[#013d5a] hover:underline cursor-pointer">{results.corrected_query}</button>
                  </p>
                </div>
              )}
              {/* Categories */}
              {results.categories.length > 0 && (
                <div className="px-4 pt-3 pb-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Categorias</p>
                  <div className="flex flex-wrap gap-1.5">
                    {results.categories.map((cat) => {
                      itemIndex++;
                      const idx = itemIndex;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => handleSelect(`/${cat.path}`)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                            selectedIndex === idx
                              ? "bg-[#013d5a] text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-[#013d5a]/10 hover:text-[#013d5a]"
                          }`}
                        >
                          {cat.name}
                          <span className="ml-1 opacity-50">{cat.count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Products */}
              {results.products.length > 0 && (
                <div className="border-t border-gray-50">
                  <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Productos</p>
                  {results.products.map((product) => {
                    itemIndex++;
                    const idx = itemIndex;
                    return (
                      <button
                        key={product.id}
                        onClick={() => handleSelect(product.url)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all cursor-pointer ${
                          selectedIndex === idx ? "bg-[#013d5a]/5" : "hover:bg-gray-50"
                        }`}
                      >
                        {/* Image */}
                        <div className="w-12 h-12 relative flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden">
                          {product.image ? (
                            <Image src={product.image} alt={product.name} fill className="object-contain p-1" sizes="48px" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-200">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          {product.marca && (
                            <p className="text-[9px] font-semibold text-[#013d5a]/40 uppercase tracking-widest">{product.marca}</p>
                          )}
                          <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                          {product.categories[0] && (
                            <p className="text-[10px] text-gray-400 truncate">en {product.categories[0].name}</p>
                          )}
                        </div>

                        {/* Price */}
                        <div className="flex-shrink-0 text-right">
                          {product.is_catalog ? (
                            <span className="text-xs text-[#013d5a] font-semibold">Cotizar</span>
                          ) : product.price ? (
                            <div>
                              <span className="text-sm font-bold text-gray-900">{formatPrice(product.price)}</span>
                              {product.on_sale && product.regular_price && (
                                <p className="text-[10px] text-gray-400 line-through">{formatPrice(product.regular_price)}</p>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* See all results */}
              <div className="border-t border-gray-100 px-4 py-3">
                <Link
                  href={`/buscar?q=${encodeURIComponent(query)}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-2 text-sm font-semibold text-[#013d5a] hover:underline cursor-pointer"
                >
                  Ver todos los resultados para &ldquo;{query}&rdquo;
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </div>
            </>
          ) : (
            <div className="px-4 py-8 text-center">
              <svg className="w-10 h-10 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-sm text-gray-500">No encontramos resultados para &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-gray-400 mt-1">Proba con otro termino o navega las categorias</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
