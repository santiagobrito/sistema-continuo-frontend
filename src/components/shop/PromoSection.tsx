/**
 * PromoSection — sección destacada en home con productos de la campaña activa.
 * Server async: si no hay campaña o no tiene productos, no renderiza nada.
 *
 * Diseño: header con título + logo (con un fondo coloreado distintivo de la
 * campaña), grid de productos y CTA. El badge propio de la campaña en cada
 * tarjeta lo aplica ProductCard automáticamente cuando product.in_active_campaign
 * es true.
 */
import Image from "next/image";
import Link from "next/link";
import ProductCard from "@/components/product/ProductCard";
import { getActiveCampaign } from "@/lib/wordpress/api";

export async function PromoSection() {
  const campaign = await getActiveCampaign({ withProducts: true, limit: 8 });
  if (!campaign || !campaign.products || campaign.products.length === 0) return null;

  const { logo, section_title, section_cta_label, section_cta_url, primary_color, text_color, products } = campaign;

  return (
    <section className="max-w-7xl mx-auto px-4 py-10">
      <div
        className="rounded-2xl p-6 md:p-8 mb-6"
        style={{
          background: `linear-gradient(135deg, ${primary_color} 0%, ${primary_color}cc 100%)`,
          color: text_color,
        }}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            {section_title && (
              <h2 className="text-xl md:text-2xl font-bold leading-tight">
                {section_title}
              </h2>
            )}
            {logo?.url && (
              <Image
                src={logo.url}
                alt={logo.alt || campaign.name}
                width={logo.width || 120}
                height={logo.height || 48}
                className="h-10 md:h-12 w-auto object-contain"
                unoptimized
              />
            )}
          </div>
          {section_cta_label && section_cta_url && (
            <Link
              href={section_cta_url}
              className="flex-shrink-0 inline-flex items-center gap-2 bg-white text-gray-900 px-5 py-2.5 rounded-full font-semibold hover:bg-gray-100 transition-all text-sm"
            >
              {section_cta_label}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
