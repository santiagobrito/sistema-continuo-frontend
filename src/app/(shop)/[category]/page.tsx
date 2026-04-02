import { notFound } from "next/navigation";
import { getCategory, getCategories, getCategoryUrl } from "@/lib/wordpress/api";
import { formatPrice } from "@/lib/utils/format";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

interface Props {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ page?: string; orderby?: string; order?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category: slug } = await params;
  try {
    const category = await getCategory(slug);
    return {
      title: category.seo_title || category.name,
      description: category.seo_description || category.description || `Productos de ${category.name} en Sistema Continuo`,
    };
  } catch {
    return { title: "Categoría no encontrada" };
  }
}

export async function generateStaticParams() {
  const { flat } = await getCategories();
  // Only top-level categories (parent === 0) for this route
  return flat
    .filter((c) => c.parent === 0)
    .map((c) => ({ category: c.slug }));
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { category: slug } = await params;
  const { page = "1", orderby = "date", order = "DESC" } = await searchParams;

  let category;
  try {
    category = await getCategory(slug, {
      page: parseInt(page),
      per_page: 24,
      orderby,
      order,
    });
  } catch {
    notFound();
  }

  const products = category.products?.data ?? [];
  const totalPages = category.products?.pages ?? 1;
  const currentPage = parseInt(page);

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      {/* Banner */}
      {category.banner_image && (
        <div className="relative w-full h-48 md:h-64 rounded-lg overflow-hidden mb-8">
          <Image
            src={category.banner_image.url}
            alt={category.name}
            fill
            className="object-cover"
            preload
          />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <h1 className="text-3xl md:text-4xl font-bold text-white">{category.name}</h1>
          </div>
        </div>
      )}

      {!category.banner_image && (
        <h1 className="text-3xl font-bold mb-4">{category.name}</h1>
      )}

      {/* SEO Content (above grid) */}
      {category.seo_content && (
        <div
          className="prose max-w-none mb-8"
          dangerouslySetInnerHTML={{ __html: category.seo_content }}
        />
      )}

      {/* Subcategories */}
      {category.children && category.children.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Subcategorías</h2>
          <div className="flex flex-wrap gap-3">
            {category.children.map((sub) => (
              <Link
                key={sub.id}
                href={getCategoryUrl(sub)}
                className="px-4 py-2 bg-gray-100 hover:bg-blue-50 hover:text-blue-700 rounded-lg text-sm transition-colors"
              >
                {sub.name} ({sub.count})
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Products grid */}
      {products.length > 0 ? (
        <>
          <div className="flex items-center justify-between mb-6">
            <p className="text-gray-600">
              {category.products?.total} productos
            </p>
            {/* Sort selector would go here */}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/${category.slug}/${product.slug}`}
                className="group block bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow overflow-hidden"
              >
                {/* Image */}
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
                    <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                      Oferta
                    </span>
                  )}
                  {product.is_catalog_only && (
                    <span className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                      Consultar
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  {product.marca && (
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                      {product.marca}
                    </p>
                  )}
                  <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">
                    {product.name}
                  </h3>
                  {product.is_catalog_only ? (
                    <p className="text-sm text-blue-600 font-medium">Consultar precio</p>
                  ) : product.price ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-gray-900">
                        {formatPrice(product.price)}
                      </span>
                      {product.on_sale && product.regular_price && (
                        <span className="text-sm text-gray-400 line-through">
                          {formatPrice(product.regular_price)}
                        </span>
                      )}
                    </div>
                  ) : null}
                  {product.stock_status === "outofstock" && (
                    <p className="text-xs text-red-500 mt-1">Sin stock</p>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {currentPage > 1 && (
                <Link
                  href={`/${slug}?page=${currentPage - 1}`}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  ← Anterior
                </Link>
              )}
              <span className="px-4 py-2 text-gray-600">
                Página {currentPage} de {totalPages}
              </span>
              {currentPage < totalPages && (
                <Link
                  href={`/${slug}?page=${currentPage + 1}`}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Siguiente →
                </Link>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="text-gray-500">No hay productos en esta categoría.</p>
      )}
    </main>
  );
}
