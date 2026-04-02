import type { MetadataRoute } from "next";
import { getSitemapData } from "@/lib/wordpress/api";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sistemacontinuo.com.ar";

// Force dynamic — sitemap must fetch from API at runtime, not build time
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  try {
    const data = await getSitemapData();

    for (const cat of data.categories) {
      const path = cat.parent ? `${cat.parent}/${cat.slug}` : cat.slug;
      entries.push({
        url: `${SITE_URL}/${path}`,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }

    for (const product of data.products) {
      const catPath = product.categories.length > 0
        ? product.categories.join("/")
        : "productos";
      entries.push({
        url: `${SITE_URL}/${catPath}/${product.slug}`,
        lastModified: new Date(product.modified),
        changeFrequency: "weekly",
        priority: 0.6,
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
