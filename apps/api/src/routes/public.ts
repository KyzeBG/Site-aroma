import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { asyncHandler } from "../utils/http.js";
import { calculateShipping } from "../services/shipping/index.js";
import { createPendingOrder } from "../services/orders.js";
import { getPublicSettings, getSensitiveSettings } from "../services/settings.js";
import { env } from "../config/env.js";
import { mercadoPagoCreatePix, mercadoPagoGetPaymentStatus } from "../services/payment/mercadoPago.js";
import { publishAdminEvent } from "../services/adminEvents.js";

export const publicRouter = Router();

publicRouter.get(
  "/settings/public",
  asyncHandler(async (_req, res) => {
    res.json(await getPublicSettings());
  })
);

publicRouter.get(
  "/categories",
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
    res.json(categories);
  })
);

publicRouter.get(
  "/products",
  asyncHandler(async (req, res) => {
    const q = z
      .object({
        category: z.string().optional(),
        search: z.string().optional()
      })
      .parse(req.query);

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        category: q.category ? { slug: q.category } : undefined,
        name: q.search ? { contains: q.search, mode: "insensitive" } : undefined
      },
      include: { images: { orderBy: { sortOrder: "asc" } } },
      orderBy: { createdAt: "desc" }
    });

    res.json(
      products.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        benefits: p.benefits,
        priceCents: p.priceCents,
        promoPriceCents: p.promoPriceCents,
        imageUrl: p.images[0]?.url ?? null
      }))
    );
  })
);

publicRouter.get(
  "/products/:slug",
  asyncHandler(async (req, res) => {
    const { slug } = z.object({ slug: z.string().min(1) }).parse(req.params);
    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        variants: true,
        category: true
      }
    });

    if (!product || !product.isActive) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    res.json(product);
  })
);

publicRouter.post(
  "/shipping/calculate",
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

    const options = await calculateShipping(body);
    res.json({
      options: options.map((o) => ({
        id: o.serviceCode,
        name: o.name,
        priceCents: o.priceCents,
        deadlineDays: o.deadlineDays
      }))
    });
  })
);

publicRouter.post(
  "/payment/pix",
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

    const { order, pixDiscountPercent } = await createPendingOrder({
      customer: body.customer,
      address: body.address,
      items: body.items,
      shipping: body.shipping,
      payment: { method: "PIX" }
    });

    const sensitive = await getSensitiveSettings();
    const accessToken = sensitive.mercadoPagoAccessToken;

    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: accessToken ? "MERCADOPAGO" : "MOCK",
        method: "PIX",
        status: "PENDING"
      }
    });

    if (!accessToken) {
      res.json({
        orderId: order.id,
        orderCode: order.code,
        paymentId: payment.id,
        pixDiscountPercent,
        qrCodeBase64: "",
        qrCode: "",
        copyPaste: "MOCK_PIX",
        mode: "mock"
      });
      return;
    }

    const mp = await mercadoPagoCreatePix({
      accessToken,
      amountCents: order.totalCents,
      description: `Pedido ${order.code}`,
      payer: { email: order.email, cpf: order.cpf }
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { providerPaymentId: mp.providerPaymentId, payload: mp.raw }
    });

    res.json({
      orderId: order.id,
      orderCode: order.code,
      paymentId: payment.id,
      pixDiscountPercent,
      qrCodeBase64: mp.qrCodeBase64,
      qrCode: mp.qrCode,
      copyPaste: mp.copyPaste,
      mode: "mercadopago"
    });
  })
);

publicRouter.post(
  "/payment/credit-card",
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
        }),
        card: z.object({
          token: z.string().min(10),
          paymentMethodId: z.string().min(2),
          issuerId: z.string().optional().nullable(),
          installments: z.coerce.number().int().min(1).max(12)
        })
      })
      .parse(req.body);

    const { order } = await createPendingOrder({
      customer: body.customer,
      address: body.address,
      items: body.items,
      shipping: body.shipping,
      payment: { method: "CREDIT_CARD" }
    });

    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: "MOCK",
        method: "CREDIT_CARD",
        status: "PENDING",
        payload: { card: { paymentMethodId: body.card.paymentMethodId, installments: body.card.installments } }
      }
    });

    res.json({
      orderId: order.id,
      orderCode: order.code,
      paymentId: payment.id,
      status: "PENDING",
      mode: "mock"
    });
  })
);

publicRouter.get(
  "/payment/status/:id",
  asyncHandler(async (req, res) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(req.params);

    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { id },
          { orderId: id },
          { providerPaymentId: id }
        ]
      },
      include: { order: true }
    });

    if (!payment) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    const sensitive = await getSensitiveSettings();
    const accessToken = sensitive.mercadoPagoAccessToken;

    if (payment.provider === "MERCADOPAGO" && accessToken && payment.providerPaymentId) {
      const mp = await mercadoPagoGetPaymentStatus({
        accessToken,
        providerPaymentId: payment.providerPaymentId
      });

      const newStatus =
        mp.status === "approved"
          ? "PAID"
          : mp.status === "rejected"
            ? "FAILED"
            : payment.status;

      if (newStatus !== payment.status) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: newStatus, payload: mp.raw }
        });

        if (newStatus === "PAID" && payment.order.status === "PENDING_PAYMENT") {
          await prisma.order.update({
            where: { id: payment.orderId },
            data: { status: "PAID" }
          });

          publishAdminEvent({
            type: "order_paid",
            orderId: payment.orderId,
            code: payment.order.code,
            totalCents: payment.order.totalCents
          });
        }
      }
    }

    const updated = await prisma.payment.findUnique({
      where: { id: payment.id },
      include: { order: { include: { items: true } } }
    });

    res.json({
      paymentId: updated?.id,
      provider: updated?.provider,
      method: updated?.method,
      status: updated?.status,
      order: updated?.order
        ? {
            id: updated.order.id,
            code: updated.order.code,
            status: updated.order.status,
            subtotalCents: updated.order.subtotalCents,
            shippingCents: updated.order.shippingCents,
            discountCents: updated.order.discountCents,
            totalCents: updated.order.totalCents,
            items: updated.order.items
          }
        : null
    });
  })
);

publicRouter.post(
  "/payment/mock/confirm/:orderId",
  asyncHandler(async (req, res) => {
    if (!env.ENABLE_MOCK_PAYMENTS) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    const { orderId } = z.object({ orderId: z.string().min(1) }).parse(req.params);

    const payment = await prisma.payment.findFirst({ where: { orderId } });
    if (!payment) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    await prisma.payment.update({ where: { id: payment.id }, data: { status: "PAID" } });
    await prisma.order.update({ where: { id: orderId }, data: { status: "PAID" } });
    res.json({ ok: true });
  })
);

