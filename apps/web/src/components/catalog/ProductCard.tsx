import Link from "next/link";
import Image from "next/image";
import { formatBRL } from "@/lib/format";

export type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  promoPriceCents: number | null;
  imageUrl: string | null;
};

export function ProductCard({ p }: { p: ProductCardData }) {
  const price = p.promoPriceCents ?? p.priceCents;
  return (
    <Link
      href={`/produto/${p.slug}`}
      className="group rounded-2xl border border-border overflow-hidden bg-card shadow-soft transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:shadow-card hover:bg-muted/30"
    >
      <div className="aspect-square bg-muted relative">
        {p.imageUrl ? (
          <Image
            src={p.imageUrl}
            alt={p.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : null}
      </div>
      <div className="p-4">
        <div className="font-serif text-base leading-tight">{p.name}</div>
        <div className="mt-2 flex items-baseline gap-2">
          <div className="text-sm font-medium">{formatBRL(price)}</div>
          {p.promoPriceCents ? (
            <div className="text-xs text-fg/50 line-through">{formatBRL(p.priceCents)}</div>
          ) : null}
        </div>
        <div className="mt-3 text-xs text-fg/60">Ver detalhes →</div>
      </div>
    </Link>
  );
}

