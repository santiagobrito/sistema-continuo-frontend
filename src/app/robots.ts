import type { MetadataRoute } from "next";

/**
 * robots.txt propio.
 *
 * Hasta el 2026-08-24 esta ruta la servía el "managed robots.txt" de Cloudflare,
 * que venía activado por defecto y declaraba `ai-train=no` más un `Disallow: /`
 * para GPTBot, ClaudeBot, Google-Extended, meta-externalagent, Amazonbot,
 * Applebot-Extended, Bytespider, CCBot y PerplexityBot. Nadie tomó esa decisión:
 * la queremos al revés, que los asistentes de IA puedan leer y citar el
 * catálogo. Al desactivarlo en Cloudflare esta ruta pasa a servirse desde acá.
 *
 * Lo único que se bloquea son rutas sin valor de búsqueda: acciones de carrito,
 * el área privada de la cuenta y los feeds RSS heredados del WordPress viejo
 * (316 URLs `/{ruta}/feed/` que Google rastrea a diario y nunca indexa).
 *
 * OJO: no bloquear `/api/`. De ahí cuelga `/api/feeds/google-shopping`, que es
 * lo que Merchant Center descarga; un Disallow ahí corta la ingesta del feed.
 */
export default function robots(): MetadataRoute.Robots {
  // Dominio fijo a propósito, no `NEXT_PUBLIC_SITE_URL`: esta ruta se resuelve en
  // build time y en el entorno de desarrollo esa variable vale
  // `nueva.sistemacontinuo.com.ar`, o sea el robots.txt de producción podría
  // anunciar el sitemap de un host que no es el canónico sin que fallara nada.
  const siteUrl = "https://sistemacontinuo.com.ar";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // Acciones, no páginas: las emitía WooCommerce y siguen rastreándose.
          "/*?add-to-cart=",
          "/*?wc-ajax=",
          "/*?remove_item=",
          // Feeds RSS del WordPress viejo.
          "/feed/",
          "/*/feed/",
          // Área privada y pasos de compra.
          "/carrito",
          "/checkout",
          "/mi-cuenta",
          "/pedido-confirmado",
          "/recuperar-carrito",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
