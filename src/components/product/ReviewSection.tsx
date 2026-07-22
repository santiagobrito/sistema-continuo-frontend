"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import type { Review } from "@/lib/wordpress/types";

// review.date llega del backend como "YYYY-MM-DD HH:MM:SS" (comment_date WP).
// Tomamos solo Y-M-D para evitar drift de timezone entre server y cliente —
// para una reseña importa el día, no la hora.
function formatReviewDate(raw: string): string {
  const dateOnly = raw.split(" ")[0].split("T")[0];
  const [y, m, d] = dateOnly.split("-").map(Number);
  if (!y || !m || !d) return "";
  return new Date(y, m - 1, d).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const MAX_PHOTOS = 3;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Comprime/redimensiona la foto en el cliente antes de subirla (máx ~1400px, JPEG).
// Baja el peso de fotos de celular de varios MB a ~200-400KB. Si el navegador no
// puede decodificar el formato (p.ej. HEIC en Chrome desktop), devuelve null y el
// caller descarta el archivo con un aviso — en Safari iOS el HEIC sí decodifica.
async function compressPhoto(file: File, maxDim = 1400, quality = 0.82): Promise<File | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob) return null;
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    return null;
  }
}

// Avatar de reseña: foto propia / Google / Gravatar (cascada resuelta en backend).
// <img> plano a propósito: las fuentes viven en hosts distintos (googleusercontent,
// media WP, gravatar) y son 32px — no vale whitelistear remotePatterns ni optimizar.
// onError cae a la inicial (cubre el Gravatar default=404 cuando el email no tiene foto).
function ReviewAvatar({ src, name }: { src?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        width={32}
        height={32}
        loading="lazy"
        onError={() => setFailed(true)}
        className="w-8 h-8 rounded-full object-cover bg-gray-100 flex-shrink-0"
      />
    );
  }
  return (
    <div className="w-8 h-8 bg-[#013d5a]/10 rounded-full flex items-center justify-center text-xs font-bold text-[#013d5a] flex-shrink-0">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

interface Props {
  reviews: Review[];
  totalReviews: number;
  averageRating: number;
  productSlug: string;
}

export function ReviewSection({ reviews, totalReviews, averageRating, productSlug }: Props) {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ rating: 5, content: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [highlight, setHighlight] = useState(false);
  const [loginRedirect, setLoginRedirect] = useState("/iniciar-sesion");
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [processingPhotos, setProcessingPhotos] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const loginCtaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Liberar los object URLs de las previews al desmontar.
  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePhotosSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // permite re-seleccionar el mismo archivo
    if (!files.length) return;

    setProcessingPhotos(true);
    setError("");
    const room = MAX_PHOTOS - photos.length;
    const next: { file: File; preview: string }[] = [];
    let skipped = false;

    for (const raw of files) {
      if (next.length >= room) {
        skipped = true;
        break;
      }
      const compressed = await compressPhoto(raw);
      if (compressed && ALLOWED_PHOTO_TYPES.includes(compressed.type)) {
        next.push({ file: compressed, preview: URL.createObjectURL(compressed) });
      } else {
        skipped = true;
      }
    }

    if (next.length) setPhotos((prev) => [...prev, ...next]);
    if (skipped) {
      setError(
        photos.length + next.length >= MAX_PHOTOS
          ? `Podés subir hasta ${MAX_PHOTOS} fotos.`
          : "Alguna foto no se pudo procesar (formato no soportado).",
      );
    }
    setProcessingPhotos(false);
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  // Build login link with redirect al producto actual + ?review=1 para retomar flow post-login.
  useEffect(() => {
    const target = `${window.location.pathname}?review=1`;
    setLoginRedirect(`/iniciar-sesion?redirect=${encodeURIComponent(target)}`);
  }, []);

  // Desde email post-compra (?review=1): scroll + abrir form + focus + highlight.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("review") !== "1") return;

    if (user) {
      setShowForm(true);
    }

    const t = setTimeout(() => {
      const target = user ? formRef.current : loginCtaRef.current;
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlight(true);
      if (user) {
        textareaRef.current?.focus({ preventScroll: true });
      }
      setTimeout(() => setHighlight(false), 2400);
    }, 120);

    // Limpiar query param para que refrescos no re-disparen el efecto.
    const url = new URL(window.location.href);
    url.searchParams.delete("review");
    window.history.replaceState({}, "", url.toString());

    return () => clearTimeout(t);
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setError("");
    try {
      // multipart: no seteamos Content-Type, el browser arma el boundary.
      const payload = new FormData();
      payload.append("product_slug", productSlug);
      payload.append("rating", String(formData.rating));
      payload.append("content", formData.content);
      photos.forEach((p) => payload.append("photos", p.file, p.file.name));

      const res = await fetch(`/api/reviews`, {
        method: "POST",
        body: payload,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al enviar");
      } else {
        photos.forEach((p) => URL.revokeObjectURL(p.preview));
        setPhotos([]);
        setSubmitted(true);
      }
    } catch {
      setError("Error de conexion");
    }
    setSubmitting(false);
  }

  return (
    <div>
      {/* Summary */}
      {totalReviews > 0 && (
        <div className="flex items-center gap-6 mb-6 pb-6 border-b border-gray-100">
          <div className="text-center">
            <p className="text-4xl font-bold text-gray-900">{averageRating.toFixed(1)}</p>
            <div className="flex text-yellow-400 mt-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <svg key={s} className={`w-4 h-4 ${s <= Math.round(averageRating) ? "fill-current" : "text-gray-200 fill-current"}`} viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">{totalReviews} opiniones</p>
          </div>
        </div>
      )}

      {/* Reviews list */}
      {reviews.length > 0 ? (
        <div className="space-y-4 mb-6">
          {reviews.map((review) => (
            <div key={review.id} className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-3 min-w-0">
                  <ReviewAvatar src={review.avatar_url} name={review.author} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{review.author}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex text-yellow-400">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <svg key={s} className={`w-3 h-3 ${s <= review.rating ? "fill-current" : "text-gray-200 fill-current"}`} viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      {review.verified && <span className="text-[10px] text-green-600 font-medium">Compra verificada</span>}
                    </div>
                  </div>
                </div>
                {review.date && (
                  <time
                    dateTime={review.date}
                    className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0"
                  >
                    {formatReviewDate(review.date)}
                  </time>
                )}
              </div>
              <div className="text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: review.content }} />
              {review.images && review.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {review.images.map((img, i) => (
                    <button
                      key={img.full}
                      type="button"
                      onClick={() => setLightbox(img.full)}
                      className="cursor-zoom-in"
                      aria-label="Ver foto de la reseña"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.thumb}
                        alt={`Foto de ${review.author} ${i + 1}`}
                        loading="lazy"
                        className="w-20 h-20 rounded-lg object-cover border border-gray-200 hover:opacity-90 transition-opacity"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-sm mb-6">Aún no hay opiniones. Sé el primero en opinar.</p>
      )}

      {/* Review form */}
      {submitted ? (
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
          <p className="text-green-700 font-medium">Gracias por tu opinión. Será publicada luego de ser revisada.</p>
        </div>
      ) : !user ? (
        <div
          ref={loginCtaRef}
          className={`bg-gray-50 rounded-xl p-4 text-center transition-all duration-500 ${highlight ? "ring-4 ring-[#013d5a]/30 bg-[#013d5a]/5" : ""}`}
        >
          <p className="text-sm text-gray-600">
            <a href={loginRedirect} className="text-[#013d5a] font-semibold hover:underline">
              Iniciá sesión
            </a>{" "}
            para dejar tu opinión. Solo los compradores verificados pueden opinar.
          </p>
        </div>
      ) : showForm ? (
        <form
          onSubmit={handleSubmit}
          ref={formRef}
          className={`bg-gray-50 rounded-xl p-5 space-y-4 transition-all duration-500 ${highlight ? "ring-4 ring-[#013d5a]/30 bg-white" : ""}`}
        >
          <h4 className="font-semibold text-gray-900">Tu opinión como {user.name.split(" ")[0]}</h4>
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Puntuacion</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} type="button" onClick={() => setFormData(p => ({ ...p, rating: s }))} className="cursor-pointer">
                  <svg className={`w-7 h-7 ${s <= formData.rating ? "text-yellow-400 fill-current" : "text-gray-200 fill-current"}`} viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
          <textarea
            ref={textareaRef}
            required
            placeholder="Conta tu experiencia con el producto..."
            value={formData.content}
            onChange={(e) => setFormData(p => ({ ...p, content: e.target.value }))}
            rows={3}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#013d5a]"
          />

          {/* Fotos "así me quedó" — opcional, hasta 3 */}
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">
              Sumá una foto de cómo te quedó <span className="text-gray-400">(opcional)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {photos.map((p, i) => (
                <div key={p.preview} className="relative w-16 h-16">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.preview} alt={`Foto ${i + 1}`} className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    aria-label="Quitar foto"
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-900 text-white rounded-full text-xs leading-none flex items-center justify-center cursor-pointer hover:bg-black"
                  >
                    ×
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={processingPhotos}
                  className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 text-gray-400 flex items-center justify-center hover:border-[#013d5a] hover:text-[#013d5a] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {processingPhotos ? (
                    <span className="text-[10px]">...</span>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  )}
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotosSelected}
              className="hidden"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-600">{error}</div>
          )}
          <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-[#013d5a] text-white rounded-lg text-sm font-semibold hover:bg-[#01567a] transition-colors cursor-pointer disabled:opacity-50">
            {submitting ? "Enviando..." : "Enviar opinión"}
          </button>
        </form>
      ) : (
        <button onClick={() => setShowForm(true)} className="text-sm font-semibold text-[#013d5a] hover:underline cursor-pointer">
          Escribir una opinión
        </button>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="Foto de la reseña" className="max-w-full max-h-full rounded-lg object-contain" />
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label="Cerrar"
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full text-2xl leading-none flex items-center justify-center cursor-pointer"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
