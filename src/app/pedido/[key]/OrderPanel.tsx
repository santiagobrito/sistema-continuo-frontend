"use client";

/**
 * Página del pedido para quien pagó (o va a pagar) por transferencia.
 *
 * Resuelve lo que antes no tenía solución: la pantalla de compra finalizada se
 * veía una sola vez, y el comprobante había que mandarlo por WhatsApp. Acá el
 * cliente vuelve cuando quiere, copia el CBU, sube el comprobante y ve en qué
 * estado está.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

interface OrderData {
  id: number;
  number: string;
  status: string;
  payment_method: string;
  total: number;
  first_name: string;
  items: Array<{ name: string; quantity: number; total: number }>;
  awaiting_payment: boolean;
  proof: { uploaded: boolean; uploaded_at: string | null; count: number; status: string };
  // (los archivos no se exponen acá a propósito: el comprobante solo lo ve administración)
  deadline: { hours: number; expires_at: string; expired: boolean } | null;
  bank: {
    bank: string; holder: string; cuit: string; cbu: string;
    alias: string; account: string; whatsapp: string;
  };
}

const money = (n: number) =>
  "$ " + Math.round(n).toLocaleString("es-AR", { maximumFractionDigits: 0 });

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Sin permiso de portapapeles el valor sigue visible para copiar a mano.
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <div className="min-w-0">
        <div className="text-xs text-gray-500">{label}</div>
        <div className="font-mono text-sm font-semibold text-gray-900 truncate">{value}</div>
      </div>
      <button
        type="button"
        onClick={copy}
        className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
      >
        {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}

/** Cuánto falta para que el pedido se cancele solo. */
function remaining(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "";
  const h = Math.floor(ms / 3_600_000);
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return d === 1 ? "1 día" : `${d} días`;
  }
  if (h >= 1) return h === 1 ? "1 hora" : `${h} horas`;
  return `${Math.max(1, Math.floor(ms / 60_000))} minutos`;
}

export function OrderPanel({ orderKey }: { orderKey: string }) {
  const [data, setData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [mpLoading, setMpLoading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/order-access/${orderKey}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo cargar");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar");
    } finally {
      setLoading(false);
    }
  }, [orderKey]);

  useEffect(() => { load(); }, [load]);

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploading(true);
    setUploadError("");
    try {
      const body = new FormData();
      files.slice(0, 3).forEach((f) => body.append("files", f));
      const res = await fetch(`/api/order-access/${orderKey}/proof`, { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo subir");
      setData(json);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "No se pudo subir");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function payWithMp() {
    setMpLoading(true);
    try {
      const res = await fetch(`/api/order-access/${orderKey}/pay-with-mp`, { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.initPoint) throw new Error(json.error || "No se pudo generar el pago");
      window.location.href = json.initPoint;
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "No se pudo generar el pago");
      setMpLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center text-gray-500">
        Cargando tu pedido…
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">No encontramos ese pedido</h1>
        <p className="text-gray-500 mb-6">
          Revisá que el enlace sea el del email. Si te sigue fallando, escribinos y lo buscamos.
        </p>
        <Link href="/" className="text-[#013d5a] font-semibold">Volver a la tienda</Link>
      </main>
    );
  }

  const paid = !data.awaiting_payment;
  const proofPending = data.proof.uploaded && data.proof.status !== "rejected";
  const isTransfer = data.payment_method === "transferencia";

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <div className="text-sm text-gray-500">Pedido</div>
        <h1 className="text-3xl font-bold text-gray-900">#{data.number}</h1>
      </div>

      {/* Estado */}
      {paid ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-5 mb-6">
          <div className="font-bold text-green-900 text-lg">Pago confirmado</div>
          <p className="text-sm text-green-800 mt-1">
            Ya estamos preparando tu pedido. Te avisamos por email cuando salga.
          </p>
        </div>
      ) : proofPending ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 mb-6">
          <div className="font-bold text-blue-900 text-lg">Comprobante recibido</div>
          <p className="text-sm text-blue-800 mt-1">
            Lo estamos verificando contra el movimiento bancario. Es a mano, así que puede tardar
            unas horas hábiles. Ya no hace falta que hagas nada, y tu pedido no se cancela mientras
            lo revisamos.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 mb-6">
          <div className="font-bold text-amber-900 text-lg">Esperando tu pago</div>
          <p className="text-sm text-amber-900 mt-1">
            Tu pedido ya tiene el stock y el precio tomados.
            {data.deadline && !data.deadline.expired && remaining(data.deadline.expires_at) && (
              <> Los guardamos <strong>{remaining(data.deadline.expires_at)}</strong> más; pasado ese plazo el pedido se cancela solo.</>
            )}
          </p>
        </div>
      )}

      {/* Items */}
      <div className="rounded-2xl border border-gray-200 p-5 mb-6">
        {data.items.map((it, i) => (
          <div key={i} className="flex justify-between gap-4 py-1.5 text-sm">
            <span className="text-gray-700">{it.name} <span className="text-gray-400">x{it.quantity}</span></span>
            <span className="text-gray-900 font-medium shrink-0">{money(it.total)}</span>
          </div>
        ))}
        <div className="flex justify-between border-t border-gray-100 mt-3 pt-3">
          <span className="font-bold text-gray-900">Total</span>
          <span className="font-bold text-[#013d5a] text-xl">{money(data.total)}</span>
        </div>
      </div>

      {!paid && isTransfer && (
        <>
          {/* Datos bancarios */}
          <div className="rounded-2xl border border-gray-200 p-5 mb-6">
            <h2 className="font-bold text-gray-900 mb-2">Transferí a esta cuenta</h2>
            <CopyRow label="CBU" value={data.bank.cbu} />
            <CopyRow label="Alias" value={data.bank.alias} />
            <CopyRow label="CUIT" value={data.bank.cuit} />
            <div className="pt-3 text-sm text-gray-600">
              {data.bank.holder} · {data.bank.bank}
            </div>
          </div>

          {/* Comprobante */}
          <div className="rounded-2xl border-2 border-[#013d5a] p-5 mb-6">
            <h2 className="font-bold text-gray-900 text-lg">
              {data.proof.uploaded ? "Tu comprobante" : "Pagá y subí el comprobante"}
            </h2>

            {/* Confirmación junto al botón, no arriba de la página. El primer
                comprobante real llegó dos veces con 10 segundos de diferencia:
                el cliente no vio que hubiera pasado nada y volvió a apretar. */}
            {data.proof.uploaded ? (
              <div className="mt-3 mb-4 rounded-xl bg-green-50 border border-green-200 p-4">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <div>
                    <p className="font-bold text-green-900">
                      Listo, recibimos tu comprobante
                    </p>
                    <p className="text-sm text-green-800 mt-0.5">
                      {data.proof.count === 1
                        ? "Nos llegó 1 archivo"
                        : `Nos llegaron ${data.proof.count} archivos`}
                      {data.proof.uploaded_at && ` a las ${new Date(data.proof.uploaded_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`}
                      . No hace falta que lo mandes de nuevo.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600 mt-1 mb-4">
                Sacale una foto o subí el PDF. Es lo que nos permite confirmar tu pedido.
              </p>
            )}

            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              multiple
              onChange={onFiles}
              disabled={uploading}
              className="hidden"
              id="proof-input"
            />
            <label
              htmlFor="proof-input"
              className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold cursor-pointer transition-colors ${
                uploading
                  ? "bg-gray-200 text-gray-500"
                  : data.proof.uploaded
                    ? "border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                    : "bg-[#013d5a] text-white hover:bg-[#012c42]"
              }`}
            >
              {uploading ? "Subiendo…" : data.proof.uploaded ? "Agregar otro archivo" : "Subir comprobante"}
            </label>

            {uploadError && <p className="text-sm text-red-600 mt-3">{uploadError}</p>}

            <p className="text-xs text-gray-500 mt-4">
              Imagen o PDF, hasta 8 MB. Subirlo no acredita el pago: lo verificamos a mano contra
              el movimiento bancario.
            </p>

            <a
              href={`https://wa.me/${data.bank.whatsapp}?text=${encodeURIComponent(
                `Hola! Te paso el comprobante de mi transferencia.\nPedido #${data.number}`,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm text-green-700 font-semibold mt-4"
            >
              ¿Preferís mandarlo por WhatsApp?
            </a>
          </div>

          {/* Cambio de medio de pago */}
          {!proofPending && (
            <div className="rounded-2xl border border-gray-200 p-5 mb-6">
              <h2 className="font-bold text-gray-900">¿Preferís pagar con tarjeta?</h2>
              <p className="text-sm text-gray-600 mt-1 mb-4">
                Podés pagar este mismo pedido con MercadoPago y se confirma al instante, sin
                comprobante.
              </p>
              <button
                type="button"
                onClick={payWithMp}
                disabled={mpLoading}
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold border-2 border-[#013d5a] text-[#013d5a] hover:bg-[#013d5a] hover:text-white transition-colors disabled:opacity-50"
              >
                {mpLoading ? "Generando el pago…" : "Pagar con MercadoPago"}
              </button>
            </div>
          )}
        </>
      )}

      <div className="text-center">
        <Link href="/" className="text-sm text-gray-500 hover:text-[#013d5a]">
          Volver a la tienda
        </Link>
      </div>
    </main>
  );
}
