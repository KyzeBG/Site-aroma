import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "node:path";
import fs from "node:fs/promises";
import { prisma } from "../db/prisma.js";
import { asyncHandler } from "../utils/http.js";
import { requireAdminAuth, signAdminToken, type AuthedAdminRequest } from "../middleware/adminAuth.js";
import { createCsrfToken, requireCsrf } from "../middleware/csrf.js";
import { updateSettings, getSettings, getSensitiveSettings } from "../services/settings.js";
import { subscribeAdminEvents } from "../services/adminEvents.js";

export const adminRouter = Router();

adminRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        email: z.string().email(),
        password: z.string().min(6)
      })
      .parse(req.body);

    const user = await prisma.adminUser.findUnique({ where: { email: body.email } });
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

adminRouter.use(requireCsrf);

adminRouter.get(
  "/me",
  requireAdminAuth,
  asyncHandler(async (req: AuthedAdminRequest, res) => {
    res.json({ id: req.admin?.sub, email: req.admin?.email });
  })
);

adminRouter.get("/events", requireAdminAuth, (req, res) => {
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");

  const send = (data: unknown) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  send({ type: "ping" });

  const unsub = subscribeAdminEvents((evt) => send(evt));
  const interval = setInterval(() => send({ type: "ping" }), 25_000);

  req.on("close", () => {
    clearInterval(interval);
    unsub();
    res.end();
  });
});

adminRouter.get(
  "/dashboard",
  requireAdminAuth,
  asyncHandler(async (_req, res) => {
    const [totalOrders, paidOrders, sum] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: "PAID" } }),
      prisma.order.aggregate({ _sum: { totalCents: true } })
    ]);

    const recentOrders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { items: true }
    });

    res.json({
      totalOrders,
      paidOrders,
      revenueCents: sum._sum.totalCents ?? 0,
      recentOrders
    });
  })
);

adminRouter.get(
  "/products",
  requireAdminAuth,
  asyncHandler(async (_req, res) => {
    const products = await prisma.product.findMany({
      include: { images: { orderBy: { sortOrder: "asc" } }, variants: true, category: true },
      orderBy: { createdAt: "desc" }
    });
    res.json(products);
  })
);

adminRouter.post(
  "/products",
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

    const product = await prisma.product.create({
      data: {
        name: body.name,
        slug: body.slug,
        description: body.description,
        benefits: body.benefits,
        priceCents: body.priceCents,
        promoPriceCents: body.promoPriceCents ?? null,
        categoryId: body.categoryId ?? null,
        stock: body.stock,
        isActive: body.isActive,
        images: { create: body.images.map((i) => ({ url: i.url, alt: i.alt ?? null, sortOrder: i.sortOrder })) },
        variants: { create: body.variants.map((v) => ({ ...v, weightGrams: v.weightGrams ?? null, type: v.type ?? null, quantity: v.quantity ?? null })) }
      },
      include: { images: true, variants: true, category: true }
    });

    res.json(product);
  })
);

adminRouter.put(
  "/products/:id",
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
              id: z.string().optional(),
              url: z.string().url(),
              alt: z.string().optional().nullable(),
              sortOrder: z.coerce.number().int().default(0)
            })
          )
          .optional(),
        variants: z
          .array(
            z.object({
              id: z.string().optional(),
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

    const updated = await prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id },
        data: {
          name: body.name,
          slug: body.slug,
          description: body.description,
          benefits: body.benefits,
          priceCents: body.priceCents,
          promoPriceCents: body.promoPriceCents,
          categoryId: body.categoryId,
          stock: body.stock,
          isActive: body.isActive
        }
      });

      if (body.images) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        await tx.productImage.createMany({
          data: body.images.map((i) => ({
            productId: id,
            url: i.url,
            alt: i.alt ?? null,
            sortOrder: i.sortOrder
          }))
        });
      }

      if (body.variants) {
        await tx.productVariant.deleteMany({ where: { productId: id } });
        await tx.productVariant.createMany({
          data: body.variants.map((v) => ({
            productId: id,
            label: v.label,
            weightGrams: v.weightGrams ?? null,
            type: v.type ?? null,
            quantity: v.quantity ?? null,
            priceDeltaCents: v.priceDeltaCents,
            stock: v.stock
          }))
        });
      }

      return tx.product.findUnique({
        where: { id },
        include: { images: { orderBy: { sortOrder: "asc" } }, variants: true, category: true }
      });
    });

    res.json(updated);
  })
);

adminRouter.delete(
  "/products/:id",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
    await prisma.product.delete({ where: { id } });
    res.json({ ok: true });
  })
);

adminRouter.get(
  "/orders",
  requireAdminAuth,
  asyncHandler(async (_req, res) => {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: { items: true, payment: true }
    });
    res.json(orders);
  })
);

adminRouter.get(
  "/orders/:id",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, payment: true, address: true }
    });
    if (!order) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json(order);
  })
);

adminRouter.put(
  "/orders/:id",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
    const body = z
      .object({
        status: z.enum(["PENDING_PAYMENT", "PAID", "SHIPPED", "DELIVERED", "CANCELED"])
      })
      .parse(req.body);

    const order = await prisma.order.update({ where: { id }, data: { status: body.status } });
    res.json(order);
  })
);

adminRouter.get(
  "/settings",
  requireAdminAuth,
  asyncHandler(async (_req, res) => {
    const s = await getSettings();
    const sensitive = await getSensitiveSettings();
    res.json({
      ...s,
      melhorEnvioTokenEnc: undefined,
      mercadoPagoAccessTokenEnc: undefined,
      mercadoPagoPublicKeyEnc: undefined,
      melhorEnvioToken: "",
      mercadoPagoAccessToken: "",
      mercadoPagoPublicKey: "",
      sensitive: {
        melhorEnvioFromZip: sensitive.melhorEnvioFromZip,
        melhorEnvioTokenConfigured: Boolean(sensitive.melhorEnvioToken),
        mercadoPagoConfigured: Boolean(sensitive.mercadoPagoAccessToken),
        mercadoPagoPublicKeyConfigured: Boolean(sensitive.mercadoPagoPublicKey)
      }
    });
  })
);

adminRouter.put(
  "/settings",
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

    const updated = await updateSettings(body);
    res.json(updated);
  })
);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

adminRouter.post(
  "/upload",
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

