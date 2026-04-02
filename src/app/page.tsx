import { getCategories, getProducts, getCategoryUrl, getProductUrl } from "@/lib/wordpress/api";
import { formatPrice } from "@/lib/utils/format";
import Image from "next/image";
import Link from "next/link";

export default async function HomePage() {
  const [categoriesData, productsData] = await Promise.all([
    getCategories().catch(() => ({ data: [], flat: [] })),
    getProducts({ per_page: 12, orderby: "popularity" }).catch(() => ({ data: [], total: 0, pages: 0, page: 1 })),
  ]);

  const topCategories = categoriesData.data.filter((c) => c.count > 0).slice(0, 10);
  const products = productsData.data;

  return (
    <main>
      {/* Hero */}
      <section className="bg-[#013d5a] text-white py-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Sistema Continuo</h1>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Maquinaria de impresión, estampadoras, papelería profesional y productos para sublimación
          </p>
          <Link
            href="/estampadoras"
            className="inline-block bg-white text-[#013d5a] px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
          >
            Ver catálogo
          </Link>
        </div>
      </section>

      {/* Categories */}
      {topCategories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold mb-6">Categorías</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {topCategories.map((cat) => (
              <Link
                key={cat.id}
                href={getCategoryUrl(cat)}
                className="group block bg-white rounded-lg border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all p-4 text-center"
              >
                {cat.image && (
                  <div className="relative w-20 h-20 mx-auto mb-3">
                    <Image
                      src={cat.image.url}
                      alt={cat.name}
                      fill
                      className="object-contain"
                      sizes="80px"
                    />
                  </div>
                )}
                <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                  {cat.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">{cat.count} productos</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured products */}
      {products.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold mb-6">Productos destacados</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((product) => (
              <Link
                key={product.id}
                href={getProductUrl(product)}
                className="group block bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="aspect-square relative bg-gray-50">
                  {product.images[0] ? (
                    <Image
                      src={product.images[0].url}
                      alt={product.images[0].alt || product.name}
                      fill
                      className="object-contain p-2 group-hover:scale-105 transition-transform"
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      Sin imagen
                    </div>
                  )}
                  {product.on_sale && (
                    <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">Oferta</span>
                  )}
                </div>
                <div className="p-3">
                  {product.marca && (
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{product.marca}</p>
                  )}
                  <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">{product.name}</h3>
                  {product.price && !product.is_catalog_only ? (
                    <span className="text-lg font-bold">{formatPrice(product.price)}</span>
                  ) : product.is_catalog_only ? (
                    <span className="text-sm text-blue-600 font-medium">Consultar precio</span>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Trust / Info */}
      <section className="bg-gray-50 py-12 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <h3 className="font-semibold mb-1">Envios a todo el pais</h3>
            <p className="text-sm text-gray-600">Correo Argentino, moto y transporte</p>
          </div>
          <div>
            <h3 className="font-semibold mb-1">Paga como quieras</h3>
            <p className="text-sm text-gray-600">MercadoPago, transferencia o efectivo</p>
          </div>
          <div>
            <h3 className="font-semibold mb-1">Retira en Haedo</h3>
            <p className="text-sm text-gray-600">Av. Rivadavia 17002, Buenos Aires</p>
          </div>
        </div>
      </section>
    </main>
  );
}
