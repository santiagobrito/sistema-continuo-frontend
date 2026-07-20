/**
 * Schema.org Structured Data generators
 */

import type { Product, Category, Review } from "@/lib/wordpress/types";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sistemacontinuo.com.ar";

export function generateProductSchema(product: Product, url: string, reviews?: Review[]) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    url: `${SITE_URL}${url}`,
    description: product.short_description?.replace(/<[^>]*>/g, "").slice(0, 500) || product.seo?.description || "",
    sku: product.sku || undefined,
    gtin: product.barcode || undefined,
    brand: product.marca ? { "@type": "Brand", name: product.marca } : undefined,
  };

  // Images
  if (product.images.length > 0) {
    schema.image = product.images.map((img) => img.url);
  }

  // Offers
  if (product.price && !product.is_catalog_only) {
    if (product.type === "variable" && product.variations?.length) {
      // Un Offer por variación con SU propio stock. El AggregateOffer anterior emitía
      // un único availability heredado del padre: si el padre tenía stock en alguna
      // variante, las agotadas figuraban InStock y Google lo marcaba como
      // "Mismatched product availability" contra el feed (que sí va por variación).
      schema.offers = product.variations
        .filter((v) => Number(v.price))
        .map((v) => ({
          "@type": "Offer",
          price: Number(v.price),
          priceCurrency: "ARS",
          sku: v.sku || undefined,
          availability:
            v.stock_status === "instock"
              ? "https://schema.org/InStock"
              : v.stock_status === "onbackorder"
                ? "https://schema.org/BackOrder"
                : "https://schema.org/OutOfStock",
          seller: { "@type": "Organization", name: "Sistema Continuo" },
        }));
    } else {
      schema.offers = {
        "@type": "Offer",
        price: Number(product.price),
        priceCurrency: "ARS",
        availability: product.stock_status === "instock"
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
        seller: { "@type": "Organization", name: "Sistema Continuo" },
      };
    }
  }

  // Reviews
  if (product.review_count > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: product.average_rating,
      reviewCount: product.review_count,
      bestRating: 5,
      worstRating: 1,
    };
  }

  if (reviews?.length) {
    schema.review = reviews.slice(0, 5).map((r) => ({
      "@type": "Review",
      author: { "@type": "Person", name: r.author },
      datePublished: r.date,
      reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
      reviewBody: r.content.replace(/<[^>]*>/g, ""),
    }));
  }

  // Video
  if (product.url_video_youtube) {
    const videoId = product.url_video_youtube.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{11})/)?.[1];
    if (videoId) {
      schema.video = {
        "@type": "VideoObject",
        name: product.name,
        description: product.seo?.description || `Video de ${product.name}`,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        contentUrl: product.url_video_youtube,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
        uploadDate: "2024-01-01",
      };
    }
  }

  return schema;
}

export function generateBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
  };
}

export function generateCategorySchema(category: Category, products: Product[]) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: category.name,
    description: category.seo_description || category.description || "",
    url: `${SITE_URL}/${category.path}`,
    numberOfItems: category.count,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: products.length,
      itemListElement: products.slice(0, 20).map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE_URL}/${p.slug}`,
        name: p.name,
      })),
    },
  };
}

export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Sistema Continuo",
    url: SITE_URL,
    logo: `${SITE_URL}/logo.webp`,
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+54-11-4650-1592",
      contactType: "sales",
      availableLanguage: "Spanish",
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: "Av. Rivadavia 17002",
      addressLocality: "Haedo",
      addressRegion: "Buenos Aires",
      postalCode: "1706",
      addressCountry: "AR",
    },
    sameAs: [
      "https://www.instagram.com/sistemacontinuo",
      "https://www.facebook.com/sistemacontinuo",
      "https://www.youtube.com/@sistemacontinuo",
    ],
  };
}

export function generateWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Sistema Continuo",
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/buscar?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}
