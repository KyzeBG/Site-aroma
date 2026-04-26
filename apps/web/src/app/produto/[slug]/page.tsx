import { apiFetch } from "@/lib/api";
import { AddToCartForm } from "@/components/product/AddToCartForm";
import { ProductGallery } from "@/components/product/ProductGallery";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Badge } from "@/components/ui/Badge";

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  benefits: string[];
  priceCents: number;
  promoPriceCents: number | null;
  images: Array<{ url: string; alt: string | null }>;
  variants: Array<{ id: string; label: string; priceDeltaCents: number }>;
};

type PublicSettings = { offers: { pixDiscountPercent: number } };

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const [product, settings] = await Promise.all([
    apiFetch<Product>(`/api/products/${slug}`, { cache: "no-store" }),
    apiFetch<PublicSettings>("/api/settings/public", { cache: "no-store" })
  ]);

  const hero = product.images[0]?.url ?? null;
  const basePriceCents = product.promoPriceCents ?? product.priceCents;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <Breadcrumbs />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <ProductGallery name={product.name} images={product.images} />
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Frete calculado na hora</Badge>
            <Badge variant="outline">Temperos e pimentas</Badge>
          </div>
          <h1 className="mt-4 font-serif text-3xl leading-tight">{product.name}</h1>
          <p className="mt-4 text-sm text-fg/70">{product.description}</p>

          <div className="mt-6">
            <AddToCartForm
              product={{
                id: product.id,
                name: product.name,
                basePriceCents,
                imageUrl: hero,
                variants: product.variants
              }}
              pixDiscountPercent={settings.offers.pixDiscountPercent}
            />
          </div>

          {product.benefits.length > 0 ? (
            <div className="mt-6">
              <div className="font-medium">Benefícios</div>
              <ul className="mt-2 text-sm text-fg/70 list-disc pl-5 space-y-1">
                {product.benefits.map((b, idx) => (
                  <li key={idx}>{b}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

