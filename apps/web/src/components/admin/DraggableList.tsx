"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";

export function DraggableList<T extends { id: string }>({
  items,
  onChange,
  renderItem
}: {
  items: T[];
  onChange: (next: T[]) => void;
  renderItem: (item: T) => React.ReactNode;
}) {
  const [dragId, setDragId] = React.useState<string | null>(null);

  const move = React.useCallback(
    (fromId: string, toId: string) => {
      if (fromId === toId) return;
      const fromIdx = items.findIndex((i) => i.id === fromId);
      const toIdx = items.findIndex((i) => i.id === toId);
      if (fromIdx < 0 || toIdx < 0) return;
      const copy = [...items];
      const [it] = copy.splice(fromIdx, 1);
      copy.splice(toIdx, 0, it);
      onChange(copy);
    },
    [items, onChange]
  );

  return (
    <div className="space-y-2">
      {items.map((it) => (
        <div
          key={it.id}
          draggable
          onDragStart={() => setDragId(it.id)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (dragId) move(dragId, it.id);
            setDragId(null);
          }}
          className={cn(
            "rounded-2xl border border-border bg-bg px-4 py-3 shadow-soft",
            dragId === it.id ? "opacity-60" : ""
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">{renderItem(it)}</div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0"
              onClick={() => onChange(items.filter((x) => x.id !== it.id))}
              aria-label="Remover item"
            >
              Remover
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

