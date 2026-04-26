import { prisma } from "../db/prisma.js";
import { getSettings } from "./settings.js";
import { sumCents } from "../utils/money.js";
import { publishAdminEvent } from "./adminEvents.js";

function createOrderCode() {
  const d = new Date();
  const y = String(d.getFullYear()).slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `TG${y}${m}${day}-${rand}`;
}

export type CheckoutItemInput = {
  productId: string;
  variantId?: string | null;
  quantity: number;
};

export async function createPendingOrder(params: {
  customer: {
    name: string;
    email: string;
    cpf: string;
    phone: string;
  };
  address: {
    zip: string;
    street: string;
    number: string;
    complement?: string | null;
    neighborhood: string;
    city: string;
    state: string;
  };
  items: CheckoutItemInput[];
  shipping: {
    serviceName?: string | null;
    deadlineDays?: number | null;
    shippingCents: number;
  };
  payment: { method: "PIX" | "CREDIT_CARD" };
}) {
  const settings = await getSettings();

  const products = await prisma.product.findMany({
    where: { id: { in: params.items.map((i) => i.productId) }, isActive: true },
    include: { variants: true }
  });

  const orderItems = params.items.map((i) => {
    const product = products.find((p) => p.id === i.productId);
    if (!product) throw new Error("product_not_found");
    const variant = i.variantId
      ? product.variants.find((v) => v.id === i.variantId)
      : null;
    if (i.quantity <= 0) throw new Error("invalid_quantity");

    const unit = (product.promoPriceCents ?? product.priceCents) + (variant?.priceDeltaCents ?? 0);
    const total = unit * i.quantity;

    return {
      productId: product.id,
      variantId: variant?.id ?? null,
      nameSnapshot: product.name,
      variantSnapshot: variant?.label ?? null,
      unitPriceCents: unit,
      quantity: i.quantity,
      totalCents: total
    };
  });

  const subtotalCents = sumCents(orderItems.map((i) => i.totalCents));

  let shippingCents = Math.max(0, params.shipping.shippingCents);
  if (settings.freeShippingEnabled && subtotalCents >= settings.freeShippingMinSubtotalCents) {
    shippingCents = 0;
  }

  const pixDiscountPercent = Math.max(0, Math.min(30, settings.pixDiscountPercent));
  const discountCents =
    params.payment.method === "PIX"
      ? Math.round((subtotalCents * pixDiscountPercent) / 100)
      : 0;

  const totalCents = Math.max(0, subtotalCents + shippingCents - discountCents);

  const order = await prisma.order.create({
    data: {
      code: createOrderCode(),
      customerName: params.customer.name,
      email: params.customer.email,
      cpf: params.customer.cpf,
      phone: params.customer.phone,
      subtotalCents,
      shippingCents,
      discountCents,
      totalCents,
      shippingServiceName: params.shipping.serviceName ?? null,
      shippingDeadlineDays: params.shipping.deadlineDays ?? null,
      address: {
        create: {
          zip: params.address.zip,
          street: params.address.street,
          number: params.address.number,
          complement: params.address.complement ?? null,
          neighborhood: params.address.neighborhood,
          city: params.address.city,
          state: params.address.state
        }
      },
      items: { create: orderItems }
    },
    include: { items: true }
  });

  publishAdminEvent({
    type: "order_created",
    orderId: order.id,
    code: order.code,
    totalCents: order.totalCents
  });

  return { order, pixDiscountPercent };
}

