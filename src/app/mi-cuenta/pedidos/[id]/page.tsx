"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatPrice } from "@/lib/utils/format";

interface WcOrder {
  id: number;
  number: string;
  status: string;
  date_created: string;
  total: string;
  line_items: Array<{ id: number; name: string; quantity: number; total: string }>;
  billing: Record<string, string>;
  shipping: Record<string, string>;
  shipping_lines?: Array<{ method_title: string; total: string }>;
  meta_data?: Array<{ key: string; value: string }>;
}

interface TrackingEvent {
  status: string;
  date: string;
  facility: string;
}

interface TrackingBundle {
  trackingNumber: string;
  event: TrackingEvent[];
}

function getMeta(order: WcOrder | null, key: string): string | undefined {
  return order?.meta_data?.find((m) => m.key === key)?.value;
}

export default function PedidoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [order, setOrder] = useState<WcOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tracking, setTracking] = useState<TrackingBundle[] | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push("/iniciar-sesion");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetch(`/api/auth/orders/${id}`)
      .then(async (r) => {
        if (!r.ok) {
          setError(r.status === 404 ? "Pedido no encontrado" : "No se pudo cargar el pedido");
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d?.order) setOrder(d.order);
      })
      .finally(() => setLoading(false));
  }, [user, id]);

  // Si la order tiene trackings PAQ.AR, cargar timeline.
  useEffect(() => {
    if (!order) return;
    const raw = getMeta(order, "_sc_paqar_trackings");
    if (!raw) return;

    try {
      const parsed: Array<{ trackingNumber: string }> = JSON.parse(raw);
      const tns = parsed.map((t) => t.trackingNumber).filter(Boolean);
      if (tns.length === 0) return;

      setTrackingLoading(true);
      fetch("/api/paqar/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingNumbers: tns }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.ok) setTracking(d.tracking);
        })
        .finally(() => setTrackingLoading(false));
    } catch {
      // meta con JSON inválido — ignorar
    }
  }, [order]);

  if (authLoading || !user || loading) {
    return (
      <main className="bg-gray-50 min-h-screen flex items-center justify-center">
        <svg className="w-8 h-8 text-[#013d5a] animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">{error || "Pedido no encontrado"}</p>
          <Link href="/mi-cuenta" className="text-[#013d5a] font-semibold hover:underline">
            Volver a mis pedidos
          </Link>
        </div>
      </main>
    );
  }

  const paqarAgency = getMeta(order, "_sc_paqar_agency_id");

  return (
    <main className="bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/mi-cuenta" className="text-sm text-gray-500 hover:text-[#013d5a] mb-4 inline-block">
          ← Mis pedidos
        </Link>

        <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Pedido #{order.number}</h1>
              <p className="text-sm text-gray-500">
                {new Date(order.date_created).toLocaleString("es-AR")}
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
              {order.status}
            </span>
          </div>

          <div className="divide-y divide-gray-50 border-t border-b border-gray-100">
            {order.line_items.map((li) => (
              <div key={li.id} className="flex justify-between py-2.5 text-sm">
                <span className="text-gray-700">
                  {li.quantity} × {li.name}
                </span>
                <span className="font-semibold text-gray-900">{formatPrice(Number(li.total) * 100)}</span>
              </div>
            ))}
          </div>

          {order.shipping_lines?.[0] && (
            <div className="flex justify-between mt-3 text-sm">
              <span className="text-gray-500">Envío — {order.shipping_lines[0].method_title}</span>
              <span className="text-gray-900">{formatPrice(Number(order.shipping_lines[0].total) * 100)}</span>
            </div>
          )}

          <div className="flex justify-between mt-3 pt-3 border-t border-gray-100 font-bold">
            <span>Total</span>
            <span>{formatPrice(Number(order.total) * 100)}</span>
          </div>
        </div>

        {/* Tracking PAQ.AR */}
        {tracking && tracking.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Seguimiento — Correo Argentino
              {tracking.length > 1 && <span className="text-sm font-normal text-gray-500 ml-2">{tracking.length} bultos</span>}
            </h2>

            {paqarAgency && (
              <p className="text-xs text-gray-500 mb-4">
                Envío a sucursal — ID {paqarAgency}
              </p>
            )}

            <div className="space-y-5">
              {tracking.map((bundle, idx) => (
                <div key={bundle.trackingNumber}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-900">
                      {tracking.length > 1 ? `Bulto ${idx + 1}` : "Tu envío"}
                    </p>
                    <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                      {bundle.trackingNumber}
                    </code>
                  </div>

                  {bundle.event.length === 0 ? (
                    <p className="text-xs text-gray-400 pl-4">Sin movimientos registrados todavía.</p>
                  ) : (
                    <ol className="relative border-l-2 border-gray-100 ml-2">
                      {bundle.event.map((ev, i) => (
                        <li key={i} className="ml-4 pb-3">
                          <span className={`absolute -left-1.5 w-3 h-3 rounded-full ${i === 0 ? "bg-[#013d5a]" : "bg-gray-300"}`}></span>
                          <p className={`text-xs font-semibold ${i === 0 ? "text-[#013d5a]" : "text-gray-700"}`}>{ev.status}</p>
                          <p className="text-[11px] text-gray-500">{ev.facility}</p>
                          <p className="text-[10px] text-gray-400">{ev.date}</p>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {trackingLoading && (
          <p className="text-center text-sm text-gray-400 py-4">Consultando estado del envío…</p>
        )}

        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-bold text-gray-900 mb-3">Datos de envío</h2>
          <p className="text-sm text-gray-700">
            {order.shipping.first_name} {order.shipping.last_name}
          </p>
          {order.shipping.address_1 && (
            <p className="text-sm text-gray-600">{order.shipping.address_1}</p>
          )}
          <p className="text-sm text-gray-600">
            {order.shipping.city} {order.shipping.postcode && `(${order.shipping.postcode})`}
          </p>
        </div>
      </div>
    </main>
  );
}
