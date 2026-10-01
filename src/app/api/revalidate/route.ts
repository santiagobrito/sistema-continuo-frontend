/**
 * ISR Revalidation Endpoint
 *
 * Called by WordPress on content save to invalidate cached pages.
 *
 * Expiración inmediata (`expire: 0`) para la ficha del producto editado: con
 * el perfil "max" Next sirve la copia vieja a la primera visita y regenera por
 * detrás, así que una ficha que nadie abría hacía días mostraba el precio de
 * hace días (reclamo de Gabriel, 1-10-2026). Los tags compartidos (listados,
 * sitemap) siguen con "max" para no enfriar todo el catálogo en cada guardado.
 *
 * Si WP manda `url` y existe CF_PURGE_TOKEN, se purga además esa URL en
 * Cloudflare, que guarda el HTML público 5 min (Cache Rule de la zona).
 */

import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

const CF_ZONE_ID = "ddf0808af33639e0c357620cb8cb6ed6";

async function purgeCloudflare(url: string): Promise<string> {
  const token = process.env.CF_PURGE_TOKEN;
  if (!token) return "skipped (no token)";
  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ files: [url] }),
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      }
    );
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      console.error("[revalidate] CF purge failed", res.status, JSON.stringify(data?.errors));
      return `failed (${res.status})`;
    }
    return "ok";
  } catch (err) {
    console.error("[revalidate] CF purge error", err);
    return "error";
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { secret, type, slug, url } = body;

  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  const immediate: string[] = [];
  const tags: string[] = [];

  switch (type) {
    case "product":
      immediate.push(`product-${slug}`);
      tags.push("products", "sitemap");
      break;
    case "post":
      immediate.push(`post-${slug}`);
      tags.push("blog", "sitemap");
      break;
    case "page":
      immediate.push(`page-${slug}`);
      tags.push("pages");
      break;
    case "hero_slide":
      tags.push("hero-slides");
      break;
    default:
      tags.push("products", "categories", "blog", "sitemap");
  }

  for (const tag of immediate) {
    revalidateTag(tag, { expire: 0 });
  }
  for (const tag of tags) {
    revalidateTag(tag, "max");
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sistemacontinuo.com.ar";
  const purge =
    typeof url === "string" && url.startsWith(siteUrl)
      ? await purgeCloudflare(url)
      : "skipped (no url)";

  return NextResponse.json({ revalidated: true, immediate, tags, purge });
}
