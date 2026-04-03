"use client";

import { useState } from "react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error();
      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <p className="text-sm text-green-300 font-medium flex items-center gap-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
        Suscripto correctamente
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full md:w-auto">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tu@email.com"
        className="px-4 py-2.5 rounded-lg text-sm text-gray-900 bg-white/95 border-0 focus:outline-none focus:ring-2 focus:ring-white/30 w-full md:w-64"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
      >
        {status === "loading" ? "..." : "Suscribirme"}
      </button>
      {status === "error" && (
        <p className="text-xs text-red-300 self-center">Error, intenta de nuevo</p>
      )}
    </form>
  );
}
