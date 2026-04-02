"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";

const NAV_LINKS = [
  { label: "Estampadoras", href: "/estampadoras" },
  { label: "Impresoras", href: "/impresoras" },
  { label: "Silhouette", href: "/silhouette" },
  { label: "Sublimables", href: "/sublimables" },
  { label: "Tintas", href: "/tintas" },
  { label: "Papeles", href: "/papel" },
  { label: "Vinilos", href: "/vinilos" },
  { label: "Gran Formato", href: "/gran-formato" },
  { label: "DTF", href: "/insumos-dtf" },
  { label: "Oficina", href: "/oficina" },
];

export function Header() {
  const { itemCount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      {/* Top bar */}
      <div className="bg-gradient-to-r from-[#013d5a] to-[#01567a] text-white/90 text-xs">
        <div className="max-w-7xl mx-auto px-4 h-8 flex items-center justify-between">
          <span className="hidden sm:inline flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>
            Envios a todo el pais — Hasta 12 cuotas sin interes
          </span>
          <div className="flex items-center gap-4 ml-auto">
            <a href="tel:+541146501592" className="hover:text-white transition-colors">(011) 4650-1592</a>
            <a
              href="https://wa.me/5491130793862"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492l4.626-1.467A11.932 11.932 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.82a9.828 9.828 0 01-5.01-1.37l-.36-.214-3.729 1.183 1.204-3.593-.235-.374A9.82 9.82 0 012.18 12 9.82 9.82 0 0112 2.18 9.82 9.82 0 0121.82 12 9.82 9.82 0 0112 21.82z"/></svg>
              WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
        {/* Mobile menu button */}
        <button
          className="lg:hidden p-1.5 -ml-1.5 rounded-md hover:bg-gray-100 transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Menu"
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        {/* Logo */}
        <Link href="/" className="flex-shrink-0">
          <Image src="/logo.webp" alt="Sistema Continuo" width={180} height={45} className="h-10 w-auto" preload />
        </Link>

        {/* Search */}
        <div className="flex-1 max-w-xl mx-4 hidden md:block">
          <div className="relative">
            <input
              type="search"
              placeholder="Buscar productos..."
              className="w-full bg-gray-50 border border-gray-200 rounded-full px-5 py-2.5 pr-11 text-sm placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-[#013d5a] focus:ring-2 focus:ring-[#013d5a]/10 transition-all"
            />
            <button className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-[#013d5a] transition-colors">
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1 ml-auto">
          <button className="md:hidden p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors" aria-label="Buscar">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          <Link href="/mi-cuenta" className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors" aria-label="Mi cuenta">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </Link>

          <Link href="/carrito" className="relative p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors" aria-label="Carrito">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
            {itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-[#013d5a] text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Desktop navigation */}
      <nav className="hidden lg:block border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <ul className="flex items-center -mb-px">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block px-3.5 py-3 text-[13px] font-medium text-gray-600 hover:text-[#013d5a] border-b-2 border-transparent hover:border-[#013d5a] transition-all whitespace-nowrap"
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
        <nav className="lg:hidden border-t bg-white absolute left-0 right-0 shadow-lg z-50 max-h-[70vh] overflow-y-auto">
          {/* Mobile search */}
          <div className="p-3 border-b">
            <input
              type="search"
              placeholder="Buscar productos..."
              className="w-full bg-gray-50 border border-gray-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-[#013d5a]"
              autoFocus
            />
          </div>
          <ul>
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="flex items-center px-4 py-3.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-[#013d5a] border-b border-gray-50 transition-colors"
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
