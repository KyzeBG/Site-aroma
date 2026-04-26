"use client";

import { useMemo, useState } from "react";
import { useCart } from "@/store/cart";
import { formatBRL } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";

type Variant = {
  id: string;
  label: string;
  priceDeltaCents: number;
};

export function AddToCartForm(props: {
  product: {
    id: string;
    name: string;
    basePriceCents: number;
    imageUrl?: string | null;
    variants: Variant[];
  };
  pixDiscountPercent: number;
}) {
  const [variantId, setVariantId] = useState<string | "">("");
  const [quantity, setQuantity] = useState(1);
  const addItem = useCart((s) => s.addItem);

  const selected = useMemo(() => {
    const v = props.product.variants.find((x) => x.id === variantId);
    const unit = props.product.basePriceCents + (v?.priceDeltaCents ?? 0);
    return { v, unit };
  }, [props.product.basePriceCents, props.product.variants, variantId]);

  const pixPrice = Math.round(selected.unit * (1 - props.pixDiscountPercent / 100));

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="accent">{props.pixDiscountPercent}% OFF Pix</Badge>
        </div>

        <div className="mt-4">
          <div className="text-xs text-fg/60">Preço</div>
          <div className="mt-1 text-2xl font-medium">{formatBRL(selected.unit)}</div>
          <div className="mt-1 text-sm text-fg/70">
            No Pix: <span className="font-medium">{formatBRL(pixPrice)}</span>
          </div>
        </div>

      {props.product.variants.length > 0 ? (
        <div className="mt-4">
          <label className="text-xs text-fg/60">Variação</label>
          <select
            className="mt-1 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            value={variantId}
            onChange={(e) => setVariantId(e.target.value)}
          >
            <option value="">Selecione</option>
            {props.product.variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="mt-4">
        <label className="text-xs text-fg/60">Quantidade</label>
        <div className="mt-1 flex items-center gap-2">
          <button
            type="button"
            className={cn(
              "h-10 w-10 rounded-xl border border-border bg-card shadow-soft transition-[transform,background-color] duration-200 hover:bg-muted/60 hover:-translate-y-0.5 active:translate-y-0"
            )}
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            aria-label="Diminuir quantidade"
          >
            -
          </button>
          <div className="min-w-10 text-center text-sm">{quantity}</div>
          <button
            type="button"
            className={cn(
              "h-10 w-10 rounded-xl border border-border bg-card shadow-soft transition-[transform,background-color] duration-200 hover:bg-muted/60 hover:-translate-y-0.5 active:translate-y-0"
            )}
            onClick={() => setQuantity((q) => Math.min(99, q + 1))}
            aria-label="Aumentar quantidade"
          >
            +
          </button>
        </div>
      </div>

      <Button
        type="button"
        className="mt-5 w-full"
        size="lg"
        onClick={() => {
          addItem({
            productId: props.product.id,
            variantId: selected.v?.id ?? null,
            name: props.product.name,
            variantLabel: selected.v?.label ?? null,
            unitPriceCents: selected.unit,
            quantity,
            imageUrl: props.product.imageUrl ?? null
          });
        }}
      >
        Comprar
      </Button>

      <div className="mt-3 text-xs text-fg/60">Frete calculado no checkout</div>
      </CardContent>
    </Card>
  );
}

