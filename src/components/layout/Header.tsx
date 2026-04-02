"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";

const NAV_LINKS = [
  { label: "Estampadoras", href: "/estampadoras" },
  { label: "Impresoras", href: "/impresoras" },
  { label: "Silhouette", href: "/silhouette" },
  { label: "Sublimables", href: "/productos-para-sublimar" },
  { label: "Tintas", href: "/tintas" },
  { label: "Papeles", href: "/papeles" },
  { label: "Vinilos", href: "/vinilos" },
  { label: "Gran Formato", href: "/gran-formato" },
  { label: "DTF", href: "/insumos-dtf" },
  { label: "Ofertas", href: "/ofertas" },
];

export function Header() {
  const { itemCount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
      {/* Top bar */}
      <div className="bg-[#013d5a] text-white text-xs py-1.5">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <span>Av. Rivadavia 17002, Haedo - Buenos Aires</span>
          <div className="flex gap-4">
            <a href="tel:+541146501592" className="hover:text-blue-200">(011) 4650-1592</a>
            <a
              href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "5491130793862"}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-green-300"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
        {/* Mobile menu button */}
        <button
          className="lg:hidden p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        {/* Logo */}
        <Link href="/" className="flex-shrink-0">
          <span className="text-xl font-bold text-[#013d5a]">Sistema Continuo</span>
        </Link>

        {/* Search */}
        <div className="flex-1 max-w-xl mx-4 hidden md:block">
          <form
            action="/buscar"
            className="relative"
            onSubmit={(e) => {
              e.preventDefault();
              if (searchQuery.trim()) {
                window.location.href = `/${NAV_LINKS[0].href.slice(1)}?search=${encodeURIComponent(searchQuery)}`;
              }
            }}
          >
            <input
              type="search"
              placeholder="Buscar productos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </form>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3 ml-auto">
          {/* Mobile search toggle */}
          <button
            className="md:hidden p-2"
            onClick={() => setSearchOpen(!searchOpen)}
            aria-label="Buscar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          {/* Account */}
          <Link href="/mi-cuenta" className="p-2 text-gray-600 hover:text-[#013d5a]" aria-label="Mi cuenta">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </Link>

          {/* Cart */}
          <Link href="/carrito" className="relative p-2 text-gray-600 hover:text-[#013d5a]" aria-label="Carrito">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Mobile search bar */}
      {searchOpen && (
        <div className="md:hidden px-4 pb-3">
          <input
            type="search"
            placeholder="Buscar productos..."
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
            autoFocus
          />
        </div>
      )}

      {/* Desktop navigation */}
      <nav className="hidden lg:block border-t bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <ul className="flex gap-1 overflow-x-auto">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block px-3 py-2.5 text-sm font-medium text-gray-700 hover:text-[#013d5a] hover:bg-white rounded-t transition-colors whitespace-nowrap"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Mobile navigation */}
      {mobileMenuOpen && (
        <nav className="lg:hidden border-t bg-white absolute left-0 right-0 shadow-lg z-50">
          <ul className="py-2">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-[#013d5a]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
