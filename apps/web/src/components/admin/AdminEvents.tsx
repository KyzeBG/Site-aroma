"use client";

import * as React from "react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

type EventMsg =
  | { type: "order_created"; orderId: string; code: string; totalCents: number }
  | { type: "order_paid"; orderId: string; code: string; totalCents: number }
  | { type: "ping" };

export function AdminEvents() {
  const toast = useToast();
  const lastSeen = React.useRef<string | null>(null);

  React.useEffect(() => {
    let es: EventSource | null = null;

    try {
      es = new EventSource(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000"}/api/admin/events`, {
        withCredentials: true
      } as any);

      es.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data) as EventMsg;
          if (data.type === "ping") return;
          const key = `${data.type}:${data.orderId}`;
          if (lastSeen.current === key) return;
          lastSeen.current = key;

          if (data.type === "order_created") {
            toast.push({
              title: "Novo pedido",
              description: `${data.code} • ${(data.totalCents / 100).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL"
              })}`
            });
          }

          if (data.type === "order_paid") {
            toast.push({
              title: "Pagamento confirmado",
              description: `${data.code} • ${(data.totalCents / 100).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL"
              })}`
            });
          }
        } catch {
        }
      };

      es.onerror = () => {
        es?.close();
      };
    } catch {
    }

    return () => {
      es?.close();
    };
  }, [toast]);

  React.useEffect(() => {
    let stopped = false;
    const poll = async () => {
      try {
        const res = await apiFetch<any[]>("/api/admin/orders");
        const newest = res?.[0];
        if (!stopped && newest?.id && lastSeen.current !== newest.id) {
          lastSeen.current = newest.id;
        }
      } catch {
      }
    };
    const id = window.setInterval(() => void poll(), 12_000);
    void poll();
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, []);

  return null;
}

