import { notFound } from "next/navigation";
import { getBlogPost, getBlogPosts } from "@/lib/wordpress/api";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const post = await getBlogPost(slug);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
    const excerpt = post.excerpt?.replace(/<[^>]*>/g, "").trim().slice(0, 160) || "";
    return {
      title: post.title,
      description: excerpt,
      alternates: { canonical: `${siteUrl}/blog/${slug}` },
      openGraph: {
        title: post.title,
        description: excerpt,
        images: post.image ? [{ url: post.image.url }] : [],
        type: "article",
      },
    };
  } catch {
    return { title: "Articulo no encontrado" };
  }
}

export async function generateStaticParams() {
  try {
    const { data } = await getBlogPosts({ per_page: 50 });
    return data.map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;

  let post;
  try {
    post = await getBlogPost(slug);
  } catch {
    notFound();
  }

  return (
    <main className="bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-[#013d5a]">Inicio</Link>
          <span className="mx-2 text-gray-300">/</span>
          <Link href="/blog" className="hover:text-[#013d5a]">Blog</Link>
          <span className="mx-2 text-gray-300">/</span>
          <span className="text-gray-900 font-medium line-clamp-1">{post.title}</span>
        </nav>

        <article>
          {post.categories[0] && (
            <span className="text-xs font-semibold text-[#013d5a] uppercase tracking-widest">
              {post.categories[0].name}
            </span>
          )}
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mt-2 mb-4 leading-tight">{post.title}</h1>
          <p className="text-sm text-gray-400 mb-8">
            {new Date(post.date).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
          </p>

          {post.image && (
            <div className="aspect-[16/9] relative rounded-xl overflow-hidden mb-8">
              <Image
                src={post.image.url}
                alt={post.image.alt || post.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 768px"
                priority
              />
            </div>
          )}

          <div
            className="prose prose-base max-w-none prose-headings:text-gray-900 prose-headings:font-semibold prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3 prose-h2:pb-2 prose-h2:border-b prose-h2:border-gray-100 prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-2 prose-p:text-gray-600 prose-p:leading-relaxed prose-p:mb-4 prose-ul:my-4 prose-ul:pl-5 prose-li:text-gray-600 prose-li:leading-relaxed prose-li:mb-1.5 prose-li:marker:text-[#013d5a] prose-strong:text-gray-800 prose-a:text-[#013d5a] prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl prose-img:my-6"
            dangerouslySetInnerHTML={{ __html: post.content || "" }}
          />

          {/* FAQ Schema */}
          {post.faq && post.faq.length > 0 && (
            <div className="mt-12 border-t border-gray-100 pt-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Preguntas frecuentes</h2>
              <div className="space-y-4">
                {post.faq.map((item, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-100 p-5">
                    <h3 className="font-semibold text-gray-900 mb-2">{item.question}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{item.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </article>

        <div className="mt-12 pt-8 border-t border-gray-100">
          <Link href="/blog" className="text-sm text-[#013d5a] font-semibold hover:underline">
            ← Volver al blog
          </Link>
        </div>
      </div>
    </main>
  );
}
