"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { formatBRL } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/Card";
import { MiniBarChart, Sparkline } from "@/components/admin/Charts";
import { Badge } from "@/components/ui/Badge";
import { AdminEvents } from "@/components/admin/AdminEvents";

type Dashboard = {
  totalOrders: number;
  paidOrders: number;
  revenueCents: number;
  recentOrders: Array<{ id: string; code: string; status: string; totalCents: number; createdAt: string }>;
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);

  useEffect(() => {
    apiFetch<Dashboard>("/api/admin/dashboard").then(setData).catch(() => setData(null));
  }, []);

  const trend = (data?.recentOrders ?? []).slice(0, 10).map((o) => o.totalCents / 100);
  const dist = [
    (data?.recentOrders ?? []).filter((o) => o.status === "PENDING_PAYMENT").length,
    (data?.recentOrders ?? []).filter((o) => o.status === "PAID").length,
    (data?.recentOrders ?? []).filter((o) => o.status === "SHIPPED").length,
    (data?.recentOrders ?? []).filter((o) => o.status === "DELIVERED").length
  ];

  return (
    <div>
      <AdminEvents />
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">Dashboard</h1>
          <div className="mt-2 text-sm text-fg/70">Visão rápida de vendas, pedidos e tendência.</div>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <Badge variant="outline">Notificações em tempo real</Badge>
          <Badge variant="outline">Modo claro/escuro</Badge>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs text-fg/60">Pedidos totais</div>
            <div className="mt-2 flex items-end justify-between gap-4">
              <div className="text-3xl font-medium">{data?.totalOrders ?? "—"}</div>
              <Sparkline values={trend.length ? trend : [0, 1, 0, 2, 1]} className="h-10 w-32" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs text-fg/60">Pedidos pagos</div>
            <div className="mt-2 flex items-end justify-between gap-4">
              <div className="text-3xl font-medium">{data?.paidOrders ?? "—"}</div>
              <MiniBarChart values={dist.reduce((a, b) => a + b, 0) ? dist : [1, 2, 1, 0]} className="h-14 w-40" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs text-fg/60">Faturamento</div>
            <div className="mt-2 text-3xl font-medium">{data ? formatBRL(data.revenueCents) : "—"}</div>
            <div className="mt-2 text-sm text-fg/70">Acumulado do período disponível</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardContent className="pt-5">
          <div className="flex items-center justify-between">
            <div className="font-medium">Pedidos recentes</div>
            <Link href="/admin/pedidos" className="text-sm text-fg/70 hover:text-fg">
              Ver todos
            </Link>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            {(data?.recentOrders ?? []).map((o) => (
              <Link
                key={o.id}
                href={`/admin/pedidos`}
                className="flex items-center justify-between rounded-xl border border-border bg-bg px-4 py-3 hover:bg-muted/60 transition-colors"
              >
                <div>
                  <div className="font-medium">{o.code}</div>
                  <div className="text-xs text-fg/60">{o.status}</div>
                </div>
                <div className="font-medium">{formatBRL(o.totalCents)}</div>
              </Link>
            ))}
            {(data?.recentOrders ?? []).length === 0 ? (
              <div className="text-fg/60">Nenhum pedido ainda.</div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

