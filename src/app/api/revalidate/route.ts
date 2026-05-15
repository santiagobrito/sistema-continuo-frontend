/**
 * ISR Revalidation Endpoint
 *
 * Called by WordPress on content save to invalidate cached pages.
 */

import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { secret, type, slug } = body;

  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  const tags: string[] = [];

  switch (type) {
    case "product":
      tags.push("products", `product-${slug}`, "sitemap");
      break;
    case "post":
      tags.push("blog", `post-${slug}`, "sitemap");
      break;
    case "page":
      tags.push("pages", `page-${slug}`);
      break;
    case "hero_slide":
      tags.push("hero-slides");
      break;
    default:
      tags.push("products", "categories", "blog", "sitemap");
  }

  for (const tag of tags) {
    revalidateTag(tag, "max");
  }

  return NextResponse.json({ revalidated: true, tags });
}
