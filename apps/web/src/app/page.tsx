import Image from "next/image";
import { apiFetch } from "@/lib/api";
import { ProductCard, type ProductCardData } from "@/components/catalog/ProductCard";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Reveal } from "@/components/ui/Reveal";

type PublicSettings = {
  storeName: string;
  home: any;
  offers: { pixDiscountPercent: number; freeShippingEnabled: boolean; freeShippingMinSubtotalCents: number };
};

export default async function HomePage({ searchParams }: { searchParams: { category?: string } }) {
  const category = searchParams.category;
  const productsPath = category ? `/api/products?category=${encodeURIComponent(category)}` : "/api/products";

  const [settings, products, categories] = await Promise.all([
    apiFetch<PublicSettings>("/api/settings/public", { cache: "no-store" }),
    apiFetch<ProductCardData[]>(productsPath, { cache: "no-store" }),
    apiFetch<Array<{ id: string; name: string; slug: string }>>("/api/categories", { cache: "no-store" })
  ]);

  const banner = settings.home?.banner;
  const benefits: Array<{ title: string; description: string }> = settings.home?.benefits ?? [];
  const heroImage =
    banner?.imageUrl ??
    "https://images.unsplash.com/photo-1524594150403-1e3e1a7b8fd4?auto=format&fit=crop&w=1800&q=80";

  const categoryArt: Record<string, string> = {
    especiarias:
      "https://images.unsplash.com/photo-1506368249639-73a05d6f6488?auto=format&fit=crop&w=1400&q=80",
    ervas: "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1400&q=80",
    pimentas:
      "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=1400&q=80",
    kits: "https://images.unsplash.com/photo-1546554137-f86b9593a222?auto=format&fit=crop&w=1400&q=80",
    temperos:
      "https://images.unsplash.com/photo-1541013406133-54f9d19a9f8d?auto=format&fit=crop&w=1400&q=80"
  };

  const fictional = [
    {
      name: "Pimenta Cayenne Defumada",
      subtitle: "Picância equilibrada com final terroso.",
      imageUrl:
        "https://images.unsplash.com/photo-1542204165-65bf26472b9b?auto=format&fit=crop&w=1400&q=80"
    },
    {
      name: "Páprica Doce Gourmet",
      subtitle: "Cor intensa e aroma envolvente.",
      imageUrl:
        "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1400&q=80"
    },
    {
      name: "Mix Chimichurri Artesanal",
      subtitle: "Perfeito para carnes, legumes e molhos.",
      imageUrl:
        "https://images.unsplash.com/photo-1604909053181-04d0d5c5f8d3?auto=format&fit=crop&w=1400&q=80"
    },
    {
      name: "Pimenta Jalapeño em Flocos",
      subtitle: "Toque fresco, textura e presença.",
      imageUrl:
        "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1400&q=80"
    }
  ];

  return (
    <div className="bg-bg">
      <section className="mx-auto max-w-6xl px-4 pt-6 pb-10">
        <Reveal>
          <div className="rounded-[28px] overflow-hidden border border-border bg-card shadow-card relative">
            <Image
              src={heroImage}
              alt={banner?.title ?? "Temperos e pimentas"}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-bg/95 via-bg/75 to-bg/20" />

            <div className="relative p-7 sm:p-12">
              <div className="max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="accent">{settings.offers.pixDiscountPercent}% OFF no Pix</Badge>
                  <Badge variant="outline">Frete calculado na hora</Badge>
                  <Badge variant="outline">Temperos e pimentas</Badge>
                </div>

                <h1 className="mt-6 font-serif text-4xl sm:text-6xl leading-[1.02]">
                  {banner?.title ?? "Temperos e pimentas com alma artesanal"}
                </h1>
                <p className="mt-4 text-base sm:text-lg text-fg/75">
                  {banner?.subtitle ??
                    "Seleção terrosa e natural para transformar suas receitas: aromas, intensidade e sabor de verdade."}
                </p>

                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  <a href="/?category=temperos" className="inline-flex">
                    <Button size="lg">Explorar catálogo</Button>
                  </a>
                  <a href="#categorias" className="inline-flex">
                    <Button size="lg" variant="outline">
                      Ver categorias
                    </Button>
                  </a>
                </div>

                <div className="mt-4 text-xs text-fg/70">
                  {settings.offers.pixDiscountPercent}% no Pix • Catálogo completo • Ingredientes selecionados
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <section id="categorias" className="mx-auto max-w-6xl px-4 pb-12">
        <Reveal>
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-serif text-2xl">Categorias</h2>
              <div className="mt-1 text-sm text-fg/70">Escolha por perfil de sabor e intensidade.</div>
            </div>
            {category ? (
              <a href="/" className="text-sm text-fg/70 hover:text-fg">
                Limpar filtro
              </a>
            ) : null}
          </div>
        </Reveal>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((c, idx) => {
            const art = categoryArt[c.slug] ?? categoryArt.temperos;
            return (
              <Reveal key={c.id} className={idx ? "" : ""}>
                <a
                  href={`/?category=${encodeURIComponent(c.slug)}`}
                  className="group block rounded-2xl border border-border bg-card shadow-card overflow-hidden transition-transform hover:-translate-y-0.5 hover:shadow-card"
                >
                  <div className="relative h-44 sm:h-48">
                    <Image src={art} alt={c.name} fill sizes="(max-width: 768px) 100vw, 25vw" className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-bg/95 via-bg/35 to-transparent" />
                  </div>
                  <div className="p-4">
                    <div className="font-medium">{c.name}</div>
                    <div className="mt-1 text-xs text-fg/70">Ver produtos →</div>
                  </div>
                </a>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12">
        <Reveal>
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-serif text-2xl">Produtos fictícios (inspiração)</h2>
              <div className="mt-1 text-sm text-fg/70">Imagens e ideias para comunicar variedade e qualidade.</div>
            </div>
            <a href="/?category=temperos" className="text-sm text-fg/70 hover:text-fg">
              Ver catálogo →
            </a>
          </div>
        </Reveal>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {fictional.map((p) => (
            <Reveal key={p.name}>
              <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden transition-transform hover:-translate-y-0.5 hover:shadow-card">
                <div className="relative h-44">
                  <Image src={p.imageUrl} alt={p.name} fill sizes="(max-width: 768px) 100vw, 25vw" className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-bg/95 via-bg/35 to-transparent" />
                </div>
                <div className="p-4">
                  <div className="font-serif text-lg leading-tight">{p.name}</div>
                  <div className="mt-2 text-sm text-fg/70">{p.subtitle}</div>
                  <div className="mt-4">
                    <a href="/?category=temperos" className="inline-flex w-full">
                      <Button size="sm" className="w-full">
                        Explorar
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="mais-vendidos" className="mx-auto max-w-6xl px-4 pb-12">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-serif text-2xl">Mais vendidos</h2>
            <div className="mt-1 text-sm text-fg/70">Escolhas rápidas para cozinhar melhor hoje.</div>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          {products.slice(0, 8).map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12">
        <Reveal>
          <h2 className="font-serif text-2xl">Benefícios</h2>
        </Reveal>
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {benefits.map((b, idx) => (
            <Reveal key={idx}>
              <Card className="transition-transform hover:-translate-y-0.5">
                <CardContent className="pt-5">
                  <div className="font-medium">{b.title}</div>
                  <div className="mt-2 text-sm text-fg/70">{b.description}</div>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}

