import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Página no encontrada",
  robots: { index: false, follow: false },
};

const popularCategories = [
  { slug: "estampadoras", name: "Estampadoras" },
  { slug: "tintas", name: "Tintas" },
  { slug: "papeles", name: "Papeles" },
  { slug: "sublimables", name: "Sublimables" },
  { slug: "silhouette", name: "Silhouette" },
  { slug: "vinilos", name: "Vinilos" },
];

export default function NotFound() {
  return (
    <main className="bg-gray-50 min-h-[70vh] flex items-center">
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#013d5a]/10 mb-6">
          <svg className="w-10 h-10 text-[#013d5a]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11.121 11.879m-9 5.243l3.003-3.003m0 0a6 6 0 108.485-8.485m-8.485 8.485a6 6 0 018.485-8.485m0 0L21 3" />
          </svg>
        </div>

        <p className="text-sm font-semibold text-[#013d5a] tracking-wide uppercase mb-2">Error 404</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
          No encontramos lo que buscás
        </h1>
        <p className="text-gray-600 mb-8 max-w-xl mx-auto">
          La página puede haber cambiado de dirección o el link tener un error.
          Probá con el buscador o navegá por las categorías.
        </p>

        <form action="/buscar" method="get" className="flex max-w-md mx-auto mb-10">
          <input
            type="text"
            name="q"
            placeholder="Buscar productos..."
            className="flex-1 px-4 py-3 border border-gray-200 rounded-l-xl text-sm focus:outline-none focus:border-[#013d5a]"
            required
          />
          <button
            type="submit"
            className="px-5 py-3 bg-[#013d5a] text-white rounded-r-xl text-sm font-semibold hover:bg-[#01567a] transition-colors"
          >
            Buscar
          </button>
        </form>

        <div className="mb-10">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Categorías populares</p>
          <div className="flex flex-wrap justify-center gap-2">
            {popularCategories.map((c) => (
              <Link
                key={c.slug}
                href={`/${c.slug}`}
                className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:border-[#013d5a] hover:text-[#013d5a] transition-colors"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#013d5a] text-white rounded-xl text-sm font-semibold hover:bg-[#01567a] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Ir al inicio
          </Link>
          <a
            href="https://wa.me/5491130793862"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:border-[#013d5a] hover:text-[#013d5a] transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492l4.626-1.467A11.932 11.932 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.82a9.828 9.828 0 01-5.01-1.37l-.36-.214-3.729 1.183 1.204-3.593-.235-.374A9.82 9.82 0 012.18 12 9.82 9.82 0 0112 2.18 9.82 9.82 0 0121.82 12 9.82 9.82 0 0112 21.82z"/>
            </svg>
            Escribinos por WhatsApp
          </a>
        </div>
      </div>
    </main>
  );
}
