/**
 * PromoMarquee — ticker scrolleando con logo + texto de la campaña activa.
 * Server async: si no hay campaña vigente no renderiza nada.
 */
import Image from "next/image";
import { getActiveCampaign } from "@/lib/wordpress/api";

const REPEATS = 8;

export async function PromoMarquee() {
  const campaign = await getActiveCampaign({ withProducts: false });
  if (!campaign) return null;

  const { logo, primary_color, text_color, marquee_prefix, marquee_emphasis, marquee_suffix } = campaign;
  const hasContent = marquee_prefix || marquee_emphasis || marquee_suffix || logo;
  if (!hasContent) return null;

  const unit = (
    <span className="inline-flex items-center gap-2 px-6 shrink-0 text-sm md:text-[15px]">
      {logo?.url && (
        <Image
          src={logo.url}
          alt={logo.alt || campaign.name}
          width={logo.width || 64}
          height={logo.height || 22}
          className="h-5 md:h-6 w-auto object-contain"
          unoptimized
        />
      )}
      {marquee_prefix && <span>{marquee_prefix}</span>}
      {marquee_emphasis && <span className="font-extrabold">{marquee_emphasis}</span>}
      {marquee_suffix && <span>{marquee_suffix}</span>}
      <span className="opacity-60" aria-hidden>•</span>
    </span>
  );

  return (
    <div
      className="sc-marquee w-full overflow-hidden py-2"
      style={{ backgroundColor: primary_color, color: text_color }}
      aria-label={`${marquee_prefix} ${marquee_emphasis} ${marquee_suffix}`.trim()}
      role="region"
    >
      <div className="sc-marquee-track whitespace-nowrap">
        {/* Renderiza el contenido 2x para que el translateX(-50%) loopee sin saltos */}
        {Array.from({ length: REPEATS * 2 }).map((_, i) => (
          <span key={i}>{unit}</span>
        ))}
      </div>
    </div>
  );
}
