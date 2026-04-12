"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await register(form);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push("/mi-cuenta");
    }
  }

  function handleGoogleSuccess({ isNew }: { user: { id: number; email: string; name: string }; isNew: boolean }) {
    if (isNew) {
      window.location.href = "/mi-cuenta/perfil?bienvenida=1";
    } else {
      window.location.href = "/mi-cuenta";
    }
  }

  const inputClass = "w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#013d5a] focus:ring-2 focus:ring-[#013d5a]/10";

  return (
    <main className="bg-gray-50 min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-gray-100 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Crear cuenta</h1>
          <p className="text-sm text-gray-500 mb-6">Registrate para seguir tus pedidos y comprar más rápido.</p>

          {/* Google Sign-In */}
          <GoogleLoginButton
            onSuccess={handleGoogleSuccess}
            onError={(err) => setError(err)}
          />

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-gray-400">o con email</span></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <input required placeholder="Nombre *" value={form.first_name} onChange={(e) => setForm(f => ({ ...f, first_name: e.target.value }))} className={inputClass} />
              <input required placeholder="Apellido *" value={form.last_name} onChange={(e) => setForm(f => ({ ...f, last_name: e.target.value }))} className={inputClass} />
            </div>
            <input required type="email" placeholder="Email *" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} className={inputClass} />
            <input type="password" placeholder="Contrasena (opcional)" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} className={inputClass} />
            <p className="text-xs text-gray-400">Si no pones contrasena, podras acceder con tu email.</p>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-600">{error}</div>
            )}

            <button type="submit" disabled={loading} className="w-full bg-[#013d5a] text-white py-3.5 rounded-xl font-semibold hover:bg-[#01567a] transition-colors cursor-pointer disabled:opacity-50">
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              ¿Ya tenés cuenta?{" "}
              <Link href="/iniciar-sesion" className="text-[#013d5a] font-semibold hover:underline cursor-pointer">Iniciar sesión</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
