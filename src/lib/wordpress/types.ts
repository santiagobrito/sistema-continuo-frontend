// === Product Types ===

export interface SCImage {
  id: number;
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
}

export interface CategoryPath {
  id: number;
  name: string;
  slug: string;
  path: string; // e.g., "estampadoras/senko-red-premium/automaticas"
}

export interface QuantityDiscount {
  min_qty: number;
  discount_percent: number;
}

export interface ProductVariation {
  id: number;
  sku: string;
  price: number;
  regular_price: number;
  on_sale: boolean;
  stock_status: "instock" | "outofstock" | "onbackorder";
  attributes: Record<string, string>;
  image: SCImage | null;
  weight: string;
}

export interface ProductAttribute {
  name: string;
  slug: string;
  options: string[];
  visible: boolean;
  variation: boolean;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  type: "simple" | "variable" | "grouped" | "external";
  status: string;
  permalink: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  purchasable: boolean;
  stock_status: "instock" | "outofstock" | "onbackorder";
  stock_quantity: number | null;
  sku: string;
  weight: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
  };
  categories: CategoryPath[];
  images: SCImage[];
  average_rating: number;
  review_count: number;

  // ACF fields
  marca: string;
  barcode: string;
  is_catalog_only: boolean;
  catalog_contact_message: string;
  shipping_category: "standard" | "heavy" | "oversized" | "fragile";
  precio_usd: number | null;
  quantity_discounts: QuantityDiscount[];

  // Reseller (only present if user is reseller)
  reseller_discount_percent?: number;
  reseller_price?: number;

  // Full detail only (single product page)
  description?: string;
  short_description?: string;
  url_video_youtube?: string;
  url_producto_fabricante?: string;
  seo?: {
    title: string;
    description: string;
  };
  attributes?: ProductAttribute[];
  variations?: ProductVariation[];
  default_attributes?: Record<string, string>;
  related?: Product[];
  cross_sell_ids?: number[];
}

// === Category Types ===

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  count: number;
  parent: number;
  path: string;

  // ACF
  seo_title: string;
  seo_description: string;
  seo_content: string;
  banner_image: SCImage | null;
  google_taxonomy_id: string;

  // WC image
  image: SCImage | null;

  // Tree
  children?: Category[];

  // Products (only in single category response)
  products?: PaginatedResponse<Product>;
}

// === Blog Types ===

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  date: string;
  modified: string;
  excerpt: string;
  image: SCImage | null;
  categories: { id: number; name: string; slug: string }[];

  // Full detail only
  content?: string;
  related_products?: number[];
  show_toc?: boolean;
  cta_type?: "none" | "product" | "category" | "newsletter" | "whatsapp" | "custom";
  cta_product?: number | null;
  cta_category?: number | null;
  cta_custom_text?: string;
  cta_custom_url?: string;
  faq?: { question: string; answer: string }[];
}

// === Review Types ===

export interface Review {
  id: number;
  author: string;
  content: string;
  rating: number;
  date: string;
  verified: boolean;
}

// === API Response Types ===

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  pages: number;
  page: number;
  per_page?: number;
}

export interface CategoriesResponse {
  data: Category[];
  flat: Category[];
}

export interface SitemapData {
  products: { slug: string; modified: string; categories: string[] }[];
  categories: { slug: string; parent: string | null; count: number }[];
  blog: { slug: string; modified: string }[];
}

// === Filter/Query Types ===

/**
 * Detect if a product is catalog-only (no online purchase).
 * True if: is_catalog_only flag, OR no price and not purchasable.
 */
export function isCatalogProduct(product: Product): boolean {
  return product.is_catalog_only || (!product.price && !product.purchasable);
}

export interface ProductFilters {
  category?: string;
  brand?: string;
  min_price?: string;
  max_price?: string;
  in_stock?: string;
  on_sale?: string;
  orderby?: "date" | "price" | "popularity" | "rating" | "title";
  order?: "ASC" | "DESC";
  search?: string;
  per_page?: number;
  page?: number;
}
