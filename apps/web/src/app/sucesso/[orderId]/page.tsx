import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { formatBRL } from "@/lib/format";

type StatusRes = {
  status: string;
  order: {
    id: string;
    code: string;
    status: string;
    subtotalCents: number;
    shippingCents: number;
    discountCents: number;
    totalCents: number;
    items: Array<{
      id: string;
      nameSnapshot: string;
      variantSnapshot: string | null;
      quantity: number;
      totalCents: number;
    }>;
  } | null;
};

export default async function SuccessPage({ params }: { params: { orderId: string } }) {
  const data = await apiFetch<StatusRes>(`/api/payment/status/${params.orderId}`, { cache: "no-store" });

  if (!data.order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border border-border bg-card shadow-soft p-6 text-sm text-fg/70">Pedido não encontrado.</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-[var(--font-playfair)] text-3xl">Pedido confirmado</h1>
      <div className="mt-2 text-sm text-fg/70">
        ID: {data.order.code} • Status: {data.order.status}
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-card shadow-soft p-6">
        <div className="font-medium">Produtos</div>
        <div className="mt-4 space-y-3 text-sm">
          {data.order.items.map((i) => (
            <div key={i.id} className="flex items-start justify-between gap-4">
              <div>
                <div className="font-medium">{i.nameSnapshot}</div>
                {i.variantSnapshot ? <div className="text-xs text-fg/60">{i.variantSnapshot}</div> : null}
                <div className="text-xs text-fg/60">Qtd: {i.quantity}</div>
              </div>
              <div className="font-medium">{formatBRL(i.totalCents)}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-border text-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-fg/70">Subtotal</span>
            <span>{formatBRL(data.order.subtotalCents)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-fg/70">Frete</span>
            <span>{formatBRL(data.order.shippingCents)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-fg/70">Desconto</span>
            <span>-{formatBRL(data.order.discountCents)}</span>
          </div>
          <div className="flex items-center justify-between font-medium">
            <span>Total</span>
            <span>{formatBRL(data.order.totalCents)}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <Link
          href="/"
          className="rounded-xl bg-primary text-primaryFg px-5 py-3 text-sm font-medium shadow-soft transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-card active:translate-y-0"
        >
          Voltar para a loja
        </Link>
        <Link
          href="/admin"
          className="rounded-xl border border-border bg-card px-5 py-3 text-sm shadow-soft transition-[transform,background-color] duration-200 hover:bg-muted/60 hover:-translate-y-0.5 active:translate-y-0"
        >
          Abrir admin
        </Link>
      </div>
    </div>
  );
}

