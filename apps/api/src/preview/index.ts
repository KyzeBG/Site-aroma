import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import multer from "multer";
import fs from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcrypt";
import { z } from "zod";
import { asyncHandler } from "../utils/http.js";
import {
  createCsrfToken,
  requireAdminAuth,
  requireCsrf,
  signAdminToken
} from "./auth.js";
import {
  createOrder,
  loadPreviewDb,
  savePreviewDb,
  type PreviewDb
} from "./data.js";

const port = Number(process.env.PORT ?? "4000");
const appOrigin = process.env.APP_ORIGIN ?? "http://localhost:3000";

const app = express();
app.set("trust proxy", 1);

app.use(
  cors({
    origin: appOrigin,
    credentials: true
  })
);
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(
  rateLimit({
    windowMs: 60_000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.get("/health", (_req, res) => res.json({ ok: true, mode: "preview" }));

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

let db: PreviewDb;
db = await loadPreviewDb();

app.get(
  "/api/settings/public",
  asyncHandler(async (_req, res) => {
    res.json({
      storeName: db.settings.storeName,
      logoUrl: db.settings.logoUrl,
      colors: {
        primary: db.settings.primaryColor,
        background: db.settings.backgroundColor,
        accent: db.settings.accentColor
      },
      whatsapp: db.settings.whatsapp,
      contactEmail: db.settings.contactEmail,
      offers: {
        pixDiscountPercent: db.settings.pixDiscountPercent,
        freeShippingEnabled: db.settings.freeShippingEnabled,
        freeShippingMinSubtotalCents: db.settings.freeShippingMinSubtotalCents
      },
      home: db.settings.home ?? null
    });
  })
);

app.get(
  "/api/categories",
  asyncHandler(async (_req, res) => {
    res.json(db.categories);
  })
);

app.get(
  "/api/products",
  asyncHandler(async (req, res) => {
    const q = z
      .object({
        category: z.string().optional(),
        search: z.string().optional()
      })
      .parse(req.query);

    const cat = q.category
      ? db.categories.find((c) => c.slug === q.category)?.id ?? null
      : null;

    const products = db.products
      .filter((p) => p.isActive)
      .filter((p) => (cat ? p.categoryId === cat : true))
      .filter((p) =>
        q.search ? p.name.toLowerCase().includes(q.search.toLowerCase()) : true
      )
      .map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        benefits: p.benefits,
        priceCents: p.priceCents,
        promoPriceCents: p.promoPriceCents,
        imageUrl: p.images.sort((a, b) => a.sortOrder - b.sortOrder)[0]?.url ?? null
      }));

    res.json(products);
  })
);

app.get(
  "/api/products/:slug",
  asyncHandler(async (req, res) => {
    const { slug } = z.object({ slug: z.string().min(1) }).parse(req.params);
    const product = db.products.find((p) => p.slug === slug);
    if (!product || !product.isActive) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json({
      ...product,
      images: product.images.sort((a, b) => a.sortOrder - b.sortOrder)
    });
  })
);

app.post(
  "/api/shipping/calculate",
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        toZip: z.string().min(8),
        items: z
          .array(
            z.object({
              productId: z.string().min(1),
              variantId: z.string().min(1).optional().nullable(),
              quantity: z.coerce.number().int().positive()
            })
          )
          .min(1)
      })
      .parse(req.body);

    const margin = Math.max(0, Math.min(100, db.settings.shippingMarginPercent));
    const base = Math.round(1890 * (1 + margin / 100));
    const exp = Math.round(3290 * (1 + margin / 100));

    void body;
    res.json({
      options: [
        { id: "preview_economico", name: "Econômico", priceCents: base, deadlineDays: 6 },
        { id: "preview_expresso", name: "Expresso", priceCents: exp, deadlineDays: 2 }
      ]
    });
  })
);

app.post(
  "/api/payment/pix",
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        customer: z.object({
          name: z.string().min(2),
          email: z.string().email(),
          cpf: z.string().min(11),
          phone: z.string().min(8)
        }),
        address: z.object({
          zip: z.string().min(8),
          street: z.string().min(2),
          number: z.string().min(1),
          complement: z.string().optional().nullable(),
          neighborhood: z.string().min(2),
          city: z.string().min(2),
          state: z.string().min(2).max(2)
        }),
        items: z
          .array(
            z.object({
              productId: z.string().min(1),
              variantId: z.string().min(1).optional().nullable(),
              quantity: z.coerce.number().int().positive()
            })
          )
          .min(1),
        shipping: z.object({
          shippingCents: z.coerce.number().int().nonnegative(),
          serviceName: z.string().optional().nullable(),
          deadlineDays: z.coerce.number().int().optional().nullable()
        })
      })
      .parse(req.body);

    const order = createOrder({
      db,
      customer: body.customer,
      address: body.address,
      items: body.items,
      shipping: body.shipping,
      payment: { method: "PIX" }
    });

    const now = new Date().toISOString();
    const paymentId = "pay_" + Math.random().toString(36).slice(2, 10);
    db.payments.unshift({
      id: paymentId,
      orderId: order.id,
      provider: "MOCK",
      method: "PIX",
      status: "PENDING",
      providerPaymentId: null,
      payload: { copyPaste: `MOCK_PIX_${order.code}` },
      createdAt: now,
      updatedAt: now
    });

    await savePreviewDb(db);

    res.json({
      orderId: order.id,
      orderCode: order.code,
      paymentId,
      pixDiscountPercent: db.settings.pixDiscountPercent,
      qrCodeBase64: "",
      qrCode: "",
      copyPaste: `MOCK_PIX_${order.code}`,
      mode: "preview"
    });
  })
);

app.get(
  "/api/payment/status/:id",
  asyncHandler(async (req, res) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
    const payment =
      db.payments.find((p) => p.id === id) ??
      db.payments.find((p) => p.orderId === id) ??
      db.payments.find((p) => p.providerPaymentId === id);

    if (!payment) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    const order = db.orders.find((o) => o.id === payment.orderId) ?? null;

    res.json({
      paymentId: payment.id,
      provider: payment.provider,
      method: payment.method,
      status: payment.status,
      order
    });
  })
);

app.post(
  "/api/payment/mock/confirm/:orderId",
  asyncHandler(async (req, res) => {
    const { orderId } = z.object({ orderId: z.string().min(1) }).parse(req.params);
    const payment = db.payments.find((p) => p.orderId === orderId);
    const order = db.orders.find((o) => o.id === orderId);
    if (!payment || !order) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    const now = new Date().toISOString();
    payment.status = "PAID";
    payment.updatedAt = now;
    order.status = "PAID";
    order.updatedAt = now;
    await savePreviewDb(db);
    res.json({ ok: true });
  })
);

app.post(
  "/api/admin/login",
  asyncHandler(async (req, res) => {
    const body = z
      .object({ email: z.string().email(), password: z.string().min(6) })
      .parse(req.body);

    const user = db.adminUsers.find((u) => u.email === body.email);
    if (!user) {
      res.status(401).json({ error: "invalid_credentials" });
      return;
    }

    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: "invalid_credentials" });
      return;
    }

    const token = signAdminToken({ sub: user.id, email: user.email });
    const csrfToken = createCsrfToken();

    res.cookie("admin_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.cookie("csrf_token", csrfToken, {
      httpOnly: false,
      sameSite: "lax",
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ token, csrfToken });
  })
);

app.use("/api/admin", requireCsrf);

app.get(
  "/api/admin/dashboard",
  requireAdminAuth,
  asyncHandler(async (_req, res) => {
    const totalOrders = db.orders.length;
    const paidOrders = db.orders.filter((o) => o.status === "PAID").length;
    const revenueCents = db.orders.reduce((acc, o) => acc + o.totalCents, 0);
    const recentOrders = db.orders.slice(0, 10);
    res.json({ totalOrders, paidOrders, revenueCents, recentOrders });
  })
);

app.get(
  "/api/admin/products",
  requireAdminAuth,
  asyncHandler(async (_req, res) => {
    res.json(db.products);
  })
);

app.post(
  "/api/admin/products",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        name: z.string().min(2),
        slug: z.string().min(2),
        description: z.string().min(10),
        benefits: z.array(z.string().min(2)).default([]),
        priceCents: z.coerce.number().int().nonnegative(),
        promoPriceCents: z.coerce.number().int().nullable().optional(),
        categoryId: z.string().nullable().optional(),
        stock: z.coerce.number().int().nonnegative().default(0),
        isActive: z.boolean().default(true),
        images: z
          .array(
            z.object({
              url: z.string().url(),
              alt: z.string().optional().nullable(),
              sortOrder: z.coerce.number().int().default(0)
            })
          )
          .default([]),
        variants: z
          .array(
            z.object({
              label: z.string().min(1),
              weightGrams: z.coerce.number().int().optional().nullable(),
              type: z.string().optional().nullable(),
              quantity: z.coerce.number().int().optional().nullable(),
              priceDeltaCents: z.coerce.number().int().default(0),
              stock: z.coerce.number().int().default(0)
            })
          )
          .default([])
      })
      .parse(req.body);

    const now = new Date().toISOString();
    const product = {
      id: "prod_" + Math.random().toString(36).slice(2, 10),
      name: body.name,
      slug: body.slug,
      description: body.description,
      benefits: body.benefits,
      priceCents: body.priceCents,
      promoPriceCents: body.promoPriceCents ?? null,
      stock: body.stock,
      isActive: body.isActive,
      categoryId: body.categoryId ?? null,
      images: body.images,
      variants: body.variants.map((v) => ({
        id: "var_" + Math.random().toString(36).slice(2, 10),
        label: v.label,
        weightGrams: v.weightGrams ?? null,
        type: v.type ?? null,
        quantity: v.quantity ?? null,
        priceDeltaCents: v.priceDeltaCents,
        stock: v.stock
      })),
      createdAt: now,
      updatedAt: now
    };

    db.products.unshift(product as any);
    await savePreviewDb(db);
    res.json(product);
  })
);

app.put(
  "/api/admin/products/:id",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
    const body = z
      .object({
        name: z.string().min(2).optional(),
        slug: z.string().min(2).optional(),
        description: z.string().min(10).optional(),
        benefits: z.array(z.string().min(2)).optional(),
        priceCents: z.coerce.number().int().nonnegative().optional(),
        promoPriceCents: z.coerce.number().int().nullable().optional(),
        categoryId: z.string().nullable().optional(),
        stock: z.coerce.number().int().nonnegative().optional(),
        isActive: z.boolean().optional(),
        images: z
          .array(
            z.object({
              url: z.string().url(),
              alt: z.string().optional().nullable(),
              sortOrder: z.coerce.number().int().default(0)
            })
          )
          .optional(),
        variants: z
          .array(
            z.object({
              label: z.string().min(1),
              weightGrams: z.coerce.number().int().optional().nullable(),
              type: z.string().optional().nullable(),
              quantity: z.coerce.number().int().optional().nullable(),
              priceDeltaCents: z.coerce.number().int().default(0),
              stock: z.coerce.number().int().default(0)
            })
          )
          .optional()
      })
      .parse(req.body);

    const p = db.products.find((x) => x.id === id);
    if (!p) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    const now = new Date().toISOString();
    Object.assign(p, {
      ...body,
      promoPriceCents: body.promoPriceCents ?? p.promoPriceCents,
      categoryId: body.categoryId ?? p.categoryId,
      images: body.images ?? p.images,
      variants: body.variants
        ? body.variants.map((v) => ({
            id: "var_" + Math.random().toString(36).slice(2, 10),
            label: v.label,
            weightGrams: v.weightGrams ?? null,
            type: v.type ?? null,
            quantity: v.quantity ?? null,
            priceDeltaCents: v.priceDeltaCents,
            stock: v.stock
          }))
        : p.variants,
      updatedAt: now
    });

    await savePreviewDb(db);
    res.json(p);
  })
);

app.delete(
  "/api/admin/products/:id",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
    db.products = db.products.filter((p) => p.id !== id);
    await savePreviewDb(db);
    res.json({ ok: true });
  })
);

app.get(
  "/api/admin/orders",
  requireAdminAuth,
  asyncHandler(async (_req, res) => {
    res.json(db.orders);
  })
);

app.get(
  "/api/admin/orders/:id",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
    const order = db.orders.find((o) => o.id === id);
    if (!order) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json(order);
  })
);

app.put(
  "/api/admin/orders/:id",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
    const body = z
      .object({
        status: z.enum(["PENDING_PAYMENT", "PAID", "SHIPPED", "DELIVERED", "CANCELED"])
      })
      .parse(req.body);

    const order = db.orders.find((o) => o.id === id);
    if (!order) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    order.status = body.status;
    order.updatedAt = new Date().toISOString();
    await savePreviewDb(db);
    res.json(order);
  })
);

app.get(
  "/api/admin/settings",
  requireAdminAuth,
  asyncHandler(async (_req, res) => {
    res.json({
      ...db.settings,
      sensitive: {
        melhorEnvioFromZip: db.settings.melhorEnvioFromZip,
        melhorEnvioTokenConfigured: Boolean(db.settings.melhorEnvioToken),
        mercadoPagoConfigured: Boolean(db.settings.mercadoPagoAccessToken),
        mercadoPagoPublicKeyConfigured: Boolean(db.settings.mercadoPagoPublicKey)
      }
    });
  })
);

app.put(
  "/api/admin/settings",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        storeName: z.string().min(2).optional(),
        logoUrl: z.string().url().nullable().optional(),
        primaryColor: z.string().min(4).optional(),
        backgroundColor: z.string().min(4).optional(),
        accentColor: z.string().min(4).optional(),
        whatsapp: z.string().nullable().optional(),
        contactEmail: z.string().email().nullable().optional(),
        pixDiscountPercent: z.coerce.number().int().min(0).max(30).optional(),
        freeShippingEnabled: z.boolean().optional(),
        freeShippingMinSubtotalCents: z.coerce.number().int().min(0).optional(),
        shippingMarginPercent: z.coerce.number().int().min(0).max(100).optional(),
        home: z.any().optional(),
        melhorEnvioFromZip: z.string().nullable().optional(),
        melhorEnvioToken: z.string().nullable().optional(),
        mercadoPagoAccessToken: z.string().nullable().optional(),
        mercadoPagoPublicKey: z.string().nullable().optional()
      })
      .parse(req.body);

    db.settings = { ...db.settings, ...body };
    await savePreviewDb(db);
    res.json(db.settings);
  })
);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

app.post(
  "/api/admin/upload",
  requireAdminAuth,
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      res.status(400).json({ error: "file_required" });
      return;
    }
    const uploadsDir = path.join(process.cwd(), "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });
    const safeName = `${Date.now()}-${file.originalname}`.replace(/[^\w.-]+/g, "_");
    const fullPath = path.join(uploadsDir, safeName);
    await fs.writeFile(fullPath, file.buffer);
    res.json({ url: `/uploads/${safeName}` });
  })
);

app.listen(port, () => {
  console.log(`Preview API listening on http://localhost:${port}`);
});
