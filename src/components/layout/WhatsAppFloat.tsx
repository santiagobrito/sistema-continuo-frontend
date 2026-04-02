"use client";

import { useState } from "react";

const WA_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "5491130793862";

export function WhatsAppFloat() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2">
      {/* Tooltip */}
      {expanded && (
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 w-72 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Sistema Continuo</p>
              <p className="text-xs text-green-600">En linea</p>
            </div>
            <button onClick={() => setExpanded(false)} className="ml-auto p-1 text-gray-400 hover:text-gray-600 cursor-pointer">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-4">Hola! En que podemos ayudarte? Escribinos por WhatsApp.</p>
          <a
            href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Hola, tengo una consulta sobre productos de Sistema Continuo")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold text-sm transition-colors cursor-pointer"
          >
            Iniciar conversacion
          </a>
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
        aria-label="WhatsApp"
      >
        {expanded ? (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        ) : (
          <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492l4.626-1.467A11.932 11.932 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.82a9.828 9.828 0 01-5.01-1.37l-.36-.214-3.729 1.183 1.204-3.593-.235-.374A9.82 9.82 0 012.18 12 9.82 9.82 0 0112 2.18 9.82 9.82 0 0121.82 12 9.82 9.82 0 0112 21.82z"/></svg>
        )}
      </button>
    </div>
  );
}
