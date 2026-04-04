import { notFound } from "next/navigation";
import { getBlogPost, getBlogPosts } from "@/lib/wordpress/api";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

const AUTHOR = {
  name: "Sistema Continuo",
  role: "Especialistas en sublimacion y estampado",
  bio: "Con mas de 15 anos en el rubro, Sistema Continuo es referente en Argentina en maquinaria de impresion, sublimacion y estampado. Desde nuestro local en Haedo, Buenos Aires, asesoramos a emprendedores y profesionales con equipos, insumos y soporte tecnico.",
  image: "/logo.webp",
  url: "https://sistemacontinuo.com.ar",
  social: {
    instagram: "https://www.instagram.com/sistemacontinuo",
    youtube: "https://www.youtube.com/@sistemacontinuo",
    facebook: "https://www.facebook.com/sistemacontinuo",
  },
};

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
        publishedTime: post.date,
        modifiedTime: post.modified || post.date,
        authors: [AUTHOR.name],
      },
      twitter: {
        card: "summary_large_image",
        title: post.title,
        description: excerpt,
        images: post.image ? [post.image.url] : [],
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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

  // Article + Author schema
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt?.replace(/<[^>]*>/g, "").trim().slice(0, 160) || "",
    image: post.image?.url || "",
    datePublished: post.date,
    dateModified: post.modified || post.date,
    url: `${siteUrl}/blog/${slug}`,
    mainEntityOfPage: { "@type": "WebPage", "@id": `${siteUrl}/blog/${slug}` },
    author: {
      "@type": "Organization",
      name: AUTHOR.name,
      url: AUTHOR.url,
      logo: { "@type": "ImageObject", url: `${siteUrl}/logo.webp` },
      sameAs: [AUTHOR.social.instagram, AUTHOR.social.youtube, AUTHOR.social.facebook],
    },
    publisher: {
      "@type": "Organization",
      name: "Sistema Continuo",
      url: AUTHOR.url,
      logo: { "@type": "ImageObject", url: `${siteUrl}/logo.webp`, width: 200, height: 60 },
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${siteUrl}/blog` },
      { "@type": "ListItem", position: 3, name: post.title },
    ],
  };

  return (
    <main className="bg-gray-50 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

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

          {/* Author byline */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full bg-[#013d5a] flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">SC</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{AUTHOR.name}</p>
              <p className="text-xs text-gray-400">
                {new Date(post.date).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
                {post.modified && post.modified !== post.date && (
                  <> · Actualizado {new Date(post.modified).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}</>
                )}
              </p>
            </div>
          </div>

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

          {/* FAQ Section */}
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

        {/* Author box */}
        <div className="mt-12 pt-8 border-t border-gray-100">
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-[#013d5a] flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-xl">SC</span>
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-[#013d5a] uppercase tracking-widest mb-1">Escrito por</p>
                <h3 className="text-lg font-bold text-gray-900">{AUTHOR.name}</h3>
                <p className="text-xs text-gray-500 mb-3">{AUTHOR.role}</p>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">{AUTHOR.bio}</p>
                <div className="flex items-center gap-4">
                  <a href={AUTHOR.social.instagram} target="_blank" rel="noopener noreferrer" className="text-xs text-[#013d5a] font-medium hover:underline">Instagram</a>
                  <a href={AUTHOR.social.youtube} target="_blank" rel="noopener noreferrer" className="text-xs text-[#013d5a] font-medium hover:underline">YouTube</a>
                  <a href={AUTHOR.social.facebook} target="_blank" rel="noopener noreferrer" className="text-xs text-[#013d5a] font-medium hover:underline">Facebook</a>
                  <a href="/contacto" className="text-xs text-[#013d5a] font-medium hover:underline">Contacto</a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <Link href="/blog" className="text-sm text-[#013d5a] font-semibold hover:underline">
            ← Volver al blog
          </Link>
        </div>
      </div>
    </main>
  );
}
