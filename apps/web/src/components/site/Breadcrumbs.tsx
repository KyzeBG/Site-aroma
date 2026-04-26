"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const labelBySegment: Record<string, string> = {
  carrinho: "Carrinho",
  checkout: "Checkout",
  admin: "Admin",
  produtos: "Produtos",
  pedidos: "Pedidos",
  config: "Configurações",
  produto: "Produto",
  sucesso: "Sucesso"
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);

  const crumbs = [{ href: "/", label: "Início" }].concat(
    parts.map((p, idx) => {
      const href = "/" + parts.slice(0, idx + 1).join("/");
      return { href, label: labelBySegment[p] ?? p };
    })
  );

  if (crumbs.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className="text-xs text-fg/60">
      <ol className="flex flex-wrap items-center gap-2">
        {crumbs.map((c, idx) => (
          <li key={c.href} className="flex items-center gap-2">
            {idx === crumbs.length - 1 ? (
              <span className="text-fg/80">{c.label}</span>
            ) : (
              <Link href={c.href} className="hover:text-fg">
                {c.label}
              </Link>
            )}
            {idx !== crumbs.length - 1 ? <span aria-hidden="true">/</span> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}

