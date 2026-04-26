import { prisma } from "../../db/prisma.js";
import { getSettings, getSensitiveSettings } from "../settings.js";
import { melhorEnvioCalculate } from "./melhorEnvio.js";

export type ShippingCalcInput = {
  toZip: string;
  items: Array<{ productId: string; variantId?: string | null; quantity: number }>;
};

export async function calculateShipping(input: ShippingCalcInput) {
  const settings = await getSettings();
  const sensitive = await getSensitiveSettings();

  const fromZip = sensitive.melhorEnvioFromZip ?? settings.melhorEnvioFromZip;
  const token = sensitive.melhorEnvioToken;

  const products = await prisma.product.findMany({
    where: {
      id: { in: input.items.map((i) => i.productId) },
      isActive: true
    },
    include: { variants: true }
  });

  const items = input.items.map((i) => {
    const product = products.find((p) => p.id === i.productId);
    if (!product) throw new Error("product_not_found");
    const variant = i.variantId
      ? product.variants.find((v) => v.id === i.variantId)
      : null;

    const weightGrams = variant?.weightGrams ?? 100;
    const weightKg = Math.max(0.01, weightGrams / 1000);
    const priceBrl = (product.promoPriceCents ?? product.priceCents) / 100;

    return {
      id: variant?.id ?? product.id,
      widthCm: 11,
      heightCm: 4,
      lengthCm: 17,
      weightKg,
      insuranceValueBrl: priceBrl,
      quantity: i.quantity
    };
  });

  let options:
    | Array<{ serviceCode: string; name: string; priceCents: number; deadlineDays: number }>
    | null = null;

  if (token && fromZip) {
    options = await melhorEnvioCalculate({
      token,
      fromZip,
      toZip: input.toZip,
      items
    });
  }

  if (!options || options.length === 0) {
    const base = 1890;
    const exp = 3290;
    options = [
      {
        serviceCode: "mock_economico",
        name: "Econômico",
        priceCents: base,
        deadlineDays: 6
      },
      {
        serviceCode: "mock_expresso",
        name: "Expresso",
        priceCents: exp,
        deadlineDays: 2
      }
    ];
  }

  const margin = Math.max(0, Math.min(100, settings.shippingMarginPercent));

  return options.map((o) => ({
    ...o,
    priceCents: Math.round(o.priceCents * (1 + margin / 100))
  }));
}

