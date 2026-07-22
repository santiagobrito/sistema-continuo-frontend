"use client";

import { useEffect, useRef, useState } from "react";
import { compressPhoto, ALLOWED_PHOTO_TYPES, MAX_PHOTOS } from "@/lib/image/compress";

interface Uploaded {
  id: number;
  thumb: string;
}

export function PhotoUpload({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [productName, setProductName] = useState("");
  const [uploaded, setUploaded] = useState<Uploaded[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Carga inicial: valida el token y trae lo ya subido.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/review-photo/${token}`, { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok) {
          setValid(true);
          setProductName(data.product_name || "");
          setUploaded(data.images || []);
        } else {
          setError(data.error || "El código expiró. Volvé a escanear desde la compu.");
        }
      } catch {
        if (!cancelled) setError("Error de conexión.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;

    setError("");
    setUploading(true);
    const room = MAX_PHOTOS - uploaded.length;
    const payload = new FormData();
    let n = 0;
    for (const raw of files) {
      if (n >= room) break;
      const compressed = await compressPhoto(raw);
      if (compressed && ALLOWED_PHOTO_TYPES.includes(compressed.type)) {
        payload.append("photos", compressed, compressed.name);
        n++;
      }
    }

    if (n === 0) {
      setError("No pudimos procesar la foto. Probá con otra.");
      setUploading(false);
      return;
    }

    try {
      const res = await fetch(`/api/review-photo/${token}`, { method: "POST", body: payload });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo subir.");
      } else {
        // Refrescar la lista real desde el server.
        const refreshed = await fetch(`/api/review-photo/${token}`, { cache: "no-store" });
        const rd = await refreshed.json();
        if (refreshed.ok) setUploaded(rd.images || []);
      }
    } catch {
      setError("Error de conexión.");
    }
    setUploading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-2xl font-bold text-[#013d5a]">Sistema Continuo</div>
          <p className="text-sm text-gray-500 mt-1">Foto para tu reseña</p>
        </div>

        {loading ? (
          <p className="text-center text-gray-500">Cargando…</p>
        ) : !valid ? (
          <div className="bg-white rounded-2xl p-6 text-center border border-gray-100">
            <p className="text-gray-700">{error}</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-6 border border-gray-100 space-y-5">
            {productName && (
              <p className="text-center text-gray-700">
                Mostranos cómo te quedó <strong>{productName}</strong>
              </p>
            )}

            {uploaded.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                {uploaded.map((u) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={u.id}
                    src={u.thumb}
                    alt="Foto subida"
                    className="w-24 h-24 rounded-lg object-cover border border-gray-200"
                  />
                ))}
              </div>
            )}

            {uploaded.length > 0 && (
              <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                <p className="text-green-700 text-sm font-medium">
                  ¡Listo! Ya aparece en tu reseña en la computadora.
                </p>
                <p className="text-green-600 text-xs mt-1">
                  Podés cerrar esta pantalla y terminar de escribir la reseña ahí.
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-600 text-center">
                {error}
              </div>
            )}

            {uploaded.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="w-full py-4 bg-[#013d5a] text-white rounded-xl font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {uploading ? (
                  "Subiendo…"
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                    </svg>
                    {uploaded.length === 0 ? "Sacar o elegir foto" : "Sumar otra foto"}
                  </>
                )}
              </button>
            )}

            <p className="text-center text-xs text-gray-400">
              {uploaded.length}/{MAX_PHOTOS} fotos · se ven después de que aprobemos la reseña
            </p>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={handleSelect}
          className="hidden"
        />
      </div>
    </div>
  );
}
