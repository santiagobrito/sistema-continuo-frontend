import type {
  Product,
  Category,
  Brand,
  BlogPost,
  Review,
  PaginatedResponse,
  CategoriesResponse,
  SitemapData,
  ProductFilters,
} from "./types";

const WP_URL = process.env.WP_URL || process.env.NEXT_PUBLIC_WP_URL || "";
const API_BASE = `${WP_URL}/wp-json/sistema-continuo/v1`;

// === Core fetch with ISR ===

interface FetchOptions {
  revalidate?: number;
  tags?: string[];
}

async function apiFetch<T>(
  endpoint: string,
  params?: Record<string, string | number | undefined>,
  options: FetchOptions = {}
): Promise<T> {
  const url = new URL(`${API_BASE}${endpoint}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const res = await fetch(url.toString(), {
    next: {
      revalidate: options.revalidate ?? 3600,
      tags: options.tags,
    },
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${endpoint}`);
  }

  return res.json();
}

// === Products ===

export async function getProducts(
  filters: ProductFilters = {}
): Promise<PaginatedResponse<Product>> {
  return apiFetch<PaginatedResponse<Product>>(
    "/products",
    filters as Record<string, string | number | undefined>,
    {
      revalidate: 3600,
      tags: ["products"],
    }
  );
}

export async function getProduct(slug: string): Promise<Product> {
  return apiFetch<Product>(`/products/${slug}`, undefined, {
    revalidate: 3600,
    tags: ["products", `product-${slug}`],
  });
}

// === Categories ===

export async function getCategories(): Promise<CategoriesResponse> {
  return apiFetch<CategoriesResponse>("/categories", undefined, {
    revalidate: 86400,
    tags: ["categories"],
  });
}

export async function getCategory(
  slug: string,
  params?: { page?: number; per_page?: number; orderby?: string; order?: string }
): Promise<Category> {
  return apiFetch<Category>(
    `/categories/${slug}`,
    params as Record<string, string | number | undefined>,
    {
      revalidate: 3600,
      tags: ["categories", `category-${slug}`],
    }
  );
}

// === Brands ===

export async function getBrands(): Promise<Brand[]> {
  const res = await apiFetch<{ data: Brand[] }>("/brands", undefined, {
    revalidate: 86400,
    tags: ["brands"],
  });
  return res.data;
}

export async function getProductsByBrand(
  brandName: string,
  params?: { page?: number; per_page?: number; orderby?: string; order?: string }
): Promise<PaginatedResponse<Product>> {
  return apiFetch<PaginatedResponse<Product>>(
    "/products",
    { brand: brandName, ...params } as Record<string, string | number | undefined>,
    {
      revalidate: 3600,
      tags: ["products", `brand-${brandName}`],
    }
  );
}

// === Blog ===

export async function getBlogPosts(
  params?: { page?: number; per_page?: number; category?: string }
): Promise<PaginatedResponse<BlogPost>> {
  return apiFetch<PaginatedResponse<BlogPost>>(
    "/blog",
    params as Record<string, string | number | undefined>,
    {
      revalidate: 3600,
      tags: ["blog"],
    }
  );
}

export async function getBlogPost(slug: string): Promise<BlogPost> {
  return apiFetch<BlogPost>(`/blog/${slug}`, undefined, {
    revalidate: 3600,
    tags: ["blog", `post-${slug}`],
  });
}

// === Reviews ===

export async function getProductReviews(
  slug: string,
  params?: { page?: number; per_page?: number }
): Promise<PaginatedResponse<Review>> {
  return apiFetch<PaginatedResponse<Review>>(
    `/products/${slug}/reviews`,
    params as Record<string, string | number | undefined>,
    {
      revalidate: 300,
      tags: [`reviews-${slug}`],
    }
  );
}

// === Sitemap ===

export async function getSitemapData(): Promise<SitemapData> {
  return apiFetch<SitemapData>("/sitemap", undefined, {
    revalidate: 3600,
    tags: ["sitemap"],
  });
}

// === Helpers ===

/**
 * Build the frontend URL for a product based on its deepest category path
 */
export function getProductUrl(product: Product): string {
  const deepest = product.categories.reduce((best, curr) => {
    const bestDepth = best?.path?.split("/").length || 0;
    const currDepth = curr.path.split("/").length;
    return currDepth > bestDepth ? curr : best;
  }, product.categories[0]);

  return deepest ? `/${deepest.path}/${product.slug}` : `/${product.slug}`;
}

/**
 * Build the frontend URL for a category
 */
export function getCategoryUrl(category: Category): string {
  return `/${category.path}`;
}

/**
 * Format price in ARS
 */
export function formatPrice(price: string | number): string {
  const num = typeof price === "string" ? parseFloat(price) : price;
  if (isNaN(num)) return "";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}
