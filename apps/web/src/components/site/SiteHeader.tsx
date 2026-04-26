"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/store/cart";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";

export function SiteHeader() {
  const count = useCart((s) => s.items.reduce((acc, i) => acc + i.quantity, 0));
  const [open, setOpen] = useState(false);
  const [brand, setBrand] = useState<{ storeName: string; logoUrl: string | null }>({
    storeName: "Aroma dos Temperos",
    logoUrl: "/brand/aroma-dos-temperos.jpg"
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const s = await apiFetch<any>("/api/settings/public");
        const storeName = typeof s?.storeName === "string" && s.storeName.trim() ? s.storeName.trim() : null;
        const logoUrl = typeof s?.logoUrl === "string" && s.logoUrl.trim() ? s.logoUrl.trim() : null;
        if (storeName || logoUrl) {
          setBrand((prev) => ({
            storeName: storeName ?? prev.storeName,
            logoUrl: logoUrl ?? prev.logoUrl
          }));
        }
      } catch {}
    })();
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/85 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="md:hidden"
            aria-label="Abrir menu"
            onClick={() => setOpen(true)}
          >
            Menu
          </Button>

          <Link href="/" className="flex items-center gap-3">
            <span className="h-10 w-[160px] rounded-2xl border border-border bg-bg shadow-soft overflow-hidden grid place-items-center">
              <Image
                src={brand.logoUrl ?? "/brand/aroma-dos-temperos.jpg"}
                alt={brand.storeName}
                width={320}
                height={80}
                className="h-10 w-[160px] object-contain [mix-blend-mode:multiply] dark:[mix-blend-mode:normal]"
                priority
              />
            </span>
            <span className="font-serif text-lg tracking-tight hidden sm:block">{brand.storeName}</span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-2 text-sm">
          <Link
            href="/"
            className="rounded-xl px-3 py-2 text-fg/80 hover:text-fg hover:bg-muted/60 transition-colors"
          >
            Início
          </Link>
          <Link
            href="/?category=temperos"
            className="rounded-xl px-3 py-2 text-fg/80 hover:text-fg hover:bg-muted/60 transition-colors"
          >
            Categorias
          </Link>
          <Link
            href="/carrinho"
            className="rounded-xl px-3 py-2 text-fg/80 hover:text-fg hover:bg-muted/60 transition-colors"
          >
            Carrinho
            {count > 0 ? (
              <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-medium text-accentFg">
                {count}
              </span>
            ) : null}
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/admin" className="hidden sm:block">
            <Button type="button" variant="outline" size="sm">
              Admin
            </Button>
          </Link>
          <Link href="/carrinho" className="sm:hidden">
            <Button type="button" variant="outline" size="sm" aria-label="Ir ao carrinho">
              {count}
            </Button>
          </Link>
        </div>
      </div>

      <div
        className={cn(
          "fixed inset-0 z-[120] bg-black/40 transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />
      <div
        className={cn(
          "fixed left-0 top-0 z-[130] h-full w-[min(360px,85vw)] bg-card border-r border-border shadow-card transition-transform md:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
      >
        <div className="p-4 flex items-center justify-between">
          <div className="font-serif text-lg">Menu</div>
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} aria-label="Fechar menu">
            Fechar
          </Button>
        </div>
        <div className="px-4 pb-4 space-y-2">
          <Link
            href="/"
            className="block rounded-xl border border-border bg-bg px-4 py-3 text-sm"
            onClick={() => setOpen(false)}
          >
            Início
          </Link>
          <Link
            href="/?category=temperos"
            className="block rounded-xl border border-border bg-bg px-4 py-3 text-sm"
            onClick={() => setOpen(false)}
          >
            Categorias
          </Link>
          <Link
            href="/carrinho"
            className="block rounded-xl border border-border bg-bg px-4 py-3 text-sm"
            onClick={() => setOpen(false)}
          >
            Carrinho ({count})
          </Link>
          <Link
            href="/admin"
            className="block rounded-xl border border-border bg-bg px-4 py-3 text-sm"
            onClick={() => setOpen(false)}
          >
            Admin
          </Link>
        </div>
      </div>
    </header>
  );
}
