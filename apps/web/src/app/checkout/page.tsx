"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useCart, cartSubtotalCents } from "@/store/cart";
import { apiFetch } from "@/lib/api";
import { formatBRL } from "@/lib/format";

type ShippingOption = { id: string; name: string; priceCents: number; deadlineDays: number };

type PublicSettings = {
  offers: { pixDiscountPercent: number; freeShippingEnabled: boolean; freeShippingMinSubtotalCents: number };
};

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cartItems = useCart((s) => s.items);
  const clearCart = useCart((s) => s.clear);

  const subtotal = useMemo(() => cartSubtotalCents(cartItems), [cartItems]);
  const zipFromQuery = searchParams.get("zip") ?? "";
  const shipIdFromQuery = searchParams.get("shipId") ?? "";

  const [zip, setZip] = useState(zipFromQuery);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShippingId, setSelectedShippingId] = useState(shipIdFromQuery);
  const selectedShipping = shippingOptions.find((o) => o.id === selectedShippingId) ?? null;

  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const pixDiscountPercent = settings?.offers.pixDiscountPercent ?? 5;

  const [customer, setCustomer] = useState({
    name: "",
    email: "",
    cpf: "",
    phone: ""
  });
  const [address, setAddress] = useState({
    zip: zipFromQuery,
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: ""
  });

  const [loading, setLoading] = useState(false);
  const [pix, setPix] = useState<null | {
    orderId: string;
    orderCode: string;
    paymentId: string;
    qrCodeBase64: string;
    copyPaste: string;
    mode: string;
  }>(null);

  useEffect(() => {
    apiFetch<PublicSettings>("/api/settings/public")
      .then(setSettings)
      .catch(() => setSettings(null));
  }, []);

  useEffect(() => {
    if (zip.replace(/\D/g, "").length < 8 || cartItems.length === 0) return;
    apiFetch<{ options: ShippingOption[] }>("/api/shipping/calculate", {
      method: "POST",
      body: JSON.stringify({
        toZip: zip,
        items: cartItems.map((i) => ({
          productId: i.productId,
          variantId: i.variantId ?? null,
          quantity: i.quantity
        }))
      })
    })
      .then((r) => {
        setShippingOptions(r.options);
        setSelectedShippingId((curr) => curr || r.options[0]?.id || "");
      })
      .catch(() => {
        setShippingOptions([]);
        setSelectedShippingId("");
      });
  }, [zip, cartItems]);

  const shippingCents = selectedShipping?.priceCents ?? 0;
  const discountCents = Math.round((subtotal * pixDiscountPercent) / 100);
  const totalPix = Math.max(0, subtotal + shippingCents - discountCents);

  async function startPix() {
    setLoading(true);
    try {
      const res = await apiFetch<{
        orderId: string;
        orderCode: string;
        paymentId: string;
        pixDiscountPercent: number;
        qrCodeBase64: string;
        copyPaste: string;
        mode: string;
      }>("/api/payment/pix", {
        method: "POST",
        body: JSON.stringify({
          customer,
          address: { ...address, zip },
          items: cartItems.map((i) => ({
            productId: i.productId,
            variantId: i.variantId ?? null,
            quantity: i.quantity
          })),
          shipping: {
            shippingCents,
            serviceName: selectedShipping?.name ?? null,
            deadlineDays: selectedShipping?.deadlineDays ?? null
          }
        })
      });
      setPix(res);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!pix?.orderId) return;

    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const status = await apiFetch<{ status: string; order: { id: string; code: string; status: string } }>(
          `/api/payment/status/${pix.orderId}`
        );
        if (!cancelled && status.status === "PAID") {
          clearCart();
          router.push(`/sucesso/${pix.orderId}`);
        }
      } catch {
      }
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pix?.orderId, clearCart, router]);

  if (cartItems.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border border-border bg-card shadow-soft p-6 text-sm text-fg/70">Seu carrinho está vazio.</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-[var(--font-playfair)] text-3xl">Checkout</h1>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="rounded-2xl border border-border bg-card shadow-soft p-5">
            <div className="font-medium">Dados do cliente</div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                className="rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                placeholder="Nome"
                value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
              />
              <input
                className="rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                placeholder="Email"
                value={customer.email}
                onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
              />
              <input
                className="rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                placeholder="CPF"
                value={customer.cpf}
                onChange={(e) => setCustomer({ ...customer, cpf: e.target.value })}
              />
              <input
                className="rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                placeholder="Telefone"
                value={customer.phone}
                onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-soft p-5">
            <div className="font-medium">Endereço</div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                className="rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                placeholder="CEP"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
              />
              <input
                className="rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                placeholder="Rua"
                value={address.street}
                onChange={(e) => setAddress({ ...address, street: e.target.value })}
              />
              <input
                className="rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                placeholder="Número"
                value={address.number}
                onChange={(e) => setAddress({ ...address, number: e.target.value })}
              />
              <input
                className="rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                placeholder="Complemento"
                value={address.complement}
                onChange={(e) => setAddress({ ...address, complement: e.target.value })}
              />
              <input
                className="rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                placeholder="Bairro"
                value={address.neighborhood}
                onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })}
              />
              <input
                className="rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                placeholder="Cidade"
                value={address.city}
                onChange={(e) => setAddress({ ...address, city: e.target.value })}
              />
              <input
                className="rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                placeholder="UF"
                value={address.state}
                onChange={(e) => setAddress({ ...address, state: e.target.value.toUpperCase() })}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-soft p-5">
            <div className="font-medium">Pagamento</div>
            <div className="mt-3 text-sm text-fg/70">{pixDiscountPercent}% de desconto no Pix</div>

            {!pix ? (
              <button
                type="button"
                className="mt-4 w-full rounded-xl bg-primary text-primaryFg px-5 py-3 text-sm font-medium shadow-soft transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-card active:translate-y-0 disabled:opacity-60 disabled:pointer-events-none"
                onClick={startPix}
                disabled={loading || !selectedShipping}
              >
                {loading ? "Gerando Pix..." : `Pagar com Pix (${formatBRL(totalPix)})`}
              </button>
            ) : (
              <div className="mt-4 rounded-xl border border-border bg-bg/40 p-4">
                <div className="text-sm font-medium">Pix gerado</div>
                <div className="mt-2 text-xs text-fg/60">Pedido {pix.orderCode} • Status: aguardando pagamento</div>

                {pix.qrCodeBase64 ? (
                  <img
                    className="mt-4 w-52 h-52 rounded-xl border border-border bg-card"
                    src={`data:image/png;base64,${pix.qrCodeBase64}`}
                    alt="QR Code Pix"
                  />
                ) : (
                  <div className="mt-4 text-sm text-fg/70">
                    Modo mock ativo. Para finalizar, use o endpoint de confirmação no backend.
                  </div>
                )}

                <div className="mt-4">
                  <label className="text-xs text-fg/60">Copia e cola</label>
                  <div className="mt-2 flex gap-2">
                    <input
                      className="flex-1 rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                      readOnly
                      value={pix.copyPaste}
                    />
                    <button
                      type="button"
                      className="rounded-xl border border-border bg-card px-4 py-2 text-sm shadow-soft transition-[transform,background-color] duration-200 hover:bg-muted/60 hover:-translate-y-0.5 active:translate-y-0"
                      onClick={() => navigator.clipboard.writeText(pix.copyPaste)}
                    >
                      Copiar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-soft p-5 h-fit">
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
            <div className="flex items-center justify-between">
              <span className="text-fg/70">Desconto Pix</span>
              <span>-{formatBRL(discountCents)}</span>
            </div>
            <div className="pt-2 border-t border-border flex items-center justify-between">
              <span className="text-fg/70">Total (Pix)</span>
              <span className="font-medium">{formatBRL(totalPix)}</span>
            </div>
          </div>

          {shippingOptions.length > 0 ? (
            <div className="mt-5">
              <div className="text-xs text-fg/60">Frete</div>
              <div className="mt-2 space-y-2">
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
            </div>
          ) : (
            <div className="mt-5 text-sm text-fg/70">Informe o CEP para calcular o frete.</div>
          )}
        </div>
      </div>
    </div>
  );
}

