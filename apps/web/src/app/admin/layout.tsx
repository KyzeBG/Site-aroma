import Link from "next/link";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Card, CardContent } from "@/components/ui/Card";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Breadcrumbs />
          <div className="mt-2 font-serif text-3xl">Admin</div>
        </div>
        <ThemeToggle />
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
        <aside className="min-w-0">
          <Card>
            <CardContent className="pt-5">
              <nav className="grid grid-cols-2 md:grid-cols-1 gap-2 text-sm">
                <Link href="/admin" className="rounded-xl border border-border bg-bg px-4 py-3 hover:bg-muted/60">
                  Dashboard
                </Link>
                <Link
                  href="/admin/produtos"
                  className="rounded-xl border border-border bg-bg px-4 py-3 hover:bg-muted/60"
                >
                  Produtos
                </Link>
                <Link
                  href="/admin/pedidos"
                  className="rounded-xl border border-border bg-bg px-4 py-3 hover:bg-muted/60"
                >
                  Pedidos
                </Link>
                <Link
                  href="/admin/config"
                  className="rounded-xl border border-border bg-bg px-4 py-3 hover:bg-muted/60"
                >
                  Configurações
                </Link>
              </nav>
            </CardContent>
          </Card>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

