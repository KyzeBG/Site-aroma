import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import url from "node:url";
import crypto from "node:crypto";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const port = Number(process.env.API_PORT ?? "4000");
const appOrigin = process.env.APP_ORIGIN ?? "http://localhost:3000";
const dataFile = path.join(__dirname, "preview-data.json");

function json(res, status, body, headers = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    ...headers
  });
  res.end(payload);
}

function text(res, status, body, headers = {}) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8", ...headers });
  res.end(body);
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(";").forEach((part) => {
    const [k, ...rest] = part.trim().split("=");
    out[k] = decodeURIComponent(rest.join("="));
  });
  return out;
}

function setCookie(name, value, opts = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (opts.maxAge) parts.push(`Max-Age=${opts.maxAge}`);
  parts.push(`Path=/`);
  parts.push(`SameSite=Lax`);
  if (opts.httpOnly) parts.push("HttpOnly");
  return parts.join("; ");
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return null;
  return JSON.parse(raw);
}

async function loadDb() {
  try {
    const raw = await fs.readFile(dataFile, "utf8");
    return JSON.parse(raw);
  } catch {
    const now = new Date().toISOString();
    const catId = crypto.randomUUID();
    const prodId = crypto.randomUUID();
    const db = {
      version: 1,
      admin: { email: "admin@tempero.com", password: "admin123456" },
      settings: {
        storeName: "Tempero Gourmet",
        logoUrl: null,
        primaryColor: "#8B4513",
        backgroundColor: "#FFFFFF",
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
        }
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
            { id: crypto.randomUUID(), label: "50g", weightGrams: 50, priceDeltaCents: 0, stock: 50 },
            { id: crypto.randomUUID(), label: "100g", weightGrams: 100, priceDeltaCents: 900, stock: 50 }
          ],
          createdAt: now,
          updatedAt: now
        }
      ],
      orders: [],
      payments: []
    };
    await fs.writeFile(dataFile, JSON.stringify(db, null, 2), "utf8");
    return db;
  }
}

async function saveDb(db) {
  await fs.writeFile(dataFile, JSON.stringify(db, null, 2), "utf8");
}

function orderCode() {
  const d = new Date();
  const y = String(d.getFullYear()).slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `TG${y}${m}${day}-${rand}`;
}

function corsHeaders(req) {
  const origin = req.headers.origin;
  if (origin && origin === appOrigin) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Headers": "Content-Type, X-CSRF-Token",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
    };
  }
  return {};
}

const sessions = new Map();

function requireAdmin(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.admin_token;
  if (!token || !sessions.has(token)) {
    json(res, 401, { error: "unauthorized" }, corsHeaders(req));
    return false;
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const csrfCookie = cookies.csrf_token;
    const csrfHeader = req.headers["x-csrf-token"];
    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      json(res, 403, { error: "csrf" }, corsHeaders(req));
      return false;
    }
  }
  return true;
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const headers = corsHeaders(req);

  if (req.method === "OPTIONS") {
    res.writeHead(204, headers);
    res.end();
    return;
  }

  if (u.pathname === "/health") {
    json(res, 200, { ok: true, mode: "static-preview-api" }, headers);
    return;
  }

  const db = await loadDb();

  if (req.method === "GET" && u.pathname === "/api/settings/public") {
    json(
      res,
      200,
      {
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
      },
      headers
    );
    return;
  }

  if (req.method === "GET" && u.pathname === "/api/categories") {
    json(res, 200, db.categories, headers);
    return;
  }

  if (req.method === "GET" && u.pathname === "/api/products") {
    const category = u.searchParams.get("category");
    const search = u.searchParams.get("search");
    const catId = category ? db.categories.find((c) => c.slug === category)?.id ?? null : null;
    const products = db.products
      .filter((p) => p.isActive)
      .filter((p) => (catId ? p.categoryId === catId : true))
      .filter((p) => (search ? p.name.toLowerCase().includes(search.toLowerCase()) : true))
      .map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        benefits: p.benefits,
        priceCents: p.priceCents,
        promoPriceCents: p.promoPriceCents,
        imageUrl: (p.images || []).slice().sort((a, b) => a.sortOrder - b.sortOrder)[0]?.url ?? null
      }));
    json(res, 200, products, headers);
    return;
  }

  if (req.method === "GET" && u.pathname.startsWith("/api/products/")) {
    const slug = decodeURIComponent(u.pathname.split("/").pop() || "");
    const p = db.products.find((x) => x.slug === slug && x.isActive);
    if (!p) return json(res, 404, { error: "not_found" }, headers);
    json(res, 200, { ...p, images: (p.images || []).slice().sort((a, b) => a.sortOrder - b.sortOrder) }, headers);
    return;
  }

  if (req.method === "POST" && u.pathname === "/api/shipping/calculate") {
    const body = await readJsonBody(req);
    void body;
    const margin = Math.max(0, Math.min(100, db.settings.shippingMarginPercent || 0));
    const base = Math.round(1890 * (1 + margin / 100));
    const exp = Math.round(3290 * (1 + margin / 100));
    json(
      res,
      200,
      {
        options: [
          { id: "preview_economico", name: "Econômico", priceCents: base, deadlineDays: 6 },
          { id: "preview_expresso", name: "Expresso", priceCents: exp, deadlineDays: 2 }
        ]
      },
      headers
    );
    return;
  }

  if (req.method === "POST" && u.pathname === "/api/payment/pix") {
    const body = await readJsonBody(req);
    const now = new Date().toISOString();
    const orderId = crypto.randomUUID();
    const code = orderCode();
    const items = (body.items || []).map((i) => {
      const p = db.products.find((x) => x.id === i.productId);
      const v = i.variantId ? (p?.variants || []).find((vv) => vv.id === i.variantId) : null;
      const unit = (p?.promoPriceCents ?? p?.priceCents ?? 0) + (v?.priceDeltaCents ?? 0);
      return {
        id: crypto.randomUUID(),
        productId: i.productId,
        variantId: i.variantId ?? null,
        nameSnapshot: p?.name ?? "Produto",
        variantSnapshot: v?.label ?? null,
        unitPriceCents: unit,
        quantity: i.quantity,
        totalCents: unit * i.quantity
      };
    });
    const subtotalCents = items.reduce((acc, it) => acc + it.totalCents, 0);
    const shippingCents = Number(body.shipping?.shippingCents ?? 0);
    const discountCents = Math.round((subtotalCents * (db.settings.pixDiscountPercent || 5)) / 100);
    const totalCents = Math.max(0, subtotalCents + shippingCents - discountCents);

    const order = {
      id: orderId,
      code,
      status: "PENDING_PAYMENT",
      customerName: body.customer?.name ?? "",
      email: body.customer?.email ?? "",
      cpf: body.customer?.cpf ?? "",
      phone: body.customer?.phone ?? "",
      address: body.address ?? null,
      items,
      subtotalCents,
      shippingCents,
      discountCents,
      totalCents,
      shippingServiceName: body.shipping?.serviceName ?? null,
      shippingDeadlineDays: body.shipping?.deadlineDays ?? null,
      createdAt: now,
      updatedAt: now
    };
    db.orders.unshift(order);

    const paymentId = crypto.randomUUID();
    db.payments.unshift({
      id: paymentId,
      orderId,
      provider: "MOCK",
      method: "PIX",
      status: "PENDING",
      payload: { copyPaste: `MOCK_PIX_${code}` },
      createdAt: now,
      updatedAt: now
    });

    await saveDb(db);

    json(
      res,
      200,
      {
        orderId,
        orderCode: code,
        paymentId,
        pixDiscountPercent: db.settings.pixDiscountPercent ?? 5,
        qrCodeBase64: "",
        qrCode: "",
        copyPaste: `MOCK_PIX_${code}`,
        mode: "static-preview"
      },
      headers
    );
    return;
  }

  if (req.method === "GET" && u.pathname.startsWith("/api/payment/status/")) {
    const id = decodeURIComponent(u.pathname.split("/").pop() || "");
    const payment = db.payments.find((p) => p.id === id || p.orderId === id) ?? null;
    if (!payment) return json(res, 404, { error: "not_found" }, headers);
    const order = db.orders.find((o) => o.id === payment.orderId) ?? null;
    json(res, 200, { paymentId: payment.id, status: payment.status, order }, headers);
    return;
  }

  if (req.method === "POST" && u.pathname.startsWith("/api/payment/mock/confirm/")) {
    const orderId = decodeURIComponent(u.pathname.split("/").pop() || "");
    const now = new Date().toISOString();
    const payment = db.payments.find((p) => p.orderId === orderId);
    const order = db.orders.find((o) => o.id === orderId);
    if (!payment || !order) return json(res, 404, { error: "not_found" }, headers);
    payment.status = "PAID";
    payment.updatedAt = now;
    order.status = "PAID";
    order.updatedAt = now;
    await saveDb(db);
    json(res, 200, { ok: true }, headers);
    return;
  }

  if (req.method === "POST" && u.pathname === "/api/admin/login") {
    const body = await readJsonBody(req);
    if (body?.email !== db.admin.email || body?.password !== db.admin.password) {
      json(res, 401, { error: "invalid_credentials" }, headers);
      return;
    }
    const token = crypto.randomBytes(24).toString("base64url");
    const csrf = crypto.randomBytes(24).toString("base64url");
    sessions.set(token, { createdAt: Date.now() });
    json(
      res,
      200,
      { token, csrfToken: csrf },
      {
        ...headers,
        "Set-Cookie": [
          setCookie("admin_token", token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 }),
          setCookie("csrf_token", csrf, { httpOnly: false, maxAge: 7 * 24 * 60 * 60 })
        ]
      }
    );
    return;
  }

  if (u.pathname.startsWith("/api/admin/")) {
    if (!requireAdmin(req, res)) return;
  }

  if (req.method === "GET" && u.pathname === "/api/admin/dashboard") {
    const totalOrders = db.orders.length;
    const paidOrders = db.orders.filter((o) => o.status === "PAID").length;
    const revenueCents = db.orders.reduce((acc, o) => acc + o.totalCents, 0);
    json(res, 200, { totalOrders, paidOrders, revenueCents, recentOrders: db.orders.slice(0, 10) }, headers);
    return;
  }

  if (req.method === "GET" && u.pathname === "/api/admin/products") {
    json(res, 200, db.products, headers);
    return;
  }

  if (req.method === "GET" && u.pathname === "/api/admin/orders") {
    json(res, 200, db.orders, headers);
    return;
  }

  if (req.method === "GET" && u.pathname === "/api/admin/settings") {
    json(res, 200, { ...db.settings }, headers);
    return;
  }

  if (req.method === "PUT" && u.pathname === "/api/admin/settings") {
    const body = await readJsonBody(req);
    db.settings = { ...db.settings, ...body };
    await saveDb(db);
    json(res, 200, db.settings, headers);
    return;
  }

  text(res, 404, "not found", headers);
});

server.listen(port, () => {
  console.log(`Preview API on http://localhost:${port}`);
});
