import { getBrands } from "@/lib/wordpress/api";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Marcas — Sistema Continuo",
  description:
    "Explora todas las marcas disponibles en Sistema Continuo: Silhouette, Senko, Epson, Artanium y mas. Envio a todo Argentina.",
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/marca`,
  },
};

export default async function BrandsPage() {
  const brands = await getBrands();

  return (
    <main className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Breadcrumbs */}
        <nav className="text-sm text-gray-500 mb-5">
          <Link href="/" className="hover:text-[#013d5a]">
            Inicio
          </Link>
          <span className="mx-2 text-gray-300">/</span>
          <span className="text-gray-900 font-medium">Marcas</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Marcas</h1>
          <p className="text-gray-500">
            {brands.length} marcas disponibles
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {brands.map((brand) => (
            <Link
              key={brand.slug}
              href={`/marca/${brand.slug}`}
              className="group bg-white rounded-xl border border-gray-100 hover:border-[#013d5a] hover:shadow-lg p-6 text-center transition-all"
            >
              <h2 className="text-lg font-semibold text-gray-900 group-hover:text-[#013d5a] transition-colors">
                {brand.name}
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                {brand.count} {brand.count === 1 ? "producto" : "productos"}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
