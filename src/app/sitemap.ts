import type { MetadataRoute } from "next";
import { getSitemapData, getBrands } from "@/lib/wordpress/api";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sistemacontinuo.com.ar";

// Re-generate diariamente. Invalidación granular via revalidateTag("sitemap")
// cuando se publican productos/categorías (ya hooked en /api/revalidate).
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/ofertas`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/blog`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/contacto`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/como-comprar`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/formas-de-pago`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/envios`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/devoluciones`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terminos-y-condiciones`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/politica-de-privacidad`, changeFrequency: "yearly", priority: 0.3 },
  ];

  try {
    const data = await getSitemapData();

    // Las rutas vienen resueltas por el backend (SC_Product_Helper), que es el mismo
    // que emite el <link rel="canonical">. No reconstruirlas acá: hacerlo dejó 427 de
    // las 721 URLs del sitemap apuntando a páginas que declaraban otra canónica, y las
    // 427 buenas fuera del sitemap (auditoría 2026-08-23).
    for (const cat of data.categories) {
      // Fallback plugin < 1.9.20: `parent` solo cubre un nivel de anidamiento.
      const path = cat.path || (cat.parent ? `${cat.parent}/${cat.slug}` : cat.slug);
      entries.push({
        url: `${SITE_URL}/${path}`,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }

    for (const product of data.products) {
      // Fallback plugin < 1.9.20: `categories` llega sin jerarquía ni orden estable.
      const path = product.url
        || `/${product.categories.length > 0 ? product.categories.join("/") : "productos"}/${product.slug}`;
      entries.push({
        url: `${SITE_URL}${path}`,
        lastModified: new Date(product.modified),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }

    // Brand pages
    const brands = await getBrands();
    entries.push({
      url: `${SITE_URL}/marca`,
      changeFrequency: "weekly",
      priority: 0.7,
    });
    for (const brand of brands) {
      entries.push({
        url: `${SITE_URL}/marca/${brand.slug}`,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }

    for (const post of data.blog) {
      entries.push({
        url: `${SITE_URL}/blog/${post.slug}`,
        lastModified: new Date(post.modified),
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
  } catch {
    // API unavailable during build — return minimal sitemap
  }

  return entries;
}
