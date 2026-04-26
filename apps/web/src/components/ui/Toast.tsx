"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export type ToastItem = {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "danger";
};

type ToastContextValue = {
  push: (t: Omit<ToastItem, "id">) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("ToastProvider missing");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  const push = React.useCallback((t: Omit<ToastItem, "id">) => {
    const id = Math.random().toString(36).slice(2);
    const item: ToastItem = { id, variant: "default", ...t };
    setItems((prev) => [item, ...prev].slice(0, 4));
    window.setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id));
    }, 4500);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed right-4 top-4 z-[100] w-[min(420px,calc(100vw-2rem))] space-y-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "rounded-2xl border border-border bg-card shadow-card px-4 py-3",
              t.variant === "danger" ? "border-danger/30" : ""
            )}
            role="status"
            aria-live="polite"
          >
            <div className="font-medium">{t.title}</div>
            {t.description ? <div className="mt-1 text-sm text-fg/70">{t.description}</div> : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

