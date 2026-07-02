"use client";

import { useState, useEffect, useCallback } from "react";

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || "";

interface Metric {
  value: number;
  prev: number;
  delta_pct: number | null;
}
interface Split {
  key: string;
  label?: string;
  orders: number;
  revenue: number;
  pct: number;
  shipping_charged?: number;
}
interface TopOrder {
  id: number;
  total: number;
  date: string;
  customer: string;
  channel: string;
  payment: string;
}
interface Kpis {
  period: { after: string; before: string; tz: string };
  business: {
    revenue: Metric;
    orders_paid: Metric;
    orders_created: Metric;
    aov: Metric;
    pending: { value: number; count: number };
  };
  channels: Split[];
  payments: Split[];
  mp_net_total: number;
  customers: { new: number; returning: number; new_revenue: number; new_pct: number };
  logistics: Split[];
  top_orders: TopOrder[];
  reviews: { count: number; prev: number; delta_pct: number | null; avg_rating: number | null };
  currency: string;
  generated_at: string;
}

const ARS = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const NUM = new Intl.NumberFormat("es-AR");

function fmtMoney(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toLocaleString("es-AR", { maximumFractionDigits: 2 })}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toLocaleString("es-AR", { maximumFractionDigits: 0 })}K`;
  return ARS.format(n);
}

const CHANNEL_COLORS: Record<string, string> = {
  "Google Ads": "bg-blue-500",
  "Orgánico": "bg-emerald-500",
  "Meta": "bg-indigo-500",
  "Directo": "bg-gray-400",
  "Referidos": "bg-amber-500",
  "Email": "bg-pink-500",
  "Otros": "bg-slate-300",
};

function Delta({ pct, invert = false }: { pct: number | null; invert?: boolean }) {
  if (pct === null || pct === undefined) return <span className="text-xs text-gray-400">— sin base</span>;
  const good = invert ? pct < 0 : pct > 0;
  const neutral = pct === 0;
  const color = neutral ? "text-gray-400" : good ? "text-emerald-600" : "text-red-500";
  const arrow = neutral ? "→" : pct > 0 ? "↑" : "↓";
  return (
    <span className={`text-xs font-semibold ${color}`}>
      {arrow} {Math.abs(pct).toLocaleString("es-AR", { maximumFractionDigits: 1 })}% <span className="text-gray-400 font-normal">vs mes ant.</span>
    </span>
  );
}

function KpiCard({ title, value, delta, sub, invert }: { title: string; value: string; delta?: Metric; sub?: string; invert?: boolean }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1.5">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      {delta && <div className="mt-2"><Delta pct={delta.delta_pct} invert={invert} /></div>}
    </div>
  );
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
function pad(n: number): string {
  return String(n).padStart(2, "0");
}
// Para el mes en curso limitamos "before" a mañana → el período anterior queda
// como el mismo tramo del mes pasado (mes-a-la-fecha vs mes-a-la-fecha), no un
// mes completo contra uno parcial (que daría flechas rojas engañosas).
function monthBounds(ym: string): { after: string; before: string; partial: boolean } {
  const [y, m] = ym.split("-").map(Number);
  const after = `${y}-${pad(m)}-01`;
  const nextM = m === 12 ? 1 : m + 1;
  const nextY = m === 12 ? y + 1 : y;
  const monthEnd = `${nextY}-${pad(nextM)}-01`;

  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;

  const partial = ym === currentMonth();
  const before = partial && tomorrowStr < monthEnd ? tomorrowStr : monthEnd;
  return { after, before, partial };
}

export default function ExecutiveDashboard() {
  const [apiKey, setApiKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<Kpis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [partial, setPartial] = useState(false);

  const fetchData = useCallback(async () => {
    if (!apiKey) return;
    setLoading(true);
    setError("");
    try {
      const { after, before, partial: isPartial } = monthBounds(month);
      setPartial(isPartial);
      const params = new URLSearchParams({ after, before });
      const res = await fetch(`${WP_URL}/wp-json/sistema-continuo/v1/dashboard/kpis?${params}`, {
        headers: { Authorization: `Basic ${btoa(apiKey)}` },
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setError("Acceso denegado. Verificá las credenciales.");
          setAuthenticated(false);
        } else {
          setError(`Error ${res.status}`);
        }
        return;
      }
      setData(await res.json());
      setAuthenticated(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de conexión");
    } finally {
      setLoading(false);
    }
  }, [apiKey, month]);

  useEffect(() => {
    if (authenticated) fetchData();
  }, [fetchData, authenticated]);

  if (!authenticated) {
    return (
      <main className="bg-gray-50 min-h-screen">
        <div className="max-w-md mx-auto px-4 py-20">
          <div className="bg-white rounded-2xl border border-gray-100 p-8">
            <h1 className="text-xl font-bold text-gray-900 mb-2">Panel del negocio</h1>
            <p className="text-sm text-gray-500 mb-6">Ingresá credenciales de admin de WordPress (usuario:AppPassword).</p>
            <form onSubmit={(e) => { e.preventDefault(); setAuthenticated(true); }}>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="scadmin:Xjaq oYjh..."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm mb-4 focus:outline-none focus:border-[#013d5a]"
              />
              {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
              <button type="submit" className="w-full bg-[#013d5a] text-white py-3 rounded-xl font-semibold hover:bg-[#01567a] transition-colors cursor-pointer">
                Acceder
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  const b = data?.business;
  const maxChannel = Math.max(1, ...(data?.channels || []).map((c) => c.revenue));

  return (
    <main className="bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Panel del negocio</h1>
            <p className="text-gray-500 text-sm mt-1">
              Sistema Continuo · lo que mueve la web · comparado contra el mes anterior
              {partial && <span className="ml-2 text-amber-600 font-medium">· mes en curso (a la fecha)</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={month}
              max={currentMonth()}
              onChange={(e) => setMonth(e.target.value)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#013d5a]"
            />
            <button onClick={fetchData} disabled={loading} className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:border-[#013d5a] cursor-pointer disabled:opacity-50">
              {loading ? "Cargando..." : "Actualizar"}
            </button>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm mb-6">{error}</p>}

        {b && (
          <>
            {/* 1. NEGOCIO */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <KpiCard title="Facturación (pagado)" value={fmtMoney(b.revenue.value)} delta={b.revenue} />
              <KpiCard title="Pedidos pagados" value={NUM.format(b.orders_paid.value)} delta={b.orders_paid} sub={`${NUM.format(b.orders_created.value)} pedidos creados`} />
              <KpiCard title="Ticket promedio" value={fmtMoney(b.aov.value)} delta={b.aov} />
              <KpiCard title="Pendiente de pago" value={fmtMoney(b.pending.value)} sub={`${NUM.format(b.pending.count)} pedidos · capital sin cerrar`} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              {/* 2. ORIGEN DE LA VENTA */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="font-bold text-gray-900 mb-1">Origen de la venta</h2>
                <p className="text-xs text-gray-400 mb-4">Cómo llegó cada pedido pagado. La suma da la facturación real (registro propio de la web, no de Google/Meta).</p>
                <div className="space-y-3">
                  {data.channels.map((c) => (
                    <div key={c.key}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{c.key}</span>
                        <span className="text-gray-500">{fmtMoney(c.revenue)} · {c.pct}% · {c.orders} ped.</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5">
                        <div className={`h-2.5 rounded-full ${CHANNEL_COLORS[c.key] || "bg-slate-300"}`} style={{ width: `${Math.max(2, (c.revenue / maxChannel) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                  {data.channels.length === 0 && <p className="text-sm text-gray-400">Sin datos en el período.</p>}
                </div>
              </div>

              {/* 3. PAGOS */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="font-bold text-gray-900 mb-1">Medios de pago</h2>
                <p className="text-xs text-gray-400 mb-4">Neto MP (post-comisión): <span className="font-semibold text-gray-600">{fmtMoney(data.mp_net_total)}</span></p>
                <div className="space-y-3">
                  {data.payments.map((pm) => (
                    <div key={pm.key} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{pm.label || pm.key}</span>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{pm.pct}%</p>
                        <p className="text-xs text-gray-400">{fmtMoney(pm.revenue)} · {pm.orders}</p>
                      </div>
                    </div>
                  ))}
                  {data.payments.length === 0 && <p className="text-sm text-gray-400">Sin datos.</p>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              {/* 4. CLIENTES */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="font-bold text-gray-900 mb-4">Clientes</h2>
                <div className="flex items-end gap-6">
                  <div>
                    <p className="text-3xl font-bold text-[#013d5a]">{NUM.format(data.customers.new)}</p>
                    <p className="text-xs text-gray-500 mt-1">Nuevos (1ª compra)</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-gray-700">{NUM.format(data.customers.returning)}</p>
                    <p className="text-xs text-gray-500 mt-1">Recurrentes</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-4">
                  {data.customers.new_pct}% de la facturación vino de clientes nuevos ({fmtMoney(data.customers.new_revenue)})
                </p>
              </div>

              {/* 6. REVIEWS */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="font-bold text-gray-900 mb-4">Valoraciones nuevas</h2>
                <p className="text-3xl font-bold text-gray-900">{NUM.format(data.reviews.count)}</p>
                <div className="mt-2"><Delta pct={data.reviews.delta_pct} /></div>
                {data.reviews.avg_rating !== null && (
                  <p className="text-xs text-gray-400 mt-3">Rating promedio del mes: <span className="font-semibold text-amber-500">★ {data.reviews.avg_rating}</span></p>
                )}
              </div>

              {/* 5. LOGÍSTICA */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="font-bold text-gray-900 mb-1">Logística</h2>
                <p className="text-xs text-gray-400 mb-3">Despachos y envío cobrado por canal.</p>
                <div className="space-y-2">
                  {data.logistics.map((l) => (
                    <div key={l.key} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{l.key}</span>
                      <span className="text-gray-500">{l.orders} ped. · {fmtMoney(l.shipping_charged || 0)}</span>
                    </div>
                  ))}
                  {data.logistics.length === 0 && <p className="text-sm text-gray-400">Sin datos.</p>}
                </div>
              </div>
            </div>

            {/* TOP PEDIDOS */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-8">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900">Pedidos más grandes con pago</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50 text-left text-gray-600">
                      <th className="px-6 py-3 font-semibold">Pedido</th>
                      <th className="px-6 py-3 font-semibold">Cliente</th>
                      <th className="px-6 py-3 font-semibold hidden md:table-cell">Origen</th>
                      <th className="px-6 py-3 font-semibold hidden md:table-cell">Pago</th>
                      <th className="px-6 py-3 font-semibold text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.top_orders.map((o) => (
                      <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-6 py-3 font-medium text-gray-900">
                          <a href={`${WP_URL}/wp-admin/admin.php?page=wc-orders&action=edit&id=${o.id}`} target="_blank" rel="noopener noreferrer" className="hover:text-[#013d5a] cursor-pointer">#{o.id}</a>
                        </td>
                        <td className="px-6 py-3 text-gray-700">{o.customer}</td>
                        <td className="px-6 py-3 hidden md:table-cell"><span className="text-xs text-gray-500">{o.channel}</span></td>
                        <td className="px-6 py-3 hidden md:table-cell"><span className="text-xs text-gray-500 capitalize">{o.payment}</span></td>
                        <td className="px-6 py-3 text-right font-semibold text-gray-900">{ARS.format(o.total)}</td>
                      </tr>
                    ))}
                    {data.top_orders.length === 0 && (
                      <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">Sin pedidos pagados en el período.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-xs text-gray-400 text-center">
              Actualizado {data.generated_at ? new Date(data.generated_at).toLocaleString("es-AR") : "—"} · valores en ARS · &quot;pagado&quot; = pago confirmado (processing → completed)
            </p>
          </>
        )}

        {loading && !data && (
          <div className="text-center py-20">
            <svg className="w-8 h-8 text-[#013d5a] animate-spin mx-auto mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-gray-500">Cargando KPIs...</p>
          </div>
        )}
      </div>
    </main>
  );
}
