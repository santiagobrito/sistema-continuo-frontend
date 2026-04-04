import { getBlogPosts } from "@/lib/wordpress/api";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog",
  description: "Guias, tutoriales y novedades sobre sublimacion, estampadoras, plotters de corte y personalizacion. Consejos para tu negocio.",
  alternates: { canonical: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/blog` },
};

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function BlogPage({ searchParams }: Props) {
  const { page = "1" } = await searchParams;
  const currentPage = parseInt(page);

  const result = await getBlogPosts({ page: currentPage, per_page: 12 });
  const posts = result.data;
  const totalPages = result.pages;

  return (
    <main className="bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <nav className="text-sm text-gray-500 mb-5">
          <Link href="/" className="hover:text-[#013d5a]">Inicio</Link>
          <span className="mx-2 text-gray-300">/</span>
          <span className="text-gray-900 font-medium">Blog</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Blog</h1>
          <p className="text-gray-500">Guias, tutoriales y novedades sobre sublimacion y personalizacion</p>
        </div>

        {posts.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group bg-white rounded-xl border border-gray-100 hover:shadow-lg transition-all overflow-hidden"
                >
                  <div className="aspect-[16/9] relative bg-gray-100">
                    {post.image ? (
                      <Image
                        src={post.image.url}
                        alt={post.image.alt || post.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-10 h-10 text-gray-200" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    {post.categories[0] && (
                      <span className="text-[10px] font-semibold text-[#013d5a] uppercase tracking-widest">
                        {post.categories[0].name}
                      </span>
                    )}
                    <h2 className="text-lg font-bold text-gray-900 mt-1 mb-2 group-hover:text-[#013d5a] transition-colors line-clamp-2">
                      {post.title}
                    </h2>
                    <p className="text-sm text-gray-500 line-clamp-2">{post.excerpt.replace(/<[^>]*>/g, "")}</p>
                    <p className="text-xs text-gray-400 mt-3">
                      {new Date(post.date).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-10">
                {currentPage > 1 && (
                  <Link href={`/blog?page=${currentPage - 1}`} className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:border-[#013d5a] hover:text-[#013d5a] transition-colors">
                    Anterior
                  </Link>
                )}
                <span className="px-4 py-2 text-sm text-gray-500">{currentPage} / {totalPages}</span>
                {currentPage < totalPages && (
                  <Link href={`/blog?page=${currentPage + 1}`} className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:border-[#013d5a] hover:text-[#013d5a] transition-colors">
                    Siguiente
                  </Link>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">Proximamente publicaremos contenido.</p>
          </div>
        )}
      </div>
    </main>
  );
}
