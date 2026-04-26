"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useCart, cartSubtotalCents } from "@/store/cart";
import { formatBRL } from "@/lib/format";
import { apiFetch } from "@/lib/api";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

type ShippingOption = { id: string; name: string; priceCents: number; deadlineDays: number };

export default function CartPage() {
  const items = useCart((s) => s.items);
  const setQuantity = useCart((s) => s.setQuantity);
  const removeItem = useCart((s) => s.removeItem);
  const toast = useToast();

  const subtotal = useMemo(() => cartSubtotalCents(items), [items]);

  const [zip, setZip] = useState("");
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShippingId, setSelectedShippingId] = useState<string>("");

  const selectedShipping = shippingOptions.find((o) => o.id === selectedShippingId) ?? null;
  const shippingCents = selectedShipping?.priceCents ?? 0;
  const total = subtotal + shippingCents;

  useEffect(() => {
    setShippingOptions([]);
    setSelectedShippingId("");
  }, [items.length]);

  async function calculate() {
    setLoadingShipping(true);
    try {
      const res = await apiFetch<{ options: ShippingOption[] }>("/api/shipping/calculate", {
        method: "POST",
        body: JSON.stringify({
          toZip: zip,
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId ?? null,
            quantity: i.quantity
          }))
        })
      });
      setShippingOptions(res.options);
      setSelectedShippingId(res.options[0]?.id ?? "");
      toast.push({ title: "Frete calculado", description: "Selecione a opção desejada para continuar." });
    } catch (e: any) {
      toast.push({ title: "Não foi possível calcular o frete", description: e?.message ?? "", variant: "danger" });
    } finally {
      setLoadingShipping(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-end justify-between">
        <div>
          <Breadcrumbs />
          <h1 className="mt-2 font-serif text-3xl">Carrinho</h1>
        </div>
        <Link href="/" className="text-sm text-fg/70 hover:text-fg">
          Continuar comprando
        </Link>
      </div>

      {items.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="pt-5 text-sm text-fg/70">Seu carrinho está vazio.</CardContent>
        </Card>
      ) : (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {items.map((i) => (
              <Card key={`${i.productId}-${i.variantId ?? ""}`}>
                <CardContent className="pt-5">
                <div className="flex gap-4">
                  <div className="relative h-20 w-20 rounded-xl bg-muted overflow-hidden shrink-0">
                    {i.imageUrl ? <Image src={i.imageUrl} alt={i.name} fill className="object-cover" /> : null}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{i.name}</div>
                    {i.variantLabel ? <div className="text-xs text-fg/60">{i.variantLabel}</div> : null}
                    <div className="mt-2 text-sm">{formatBRL(i.unitPriceCents)}</div>
                    <div className="mt-3 flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-label="Diminuir quantidade"
                        onClick={() => setQuantity({ productId: i.productId, variantId: i.variantId }, i.quantity - 1)}
                      >
                        -
                      </Button>
                      <div className="min-w-10 text-center text-sm">{i.quantity}</div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-label="Aumentar quantidade"
                        onClick={() => setQuantity({ productId: i.productId, variantId: i.variantId }, i.quantity + 1)}
                      >
                        +
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="ml-auto"
                        onClick={() => {
                          removeItem({ productId: i.productId, variantId: i.variantId });
                          toast.push({ title: "Item removido" });
                        }}
                      >
                        Remover
                      </Button>
                    </div>
                  </div>
                </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="h-fit">
            <CardContent className="pt-5">
            <div className="font-medium">Resumo</div>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-fg/70">Subtotal</span>
                <span>{formatBRL(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-fg/70">Frete</span>
                <span>{selectedShipping ? formatBRL(selectedShipping.priceCents) : "—"}</span>
              </div>
              <div className="pt-2 border-t border-border flex items-center justify-between">
                <span className="text-fg/70">Total</span>
                <span className="font-medium">{formatBRL(total)}</span>
              </div>
            </div>

            <div className="mt-5">
              <label className="text-xs text-fg/60">CEP para calcular frete</label>
              <div className="mt-2 flex gap-2">
                <Input
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="00000-000"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={loadingShipping || zip.replace(/\D/g, "").length < 8}
                  onClick={calculate}
                >
                  {loadingShipping ? "Calculando..." : "Calcular"}
                </Button>
              </div>
            </div>

            {shippingOptions.length > 0 ? (
              <div className="mt-4 space-y-2">
                {shippingOptions.map((o) => (
                  <label key={o.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="shipping"
                      checked={selectedShippingId === o.id}
                      onChange={() => setSelectedShippingId(o.id)}
                    />
                    <span className="flex-1">
                      {o.name} • {o.deadlineDays} dias
                    </span>
                    <span className="font-medium">{formatBRL(o.priceCents)}</span>
                  </label>
                ))}
              </div>
            ) : null}

            <div className="mt-6">
              <Link
                href={`/checkout?zip=${encodeURIComponent(zip)}&shipId=${encodeURIComponent(selectedShippingId)}`}
                className={!selectedShippingId ? "pointer-events-none opacity-50" : ""}
                aria-disabled={!selectedShippingId}
              >
                <Button className="w-full" size="lg" disabled={!selectedShippingId}>
                  Checkout
                </Button>
              </Link>
            </div>

            <div className="mt-3 text-xs text-fg/60">Frete calculado no checkout</div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

