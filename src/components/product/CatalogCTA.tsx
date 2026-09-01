"use client";

/**
 * CatalogCTA — embudo de cotización para productos de gran formato (is_catalog_only).
 *
 * Dos canales: WhatsApp (wa.me, target=_blank) y email (mailto:). Cada clic empuja
 * `quote_request` al dataLayer (ver trackQuoteRequest en lib/analytics/gtm.ts) antes
 * de que el navegador siga el enlace. Ninguno de los dos navega la página actual
 * (nueva pestaña / cliente de correo), así que el push simple no se pierde.
 * NO usar preventDefault: el enlace tiene que funcionar aunque GTM no cargue.
 */

import { trackQuoteRequest } from "@/lib/analytics/gtm";

interface CatalogCTAProps {
  productId: number;
  productName: string;
  productCategory?: string;
  productUrl: string;
  whatsapp: string;
  email: string;
}

export function CatalogCTA({ productId, productName, productCategory, productUrl, whatsapp, email }: CatalogCTAProps) {
  const message = encodeURIComponent(
    `Hola, estoy interesado en ${productName}. Me gustaría recibir una cotización. ${productUrl}`
  );

  const track = (channel: "whatsapp" | "email") => () =>
    trackQuoteRequest({
      channel,
      item_id: String(productId),
      item_name: productName,
      item_category: productCategory,
    });

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-[#013d5a] rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-[#013d5a] text-lg">Equipo de gran formato</h3>
            <p className="text-sm text-gray-600 mt-1 leading-relaxed">
              Este equipo requiere una cotización personalizada. Por sus características
              de tamaño y configuración, nuestro equipo de ejecutivos te asesora para
              encontrar la mejor solución para tu negocio, incluyendo instalación,
              capacitación y soporte técnico.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            href={`https://wa.me/${whatsapp}?text=${message}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={track("whatsapp")}
            className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-3.5 rounded-xl font-semibold text-sm transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
            Hablar con un ejecutivo
          </a>
          <a
            href={`mailto:${email}?subject=Cotización: ${encodeURIComponent(productName)}&body=${encodeURIComponent(`Hola, me interesa recibir cotización por: ${productName}\n\n${productUrl}`)}`}
            onClick={track("email")}
            className="flex items-center justify-center gap-2 bg-white border border-[#013d5a]/20 text-[#013d5a] py-3.5 rounded-xl font-semibold text-sm hover:bg-[#013d5a]/5 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
            Solicitar cotización por email
          </a>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-white rounded-xl border border-gray-100 p-3">
          <p className="text-xs font-semibold text-gray-900">Asesoramiento</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Técnico especializado</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-3">
          <p className="text-xs font-semibold text-gray-900">Instalación</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Opcional con capacitación</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-3">
          <p className="text-xs font-semibold text-gray-900">Financiación</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Planes a medida</p>
        </div>
      </div>
    </div>
  );
}
