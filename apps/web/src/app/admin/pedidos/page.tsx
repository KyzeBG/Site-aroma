"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatBRL } from "@/lib/format";

type Order = {
  id: string;
  code: string;
  status: string;
  totalCents: number;
  createdAt: string;
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const res = await apiFetch<any[]>("/api/admin/orders");
      setOrders(res);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, []);

  async function updateStatus(orderId: string, status: string) {
    await apiFetch(`/api/admin/orders/${orderId}`, {
      method: "PUT",
      body: JSON.stringify({ status })
    });
    await refresh();
  }

  return (
    <div>
      <h1 className="font-[var(--font-playfair)] text-3xl">Pedidos</h1>

      <div className="mt-6 rounded-2xl border border-border bg-card shadow-soft p-5">
        <div className="font-medium">Lista</div>
        <div className="mt-4 space-y-3 text-sm">
          {loading ? <div className="text-fg/60">Carregando...</div> : null}
          {orders.map((o) => (
            <div key={o.id} className="rounded-xl border border-border bg-bg/40 px-4 py-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium">{o.code}</div>
                  <div className="text-xs text-fg/60">{new Date(o.createdAt).toLocaleString("pt-BR")}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatBRL(o.totalCents)}</div>
                  <div className="text-xs text-fg/60">{o.status}</div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {["PENDING_PAYMENT", "PAID", "SHIPPED", "DELIVERED"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-soft transition-[transform,background-color] duration-200 hover:bg-muted/60 hover:-translate-y-0.5 active:translate-y-0"
                    onClick={() => updateStatus(o.id, s)}
                  >
                    Marcar {s}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {orders.length === 0 && !loading ? <div className="text-fg/60">Nenhum pedido.</div> : null}
        </div>
      </div>
    </div>
  );
}

