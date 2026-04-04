"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import type { Review } from "@/lib/wordpress/types";

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_slug: productSlug,
          rating: formData.rating,
          content: formData.content,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al enviar");
      } else {
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
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-[#013d5a]/10 rounded-full flex items-center justify-center text-xs font-bold text-[#013d5a]">
                  {review.author.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{review.author}</p>
                  <div className="flex items-center gap-2">
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
              <div className="text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: review.content }} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-sm mb-6">Aun no hay opiniones. Se el primero en opinar.</p>
      )}

      {/* Review form */}
      {submitted ? (
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
          <p className="text-green-700 font-medium">Gracias por tu opinion. Sera publicada luego de ser revisada.</p>
        </div>
      ) : !user ? (
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-600">
            <a href="/iniciar-sesion" className="text-[#013d5a] font-semibold hover:underline">Inicia sesion</a> para dejar tu opinion.
            Solo los compradores verificados pueden opinar.
          </p>
        </div>
      ) : showForm ? (
        <form onSubmit={handleSubmit} className="bg-gray-50 rounded-xl p-5 space-y-4">
          <h4 className="font-semibold text-gray-900">Tu opinion como {user.name.split(" ")[0]}</h4>
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
          <textarea required placeholder="Conta tu experiencia con el producto..." value={formData.content} onChange={(e) => setFormData(p => ({ ...p, content: e.target.value }))} rows={3} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#013d5a]" />
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-600">{error}</div>
          )}
          <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-[#013d5a] text-white rounded-lg text-sm font-semibold hover:bg-[#01567a] transition-colors cursor-pointer disabled:opacity-50">
            {submitting ? "Enviando..." : "Enviar opinion"}
          </button>
        </form>
      ) : (
        <button onClick={() => setShowForm(true)} className="text-sm font-semibold text-[#013d5a] hover:underline cursor-pointer">
          Escribir una opinion
        </button>
      )}
    </div>
  );
}
