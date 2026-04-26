"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@tempero.com");
  const [password, setPassword] = useState("admin123456");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      router.push("/admin");
    } catch (e: any) {
      setError(e?.message ?? "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-[var(--font-playfair)] text-3xl">Login Admin</h1>
      <div className="mt-6 rounded-2xl border border-border bg-card shadow-soft p-6">
        <div className="space-y-3">
          <input
            className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            placeholder="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error ? <div className="text-sm text-red-600">{error}</div> : null}
          <button
            type="button"
            className="w-full rounded-xl bg-primary text-primaryFg px-5 py-3 text-sm font-medium shadow-soft transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-card active:translate-y-0 disabled:opacity-60"
            onClick={submit}
            disabled={loading}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </div>
      </div>
    </div>
  );
}

