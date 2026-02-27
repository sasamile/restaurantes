"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const authLogin = useMutation(api.auth.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const user = await authLogin({ email, password });
      login({
        _id: user._id,
        name: user.name,
        email: user.email,
        isSuperadmin: user.isSuperadmin,
      });
      if (user.isSuperadmin) {
        router.push("/superadmin");
      } else {
        router.push("/tenants");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50">
        <div className="mb-8 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-red-600 text-xl font-bold text-white shadow-lg shadow-red-600/30">
            R
          </span>
          <h1 className="mt-4 text-2xl font-semibold text-slate-800">
            Restaurantes SaaS
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Inicia sesión para acceder a tu panel.
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-800 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              placeholder="tu@ejemplo.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-800 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-red-600/25 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          SaaS Restaurantes — Un solo login para superadmin y administradores.
        </p>
      </div>
    </div>
  );
}
