"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatBRL } from "@/lib/format";

type Product = {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  promoPriceCents: number | null;
  stock: number;
  isActive: boolean;
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    priceCents: 0,
    promoPriceCents: null as number | null,
    stock: 0,
    benefitsText: "Aroma intenso\nSeleção premium",
    imagesText: "",
    variantsText: ""
  });

  async function refresh() {
    setLoading(true);
    try {
      const res = await apiFetch<any[]>("/api/admin/products");
      setProducts(res);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, []);

  const previewPrice = useMemo(() => formatBRL(form.priceCents), [form.priceCents]);

  async function create() {
    const benefits = form.benefitsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const images = form.imagesText
      ? JSON.parse(form.imagesText)
      : [];
    const variants = form.variantsText
      ? JSON.parse(form.variantsText)
      : [];

    await apiFetch("/api/admin/products", {
      method: "POST",
      body: JSON.stringify({
        name: form.name,
        slug: form.slug,
        description: form.description,
        benefits,
        priceCents: form.priceCents,
        promoPriceCents: form.promoPriceCents,
        stock: form.stock,
        images,
        variants
      })
    });

    setForm({
      name: "",
      slug: "",
      description: "",
      priceCents: 0,
      promoPriceCents: null,
      stock: 0,
      benefitsText: "",
      imagesText: "",
      variantsText: ""
    });

    await refresh();
  }

  return (
    <div>
      <h1 className="font-[var(--font-playfair)] text-3xl">Produtos</h1>

      <div className="mt-6 rounded-2xl border border-border bg-card shadow-soft p-5">
        <div className="font-medium">Novo produto</div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            className="rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            placeholder="Nome"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            placeholder="Slug (ex: pimenta-preta-grao)"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
          <input
            className="rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            placeholder={`Preço em centavos (ex: 2490) • ${previewPrice}`}
            value={form.priceCents}
            onChange={(e) => setForm({ ...form, priceCents: Number(e.target.value) })}
          />
          <input
            className="rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            placeholder="Estoque"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
          />
          <textarea
            className="sm:col-span-2 rounded-xl border border-border bg-bg px-3 py-2 text-sm min-h-24 shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            placeholder="Descrição"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <textarea
            className="sm:col-span-2 rounded-xl border border-border bg-bg px-3 py-2 text-sm min-h-20 shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            placeholder="Benefícios (1 por linha)"
            value={form.benefitsText}
            onChange={(e) => setForm({ ...form, benefitsText: e.target.value })}
          />
          <textarea
            className="sm:col-span-2 rounded-xl border border-border bg-bg px-3 py-2 text-sm min-h-24 shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            placeholder='Imagens (JSON) ex: [{"url":"https://...","alt":"...","sortOrder":0}]'
            value={form.imagesText}
            onChange={(e) => setForm({ ...form, imagesText: e.target.value })}
          />
          <textarea
            className="sm:col-span-2 rounded-xl border border-border bg-bg px-3 py-2 text-sm min-h-24 shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            placeholder='Variações (JSON) ex: [{"label":"100g","weightGrams":100,"stock":10,"priceDeltaCents":0}]'
            value={form.variantsText}
            onChange={(e) => setForm({ ...form, variantsText: e.target.value })}
          />
        </div>
        <button
          type="button"
          className="mt-4 rounded-xl bg-primary text-primaryFg px-5 py-3 text-sm font-medium shadow-soft transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-card active:translate-y-0"
          onClick={create}
        >
          Criar
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card shadow-soft p-5">
        <div className="font-medium">Lista</div>
        <div className="mt-4 space-y-2 text-sm">
          {loading ? <div className="text-fg/60">Carregando...</div> : null}
          {products.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-xl border border-border bg-bg/40 px-4 py-3">
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-fg/60">{p.slug}</div>
              </div>
              <div className="text-right">
                <div className="font-medium">{formatBRL(p.promoPriceCents ?? p.priceCents)}</div>
                <div className="text-xs text-fg/60">Estoque: {p.stock}</div>
              </div>
            </div>
          ))}
          {products.length === 0 && !loading ? (
            <div className="text-fg/60">Nenhum produto.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

