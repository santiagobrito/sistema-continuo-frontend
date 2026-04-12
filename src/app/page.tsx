import { getCategories, getProducts, getBrands, getBlogPosts, getCategoryUrl, getProductUrl } from "@/lib/wordpress/api";
import { formatPrice } from "@/lib/utils/format";
import type { Product } from "@/lib/wordpress/types";
import Image from "next/image";
import Link from "next/link";

export const revalidate = 300; // ISR: revalidate every 5 minutes

const MAIN_CATEGORIES = [
  { slug: "estampadoras", label: "Estampadoras", icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" },
  { slug: "impresoras", label: "Impresoras", icon: "M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" },
  { slug: "silhouette", label: "Silhouette", icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" },
  { slug: "sublimables", label: "Sublimables", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
  { slug: "tintas", label: "Tintas", icon: "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" },
  { slug: "papel", label: "Papeles", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { slug: "vinilos", label: "Vinilos", icon: "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" },
  { slug: "gran-formato", label: "Gran Formato", icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" },
];

export default async function HomePage() {
  const emptyPaginated = { data: [], total: 0, pages: 0, page: 1 };

  const [categoriesData, onSaleData, brandsData, blogData,
    estampadorasData, tintasData, papelesData, sublimablesData, silhouetteData
  ] = await Promise.all([
    getCategories().catch(() => ({ data: [], flat: [] })),
    getProducts({ per_page: 4, on_sale: "1" }).catch(() => emptyPaginated),
    getBrands().catch(() => []),
    getBlogPosts({ per_page: 3 }).catch(() => emptyPaginated),
    getProducts({ category: "estampadoras", per_page: 4, orderby: "popularity" }).catch(() => emptyPaginated),
    getProducts({ category: "tintas", per_page: 4, orderby: "popularity" }).catch(() => emptyPaginated),
    getProducts({ category: "papel", per_page: 4, orderby: "popularity" }).catch(() => emptyPaginated),
    getProducts({ category: "sublimables", per_page: 4, orderby: "popularity" }).catch(() => emptyPaginated),
    getProducts({ category: "silhouette", per_page: 4, orderby: "popularity" }).catch(() => emptyPaginated),
  ]);

  const onSaleProducts = onSaleData.data.filter((p) => p.regular_price && Number(p.regular_price) > Number(p.price));
  const brands = brandsData;
  const blogPosts = blogData.data;

  const categorySections = [
    { title: "Estampadoras", slug: "estampadoras", desc: "Planas, gorras, tazas, 8en1 y automaticas", products: estampadorasData.data, total: estampadorasData.total },
    { title: "Tintas profesionales", slug: "tintas", desc: "OCP, Artanium, KIIAN para Epson, HP y Canon", products: tintasData.data, total: tintasData.total },
    { title: "Papeles", slug: "papel", desc: "Sublimacion, transfer, fotografico y autoadhesivo", products: papelesData.data, total: papelesData.total },
    { title: "Sublimables", slug: "sublimables", desc: "Tazas, remeras, gorras, madera, polímero y más", products: sublimablesData.data, total: sublimablesData.total },
    { title: "Silhouette", slug: "silhouette", desc: "Plotters Cameo 5, Curio 2, cuchillas y accesorios", products: silhouetteData.data, total: silhouetteData.total },
  ];

  return (
    <main className="bg-gray-50">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[#013d5a] via-[#01567a] to-[#0178a5] text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIi8+PC9zdmc+')] opacity-50" />
        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-blue-200 uppercase tracking-widest mb-3">+20 años equipando emprendedores</p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.1] mb-5 tracking-tight">
              Todo para sublimación en un solo lugar
            </h1>
            <p className="text-lg md:text-xl text-blue-100/90 mb-4 leading-relaxed">
              +600 productos: estampadoras, sublimadoras, plotters Silhouette, tintas, papeles y artículos sublimables.
            </p>
            <div className="flex items-center gap-4 text-sm text-blue-200 mb-8">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                Envío a todo el país
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                Hasta 12 cuotas
              </span>
              <span className="flex items-center gap-1.5 hidden sm:flex">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                Garantía 1 año
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/estampadoras" className="inline-flex items-center gap-2 bg-white text-[#013d5a] px-7 py-3.5 rounded-full font-semibold hover:bg-blue-50 transition-all shadow-lg shadow-black/10">
                Ver estampadoras
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
              </Link>
              <Link href="/ofertas" className="inline-flex items-center gap-2 bg-red-500 text-white px-7 py-3.5 rounded-full font-semibold hover:bg-red-600 transition-all">
                Ofertas
              </Link>
              <a href="https://wa.me/5491133466497" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-white/10 backdrop-blur text-white px-7 py-3.5 rounded-full font-semibold hover:bg-white/20 transition-all border border-white/20">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Categories grid */}
      <section className="max-w-7xl mx-auto px-4 -mt-10 relative z-10 mb-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {MAIN_CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/${cat.slug}`}
              className="group flex flex-col items-center gap-2.5 bg-white rounded-xl p-4 shadow-sm hover:shadow-md border border-gray-100 hover:border-[#013d5a]/20 transition-all"
            >
              <div className="w-11 h-11 rounded-lg bg-[#013d5a]/5 group-hover:bg-[#013d5a]/10 flex items-center justify-center transition-colors">
                <svg className="w-5 h-5 text-[#013d5a]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d={cat.icon} />
                </svg>
              </div>
              <span className="text-xs font-semibold text-gray-700 group-hover:text-[#013d5a] text-center transition-colors">{cat.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured: Combos */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="bg-gradient-to-r from-[#013d5a] to-[#01567a] rounded-2xl p-6 md:p-10 text-white">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-sm font-semibold text-blue-200 uppercase tracking-widest mb-2">Todo en uno</p>
              <h2 className="text-2xl md:text-3xl font-bold mb-3">Combos de sublimación</h2>
              <p className="text-blue-100 text-sm leading-relaxed max-w-md">
                Estampadora + insumos + artículos sublimables. Todo lo que necesitas para arrancar o potenciar tu negocio en un solo pack con precio especial.
              </p>
            </div>
            <Link href="/estampadoras/combos-de-sublimacion" className="flex-shrink-0 inline-flex items-center gap-2 bg-white text-[#013d5a] px-7 py-3.5 rounded-full font-semibold hover:bg-blue-50 transition-all">
              Ver combos
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* On Sale — urgency */}
      {onSaleProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">OFERTAS</span>
              <h2 className="text-2xl font-bold text-gray-900">Descuentos activos</h2>
            </div>
            <Link href="/ofertas" className="text-sm font-medium text-[#013d5a] hover:underline">Ver todas</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {onSaleProducts.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Category sections */}
      {categorySections.map((section, i) => (
        section.products.length > 0 && (
          <section key={section.slug} className={`py-10 ${i % 2 === 1 ? "bg-white" : ""}`}>
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{section.title}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{section.desc}</p>
                </div>
                <Link href={`/${section.slug}`} className="text-sm font-medium text-[#013d5a] hover:underline whitespace-nowrap">
                  Ver los {section.total}
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {section.products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          </section>
        )
      ))}

      {/* Brands */}
      {brands.length > 0 && (
        <section className="border-t border-gray-200 bg-white py-10">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Marcas</h2>
              <Link href="/marca" className="text-sm font-medium text-[#013d5a] hover:underline">Ver todas</Link>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
              {brands.map((brand) => (
                <Link key={brand.slug} href={`/marca/${brand.slug}`} className="group bg-gray-50 hover:bg-[#013d5a]/5 rounded-xl p-4 text-center transition-all border border-transparent hover:border-[#013d5a]/10">
                  <p className="font-semibold text-gray-800 group-hover:text-[#013d5a] text-sm">{brand.name}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{brand.count} productos</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Trust bar */}
      <section className="border-t border-gray-200 bg-white py-10">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#013d5a]/5 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-[#013d5a]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Envíos a todo el país</h3>
              <p className="text-xs text-gray-500 mt-0.5">Correo Argentino, moto y transporte</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#013d5a]/5 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-[#013d5a]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Paga como quieras</h3>
              <p className="text-xs text-gray-500 mt-0.5">MercadoPago, transferencia o efectivo</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#013d5a]/5 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-[#013d5a]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Retira en Haedo</h3>
              <p className="text-xs text-gray-500 mt-0.5">Av. Rivadavia 17002, Buenos Aires</p>
            </div>
          </div>
        </div>
      </section>

      {/* Blog */}
      {blogPosts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Blog</h2>
            <Link href="/blog" className="text-sm text-[#013d5a] font-semibold hover:underline">Ver todos</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {blogPosts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="group bg-white rounded-xl border border-gray-100 hover:shadow-lg transition-all overflow-hidden">
                <div className="aspect-[16/9] relative bg-gray-100">
                  {post.image ? (
                    <Image src={post.image.url} alt={post.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="33vw" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-200" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 group-hover:text-[#013d5a] transition-colors line-clamp-2 text-sm">{post.title}</h3>
                  <p className="text-xs text-gray-500 mt-2 line-clamp-2">{post.excerpt.replace(/<[^>]*>/g, "")}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={getProductUrl(product)} className="group bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all overflow-hidden">
      <div className="aspect-square relative bg-gray-50/50 p-3">
        {product.images[0] ? (
          <Image src={product.images[0].url} alt={product.images[0].alt || product.name} fill className="object-contain p-2 group-hover:scale-105 transition-transform duration-300" sizes="(max-width: 768px) 50vw, 25vw" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-200" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
        )}
        {product.on_sale && product.regular_price && Number(product.regular_price) > Number(product.price) && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            -{Math.round((1 - Number(product.price) / Number(product.regular_price)) * 100)}%
          </span>
        )}
        {product.stock_status === "outofstock" && (
          <span className="absolute top-2 right-2 bg-gray-800/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Sin stock</span>
        )}
      </div>
      <div className="p-3.5 pt-2.5">
        {product.marca && <p className="text-[10px] font-semibold text-[#013d5a]/60 uppercase tracking-widest mb-0.5">{product.marca}</p>}
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug mb-2 group-hover:text-[#013d5a] transition-colors">{product.name}</h3>
        {product.price && !product.is_catalog_only ? (
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold text-gray-900">{formatPrice(product.price)}</span>
            {product.on_sale && product.regular_price && Number(product.regular_price) > Number(product.price) && (
              <span className="text-xs text-gray-400 line-through">{formatPrice(product.regular_price)}</span>
            )}
          </div>
        ) : product.is_catalog_only ? (
          <span className="text-sm text-[#013d5a] font-semibold">Consultar</span>
        ) : null}
      </div>
    </Link>
  );
}
