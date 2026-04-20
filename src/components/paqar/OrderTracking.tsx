"use client";

/**
 * Componente para mostrar el tracking de un pedido en /mi-cuenta/pedidos/[id].
 *
 * Uso:
 *   <OrderTracking trackingNumbers={["TN1","TN2","TN3"]} />
 *
 * Llama a /api/paqar/tracking (POST) y muestra timeline por bulto.
 */

import { useEffect, useState } from "react";
import type { PaqarTrackingResponse } from "@/lib/paqar/types";

interface Props {
  trackingNumbers: string[];
}

export function OrderTracking({ trackingNumbers }: Props) {
  const [tracking, setTracking] = useState<PaqarTrackingResponse[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!trackingNumbers || trackingNumbers.length === 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/paqar/tracking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trackingNumbers }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || "error");
        setTracking(data.tracking);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [trackingNumbers]);

  if (!trackingNumbers || trackingNumbers.length === 0) return null;

  if (loading) {
    return <div className="text-sm text-gray-500">Cargando estado del envío...</div>;
  }

  if (error) {
    return (
      <div className="text-sm text-red-600">
        No pudimos consultar el estado del envío. Tus códigos de seguimiento son:{" "}
        {trackingNumbers.join(", ")}.
      </div>
    );
  }

  if (!tracking) return null;

  return (
    <div className="space-y-6">
      {trackingNumbers.length > 1 && (
        <p className="text-sm text-gray-700">
          Tu pedido viaja en <strong>{trackingNumbers.length} cajas</strong>.
          Cada una tiene su propio seguimiento.
        </p>
      )}

      {tracking.map((t, idx) => (
        <div key={t.trackingNumber} className="rounded-lg border border-gray-200 p-4">
          <header className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500">
                Caja {idx + 1} de {tracking.length}
              </div>
              <div className="font-mono text-sm">{t.trackingNumber}</div>
            </div>
            <a
              href={`https://www.correoargentino.com.ar/formularios/e-commerce?trackingNumber=${t.trackingNumber}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-600 hover:underline"
            >
              Ver en Correo Argentino →
            </a>
          </header>

          {t.event && t.event.length > 0 ? (
            <ol className="relative border-l border-gray-200 pl-4">
              {t.event.map((ev, i) => (
                <li key={i} className="mb-3 last:mb-0">
                  <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-blue-500" />
                  <div className="text-sm font-medium">{ev.status}</div>
                  <div className="text-xs text-gray-500">
                    {ev.facility} — {ev.date}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="text-sm text-gray-500">Sin movimientos todavía.</div>
          )}
        </div>
      ))}
    </div>
  );
}
