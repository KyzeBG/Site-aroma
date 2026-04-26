"use client";

import * as React from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getOrAssignVariant, recordExposure } from "@/lib/experiments";

export function HomeHeroExperiment(props: {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaHref: string;
  pixDiscountPercent: number;
}) {
  const variant = React.useMemo(() => getOrAssignVariant("home_hero_v1", ["A", "B"]), []);

  React.useEffect(() => {
    recordExposure("home_hero_v1", variant);
  }, [variant]);

  if (variant === "B") {
    return (
      <div className="max-w-2xl">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="accent">{props.pixDiscountPercent}% OFF no Pix</Badge>
          <Badge variant="outline">Frete no checkout</Badge>
        </div>
        <h1 className="mt-5 font-serif text-3xl sm:text-5xl leading-tight">{props.title}</h1>
        <p className="mt-4 text-sm sm:text-base text-fg/75">{props.subtitle}</p>
        <div className="mt-7 flex flex-col sm:flex-row gap-3">
          <a href={props.ctaHref} className="inline-flex">
            <Button size="lg">{props.ctaText}</Button>
          </a>
          <a href="/?category=temperos" className="inline-flex">
            <Button size="lg" variant="secondary">
              Ver categorias
            </Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="accent">{props.pixDiscountPercent}% OFF no Pix</Badge>
        <Badge variant="outline">Frete no checkout</Badge>
        <Badge variant="outline">Temperos e pimentas</Badge>
      </div>
      <h1 className="mt-5 font-serif text-3xl sm:text-5xl leading-tight">{props.title}</h1>
      <p className="mt-4 text-sm sm:text-base text-fg/75">{props.subtitle}</p>
      <div className="mt-7 flex flex-col sm:flex-row gap-3">
        <a href={props.ctaHref} className="inline-flex">
          <Button size="lg">{props.ctaText}</Button>
        </a>
        <a href="/carrinho" className="inline-flex">
          <Button size="lg" variant="outline">
            Ir para o carrinho
          </Button>
        </a>
      </div>
    </div>
  );
}
