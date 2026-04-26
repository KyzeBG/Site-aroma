import fs from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcrypt";

export type PreviewProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  benefits: string[];
  priceCents: number;
  promoPriceCents: number | null;
  stock: number;
  isActive: boolean;
  categoryId: string | null;
  images: Array<{ url: string; alt: string | null; sortOrder: number }>;
  variants: Array<{
    id: string;
    label: string;
    weightGrams: number | null;
    type: string | null;
    quantity: number | null;
    priceDeltaCents: number;
    stock: number;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type PreviewCategory = { id: string; name: string; slug: string };

export type PreviewOrder = {
  id: string;
  code: string;
  status: "PENDING_PAYMENT" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELED";
  customerName: string;
  email: string;
  cpf: string;
  phone: string;
  address: {
    zip: string;
    street: string;
    number: string;
    complement: string | null;
    neighborhood: string;
    city: string;
    state: string;
  };
  items: Array<{
    id: string;
    productId: string;
    variantId: string | null;
    nameSnapshot: string;
    variantSnapshot: string | null;
    unitPriceCents: number;
    quantity: number;
    totalCents: number;
  }>;
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  totalCents: number;
  shippingServiceName: string | null;
  shippingDeadlineDays: number | null;
  createdAt: string;
  updatedAt: string;
};

export type PreviewPayment = {
  id: string;
  orderId: string;
  provider: "MOCK";
  method: "PIX" | "CREDIT_CARD";
  status: "PENDING" | "PAID" | "FAILED" | "CANCELED";
  providerPaymentId: string | null;
  payload: any;
  createdAt: string;
  updatedAt: string;
};

export type PreviewSettings = {
  storeName: string;
  logoUrl: string | null;
  primaryColor: string;
  backgroundColor: string;
  accentColor: string;
  whatsapp: string | null;
  contactEmail: string | null;
  pixDiscountPercent: number;
  freeShippingEnabled: boolean;
  freeShippingMinSubtotalCents: number;
  shippingMarginPercent: number;
  home: any;
  melhorEnvioToken: string | null;
  melhorEnvioFromZip: string | null;
  mercadoPagoAccessToken: string | null;
  mercadoPagoPublicKey: string | null;
};

export type PreviewAdminUser = { id: string; email: string; passwordHash: string };

export type PreviewDb = {
  version: number;
  adminUsers: PreviewAdminUser[];
  settings: PreviewSettings;
  categories: PreviewCategory[];
  products: PreviewProduct[];
  orders: PreviewOrder[];
  payments: PreviewPayment[];
};

function cuidLike() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function orderCode() {
  const d = new Date();
  const y = String(d.getFullYear()).slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `TG${y}${m}${day}-${rand}`;
}

export function computeSubtotalCents(items: Array<{ totalCents: number }>) {
  return items.reduce((acc, i) => acc + i.totalCents, 0);
}

export function computeDiscountCents(subtotalCents: number, pixDiscountPercent: number) {
  const p = Math.max(0, Math.min(30, pixDiscountPercent));
  return Math.round((subtotalCents * p) / 100);
}

export function computeTotalCents(params: {
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
}) {
  return Math.max(0, params.subtotalCents + params.shippingCents - params.discountCents);
}

export function dataFilePath() {
  return path.join(process.cwd(), "preview-data.json");
}

export async function loadPreviewDb(): Promise<PreviewDb> {
  const file = dataFilePath();
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as PreviewDb;
  } catch {
    const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@tempero.com";
    const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin123456";
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    const catId = cuidLike();
    const prodId = cuidLike();
    const now = new Date().toISOString();

    const db: PreviewDb = {
      version: 1,
      adminUsers: [{ id: cuidLike(), email: adminEmail, passwordHash }],
      settings: {
        storeName: "Tempero Gourmet",
        logoUrl: null,
        primaryColor: "#8B4513",
        backgroundColor: "#FAEBD7",
        accentColor: "#D2691E",
        whatsapp: null,
        contactEmail: null,
        pixDiscountPercent: 5,
        freeShippingEnabled: false,
        freeShippingMinSubtotalCents: 0,
        shippingMarginPercent: 0,
        home: {
          banner: {
            title: "Temperos Premium Direto para Sua Casa",
            subtitle: "Ervas, especiarias e produtos naturais com qualidade gourmet.",
            ctaText: "Comprar agora",
            ctaHref: "/#mais-vendidos",
            imageUrl:
              "https://images.unsplash.com/photo-1542204165-65bf26472b9b?auto=format&fit=crop&w=1600&q=80"
          },
          benefits: [
            { title: "Aroma intenso", description: "Temperos e pimentas com presença e personalidade." },
            { title: "Ingredientes selecionados", description: "Curadoria focada em frescor e autenticidade." },
            { title: "Variedade", description: "Do cotidiano ao gourmet, para todo tipo de receita." }
          ]
        },
        melhorEnvioToken: null,
        melhorEnvioFromZip: null,
        mercadoPagoAccessToken: null,
        mercadoPagoPublicKey: null
      },
      categories: [{ id: catId, name: "Temperos", slug: "temperos" }],
      products: [
        {
          id: prodId,
          name: "Pimenta Preta em Grãos",
          slug: "pimenta-preta-grao",
          description:
            "Pimenta preta premium em grãos, ideal para moer na hora e elevar qualquer receita.",
          benefits: ["Aroma intenso", "Ideal para moer na hora", "Seleção premium"],
          priceCents: 2490,
          promoPriceCents: null,
          stock: 100,
          isActive: true,
          categoryId: catId,
          images: [
            {
              url: "https://images.unsplash.com/photo-1601655781320-205e34c27b06?auto=format&fit=crop&w=1600&q=80",
              alt: "Pimenta preta em grãos",
              sortOrder: 0
            }
          ],
          variants: [
            {
              id: cuidLike(),
              label: "50g",
              weightGrams: 50,
              type: null,
              quantity: null,
              priceDeltaCents: 0,
              stock: 50
            },
            {
              id: cuidLike(),
              label: "100g",
              weightGrams: 100,
              type: null,
              quantity: null,
              priceDeltaCents: 900,
              stock: 50
            }
          ],
          createdAt: now,
          updatedAt: now
        }
      ],
      orders: [],
      payments: []
    };

    await savePreviewDb(db);
    return db;
  }
}

export async function savePreviewDb(db: PreviewDb) {
  const file = dataFilePath();
  await fs.writeFile(file, JSON.stringify(db, null, 2), "utf8");
}

export function createOrder(params: {
  db: PreviewDb;
  customer: { name: string; email: string; cpf: string; phone: string };
  address: PreviewOrder["address"];
  items: Array<{ productId: string; variantId?: string | null; quantity: number }>;
  shipping: { shippingCents: number; serviceName?: string | null; deadlineDays?: number | null };
  payment: { method: "PIX" | "CREDIT_CARD" };
}) {
  const now = new Date().toISOString();
  const orderId = cuidLike();

  const orderItems = params.items.map((i) => {
    const product = params.db.products.find((p) => p.id === i.productId && p.isActive);
    if (!product) throw new Error("product_not_found");
    const variant = i.variantId ? product.variants.find((v) => v.id === i.variantId) : null;
    const unit = (product.promoPriceCents ?? product.priceCents) + (variant?.priceDeltaCents ?? 0);
    const total = unit * i.quantity;
    return {
      id: cuidLike(),
      productId: product.id,
      variantId: variant?.id ?? null,
      nameSnapshot: product.name,
      variantSnapshot: variant?.label ?? null,
      unitPriceCents: unit,
      quantity: i.quantity,
      totalCents: total
    };
  });

  const subtotalCents = computeSubtotalCents(orderItems);
  let shippingCents = Math.max(0, params.shipping.shippingCents);
  if (
    params.db.settings.freeShippingEnabled &&
    subtotalCents >= params.db.settings.freeShippingMinSubtotalCents
  ) {
    shippingCents = 0;
  }

  const discountCents =
    params.payment.method === "PIX"
      ? computeDiscountCents(subtotalCents, params.db.settings.pixDiscountPercent)
      : 0;

  const totalCents = computeTotalCents({ subtotalCents, shippingCents, discountCents });

  const order: PreviewOrder = {
    id: orderId,
    code: orderCode(),
    status: "PENDING_PAYMENT",
    customerName: params.customer.name,
    email: params.customer.email,
    cpf: params.customer.cpf,
    phone: params.customer.phone,
    address: {
      zip: params.address.zip,
      street: params.address.street,
      number: params.address.number,
      complement: params.address.complement ?? null,
      neighborhood: params.address.neighborhood,
      city: params.address.city,
      state: params.address.state
    },
    items: orderItems,
    subtotalCents,
    shippingCents,
    discountCents,
    totalCents,
    shippingServiceName: params.shipping.serviceName ?? null,
    shippingDeadlineDays: params.shipping.deadlineDays ?? null,
    createdAt: now,
    updatedAt: now
  };

  params.db.orders.unshift(order);
  return order;
}
