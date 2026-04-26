const DATA_URL = "./preview-data.json";
const OVERRIDES_KEY = "aroma_preview_overrides_v1";
const ORDERS_KEY = "aroma_preview_orders_v1";
const ADMIN_SESSION_KEY = "aroma_preview_admin_v1";
const REVISIONS_KEY = "aroma_preview_revisions_v1";
const BUILD_ID = "20260426-4";

function setDataSourceLabel(label) {
  const el = document.getElementById("apiBase");
  if (el) el.textContent = label;
}

setDataSourceLabel("local (preview-data.json)");
document.getElementById("buildId")?.replaceChildren(BUILD_ID);

function safeJsonParse(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

let baseDataPromise = null;
async function loadBaseData() {
  if (!baseDataPromise) {
    baseDataPromise = fetch(DATA_URL, { cache: "no-store" }).then(async (r) => {
      if (!r.ok) throw new Error(`data_unavailable_${r.status}`);
      return r.json();
    });
  }
  return baseDataPromise;
}

function loadOverrides() {
  return safeJsonParse(localStorage.getItem(OVERRIDES_KEY) || "null", null) ?? {
    settingsPatch: {},
    productsExtra: [],
    productsPatch: {}
  };
}

function saveOverrides(next) {
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(next));
}

function loadRevisions() {
  return safeJsonParse(localStorage.getItem(REVISIONS_KEY) || "[]", []);
}

function saveRevisions(next) {
  localStorage.setItem(REVISIONS_KEY, JSON.stringify(next));
}

function getOrders() {
  return safeJsonParse(localStorage.getItem(ORDERS_KEY) || "[]", []);
}

function saveOrders(next) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(next));
}

async function loadDb() {
  const base = await loadBaseData();
  const ov = loadOverrides();
  const settings = { ...(base.settings ?? {}), ...(ov.settingsPatch ?? {}) };
  const categories = Array.isArray(base.categories) ? base.categories : [];
  const productsBase = Array.isArray(base.products) ? base.products : [];
  const productsExtra = Array.isArray(ov.productsExtra) ? ov.productsExtra : [];
  const patches = ov.productsPatch ?? {};
  const products = [...productsBase, ...productsExtra].map((p) => {
    const patch = patches?.[p.id] ?? null;
    if (!patch) return p;
    const merged = { ...p, ...patch };
    merged.images = Array.isArray(merged.images)
      ? merged.images.slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      : [];
    merged.variants = Array.isArray(merged.variants) ? merged.variants : [];
    return merged;
  });
  return { settings, categories, products };
}

function applyTheme(theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem("theme", theme);
}

function getTheme() {
  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") return saved;
  return matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

applyTheme(getTheme());

document.getElementById("themeToggle")?.addEventListener("click", () => {
  applyTheme(getTheme() === "dark" ? "light" : "dark");
});

let toastRoot = null;
function ensureToastRoot() {
  if (toastRoot) return toastRoot;
  toastRoot = document.createElement("div");
  toastRoot.className =
    "fixed bottom-4 left-1/2 z-[999] w-[min(520px,92vw)] -translate-x-1/2 space-y-2";
  document.body.appendChild(toastRoot);
  return toastRoot;
}

function toast(message, opts) {
  const type = opts?.type ?? "info";
  const title = opts?.title ?? null;
  const ttlMs = Number.isFinite(opts?.ttlMs) ? opts.ttlMs : 3200;

  const root = ensureToastRoot();
  const elToast = document.createElement("div");
  const tone =
    type === "success"
      ? "border-emerald-500/30 bg-emerald-500/10"
      : type === "error"
        ? "border-red-500/30 bg-red-500/10"
        : type === "warning"
          ? "border-amber-500/30 bg-amber-500/10"
          : "border-border bg-card";

  elToast.className = `rounded-2xl border ${tone} shadow-lg backdrop-blur px-4 py-3 text-sm text-fg`;
  elToast.setAttribute("role", type === "error" ? "alert" : "status");
  elToast.innerHTML = `
    <div class="flex items-start gap-3">
      <div class="min-w-0 flex-1">
        ${title ? `<div class="font-medium">${title}</div>` : ""}
        <div class="${title ? "mt-1" : ""} text-fg/80">${message}</div>
      </div>
      <button type="button" class="rounded-xl border border-border bg-bg/60 px-2 py-1 text-xs hover:bg-muted/60" aria-label="Fechar">
        Fechar
      </button>
    </div>
  `;

  const close = () => {
    elToast.style.transition = "opacity 180ms ease, transform 180ms ease";
    elToast.style.opacity = "0";
    elToast.style.transform = "translateY(6px)";
    window.setTimeout(() => elToast.remove(), 200);
  };

  elToast.querySelector("button")?.addEventListener("click", close);
  root.appendChild(elToast);

  if (ttlMs > 0) window.setTimeout(close, ttlMs);
}

function toErrorMessage(e) {
  const msg = String(e?.message ?? e ?? "");
  if (!msg) return "Ocorreu um erro inesperado.";
  return msg.length > 240 ? msg.slice(0, 240) + "…" : msg;
}

function formatBRL(cents) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function normalizeTiers(input) {
  const tiers = Array.isArray(input) ? input : [];
  const cleaned = tiers
    .map((t) => ({
      minQty: Number(t?.minQty ?? 0),
      percentOff: Number(t?.percentOff ?? 0)
    }))
    .filter((t) => Number.isFinite(t.minQty) && Number.isFinite(t.percentOff))
    .map((t) => ({ minQty: Math.max(1, Math.floor(t.minQty)), percentOff: Math.max(0, Math.min(90, t.percentOff)) }))
    .sort((a, b) => a.minQty - b.minQty || a.percentOff - b.percentOff);

  const uniq = [];
  const seen = new Set();
  for (const t of cleaned) {
    const key = `${t.minQty}:${t.percentOff}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(t);
  }
  return uniq;
}

function discountPercentForQty(variant, qty) {
  const q = Math.max(1, Math.floor(Number(qty ?? 1)));
  const tiers = normalizeTiers(variant?.discountTiers);
  let best = 0;
  for (const t of tiers) {
    if (q >= t.minQty) best = Math.max(best, t.percentOff);
  }
  return best;
}

function computeUnitPriceCents(product, variant) {
  const base = product?.promoPriceCents ?? product?.priceCents ?? 0;
  return base + (variant?.priceDeltaCents ?? 0);
}

function computeLineTotals({ product, variant, qty }) {
  const unit = computeUnitPriceCents(product, variant);
  const pct = discountPercentForQty(variant, qty);
  const discountedUnit = Math.round(unit * (1 - pct / 100));
  const line = discountedUnit * qty;
  const discount = unit * qty - line;
  return { unit, pct, discountedUnit, line, discount };
}

function cartKey(pId, vId) {
  return `${pId}::${vId ?? ""}`;
}

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem("tempero_cart_v1") || "[]");
  } catch {
    return [];
  }
}

function saveCart(items) {
  localStorage.setItem("tempero_cart_v1", JSON.stringify(items));
  renderCartCount();
}

function renderCartCount() {
  const cart = loadCart();
  const count = cart.reduce((acc, i) => acc + i.quantity, 0);
  document.getElementById("cartCount").textContent = String(count);
}

async function api(path, init) {
  const method = String(init?.method ?? "GET").toUpperCase();
  const url = new URL(path, "http://local");
  const body = init?.body ? safeJsonParse(String(init.body), null) : null;

  const requireAdmin = () => {
    const ok = localStorage.getItem(ADMIN_SESSION_KEY) === "1";
    if (!ok) throw new Error("unauthorized");
  };

  if (method === "GET" && url.pathname === "/api/settings/public") {
    const db = await loadDb();
    return {
      storeName: db.settings.storeName ?? "Aroma dos Temperos",
      logoUrl: db.settings.logoUrl ?? "/brand/aroma-dos-temperos.jpg",
      whatsapp: db.settings.whatsapp ?? null,
      contactEmail: db.settings.contactEmail ?? null,
      offers: {
        pixDiscountPercent: Number(db.settings.pixDiscountPercent ?? 5),
        freeShippingEnabled: Boolean(db.settings.freeShippingEnabled ?? false),
        freeShippingMinSubtotalCents: Number(db.settings.freeShippingMinSubtotalCents ?? 0)
      },
      home: db.settings.home ?? null
    };
  }

  if (method === "GET" && url.pathname === "/api/categories") {
    const db = await loadDb();
    return db.categories;
  }

  if (method === "GET" && url.pathname === "/api/products") {
    const db = await loadDb();
    const category = url.searchParams.get("category");
    const search = url.searchParams.get("search");
    const catId = category ? db.categories.find((c) => c.slug === category)?.id ?? null : null;
    return db.products
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
  }

  if (method === "GET" && url.pathname.startsWith("/api/products/")) {
    const db = await loadDb();
    const slug = decodeURIComponent(url.pathname.split("/").pop() || "");
    const p = db.products.find((x) => x.slug === slug && x.isActive);
    if (!p) throw new Error("not_found");
    return { ...p, images: (p.images || []).slice().sort((a, b) => a.sortOrder - b.sortOrder) };
  }

  if (method === "POST" && url.pathname === "/api/shipping/calculate") {
    const db = await loadDb();
    void body;
    const margin = Math.max(0, Math.min(100, Number(db.settings.shippingMarginPercent || 0)));
    const base = Math.round(1890 * (1 + margin / 100));
    const exp = Math.round(3290 * (1 + margin / 100));
    return {
      options: [
        { id: "preview_economico", name: "Econômico", priceCents: base, deadlineDays: 6 },
        { id: "preview_expresso", name: "Expresso", priceCents: exp, deadlineDays: 2 }
      ]
    };
  }

  if (method === "POST" && url.pathname === "/api/payment/pix") {
    const payload = body ?? {};
    const items = Array.isArray(payload.items) ? payload.items : [];
    const db = await loadDb();

    const now = new Date().toISOString();
    const orderId = crypto.randomUUID();
    const code = `P${Math.floor(Date.now() / 1000).toString(36).toUpperCase()}`;

    const orderItems = items.map((i) => {
      const p = db.products.find((x) => x.id === i.productId);
      const v = i.variantId ? (p?.variants || []).find((vv) => vv.id === i.variantId) : null;
      const qty = Math.max(1, Math.floor(Number(i.quantity ?? 1)));
      const unit = (p?.promoPriceCents ?? p?.priceCents ?? 0) + (v?.priceDeltaCents ?? 0);
      const pct = discountPercentForQty(v, qty);
      const discountedUnit = Math.round(unit * (1 - pct / 100));
      return {
        id: crypto.randomUUID(),
        productId: i.productId,
        variantId: i.variantId ?? null,
        nameSnapshot: p?.name ?? "Produto",
        variantSnapshot: v?.label ?? null,
        unitPriceCents: discountedUnit,
        quantity: qty,
        totalCents: discountedUnit * qty,
        tierDiscountPercent: pct
      };
    });

    const subtotalCents = orderItems.reduce((acc, it) => acc + it.totalCents, 0);
    const originalSubtotalCents = items.reduce((acc, i) => {
      const p = db.products.find((x) => x.id === i.productId);
      const v = i.variantId ? (p?.variants || []).find((vv) => vv.id === i.variantId) : null;
      const qty = Math.max(1, Math.floor(Number(i.quantity ?? 1)));
      const unit = (p?.promoPriceCents ?? p?.priceCents ?? 0) + (v?.priceDeltaCents ?? 0);
      return acc + unit * qty;
    }, 0);

    const tierDiscountCents = Math.max(0, originalSubtotalCents - subtotalCents);
    const shippingCents = Number(payload.shipping?.shippingCents ?? payload.shipping?.priceCents ?? 0);
    const pixDiscountPercent = Math.max(0, Math.min(90, Number(db.settings.pixDiscountPercent ?? 5)));
    const pixDiscountCents = Math.round((subtotalCents * pixDiscountPercent) / 100);
    const discountCents = tierDiscountCents + pixDiscountCents;
    const totalCents = Math.max(0, subtotalCents + shippingCents - pixDiscountCents);

    const order = {
      id: orderId,
      code,
      status: "PENDING_PAYMENT",
      customerName: String(payload.customer?.name ?? ""),
      email: String(payload.customer?.email ?? ""),
      cpf: String(payload.customer?.cpf ?? ""),
      phone: String(payload.customer?.phone ?? ""),
      items: orderItems,
      subtotalCents,
      shippingCents,
      discountCents,
      totalCents,
      createdAt: now
    };

    const orders = getOrders();
    orders.unshift(order);
    saveOrders(orders);

    return {
      orderId,
      orderCode: code,
      copyPaste: `00020126580014BR.GOV.BCB.PIX0136preview-${orderId}520400005303986540${String(
        (totalCents / 100).toFixed(2)
      ).replace(".", "")}5802BR5920Aroma dos Temperos6009Sao Paulo62290525preview-local-${orderId}6304ABCD`,
      qrCodeBase64: null
    };
  }

  if (method === "POST" && url.pathname.startsWith("/api/payment/mock/confirm/")) {
    const orderId = decodeURIComponent(url.pathname.split("/").pop() || "");
    const orders = getOrders();
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx >= 0) {
      orders[idx] = { ...orders[idx], status: "PAID" };
      saveOrders(orders);
    }
    return { ok: true };
  }

  if (method === "GET" && url.pathname.startsWith("/api/payment/status/")) {
    const orderId = decodeURIComponent(url.pathname.split("/").pop() || "");
    const orders = getOrders();
    const order = orders.find((o) => o.id === orderId) ?? null;
    return { order };
  }

  if (method === "POST" && url.pathname === "/api/admin/login") {
    const email = String(body?.email ?? "");
    const password = String(body?.password ?? "");
    if (email === "admin@tempero.com" && password === "admin123456") {
      localStorage.setItem(ADMIN_SESSION_KEY, "1");
      return { token: "local", csrfToken: "local" };
    }
    throw new Error("invalid_credentials");
  }

  if (method === "GET" && url.pathname === "/api/admin/dashboard") {
    requireAdmin();
    const orders = getOrders();
    const totalOrders = orders.length;
    const paidOrders = orders.filter((o) => o.status === "PAID").length;
    const revenueCents = orders.filter((o) => o.status === "PAID").reduce((acc, o) => acc + (o.totalCents ?? 0), 0);
    return { totalOrders, paidOrders, revenueCents };
  }

  if (method === "GET" && url.pathname === "/api/admin/orders") {
    requireAdmin();
    return getOrders();
  }

  if (method === "GET" && url.pathname === "/api/admin/products") {
    requireAdmin();
    const db = await loadDb();
    return db.products.slice().sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }

  if (method === "GET" && url.pathname.startsWith("/api/admin/products/")) {
    requireAdmin();
    const db = await loadDb();
    const id = decodeURIComponent(url.pathname.split("/").pop() || "");
    const p = db.products.find((x) => x.id === id) ?? null;
    if (!p) throw new Error("not_found");
    return { ...p, images: (p.images || []).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)) };
  }

  if (method === "PUT" && url.pathname.startsWith("/api/admin/products/")) {
    requireAdmin();
    const db = await loadDb();
    const id = decodeURIComponent(url.pathname.split("/").pop() || "");
    const current = db.products.find((x) => x.id === id) ?? null;
    if (!current) throw new Error("not_found");

    const nextOverrides = loadOverrides();
    const patches = { ...(nextOverrides.productsPatch ?? {}) };

    const draft = body ?? {};
    const nextSlug = String(draft.slug ?? current.slug).trim();
    if (!nextSlug || nextSlug.length < 2) throw new Error("invalid_slug");
    const slugTaken = db.products.some((p) => p.id !== id && p.slug === nextSlug);
    if (slugTaken) throw new Error("slug_already_exists");

    const imagesIn = Array.isArray(draft.images) ? draft.images : current.images ?? [];
    const images = imagesIn
      .slice(0, 12)
      .map((img, idx) => ({
        id: String(img?.id ?? crypto.randomUUID()),
        url: String(img?.url ?? "").trim(),
        alt: String(img?.alt ?? "").trim() || null,
        sortOrder: Number.isFinite(Number(img?.sortOrder)) ? Number(img.sortOrder) : idx
      }))
      .filter((img) => img.url.length >= 8);

    const variantsIn = Array.isArray(draft.variants) ? draft.variants : current.variants ?? [];
    const variants = variantsIn.map((v) => ({
      ...v,
      id: String(v?.id ?? crypto.randomUUID()),
      label: String(v?.label ?? "").trim() || "Variação",
      priceDeltaCents: Number(v?.priceDeltaCents ?? 0),
      discountTiers: normalizeTiers(v?.discountTiers)
    }));

    patches[id] = {
      name: String(draft.name ?? current.name),
      slug: nextSlug,
      description: String(draft.description ?? current.description ?? ""),
      benefits: Array.isArray(draft.benefits) ? draft.benefits : current.benefits ?? [],
      isActive: Boolean(draft.isActive ?? current.isActive),
      categoryId: String(draft.categoryId ?? current.categoryId ?? ""),
      priceCents: Number(draft.priceCents ?? current.priceCents ?? 0),
      promoPriceCents: draft.promoPriceCents === null ? null : Number(draft.promoPriceCents ?? current.promoPriceCents ?? 0),
      stock: Number(draft.stock ?? current.stock ?? 0),
      images,
      variants
    };

    nextOverrides.productsPatch = patches;
    saveOverrides(nextOverrides);
    return { ok: true };
  }

  if (method === "GET" && url.pathname === "/api/admin/settings") {
    requireAdmin();
    const db = await loadDb();
    return {
      storeName: db.settings.storeName ?? "Aroma dos Temperos",
      whatsapp: db.settings.whatsapp ?? null,
      pixDiscountPercent: Number(db.settings.pixDiscountPercent ?? 5),
      shippingMarginPercent: Number(db.settings.shippingMarginPercent ?? 0)
    };
  }

  if (method === "PUT" && url.pathname === "/api/admin/settings") {
    requireAdmin();
    const next = loadOverrides();
    next.settingsPatch = {
      ...(next.settingsPatch ?? {}),
      storeName: body?.storeName ?? null,
      whatsapp: body?.whatsapp ?? null,
      pixDiscountPercent: Number(body?.pixDiscountPercent ?? 5),
      shippingMarginPercent: Number(body?.shippingMarginPercent ?? 0),
      logoUrl: "/brand/aroma-dos-temperos.jpg"
    };
    saveOverrides(next);
    return { ok: true };
  }

  if (method === "POST" && url.pathname === "/api/admin/logout") {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    return { ok: true };
  }

  throw new Error("not_implemented");
}

function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function route() {
  const hash = location.hash || "#/";
  const [path, query] = hash.slice(1).split("?");
  return { path, query: new URLSearchParams(query || "") };
}

function setRoute(hash) {
  location.hash = hash;
}

let revealObserver = null;

function setupReveals(root) {
  const reduce =
    typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    root.querySelectorAll(".reveal").forEach((n) => n.setAttribute("data-inview", "true"));
    return;
  }

  if (!revealObserver) {
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.setAttribute("data-inview", "true");
            revealObserver?.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );
  }

  revealObserver.disconnect();
  root.querySelectorAll(".reveal").forEach((n) => {
    n.setAttribute("data-inview", "false");
    revealObserver.observe(n);
  });
}

function setView(node) {
  const app = document.getElementById("app");
  app.innerHTML = "";
  app.appendChild(node);
  setupReveals(app);
}

async function viewHome() {
  const [settings, products, categories] = await Promise.all([
    api("/api/settings/public"),
    api("/api/products"),
    api("/api/categories")
  ]);
  const banner = settings.home?.banner;
  const benefits = settings.home?.benefits ?? [];
  const heroImage =
    banner?.imageUrl ??
    "https://images.unsplash.com/photo-1524594150403-1e3e1a7b8fd4?auto=format&fit=crop&w=1800&q=80";

  const categoryArt = {
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

  const node = el(`
    <div>
      <section class="reveal rounded-3xl overflow-hidden border border-border bg-primary shadow-hero relative min-h-[62vh]">
        <div class="absolute inset-0">
          <img src="${heroImage}" alt="${banner?.title ?? "Temperos e pimentas"}" class="h-full w-full object-cover opacity-60" />
          <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_left,_rgba(245,245,220,0.10),_transparent_55%)]"></div>
          <div class="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/70 to-primary/20"></div>
        </div>
        <div class="relative p-8 sm:p-12">
          <div class="max-w-2xl">
            <div class="flex flex-wrap items-center gap-2">
              <span class="inline-flex items-center rounded-full border border-primaryFg/25 bg-primaryFg/10 px-3 py-1 text-xs text-primaryFg/90">Coleção 2026</span>
              <span class="inline-flex items-center rounded-full border border-primaryFg/25 bg-primaryFg/10 px-3 py-1 text-xs text-primaryFg/90">${settings.offers.pixDiscountPercent}% OFF no Pix</span>
            </div>
            <h1 class="mt-7 font-serif text-5xl sm:text-6xl leading-[1.0] text-primaryFg">${banner?.title ?? "Temperos premium direto para sua casa"}</h1>
            <p class="mt-5 text-primaryFg/80 text-sm sm:text-lg">${banner?.subtitle ?? "Ervas, especiarias e pimentas selecionadas. Sabor de verdade, entrega para todo Brasil."}</p>
            <div class="mt-8 flex flex-col sm:flex-row gap-3">
              <a href="#/catalogo" class="inline-flex items-center justify-center rounded-xl bg-primaryFg text-primary px-6 py-3 text-sm font-medium shadow-soft transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:bg-card hover:shadow-hero active:translate-y-0">Comprar agora →</a>
              <a href="#categorias" class="inline-flex items-center justify-center rounded-xl border border-primaryFg/35 bg-transparent text-primaryFg px-6 py-3 text-sm font-medium shadow-soft transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-primaryFg/10 active:translate-y-0">Ver categorias</a>
            </div>
            <div class="mt-5 text-xs text-primaryFg/70">Frete calculado na hora • ${settings.offers.pixDiscountPercent}% no Pix</div>
          </div>
        </div>
      </section>

      <section id="categorias" class="mt-10">
        <div class="reveal flex items-end justify-between">
          <div>
            <h2 class="font-serif text-2xl">Categorias</h2>
            <div class="mt-1 text-sm text-fg/70">Escolha por perfil de sabor e intensidade.</div>
          </div>
          <a href="#/catalogo" class="text-sm text-fg/70 hover:text-fg">Ver tudo →</a>
        </div>
        <div class="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="cats"></div>
      </section>

      <section class="mt-10">
        <div class="reveal flex items-end justify-between">
          <div>
            <h2 class="font-serif text-2xl">Produtos fictícios (inspiração)</h2>
            <div class="mt-1 text-sm text-fg/70">Imagens e ideias para comunicar variedade e qualidade.</div>
          </div>
          <a href="#/catalogo" class="text-sm text-fg/70 hover:text-fg">Ver catálogo →</a>
        </div>
        <div class="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="fictional"></div>
      </section>

      <section class="mt-10">
        <div class="reveal flex items-end justify-between">
          <div>
            <h2 class="font-serif text-2xl">Mais vendidos</h2>
            <div class="mt-1 text-sm text-fg/70">Escolhas rápidas para cozinhar melhor hoje.</div>
          </div>
        </div>
        <div class="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4" id="grid"></div>
      </section>

      <section class="mt-10">
        <h2 class="reveal font-serif text-2xl">Benefícios</h2>
        <div class="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4" id="benefits"></div>
      </section>
    </div>
  `);

  const catsWrap = node.querySelector("#cats");
  categories.slice(0, 8).forEach((c, idx) => {
    const art = categoryArt[c.slug] ?? categoryArt.temperos;
    catsWrap.appendChild(
      el(`
        <a href="#/catalogo?category=${encodeURIComponent(c.slug)}" class="reveal group block rounded-2xl border border-border bg-card overflow-hidden shadow transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:bg-muted/30 hover:shadow-lg">
          <div class="relative h-44 sm:h-48">
            <img src="${art}" alt="${c.name}" class="absolute inset-0 h-full w-full object-cover" loading="lazy" />
            <div class="absolute inset-0 bg-gradient-to-t from-bg/95 via-bg/35 to-transparent"></div>
          </div>
          <div class="p-4">
            <div class="font-medium">${c.name}</div>
            <div class="mt-1 text-xs text-fg/70">Ver produtos →</div>
          </div>
        </a>
      `)
    );
  });

  const fictionalWrap = node.querySelector("#fictional");
  fictional.forEach((p) => {
    fictionalWrap.appendChild(
      el(`
        <div class="reveal rounded-2xl border border-border bg-card overflow-hidden shadow transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:bg-muted/30 hover:shadow-lg">
          <div class="relative h-44">
            <img src="${p.imageUrl}" alt="${p.name}" class="absolute inset-0 h-full w-full object-cover" loading="lazy" />
            <div class="absolute inset-0 bg-gradient-to-t from-bg/95 via-bg/35 to-transparent"></div>
          </div>
          <div class="p-4">
            <div class="font-serif text-lg leading-tight">${p.name}</div>
            <div class="mt-2 text-sm text-fg/70">${p.subtitle}</div>
            <div class="mt-4">
              <a href="#/catalogo" class="inline-flex w-full items-center justify-center rounded-xl bg-primary text-primaryFg px-4 py-2 text-sm font-medium shadow transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-lg active:translate-y-0">Explorar</a>
            </div>
          </div>
        </div>
      `)
    );
  });

  const grid = node.querySelector("#grid");
  products.slice(0, 8).forEach((p) => {
    grid.appendChild(
      el(`
        <a href="#/produto?slug=${encodeURIComponent(p.slug)}" class="reveal rounded-2xl border border-border overflow-hidden bg-card shadow transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:bg-muted/30 hover:shadow-lg">
          <div class="aspect-square bg-muted relative">
            ${p.imageUrl ? `<img src="${p.imageUrl}" alt="${p.name}" class="h-full w-full object-cover" loading="lazy" />` : ""}
          </div>
          <div class="p-4">
            <div class="font-serif text-base leading-tight">${p.name}</div>
            <div class="mt-2 flex items-baseline gap-2">
              <div class="text-sm font-medium">${formatBRL(p.promoPriceCents ?? p.priceCents)}</div>
              ${p.promoPriceCents ? `<div class="text-xs text-fg/50 line-through">${formatBRL(p.priceCents)}</div>` : ""}
            </div>
            <div class="mt-3 text-xs text-fg/60">Ver detalhes →</div>
          </div>
        </a>
      `)
    );
  });

  const bWrap = node.querySelector("#benefits");
  benefits.forEach((b) => {
    bWrap.appendChild(
      el(`
        <div class="reveal rounded-2xl border border-border bg-card shadow p-5 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-lg">
          <div class="font-medium">${b.title}</div>
          <div class="mt-2 text-sm text-fg/70">${b.description}</div>
        </div>
      `)
    );
  });

  setView(node);
}

async function viewCatalog() {
  const categories = await api("/api/categories");
  const r = route();
  const category = r.query.get("category");
  const search = r.query.get("search");
  const page = Math.max(1, Math.floor(Number(r.query.get("page") ?? "1") || 1));
  const pageSize = 24;

  const qs = new URLSearchParams();
  if (category) qs.set("category", category);
  if (search) qs.set("search", search);
  const products = await api(`/api/products${qs.toString() ? `?${qs}` : ""}`);
  const total = products.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const sliceStart = (safePage - 1) * pageSize;
  const pageItems = products.slice(sliceStart, sliceStart + pageSize);

  const node = el(`
    <div>
      <div class="flex items-end justify-between gap-4">
        <h1 class="font-serif text-3xl">Catálogo</h1>
        <div class="text-xs text-fg/60">Explore por categoria e sabor</div>
      </div>

      <div class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="rounded-2xl border border-border bg-card shadow p-4">
          <div class="font-medium">Filtros</div>
          <div class="mt-3">
            <label class="text-xs text-fg/60">Buscar</label>
            <input id="search" class="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm" placeholder="Ex: pimenta" value="${search ?? ""}" />
          </div>
          <div class="mt-3">
            <div class="text-xs text-fg/60">Categorias</div>
            <div class="mt-2 flex flex-wrap gap-2" id="cats"></div>
          </div>
          <button id="apply" class="mt-4 w-full rounded-xl bg-primary text-primaryFg px-4 py-2 text-sm font-medium">Aplicar</button>
        </div>
        <div class="md:col-span-2">
          <div class="flex items-center justify-between gap-3">
            <div class="text-sm text-fg/70">${total} itens • Página ${safePage} de ${totalPages}</div>
            <div class="flex items-center gap-2">
              <button id="prevPage" type="button" class="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-soft hover:bg-muted/60" ${safePage <= 1 ? "disabled" : ""}>Anterior</button>
              <button id="nextPage" type="button" class="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-soft hover:bg-muted/60" ${safePage >= totalPages ? "disabled" : ""}>Próxima</button>
            </div>
          </div>
          <div class="grid grid-cols-2 lg:grid-cols-3 gap-4" id="grid"></div>
        </div>
      </div>
    </div>
  `);

  const cats = node.querySelector("#cats");
  const catBtn = (slug, name, active) =>
    el(`<button type="button" data-slug="${slug}" class="rounded-xl border border-border px-3 py-2 text-xs shadow-soft transition-[transform,background-color] duration-200 hover:bg-muted/60 hover:-translate-y-0.5 active:translate-y-0 ${
      active ? "bg-muted/60" : "bg-card"
    }">${name}</button>`);

  cats.appendChild(catBtn("", "Todas", !category));
  categories.forEach((c) => cats.appendChild(catBtn(c.slug, c.name, category === c.slug)));

  cats.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-slug]");
    if (!b) return;
    const slug = b.getAttribute("data-slug") || "";
    const next = new URLSearchParams(route().query);
    if (slug) next.set("category", slug);
    else next.delete("category");
    setRoute(`#/catalogo?${next.toString()}`);
  });

  node.querySelector("#apply").addEventListener("click", () => {
    const val = node.querySelector("#search").value.trim();
    const next = new URLSearchParams(route().query);
    if (val) next.set("search", val);
    else next.delete("search");
    next.delete("page");
    setRoute(`#/catalogo?${next.toString()}`);
  });

  function gotoPage(nextPage) {
    const next = new URLSearchParams(route().query);
    if (nextPage <= 1) next.delete("page");
    else next.set("page", String(nextPage));
    setRoute(`#/catalogo?${next.toString()}`);
  }

  node.querySelector("#prevPage").addEventListener("click", () => gotoPage(Math.max(1, safePage - 1)));
  node.querySelector("#nextPage").addEventListener("click", () => gotoPage(Math.min(totalPages, safePage + 1)));

  const grid = node.querySelector("#grid");
  pageItems.forEach((p) => {
    grid.appendChild(
      el(`
        <a href="#/produto?slug=${encodeURIComponent(p.slug)}" class="reveal rounded-2xl border border-border overflow-hidden bg-card shadow transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:bg-muted/30 hover:shadow-lg">
          <div class="aspect-square bg-muted relative">
            ${p.imageUrl ? `<img src="${p.imageUrl}" alt="${p.name}" class="h-full w-full object-cover" loading="lazy" />` : ""}
          </div>
          <div class="p-4">
            <div class="font-serif text-base leading-tight">${p.name}</div>
            <div class="mt-2 flex items-baseline gap-2">
              <div class="text-sm font-medium">${formatBRL(p.promoPriceCents ?? p.priceCents)}</div>
              ${p.promoPriceCents ? `<div class="text-xs text-fg/50 line-through">${formatBRL(p.priceCents)}</div>` : ""}
            </div>
          </div>
        </a>
      `)
    );
  });

  setView(node);
}

async function viewProduct() {
  const r = route();
  const slug = r.query.get("slug");
  if (!slug) return setRoute("#/catalogo");

  const [product, settings] = await Promise.all([api(`/api/products/${slug}`), api("/api/settings/public")]);
  const pixDiscountPercent = settings.offers.pixDiscountPercent ?? 5;

  const node = el(`
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <div class="rounded-3xl border border-border overflow-hidden bg-muted relative aspect-square">
          <img id="hero" class="h-full w-full object-cover" alt="${product.name}" src="${product.images?.[0]?.url ?? ""}" />
        </div>
        <div class="mt-4 grid grid-cols-4 gap-3" id="thumbs"></div>
      </div>
      <div>
        <h1 class="font-serif text-3xl leading-tight">${product.name}</h1>
        <p class="mt-4 text-sm text-fg/70">${product.description}</p>

        <div class="mt-6 rounded-2xl border border-border bg-card shadow p-5">
          <div class="text-xs text-fg/60">Preço</div>
          <div class="mt-2 text-2xl font-medium" id="price"></div>
          <div id="qtyDiscount" class="mt-1 text-xs text-fg/60 hidden"></div>
          <div class="mt-1 text-sm text-fg/70">${pixDiscountPercent}% de desconto no Pix</div>

          <div class="mt-4 ${product.variants?.length ? "" : "hidden"}">
            <label class="text-xs text-fg/60">Variação</label>
            <select id="variant" class="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm"></select>
          </div>

          <div class="mt-4">
            <label class="text-xs text-fg/60">Quantidade</label>
            <div class="mt-1 flex items-center gap-2">
              <button id="minus" type="button" class="h-10 w-10 rounded-xl border border-border bg-bg shadow-soft transition-[transform,background-color] duration-200 hover:bg-muted/60 hover:-translate-y-0.5 active:translate-y-0">-</button>
              <div id="qty" class="min-w-10 text-center text-sm">1</div>
              <button id="plus" type="button" class="h-10 w-10 rounded-xl border border-border bg-bg shadow-soft transition-[transform,background-color] duration-200 hover:bg-muted/60 hover:-translate-y-0.5 active:translate-y-0">+</button>
            </div>
          </div>

          <button id="buy" type="button" class="mt-5 w-full rounded-xl bg-primary text-primaryFg px-5 py-3 text-sm font-medium shadow transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-lg active:translate-y-0">
            Comprar
          </button>
          <div class="mt-3 text-xs text-fg/60">Frete calculado no checkout</div>
        </div>

        <div class="mt-6 ${product.benefits?.length ? "" : "hidden"}">
          <div class="font-medium">Benefícios</div>
          <ul class="mt-2 text-sm text-fg/70 list-disc pl-5 space-y-1" id="benefits"></ul>
        </div>
      </div>
    </div>
  `);

  const hero = node.querySelector("#hero");
  const thumbs = node.querySelector("#thumbs");
  (product.images || []).slice(0, 8).forEach((img) => {
    const b = el(
      `<button type="button" class="rounded-2xl border border-border overflow-hidden bg-muted relative aspect-square">
        <img src="${img.url}" alt="${img.alt ?? product.name}" class="h-full w-full object-cover" loading="lazy" />
      </button>`
    );
    b.addEventListener("click", () => (hero.src = img.url));
    thumbs.appendChild(b);
  });

  const benefits = node.querySelector("#benefits");
  (product.benefits || []).forEach((b) => benefits.appendChild(el(`<li>${b}</li>`)));

  let qty = 1;
  const qtyEl = node.querySelector("#qty");
  node.querySelector("#minus").addEventListener("click", () => {
    qty = Math.max(1, qty - 1);
    qtyEl.textContent = String(qty);
    refreshPrice();
  });
  node.querySelector("#plus").addEventListener("click", () => {
    qty = Math.min(99, qty + 1);
    qtyEl.textContent = String(qty);
    refreshPrice();
  });

  const variantSel = node.querySelector("#variant");
  const variants = product.variants || [];
  if (variants.length) {
    variantSel.appendChild(el(`<option value="">Selecione</option>`));
    variants.forEach((v) => variantSel.appendChild(el(`<option value="${v.id}">${v.label}</option>`)));
  }

  function currentUnit() {
    const base = product.promoPriceCents ?? product.priceCents;
    const vId = variantSel.value || null;
    const v = vId ? variants.find((x) => x.id === vId) : null;
    return { unit: base + (v?.priceDeltaCents ?? 0), variant: v };
  }

  const priceEl = node.querySelector("#price");
  const qtyDiscountEl = node.querySelector("#qtyDiscount");
  function refreshPrice() {
    const cur = currentUnit();
    const unit = cur.unit;
    const pct = discountPercentForQty(cur.variant, qty);
    const discountedUnit = Math.round(unit * (1 - pct / 100));
    priceEl.textContent = formatBRL(discountedUnit);
    if (pct > 0) {
      qtyDiscountEl.classList.remove("hidden");
      qtyDiscountEl.textContent = `Desconto por quantidade: ${pct}% (na quantidade atual)`;
    } else {
      qtyDiscountEl.classList.add("hidden");
      qtyDiscountEl.textContent = "";
    }
  }
  refreshPrice();
  variantSel.addEventListener("change", refreshPrice);

  node.querySelector("#buy").addEventListener("click", () => {
    const cart = loadCart();
    const vId = variantSel.value || null;
    const key = cartKey(product.id, vId);
    const idx = cart.findIndex((i) => cartKey(i.productId, i.variantId) === key);
    const unit = currentUnit().unit;
    if (idx >= 0) cart[idx].quantity += qty;
    else {
      const v = vId ? variants.find((x) => x.id === vId) : null;
      cart.push({
        productId: product.id,
        variantId: vId,
        name: product.name,
        variantLabel: v?.label ?? null,
        unitPriceCents: unit,
        quantity: qty,
        imageUrl: product.images?.[0]?.url ?? null
      });
    }
    saveCart(cart);
    setRoute("#/carrinho");
  });

  setView(node);
}

async function viewCart() {
  const cart = loadCart();
  if (!cart.length) {
    setView(
      el(`<div class="rounded-2xl border border-border bg-card shadow p-6 text-sm text-fg/70">Seu carrinho está vazio.</div>`)
    );
    return;
  }

  const db = await loadDb();
  const productById = new Map(db.products.map((p) => [p.id, p]));

  let zip = "";
  let shippingOptions = [];
  let selectedShippingId = "";

  const node = el(`
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-4" id="items"></div>
      <div class="rounded-2xl border border-border bg-card shadow p-5 h-fit">
        <div class="font-medium">Resumo</div>
        <div class="mt-4 space-y-2 text-sm" id="summary"></div>
        <div class="mt-5">
          <label class="text-xs text-fg/60">CEP para calcular frete</label>
          <div class="mt-2 flex gap-2">
            <input id="zip" class="flex-1 rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60" placeholder="00000-000" />
            <button id="calc" type="button" class="rounded-xl border border-border bg-card px-4 py-2 text-sm shadow-soft transition-[transform,background-color] duration-200 hover:bg-muted/60 hover:-translate-y-0.5 active:translate-y-0">Calcular</button>
          </div>
        </div>
        <div class="mt-4 space-y-2" id="ship"></div>
        <button id="checkout" type="button" class="mt-6 w-full text-center rounded-xl bg-primary text-primaryFg px-5 py-3 text-sm font-medium shadow transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-lg active:translate-y-0">Checkout</button>
        <div class="mt-3 text-xs text-fg/60">Frete calculado no checkout</div>
      </div>
    </div>
  `);

  function resolveItem(i) {
    const p = productById.get(i.productId) ?? null;
    const v = i.variantId && p?.variants ? p.variants.find((x) => x.id === i.variantId) : null;
    return { product: p, variant: v };
  }

  function subtotalWithTierDiscount() {
    return cart.reduce((acc, i) => {
      const { product, variant } = resolveItem(i);
      if (!product) return acc + i.unitPriceCents * i.quantity;
      const totals = computeLineTotals({ product, variant, qty: i.quantity });
      return acc + totals.line;
    }, 0);
  }

  function tierDiscountTotal() {
    return cart.reduce((acc, i) => {
      const { product, variant } = resolveItem(i);
      if (!product) return acc;
      const totals = computeLineTotals({ product, variant, qty: i.quantity });
      return acc + totals.discount;
    }, 0);
  }

  function selectedShipping() {
    return shippingOptions.find((o) => o.id === selectedShippingId) ?? null;
  }

  function render() {
    const itemsWrap = node.querySelector("#items");
    itemsWrap.innerHTML = "";
    cart.forEach((i) => {
      const { product, variant } = resolveItem(i);
      const totals = product ? computeLineTotals({ product, variant, qty: i.quantity }) : null;
      const shownUnit = totals ? totals.discountedUnit : i.unitPriceCents;
      const pct = totals ? totals.pct : 0;
      const row = el(`
        <div class="rounded-2xl border border-border bg-card shadow p-4">
          <div class="flex gap-4">
            <div class="h-20 w-20 rounded-xl bg-muted overflow-hidden shrink-0">
              ${i.imageUrl ? `<img src="${i.imageUrl}" alt="${i.name}" class="h-full w-full object-cover" />` : ""}
            </div>
            <div class="flex-1">
              <div class="font-medium">${i.name}</div>
              ${i.variantLabel ? `<div class="text-xs text-fg/60">${i.variantLabel}</div>` : ""}
              <div class="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <div class="font-medium">${formatBRL(shownUnit)}</div>
                ${pct > 0 ? `<span class="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] text-fg/80">-${pct}% por quantidade</span>` : ""}
              </div>
              <div class="mt-3 flex items-center gap-2">
                <button data-a="dec" type="button" class="h-9 w-9 rounded-xl border border-border bg-bg shadow-soft transition-[transform,background-color] duration-200 hover:bg-muted/60 hover:-translate-y-0.5 active:translate-y-0">-</button>
                <div class="min-w-10 text-center text-sm">${i.quantity}</div>
                <button data-a="inc" type="button" class="h-9 w-9 rounded-xl border border-border bg-bg shadow-soft transition-[transform,background-color] duration-200 hover:bg-muted/60 hover:-translate-y-0.5 active:translate-y-0">+</button>
                <button data-a="rm" type="button" class="ml-auto text-xs text-fg/60 hover:text-fg">Remover</button>
              </div>
            </div>
          </div>
        </div>
      `);

      row.addEventListener("click", (e) => {
        const a = e.target.closest("button[data-a]")?.getAttribute("data-a");
        if (!a) return;
        if (a === "inc") i.quantity = Math.min(99, i.quantity + 1);
        if (a === "dec") i.quantity = Math.max(1, i.quantity - 1);
        if (a === "rm") {
          const idx = cart.indexOf(i);
          if (idx >= 0) cart.splice(idx, 1);
        }
        saveCart(cart);
        render();
      });

      itemsWrap.appendChild(row);
    });

    const sum = node.querySelector("#summary");
    const ship = selectedShipping();
    const shipCents = ship?.priceCents ?? 0;
    const sub = subtotalWithTierDiscount();
    const tierDisc = tierDiscountTotal();
    const total = sub + shipCents;
    sum.innerHTML = `
      <div class="flex items-center justify-between"><span class="text-fg/70">Subtotal</span><span>${formatBRL(sub)}</span></div>
      ${
        tierDisc > 0
          ? `<div class="flex items-center justify-between"><span class="text-fg/70">Desconto por quantidade</span><span>-${formatBRL(tierDisc)}</span></div>`
          : ""
      }
      <div class="flex items-center justify-between"><span class="text-fg/70">Frete</span><span>${
        ship ? formatBRL(ship.priceCents) : "—"
      }</span></div>
      <div class="pt-2 border-t border-border flex items-center justify-between"><span class="text-fg/70">Total</span><span class="font-medium">${formatBRL(
        total
      )}</span></div>
    `;
  }

  async function calcShipping() {
    zip = node.querySelector("#zip").value;
    const res = await api("/api/shipping/calculate", {
      method: "POST",
      body: JSON.stringify({
        toZip: zip,
        items: cart.map((i) => ({
          productId: i.productId,
          variantId: i.variantId ?? null,
          quantity: i.quantity
        }))
      })
    });
    shippingOptions = res.options;
    selectedShippingId = shippingOptions[0]?.id ?? "";
    const shipWrap = node.querySelector("#ship");
    shipWrap.innerHTML = "";
    shippingOptions.forEach((o) => {
      const row = el(`
        <label class="flex items-center gap-2 text-sm">
          <input type="radio" name="ship" ${o.id === selectedShippingId ? "checked" : ""} />
          <span class="flex-1">${o.name} • ${o.deadlineDays} dias</span>
          <span class="font-medium">${formatBRL(o.priceCents)}</span>
        </label>
      `);
      row.querySelector("input").addEventListener("change", () => {
        selectedShippingId = o.id;
        render();
      });
      shipWrap.appendChild(row);
    });
    render();
  }

  node.querySelector("#calc").addEventListener("click", () =>
    calcShipping().catch((e) => toast(toErrorMessage(e), { type: "error" }))
  );
  node.querySelector("#checkout").addEventListener("click", () => {
    if (!selectedShippingId) return toast("Calcule o frete antes de continuar.", { type: "warning" });
    setRoute(`#/checkout?zip=${encodeURIComponent(zip)}&shipId=${encodeURIComponent(selectedShippingId)}`);
  });

  render();
  setView(node);
}

async function viewCheckout() {
  const cart = loadCart();
  if (!cart.length) return setRoute("#/carrinho");

  const db = await loadDb();
  const productById = new Map(db.products.map((p) => [p.id, p]));

  const settings = await api("/api/settings/public");
  const pixDiscountPercent = settings.offers.pixDiscountPercent ?? 5;

  const r = route();
  const zip = r.query.get("zip") ?? "";
  const shipId = r.query.get("shipId") ?? "";

  const shipRes = await api("/api/shipping/calculate", {
    method: "POST",
    body: JSON.stringify({
      toZip: zip,
      items: cart.map((i) => ({ productId: i.productId, variantId: i.variantId ?? null, quantity: i.quantity }))
    })
  });

  const shippingOptions = shipRes.options ?? [];
  const selectedShipping = shippingOptions.find((o) => o.id === shipId) ?? shippingOptions[0] ?? null;

  const subtotal = cart.reduce((acc, i) => {
    const p = productById.get(i.productId) ?? null;
    const v = i.variantId && p?.variants ? p.variants.find((x) => x.id === i.variantId) : null;
    if (!p) return acc + i.unitPriceCents * i.quantity;
    const totals = computeLineTotals({ product: p, variant: v, qty: i.quantity });
    return acc + totals.line;
  }, 0);
  const tierDiscountCents = cart.reduce((acc, i) => {
    const p = productById.get(i.productId) ?? null;
    const v = i.variantId && p?.variants ? p.variants.find((x) => x.id === i.variantId) : null;
    if (!p) return acc;
    const totals = computeLineTotals({ product: p, variant: v, qty: i.quantity });
    return acc + totals.discount;
  }, 0);
  const shippingCents = selectedShipping?.priceCents ?? 0;
  const discountCents = Math.round((subtotal * pixDiscountPercent) / 100);
  const totalPix = Math.max(0, subtotal + shippingCents - discountCents);

  const node = el(`
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-5">
        <div class="rounded-2xl border border-border bg-card shadow p-5">
          <div class="font-medium">Dados do cliente</div>
          <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input id="name" class="rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60" placeholder="Nome" />
            <input id="email" class="rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60" placeholder="Email" />
            <input id="cpf" class="rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60" placeholder="CPF" />
            <input id="phone" class="rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60" placeholder="Telefone" />
          </div>
        </div>
        <div class="rounded-2xl border border-border bg-card shadow p-5">
          <div class="font-medium">Endereço</div>
          <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input id="zip" class="rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60" placeholder="CEP" value="${zip}" />
            <input id="street" class="rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60" placeholder="Rua" />
            <input id="number" class="rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60" placeholder="Número" />
            <input id="comp" class="rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60" placeholder="Complemento" />
            <input id="neigh" class="rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60" placeholder="Bairro" />
            <input id="city" class="rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60" placeholder="Cidade" />
            <input id="state" class="rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60" placeholder="UF" />
          </div>
        </div>
        <div class="rounded-2xl border border-border bg-card shadow p-5">
          <div class="font-medium">Pagamento</div>
          <div class="mt-3 text-sm text-fg/70">${pixDiscountPercent}% de desconto no Pix</div>
          <button id="pix" type="button" class="mt-4 w-full rounded-xl bg-primary text-primaryFg px-5 py-3 text-sm font-medium shadow transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-lg active:translate-y-0">Pagar com Pix (${formatBRL(
            totalPix
          )})</button>
          <div id="pixBox" class="mt-4 hidden rounded-xl border border-border bg-bg/40 p-4"></div>
        </div>
      </div>
      <div class="rounded-2xl border border-border bg-card shadow p-5 h-fit">
        <div class="font-medium">Resumo</div>
        <div class="mt-4 space-y-2 text-sm">
          <div class="flex items-center justify-between"><span class="text-fg/70">Subtotal</span><span>${formatBRL(
            subtotal
          )}</span></div>
          ${
            tierDiscountCents > 0
              ? `<div class="flex items-center justify-between"><span class="text-fg/70">Desconto por quantidade</span><span>-${formatBRL(tierDiscountCents)}</span></div>`
              : ""
          }
          <div class="flex items-center justify-between"><span class="text-fg/70">Frete</span><span>${selectedShipping ? formatBRL(shippingCents) : "—"}</span></div>
          <div class="flex items-center justify-between"><span class="text-fg/70">Desconto Pix</span><span>-${formatBRL(
            discountCents
          )}</span></div>
          <div class="pt-2 border-t border-border flex items-center justify-between font-medium"><span>Total (Pix)</span><span>${formatBRL(
            totalPix
          )}</span></div>
        </div>
      </div>
    </div>
  `);

  function markInvalid(input, message) {
    if (!input) return;
    input.setAttribute("aria-invalid", "true");
    input.classList.add("ring-2", "ring-red-500/40");
    if (message) toast(message, { type: "warning" });
  }

  function clearInvalid(input) {
    if (!input) return;
    input.removeAttribute("aria-invalid");
    input.classList.remove("ring-2", "ring-red-500/40");
  }

  async function startPix() {
    const nameEl = node.querySelector("#name");
    const emailEl = node.querySelector("#email");
    const cpfEl = node.querySelector("#cpf");
    const phoneEl = node.querySelector("#phone");
    const zipEl = node.querySelector("#zip");
    const streetEl = node.querySelector("#street");
    const numberEl = node.querySelector("#number");
    const neighEl = node.querySelector("#neigh");
    const cityEl = node.querySelector("#city");
    const stateEl = node.querySelector("#state");

    [nameEl, emailEl, cpfEl, phoneEl, zipEl, streetEl, numberEl, neighEl, cityEl, stateEl].forEach(clearInvalid);

    const name = nameEl.value.trim();
    const email = emailEl.value.trim();
    const cpf = cpfEl.value.replace(/\D/g, "");
    const phone = phoneEl.value.trim();
    const zipVal = zipEl.value.replace(/\D/g, "");
    const street = streetEl.value.trim();
    const number = numberEl.value.trim();
    const neighborhood = neighEl.value.trim();
    const city = cityEl.value.trim();
    const state = (stateEl.value || "").trim().toUpperCase();

    let ok = true;
    if (name.length < 2) (ok = false), markInvalid(nameEl, "Informe seu nome.");
    if (!email.includes("@") || email.length < 5) (ok = false), markInvalid(emailEl, "Informe um email válido.");
    if (cpf.length !== 11) (ok = false), markInvalid(cpfEl, "CPF deve ter 11 dígitos.");
    if (zipVal.length !== 8) (ok = false), markInvalid(zipEl, "CEP deve ter 8 dígitos.");
    if (street.length < 2) (ok = false), markInvalid(streetEl, "Informe a rua.");
    if (number.length < 1) (ok = false), markInvalid(numberEl, "Informe o número.");
    if (neighborhood.length < 2) (ok = false), markInvalid(neighEl, "Informe o bairro.");
    if (city.length < 2) (ok = false), markInvalid(cityEl, "Informe a cidade.");
    if (state.length !== 2) (ok = false), markInvalid(stateEl, "UF deve ter 2 letras (ex: SP).");
    if (!ok) return;

    const payload = {
      customer: {
        name,
        email,
        cpf,
        phone
      },
      address: {
        zip: zipVal,
        street,
        number,
        complement: node.querySelector("#comp").value || null,
        neighborhood,
        city,
        state
      },
      items: cart.map((i) => ({
        productId: i.productId,
        variantId: i.variantId ?? null,
        quantity: i.quantity
      })),
      shipping: {
        shippingCents,
        serviceName: selectedShipping?.name ?? null,
        deadlineDays: selectedShipping?.deadlineDays ?? null
      }
    };

    const pix = await api("/api/payment/pix", { method: "POST", body: JSON.stringify(payload) });
    toast("Pix gerado. Use o copia e cola para pagar.", { type: "success" });
    const box = node.querySelector("#pixBox");
    box.classList.remove("hidden");
    box.innerHTML = `
      <div class="text-sm font-medium">Pix gerado</div>
      <div class="mt-2 text-xs text-fg/60">Pedido ${pix.orderCode} • aguardando pagamento</div>
      <div class="mt-4">
        <label class="text-xs text-fg/60">Copia e cola</label>
        <div class="mt-2 flex gap-2">
          <input class="flex-1 rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft" value="${pix.copyPaste}" readonly />
          <button id="copy" type="button" class="rounded-xl border border-border bg-card px-4 py-2 text-sm shadow-soft transition-[transform,background-color] duration-200 hover:bg-muted/60 hover:-translate-y-0.5 active:translate-y-0">Copiar</button>
        </div>
      </div>
      <button id="confirm" type="button" class="mt-4 w-full rounded-xl border border-border bg-card px-4 py-2 text-sm shadow-soft transition-[transform,background-color] duration-200 hover:bg-muted/60 hover:-translate-y-0.5 active:translate-y-0">Confirmar pagamento (mock)</button>
    `;

    box.querySelector("#copy").addEventListener("click", async () => {
      await navigator.clipboard.writeText(pix.copyPaste);
      toast("Copiado para a área de transferência.", { type: "success", ttlMs: 1600 });
    });
    box.querySelector("#confirm").addEventListener("click", async () => {
      await api(`/api/payment/mock/confirm/${pix.orderId}`, { method: "POST" });
      localStorage.removeItem("tempero_cart_v1");
      renderCartCount();
      setRoute(`#/sucesso?orderId=${encodeURIComponent(pix.orderId)}`);
    });
  }

  node.querySelector("#pix").addEventListener("click", () => startPix().catch((e) => toast(toErrorMessage(e), { type: "error" })));
  setView(node);
}

async function viewSuccess() {
  const r = route();
  const orderId = r.query.get("orderId");
  if (!orderId) return setRoute("#/");

  const data = await api(`/api/payment/status/${orderId}`);
  const order = data.order;
  if (!order) {
    setView(el(`<div class="rounded-2xl border border-border bg-card shadow p-6 text-sm text-fg/70">Pedido não encontrado.</div>`));
    return;
  }

  const node = el(`
    <div class="mx-auto max-w-3xl py-6">
      <h1 class="font-serif text-3xl">Pedido confirmado</h1>
      <div class="mt-2 text-sm text-fg/70">ID: ${order.code} • Status: ${order.status}</div>
      <div class="mt-8 rounded-2xl border border-border bg-card shadow p-6">
        <div class="font-medium">Produtos</div>
        <div class="mt-4 space-y-3 text-sm" id="items"></div>
        <div class="mt-6 pt-4 border-t border-border text-sm space-y-2">
          <div class="flex items-center justify-between"><span class="text-fg/70">Subtotal</span><span>${formatBRL(
            order.subtotalCents
          )}</span></div>
          <div class="flex items-center justify-between"><span class="text-fg/70">Frete</span><span>${formatBRL(
            order.shippingCents
          )}</span></div>
          <div class="flex items-center justify-between"><span class="text-fg/70">Desconto</span><span>-${formatBRL(
            order.discountCents
          )}</span></div>
          <div class="flex items-center justify-between font-medium"><span>Total</span><span>${formatBRL(
            order.totalCents
          )}</span></div>
        </div>
      </div>
      <div class="mt-6 flex gap-3">
        <a href="#/" class="rounded-xl bg-primary text-primaryFg px-5 py-3 text-sm font-medium shadow transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-lg active:translate-y-0">Voltar para a loja</a>
        <a href="#/admin" class="rounded-xl border border-border bg-card px-5 py-3 text-sm shadow-soft transition-[transform,background-color] duration-200 hover:bg-muted/60 hover:-translate-y-0.5 active:translate-y-0">Abrir admin</a>
      </div>
    </div>
  `);

  const items = node.querySelector("#items");
  order.items.forEach((i) => {
    items.appendChild(
      el(`
        <div class="flex items-start justify-between gap-4">
          <div>
            <div class="font-medium">${i.nameSnapshot}</div>
            ${i.variantSnapshot ? `<div class="text-xs text-fg/60">${i.variantSnapshot}</div>` : ""}
            <div class="text-xs text-fg/60">Qtd: ${i.quantity}</div>
          </div>
          <div class="font-medium">${formatBRL(i.totalCents)}</div>
        </div>
      `)
    );
  });

  setView(node);
}

async function viewAdmin() {
  const r = route();
  const tab = r.query.get("tab") ?? "dashboard";
  const sub = r.query.get("sub") ?? "";
  const authed = localStorage.getItem(ADMIN_SESSION_KEY) === "1";

  const node = el(`
    <div class="mx-auto max-w-6xl">
      <div class="flex items-end justify-between gap-4">
        <div>
          <h1 class="font-serif text-3xl">Admin</h1>
          <div class="mt-1 text-sm text-fg/70">Gerencie anúncios, descontos por variação e configuração do site.</div>
        </div>
        <div class="flex items-center gap-2">
          <a href="#/" class="rounded-xl border border-border bg-card px-4 py-2 text-sm shadow-soft hover:bg-muted/60">Ver loja</a>
          <button id="logout" type="button" class="rounded-xl border border-border bg-card px-4 py-2 text-sm shadow-soft hover:bg-muted/60 ${authed ? "" : "hidden"}">Sair</button>
        </div>
      </div>

      <div class="mt-6 grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-6">
        <aside class="rounded-2xl border border-primaryFg/15 bg-primary shadow-hero p-4 h-fit text-primaryFg">
          <div class="flex items-center justify-between">
            <div class="font-medium text-primaryFg">Navegação</div>
            <span class="text-[11px] text-primaryFg/70">${authed ? "Logado" : "Visitante"}</span>
          </div>
          <div class="mt-4 space-y-2 text-sm">
            <button data-tab="dashboard" type="button" class="w-full text-left rounded-xl border border-primaryFg/15 bg-primaryFg/5 px-4 py-2 shadow-soft hover:bg-primaryFg/10">Dashboard</button>
            <button data-tab="orders" type="button" class="w-full text-left rounded-xl border border-primaryFg/15 bg-primaryFg/5 px-4 py-2 shadow-soft hover:bg-primaryFg/10">Pedidos</button>

            <details class="rounded-xl border border-primaryFg/15 bg-primaryFg/5 px-3 py-2">
              <summary class="cursor-pointer select-none text-sm font-medium text-primaryFg">Anúncios</summary>
              <div class="mt-2 space-y-2">
                <button data-tab="products" data-sub="list" type="button" class="w-full text-left rounded-xl border border-primaryFg/15 bg-primary px-3 py-2 text-xs shadow-soft hover:bg-primaryFg/10">Lista</button>
                <button data-tab="products" data-sub="new" type="button" class="w-full text-left rounded-xl border border-primaryFg/15 bg-primary px-3 py-2 text-xs shadow-soft hover:bg-primaryFg/10">Criar (demo)</button>
              </div>
            </details>

            <details class="rounded-xl border border-primaryFg/15 bg-primaryFg/5 px-3 py-2" ${tab === "settings" ? "open" : ""}>
              <summary class="cursor-pointer select-none text-sm font-medium text-primaryFg">Configuração</summary>
              <div class="mt-2 space-y-2">
                <button data-tab="settings" data-sub="wizard" type="button" class="w-full text-left rounded-xl border border-primaryFg/15 bg-primary px-3 py-2 text-xs shadow-soft hover:bg-primaryFg/10">Assistente</button>
                <button data-tab="settings" data-sub="general" type="button" class="w-full text-left rounded-xl border border-primaryFg/15 bg-primary px-3 py-2 text-xs shadow-soft hover:bg-primaryFg/10">Geral</button>
                <button data-tab="settings" data-sub="revisions" type="button" class="w-full text-left rounded-xl border border-primaryFg/15 bg-primary px-3 py-2 text-xs shadow-soft hover:bg-primaryFg/10">Revisões</button>
              </div>
            </details>
          </div>
          <div class="mt-4 text-xs text-primaryFg/70">
            Dica: o preview salva alterações no seu navegador (localStorage).
          </div>
        </aside>

        <main class="min-w-0">
          <div class="flex flex-wrap items-center gap-2 text-sm text-fg/70">
            <a href="#/admin" class="hover:text-fg">Admin</a>
            <span>•</span>
            <span id="crumb"></span>
          </div>
          <div class="mt-4 rounded-2xl border border-border bg-card shadow-soft p-5" id="panel"></div>
        </main>
      </div>
    </div>
  `);

  const panel = node.querySelector("#panel");
  const crumb = node.querySelector("#crumb");

  function setAdminRoute(nextTab, nextSub) {
    const qs = new URLSearchParams();
    if (nextTab) qs.set("tab", nextTab);
    if (nextSub) qs.set("sub", nextSub);
    setRoute(`#/admin?${qs.toString()}`);
  }

  node.querySelector("aside").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-tab]");
    if (!b) return;
    setAdminRoute(b.getAttribute("data-tab"), b.getAttribute("data-sub") || "");
  });

  node.querySelector("#logout")?.addEventListener("click", async () => {
    await api("/api/admin/logout", { method: "POST" });
    toast("Sessão encerrada.", { type: "success" });
    setAdminRoute("dashboard", "");
  });

  function badge(status) {
    const cls =
      status === "PAID"
        ? "border-emerald-500/30 bg-emerald-500/10"
        : status === "PENDING_PAYMENT"
          ? "border-amber-500/30 bg-amber-500/10"
          : "border-border bg-bg/40";
    return `<span class="inline-flex items-center rounded-full border ${cls} px-2 py-0.5 text-[11px] text-fg/80">${status}</span>`;
  }

  function sparkline(values) {
    const v = Array.isArray(values) ? values : [];
    if (!v.length) return "";
    const max = Math.max(...v, 1);
    const min = Math.min(...v, 0);
    const w = 200;
    const h = 44;
    const pts = v
      .map((x, idx) => {
        const t = v.length === 1 ? 0 : idx / (v.length - 1);
        const px = t * (w - 2) + 1;
        const norm = max === min ? 0.5 : (x - min) / (max - min);
        const py = (1 - norm) * (h - 2) + 1;
        return `${px.toFixed(1)},${py.toFixed(1)}`;
      })
      .join(" ");
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" class="block"><polyline fill="none" stroke="currentColor" stroke-width="2" points="${pts}"/></svg>`;
  }

  async function ensureAuthed() {
    if (localStorage.getItem(ADMIN_SESSION_KEY) === "1") return true;
    panel.innerHTML = `
      <div class="flex items-start justify-between gap-4">
        <div>
          <div class="font-medium">Login</div>
          <div class="mt-1 text-sm text-fg/70">Acesso do preview (demo).</div>
        </div>
        <a class="text-sm text-fg/70 hover:text-fg" href="#/">Voltar</a>
      </div>
      <div class="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="text-xs text-fg/60">Email</label>
          <input id="email" class="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60" placeholder="admin@tempero.com" value="admin@tempero.com" />
        </div>
        <div>
          <label class="text-xs text-fg/60">Senha</label>
          <input id="pass" class="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60" placeholder="admin123456" type="password" value="admin123456" />
        </div>
      </div>
      <button id="login" type="button" class="mt-4 w-full rounded-xl bg-primary text-primaryFg px-5 py-3 text-sm font-medium shadow transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-lg active:translate-y-0">Entrar</button>
      <div class="mt-3 text-xs text-fg/60">Use: admin@tempero.com / admin123456</div>
    `;

    panel.querySelector("#login").addEventListener("click", async () => {
      const email = panel.querySelector("#email").value.trim();
      const password = panel.querySelector("#pass").value;
      try {
        await api("/api/admin/login", { method: "POST", body: JSON.stringify({ email, password }) });
        toast("Login realizado.", { type: "success" });
        setAdminRoute("dashboard", "");
      } catch (e) {
        toast("Email ou senha inválidos.", { type: "error" });
      }
    });
    crumb.textContent = "Login";
    return false;
  }

  async function showDashboard() {
    crumb.textContent = "Dashboard";
    const d = await api("/api/admin/dashboard");
    const orders = await api("/api/admin/orders");
    const paidByDay = {};
    orders
      .filter((o) => o.status === "PAID")
      .forEach((o) => {
        const day = String(o.createdAt ?? "").slice(0, 10) || "—";
        paidByDay[day] = (paidByDay[day] ?? 0) + (o.totalCents ?? 0);
      });
    const days = Object.keys(paidByDay).sort().slice(-14);
    const values = days.map((k) => Math.round((paidByDay[k] ?? 0) / 100));

    panel.innerHTML = `
      <div class="flex items-start justify-between gap-4">
        <div>
          <div class="font-medium">Métricas</div>
          <div class="mt-1 text-sm text-fg/70">Atualiza quando pedidos mudam neste navegador.</div>
        </div>
        <button id="refresh" type="button" class="rounded-xl border border-border bg-card px-4 py-2 text-sm shadow-soft hover:bg-muted/60">Atualizar</button>
      </div>
      <div class="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="rounded-2xl border border-border bg-bg/40 p-4">
          <div class="text-xs text-fg/60">Pedidos</div>
          <div class="mt-2 text-2xl font-medium">${d.totalOrders}</div>
        </div>
        <div class="rounded-2xl border border-border bg-bg/40 p-4">
          <div class="text-xs text-fg/60">Pagos</div>
          <div class="mt-2 text-2xl font-medium">${d.paidOrders}</div>
        </div>
        <div class="rounded-2xl border border-border bg-bg/40 p-4">
          <div class="text-xs text-fg/60">Faturamento</div>
          <div class="mt-2 text-2xl font-medium">${formatBRL(d.revenueCents)}</div>
        </div>
      </div>
      <div class="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="rounded-2xl border border-border bg-bg/40 p-4">
          <div class="text-xs text-fg/60">Faturamento (últimos dias)</div>
          <div class="mt-3 text-fg/80">${sparkline(values)}</div>
          <div class="mt-2 text-[11px] text-fg/60">${days.length ? days[0] + " → " + days[days.length - 1] : "Sem dados"}</div>
        </div>
        <div class="rounded-2xl border border-border bg-bg/40 p-4">
          <div class="text-xs text-fg/60">Atalhos</div>
          <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button data-go="products" type="button" class="rounded-xl border border-border bg-card px-4 py-3 text-left shadow-soft hover:bg-muted/60">
              <div class="font-medium">Editar anúncios</div>
              <div class="text-xs text-fg/60">Imagens, variações e descontos.</div>
            </button>
            <button data-go="settings" type="button" class="rounded-xl border border-border bg-card px-4 py-3 text-left shadow-soft hover:bg-muted/60">
              <div class="font-medium">Configurar loja</div>
              <div class="text-xs text-fg/60">Assistente com autosave.</div>
            </button>
          </div>
        </div>
      </div>
    `;

    panel.querySelector("#refresh")?.addEventListener("click", () => setAdminRoute("dashboard", ""));
    panel.querySelectorAll("button[data-go]").forEach((b) => {
      b.addEventListener("click", () => {
        const t = b.getAttribute("data-go");
        if (t === "products") setAdminRoute("products", "list");
        if (t === "settings") setAdminRoute("settings", "wizard");
      });
    });
  }

  async function showOrders() {
    crumb.textContent = "Pedidos";
    const orders = await api("/api/admin/orders");
    panel.innerHTML = `
      <div class="flex items-start justify-between gap-4">
        <div>
          <div class="font-medium">Pedidos</div>
          <div class="mt-1 text-sm text-fg/70">Lista local do preview (mock).</div>
        </div>
        <div class="flex items-center gap-2">
          <input id="q" class="w-56 rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft" placeholder="Buscar por código..." />
          <button id="refresh" type="button" class="rounded-xl border border-border bg-card px-4 py-2 text-sm shadow-soft hover:bg-muted/60">Atualizar</button>
        </div>
      </div>
      <div class="mt-5 overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-xs text-fg/60">
            <tr class="border-b border-border">
              <th class="py-2 text-left font-medium">Código</th>
              <th class="py-2 text-left font-medium">Status</th>
              <th class="py-2 text-left font-medium">Cliente</th>
              <th class="py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody id="rows"></tbody>
        </table>
      </div>
    `;

    function renderRows(list) {
      const tbody = panel.querySelector("#rows");
      tbody.innerHTML = "";
      list.forEach((o) => {
        tbody.appendChild(
          el(`
            <tr class="border-b border-border/60">
              <td class="py-3">
                <div class="font-medium">${o.code}</div>
                <div class="text-[11px] text-fg/60">${String(o.createdAt ?? "").slice(0, 19).replace("T", " ")}</div>
              </td>
              <td class="py-3">${badge(o.status)}</td>
              <td class="py-3">
                <div class="text-fg/80">${o.customerName || "—"}</div>
                <div class="text-[11px] text-fg/60">${o.email || ""}</div>
              </td>
              <td class="py-3 text-right font-medium">${formatBRL(o.totalCents ?? 0)}</td>
            </tr>
          `)
        );
      });
      if (!list.length) {
        tbody.appendChild(el(`<tr><td class="py-6 text-center text-sm text-fg/60" colspan="4">Sem pedidos.</td></tr>`));
      }
    }

    renderRows(orders);
    panel.querySelector("#refresh").addEventListener("click", () => setAdminRoute("orders", ""));
    panel.querySelector("#q").addEventListener("input", (e) => {
      const q = e.target.value.trim().toLowerCase();
      renderRows(q ? orders.filter((o) => String(o.code ?? "").toLowerCase().includes(q)) : orders);
    });
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error("file_read_failed"));
      r.readAsDataURL(file);
    });
  }

  async function resizeAndCropSquareDataUrl(dataUrl, size) {
    const img = new Image();
    img.decoding = "async";
    img.src = dataUrl;
    await img.decode();

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas_unavailable");

    const sw = img.naturalWidth;
    const sh = img.naturalHeight;
    const s = Math.min(sw, sh);
    const sx = Math.round((sw - s) / 2);
    const sy = Math.round((sh - s) / 2);
    ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", 0.9);
  }

  function validateTiers(tiers) {
    const t = normalizeTiers(tiers);
    const mins = new Set();
    for (const row of t) {
      if (mins.has(row.minQty)) return { ok: false, message: "Não repita a mesma quantidade mínima nas faixas." };
      mins.add(row.minQty);
    }
    return { ok: true, value: t };
  }

  async function showProducts() {
    crumb.textContent = "Anúncios";
    if (!(await ensureAuthed())) return;

    const products = await api("/api/admin/products");
    const categories = await api("/api/categories");
    const byCat = new Map(categories.map((c) => [c.id, c]));
    const pageSize = 20;
    let page = 1;
    let q = "";

    panel.innerHTML = `
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div class="font-medium">Anúncios</div>
          <div class="mt-1 text-sm text-fg/70">Edite imagens, variações e descontos progressivos.</div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <input id="q" class="w-64 rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft" placeholder="Buscar produto..." />
          <button id="refresh" type="button" class="rounded-xl border border-border bg-card px-4 py-2 text-sm shadow-soft hover:bg-muted/60">Atualizar</button>
        </div>
      </div>

      <div class="mt-5 rounded-2xl border border-border bg-bg/40 overflow-hidden">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px" id="grid"></div>
      </div>

      <div class="mt-4 flex items-center justify-between text-sm text-fg/70">
        <div id="meta"></div>
        <div class="flex items-center gap-2">
          <button id="prev" type="button" class="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-soft hover:bg-muted/60">Anterior</button>
          <button id="next" type="button" class="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-soft hover:bg-muted/60">Próxima</button>
        </div>
      </div>

      <div id="modal" class="fixed inset-0 z-[999] hidden">
        <div class="absolute inset-0 bg-black/40"></div>
        <div class="absolute inset-x-0 bottom-0 sm:inset-y-10 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-4xl sm:rounded-3xl sm:border sm:border-border sm:bg-card sm:shadow-2xl sm:overflow-hidden">
          <div class="bg-card border-t sm:border-t-0 border-border rounded-t-3xl sm:rounded-none">
            <div class="flex items-center justify-between gap-3 px-5 py-4 border-b border-border">
              <div class="min-w-0">
                <div class="font-medium truncate" id="mTitle"></div>
                <div class="text-xs text-fg/60 truncate" id="mSub"></div>
              </div>
              <div class="flex items-center gap-2">
                <button id="mSave" type="button" class="rounded-xl bg-primary text-primaryFg px-4 py-2 text-sm font-medium shadow hover:bg-primary/90">Salvar</button>
                <button id="mClose" type="button" class="rounded-xl border border-border bg-card px-4 py-2 text-sm shadow-soft hover:bg-muted/60">Fechar</button>
              </div>
            </div>
            <div class="max-h-[70vh] overflow-auto px-5 py-5" id="mBody"></div>
          </div>
        </div>
      </div>
    `;

    const grid = panel.querySelector("#grid");
    const meta = panel.querySelector("#meta");
    const modal = panel.querySelector("#modal");
    const mBody = panel.querySelector("#mBody");
    const mTitle = panel.querySelector("#mTitle");
    const mSub = panel.querySelector("#mSub");
    const mClose = panel.querySelector("#mClose");
    const mSave = panel.querySelector("#mSave");

    let editing = null;

    function filtered() {
      const base = Array.isArray(products) ? products : [];
      const qq = q.trim().toLowerCase();
      return qq ? base.filter((p) => p.name.toLowerCase().includes(qq) || p.slug.toLowerCase().includes(qq)) : base;
    }

    function renderList() {
      const list = filtered();
      const total = list.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      page = Math.max(1, Math.min(page, totalPages));
      const slice = list.slice((page - 1) * pageSize, page * pageSize);

      meta.textContent = `${total} anúncios • Página ${page} de ${totalPages}`;
      grid.innerHTML = "";
      slice.forEach((p) => {
        const thumb = (p.images || []).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))[0]?.url ?? p.imageUrl ?? "";
        const catName = byCat.get(p.categoryId)?.name ?? "—";
        grid.appendChild(
          el(`
            <button data-id="${p.id}" type="button" class="text-left bg-card p-4 hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring/60">
              <div class="flex gap-3">
                <div class="h-14 w-14 rounded-2xl bg-muted overflow-hidden shrink-0">
                  ${thumb ? `<img src="${thumb}" alt="" class="h-full w-full object-cover" loading="lazy" />` : ""}
                </div>
                <div class="min-w-0 flex-1">
                  <div class="font-medium truncate">${p.name}</div>
                  <div class="text-xs text-fg/60 truncate">${catName} • ${p.slug}</div>
                  <div class="mt-2 text-sm font-medium">${formatBRL(p.promoPriceCents ?? p.priceCents)}</div>
                </div>
              </div>
            </button>
          `)
        );
      });
    }

    function openModal() {
      modal.classList.remove("hidden");
      modal.addEventListener(
        "click",
        (e) => {
          if (e.target === modal || e.target === modal.firstElementChild) closeModal();
        },
        { once: true }
      );
    }

    function closeModal() {
      modal.classList.add("hidden");
      editing = null;
      mBody.innerHTML = "";
    }

    function renderImageManager(state) {
      const imgs = state.images;
      const box = el(`
        <div class="rounded-2xl border border-border bg-bg/40 p-4">
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="font-medium">Imagens</div>
              <div class="mt-1 text-xs text-fg/60">Crop e resize automáticos (quadrado 1200×1200). Arraste para reordenar.</div>
            </div>
            <div class="flex items-center gap-2">
              <input id="file" type="file" accept="image/png,image/jpeg,image/webp" multiple class="hidden" />
              <button id="add" type="button" class="rounded-xl border border-border bg-card px-4 py-2 text-sm shadow-soft hover:bg-muted/60">Adicionar</button>
            </div>
          </div>
          <div class="mt-4 rounded-2xl border border-dashed border-border bg-bg/40 p-4 text-sm text-fg/70" id="drop">
            Solte imagens aqui ou clique em “Adicionar”.
          </div>
          <div class="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3" id="thumbs"></div>
        </div>
      `);

      const input = box.querySelector("#file");
      box.querySelector("#add").addEventListener("click", () => input.click());

      async function addFiles(files) {
        const list = Array.from(files || []);
        for (const f of list) {
          const okType = ["image/png", "image/jpeg", "image/webp"].includes(f.type);
          const okSize = f.size <= 6 * 1024 * 1024;
          if (!okType) {
            toast(`Formato inválido: ${f.name}`, { type: "warning" });
            continue;
          }
          if (!okSize) {
            toast(`Arquivo muito grande (máx. 6MB): ${f.name}`, { type: "warning" });
            continue;
          }
          const raw = await readFileAsDataURL(f);
          const processed = await resizeAndCropSquareDataUrl(raw, 1200);
          imgs.push({ id: crypto.randomUUID(), url: processed, alt: null, sortOrder: imgs.length });
        }
        renderThumbs();
      }

      input.addEventListener("change", () => addFiles(input.files).catch((e) => toast(toErrorMessage(e), { type: "error" })));
      const drop = box.querySelector("#drop");
      drop.addEventListener("dragover", (e) => {
        e.preventDefault();
        drop.classList.add("ring-2", "ring-ring/40");
      });
      drop.addEventListener("dragleave", () => drop.classList.remove("ring-2", "ring-ring/40"));
      drop.addEventListener("drop", (e) => {
        e.preventDefault();
        drop.classList.remove("ring-2", "ring-ring/40");
        addFiles(e.dataTransfer?.files).catch((err) => toast(toErrorMessage(err), { type: "error" }));
      });

      const thumbs = box.querySelector("#thumbs");

      function reorder(from, to) {
        if (from === to) return;
        const [item] = imgs.splice(from, 1);
        imgs.splice(to, 0, item);
        imgs.forEach((x, idx) => (x.sortOrder = idx));
      }

      function renderThumbs() {
        thumbs.innerHTML = "";
        imgs.forEach((img, idx) => {
          const card = el(`
            <div class="rounded-2xl border border-border bg-card overflow-hidden shadow-soft" draggable="true" data-idx="${idx}">
              <div class="aspect-square bg-muted">
                <img src="${img.url}" alt="" class="h-full w-full object-cover" loading="lazy" />
              </div>
              <div class="p-2 flex items-center gap-2">
                <button data-a="up" type="button" class="rounded-xl border border-border bg-bg/60 px-2 py-1 text-[11px] hover:bg-muted/60" aria-label="Mover para cima">↑</button>
                <button data-a="down" type="button" class="rounded-xl border border-border bg-bg/60 px-2 py-1 text-[11px] hover:bg-muted/60" aria-label="Mover para baixo">↓</button>
                <button data-a="rm" type="button" class="ml-auto rounded-xl border border-border bg-bg/60 px-2 py-1 text-[11px] hover:bg-muted/60" aria-label="Remover">Remover</button>
              </div>
            </div>
          `);

          card.addEventListener("click", (e) => {
            const a = e.target.closest("button[data-a]")?.getAttribute("data-a");
            if (!a) return;
            if (a === "rm") imgs.splice(idx, 1);
            if (a === "up" && idx > 0) reorder(idx, idx - 1);
            if (a === "down" && idx < imgs.length - 1) reorder(idx, idx + 1);
            imgs.forEach((x, i) => (x.sortOrder = i));
            renderThumbs();
          });

          card.addEventListener("dragstart", (e) => {
            e.dataTransfer?.setData("text/plain", String(idx));
            e.dataTransfer?.setDragImage(card, 10, 10);
          });
          card.addEventListener("dragover", (e) => e.preventDefault());
          card.addEventListener("drop", (e) => {
            e.preventDefault();
            const from = Number(e.dataTransfer?.getData("text/plain"));
            if (!Number.isFinite(from)) return;
            reorder(from, idx);
            renderThumbs();
          });

          thumbs.appendChild(card);
        });
      }

      renderThumbs();
      return box;
    }

    function renderDiscountEditor(state) {
      const root = el(`<div class="rounded-2xl border border-border bg-bg/40 p-4"></div>`);
      root.innerHTML = `
        <div class="font-medium">Descontos por variação</div>
        <div class="mt-1 text-xs text-fg/60">Defina faixas por quantidade (ex.: 3+ → 5%).</div>
        <div class="mt-4 space-y-4" id="vars"></div>
      `;
      const vars = root.querySelector("#vars");

      state.variants.forEach((v, vIdx) => {
        const block = el(`
          <div class="rounded-2xl border border-border bg-card p-4">
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0">
                <div class="font-medium">${v.label}</div>
                <div class="text-xs text-fg/60">Acréscimo: ${formatBRL(Number(v.priceDeltaCents ?? 0))}</div>
              </div>
              <button data-add="1" type="button" class="rounded-xl border border-border bg-bg/60 px-3 py-2 text-xs shadow-soft hover:bg-muted/60">Adicionar faixa</button>
            </div>
            <div class="mt-3 overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="text-xs text-fg/60">
                  <tr class="border-b border-border">
                    <th class="py-2 text-left font-medium">Qtd mín.</th>
                    <th class="py-2 text-left font-medium">% OFF</th>
                    <th class="py-2 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody id="rows"></tbody>
              </table>
            </div>
            <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-fg/60">
              <span>Preview:</span>
              <input data-qty type="number" min="1" value="1" class="w-20 rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft" />
              <span id="pv"></span>
            </div>
          </div>
        `);

        const rows = block.querySelector("#rows");
        const qtyInput = block.querySelector("input[data-qty]");
        const pv = block.querySelector("#pv");

        function renderRows() {
          rows.innerHTML = "";
          const tiers = normalizeTiers(v.discountTiers);
          v.discountTiers = tiers;
          tiers.forEach((t, idx) => {
            rows.appendChild(
              el(`
                <tr class="border-b border-border/60">
                  <td class="py-2">
                    <input data-k="minQty" data-idx="${idx}" type="number" min="1" value="${t.minQty}" class="w-24 rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft" />
                  </td>
                  <td class="py-2">
                    <input data-k="percentOff" data-idx="${idx}" type="number" min="0" max="90" step="0.5" value="${t.percentOff}" class="w-24 rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft" />
                  </td>
                  <td class="py-2 text-right">
                    <button data-rm="${idx}" type="button" class="rounded-xl border border-border bg-bg/60 px-3 py-2 text-xs shadow-soft hover:bg-muted/60">Remover</button>
                  </td>
                </tr>
              `)
            );
          });
          if (!tiers.length) rows.appendChild(el(`<tr><td class="py-4 text-sm text-fg/60" colspan="3">Sem faixas configuradas.</td></tr>`));
          refreshPreview();
        }

        function refreshPreview() {
          const qty = Math.max(1, Math.floor(Number(qtyInput.value || "1")));
          const product = state;
          const totals = computeLineTotals({ product, variant: v, qty });
          pv.textContent = `${qty} un. • ${formatBRL(totals.discountedUnit)} cada • -${totals.pct}%`;
        }

        block.querySelector("button[data-add]").addEventListener("click", () => {
          v.discountTiers = normalizeTiers([...(v.discountTiers || []), { minQty: 2, percentOff: 5 }]);
          renderRows();
        });

        block.addEventListener("input", (e) => {
          const rm = e.target.closest("button[data-rm]")?.getAttribute("data-rm");
          if (rm != null) return;
          const idx = e.target.getAttribute("data-idx");
          const k = e.target.getAttribute("data-k");
          if (idx != null && k) {
            const i = Number(idx);
            const tiers = normalizeTiers(v.discountTiers);
            const row = tiers[i];
            if (row) {
              row[k] = Number(e.target.value);
              const val = validateTiers(tiers);
              if (!val.ok) toast(val.message, { type: "warning" });
              v.discountTiers = val.ok ? val.value : tiers;
              renderRows();
            }
          }
        });

        block.addEventListener("click", (e) => {
          const rm = e.target.closest("button[data-rm]")?.getAttribute("data-rm");
          if (rm == null) return;
          const idx = Number(rm);
          const tiers = normalizeTiers(v.discountTiers);
          tiers.splice(idx, 1);
          v.discountTiers = tiers;
          renderRows();
        });

        qtyInput.addEventListener("input", refreshPreview);
        renderRows();
        vars.appendChild(block);
      });
      return root;
    }

    async function editProduct(id) {
      const p = await api(`/api/admin/products/${encodeURIComponent(id)}`);
      editing = JSON.parse(JSON.stringify(p));
      editing.images = Array.isArray(editing.images) ? editing.images : [];
      editing.variants = Array.isArray(editing.variants) ? editing.variants : [];

      mTitle.textContent = editing.name;
      mSub.textContent = editing.slug;

      mBody.innerHTML = "";
      const form = el(`
        <div class="space-y-5">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-fg/60">Nome</label>
              <input id="name" class="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60" value="${editing.name ?? ""}" />
              <div class="mt-1 text-[11px] text-fg/60">Obrigatório</div>
            </div>
            <div>
              <label class="text-xs text-fg/60">Slug</label>
              <input id="slug" class="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60" value="${editing.slug ?? ""}" />
              <div id="slugErr" class="mt-1 text-[11px] text-red-600 hidden"></div>
            </div>
          </div>
          <div>
            <label class="text-xs text-fg/60">Descrição</label>
            <textarea id="desc" class="mt-1 w-full min-h-28 rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60">${editing.description ?? ""}</textarea>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="text-xs text-fg/60">Preço (centavos)</label>
              <input id="price" type="number" min="0" class="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft" value="${Number(editing.priceCents ?? 0)}" />
            </div>
            <div>
              <label class="text-xs text-fg/60">Promo (centavos)</label>
              <input id="promo" type="number" min="0" class="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft" value="${Number(editing.promoPriceCents ?? 0)}" />
            </div>
            <div>
              <label class="text-xs text-fg/60">Ativo</label>
              <select id="active" class="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft">
                <option value="1" ${editing.isActive ? "selected" : ""}>Sim</option>
                <option value="0" ${!editing.isActive ? "selected" : ""}>Não</option>
              </select>
            </div>
          </div>
          <div>
            <label class="text-xs text-fg/60">Categoria</label>
            <select id="cat" class="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft"></select>
          </div>
        </div>
      `);

      const catSel = form.querySelector("#cat");
      categories.forEach((c) => catSel.appendChild(el(`<option value="${c.id}" ${c.id === editing.categoryId ? "selected" : ""}>${c.name}</option>`)));

      const slugErr = form.querySelector("#slugErr");
      const slugInput = form.querySelector("#slug");
      slugInput.addEventListener("input", () => {
        const s = slugInput.value.trim();
        const taken = products.some((pp) => pp.id !== editing.id && pp.slug === s);
        if (!s || s.length < 2) {
          slugErr.textContent = "Slug inválido.";
          slugErr.classList.remove("hidden");
          slugInput.setAttribute("aria-invalid", "true");
          return;
        }
        if (taken) {
          slugErr.textContent = "Slug já existe em outro anúncio.";
          slugErr.classList.remove("hidden");
          slugInput.setAttribute("aria-invalid", "true");
          return;
        }
        slugErr.classList.add("hidden");
        slugInput.removeAttribute("aria-invalid");
      });

      mBody.appendChild(form);
      mBody.appendChild(renderImageManager(editing));
      mBody.appendChild(renderDiscountEditor(editing));

      openModal();

      mClose.onclick = closeModal;
      mSave.onclick = async () => {
        try {
          const payload = {
            name: form.querySelector("#name").value.trim(),
            slug: form.querySelector("#slug").value.trim(),
            description: form.querySelector("#desc").value,
            priceCents: Number(form.querySelector("#price").value),
            promoPriceCents: Number(form.querySelector("#promo").value),
            categoryId: form.querySelector("#cat").value,
            isActive: form.querySelector("#active").value === "1",
            images: editing.images,
            variants: editing.variants
          };
          if (!payload.name || payload.name.length < 2) throw new Error("Nome é obrigatório.");
          await api(`/api/admin/products/${encodeURIComponent(editing.id)}`, { method: "PUT", body: JSON.stringify(payload) });
          toast("Anúncio salvo.", { type: "success" });
          closeModal();
          setAdminRoute("products", "list");
        } catch (e) {
          toast(toErrorMessage(e), { type: "error" });
        }
      };
    }

    panel.querySelector("#refresh").addEventListener("click", () => setAdminRoute("products", "list"));
    panel.querySelector("#q").addEventListener("input", (e) => {
      q = e.target.value;
      page = 1;
      renderList();
    });
    panel.querySelector("#prev").addEventListener("click", () => {
      page = Math.max(1, page - 1);
      renderList();
    });
    panel.querySelector("#next").addEventListener("click", () => {
      page = page + 1;
      renderList();
    });

    grid.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-id]");
      if (!b) return;
      editProduct(b.getAttribute("data-id")).catch((err) => toast(toErrorMessage(err), { type: "error" }));
    });

    renderList();
  }

  async function showSettings() {
    crumb.textContent = "Configuração";
    if (!(await ensureAuthed())) return;

    const s = await api("/api/admin/settings");
    const state = {
      storeName: String(s.storeName ?? ""),
      whatsapp: String(s.whatsapp ?? ""),
      pixDiscountPercent: Number(s.pixDiscountPercent ?? 5),
      shippingMarginPercent: Number(s.shippingMarginPercent ?? 0)
    };

    const subTab = sub || "wizard";
    crumb.textContent = subTab === "general" ? "Configuração / Geral" : subTab === "revisions" ? "Configuração / Revisões" : "Configuração / Assistente";

    const header = el(`
      <div class="flex items-start justify-between gap-4">
        <div>
          <div class="font-medium">Configuração</div>
          <div class="mt-1 text-sm text-fg/70">Autosave e histórico local (preview).</div>
        </div>
        <div class="text-xs text-fg/60" id="saveState">—</div>
      </div>
    `);

    panel.innerHTML = "";
    panel.appendChild(header);

    const saveState = header.querySelector("#saveState");
    let saveTimer = null;

    function pushRevision(snapshot) {
      const revisions = loadRevisions();
      revisions.unshift({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), snapshot });
      saveRevisions(revisions.slice(0, 30));
    }

    async function saveNow() {
      saveState.textContent = "Salvando…";
      await api("/api/admin/settings", { method: "PUT", body: JSON.stringify(state) });
      pushRevision({ ...state });
      saveState.textContent = "Salvo";
    }

    function scheduleSave() {
      saveState.textContent = "Alterado";
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => saveNow().catch((e) => toast(toErrorMessage(e), { type: "error" })), 650);
    }

    function renderWizard() {
      const steps = [
        { id: "store", title: "Loja" },
        { id: "offers", title: "Ofertas" },
        { id: "shipping", title: "Frete" }
      ];
      let step = "store";

      const w = el(`
        <div class="mt-5">
          <div class="flex flex-wrap items-center gap-2" id="steps"></div>
          <div class="mt-5" id="content"></div>
          <div class="mt-6 flex items-center justify-between gap-3">
            <button id="prev" type="button" class="rounded-xl border border-border bg-card px-4 py-2 text-sm shadow-soft hover:bg-muted/60">Voltar</button>
            <div class="flex items-center gap-2">
              <button id="preview" type="button" class="rounded-xl border border-border bg-card px-4 py-2 text-sm shadow-soft hover:bg-muted/60">Abrir preview</button>
              <button id="next" type="button" class="rounded-xl bg-primary text-primaryFg px-4 py-2 text-sm font-medium shadow hover:bg-primary/90">Próximo</button>
            </div>
          </div>
        </div>
      `);

      const stepsWrap = w.querySelector("#steps");
      const content = w.querySelector("#content");

      function renderSteps() {
        stepsWrap.innerHTML = "";
        steps.forEach((s) => {
          stepsWrap.appendChild(
            el(`<button type="button" data-step="${s.id}" class="rounded-full border border-border px-3 py-1 text-xs shadow-soft ${
              step === s.id ? "bg-muted/60" : "bg-card hover:bg-muted/60"
            }">${s.title}</button>`)
          );
        });
      }

      function renderStep() {
        renderSteps();
        content.innerHTML = "";
        if (step === "store") {
          content.appendChild(
            el(`
              <div class="rounded-2xl border border-border bg-bg/40 p-4">
                <div class="font-medium">Dados da loja</div>
                <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label class="text-xs text-fg/60">Nome</label>
                    <input id="storeName" class="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft" value="${state.storeName}" />
                  </div>
                  <div>
                    <label class="text-xs text-fg/60">WhatsApp</label>
                    <input id="whatsapp" class="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft" value="${state.whatsapp}" placeholder="(11) 99999-9999" />
                  </div>
                </div>
              </div>
            `)
          );
          content.querySelector("#storeName").addEventListener("input", (e) => {
            state.storeName = e.target.value;
            scheduleSave();
          });
          content.querySelector("#whatsapp").addEventListener("input", (e) => {
            state.whatsapp = e.target.value;
            scheduleSave();
          });
        }

        if (step === "offers") {
          content.appendChild(
            el(`
              <div class="rounded-2xl border border-border bg-bg/40 p-4">
                <div class="font-medium">Ofertas</div>
                <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label class="text-xs text-fg/60">Desconto Pix (%)</label>
                    <input id="pix" type="number" min="0" max="90" step="0.5" class="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft" value="${state.pixDiscountPercent}" />
                    <div class="mt-1 text-[11px] text-fg/60">Aparece no checkout e na Home.</div>
                  </div>
                </div>
              </div>
            `)
          );
          content.querySelector("#pix").addEventListener("input", (e) => {
            state.pixDiscountPercent = Number(e.target.value);
            scheduleSave();
          });
        }

        if (step === "shipping") {
          content.appendChild(
            el(`
              <div class="rounded-2xl border border-border bg-bg/40 p-4">
                <div class="font-medium">Frete</div>
                <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label class="text-xs text-fg/60">Margem (%)</label>
                    <input id="margin" type="number" min="0" max="100" step="1" class="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft" value="${state.shippingMarginPercent}" />
                    <div class="mt-1 text-[11px] text-fg/60">Ajusta o custo do frete do preview.</div>
                  </div>
                </div>
              </div>
            `)
          );
          content.querySelector("#margin").addEventListener("input", (e) => {
            state.shippingMarginPercent = Number(e.target.value);
            scheduleSave();
          });
        }
      }

      w.querySelector("#prev").addEventListener("click", () => {
        const idx = Math.max(0, steps.findIndex((s) => s.id === step) - 1);
        step = steps[idx].id;
        renderStep();
      });
      w.querySelector("#next").addEventListener("click", () => {
        const idx = Math.min(steps.length - 1, steps.findIndex((s) => s.id === step) + 1);
        step = steps[idx].id;
        renderStep();
      });
      w.querySelector("#preview").addEventListener("click", () => {
        toast("Abra a loja em outra aba para ver o resultado.", { type: "info" });
        window.open("#/", "_blank");
      });
      stepsWrap.addEventListener("click", (e) => {
        const b = e.target.closest("button[data-step]");
        if (!b) return;
        step = b.getAttribute("data-step");
        renderStep();
      });

      renderStep();
      return w;
    }

    function renderGeneral() {
      const g = el(`
        <div class="mt-5 rounded-2xl border border-border bg-bg/40 p-4">
          <div class="font-medium">Geral</div>
          <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-fg/60">Nome</label>
              <input id="storeName" class="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft" value="${state.storeName}" />
            </div>
            <div>
              <label class="text-xs text-fg/60">WhatsApp</label>
              <input id="whatsapp" class="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft" value="${state.whatsapp}" />
            </div>
            <div>
              <label class="text-xs text-fg/60">Pix (%)</label>
              <input id="pix" type="number" min="0" max="90" step="0.5" class="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft" value="${state.pixDiscountPercent}" />
            </div>
            <div>
              <label class="text-xs text-fg/60">Margem frete (%)</label>
              <input id="margin" type="number" min="0" max="100" step="1" class="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft" value="${state.shippingMarginPercent}" />
            </div>
          </div>
          <button id="saveNow" type="button" class="mt-4 rounded-xl bg-primary text-primaryFg px-5 py-3 text-sm font-medium shadow hover:bg-primary/90">Salvar agora</button>
        </div>
      `);
      g.querySelectorAll("input").forEach((inp) =>
        inp.addEventListener("input", () => {
          state.storeName = g.querySelector("#storeName").value;
          state.whatsapp = g.querySelector("#whatsapp").value;
          state.pixDiscountPercent = Number(g.querySelector("#pix").value);
          state.shippingMarginPercent = Number(g.querySelector("#margin").value);
          scheduleSave();
        })
      );
      g.querySelector("#saveNow").addEventListener("click", () => saveNow().catch((e) => toast(toErrorMessage(e), { type: "error" })));
      return g;
    }

    function renderRevisions() {
      const revisions = loadRevisions();
      const root = el(`
        <div class="mt-5 rounded-2xl border border-border bg-bg/40 p-4">
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="font-medium">Revisões</div>
              <div class="mt-1 text-sm text-fg/70">Rollback rápido das configurações (local).</div>
            </div>
            <div class="flex items-center gap-2">
              <button id="clearRevisions" type="button" class="rounded-xl border border-border bg-card px-4 py-2 text-sm shadow-soft hover:bg-muted/60">Limpar revisões</button>
              <button id="resetLocal" type="button" class="rounded-xl border border-border bg-bg/60 px-4 py-2 text-sm shadow-soft hover:bg-muted/60">Resetar preview</button>
            </div>
          </div>
          <div class="mt-4 space-y-2 text-sm" id="list"></div>
        </div>
      `);
      const list = root.querySelector("#list");
      if (!revisions.length) list.appendChild(el(`<div class="text-sm text-fg/60">Sem revisões ainda.</div>`));
      revisions.slice(0, 20).forEach((rev) => {
        const when = String(rev.createdAt ?? "").slice(0, 19).replace("T", " ");
        const row = el(`
          <div class="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
            <div class="min-w-0">
              <div class="font-medium">${when}</div>
              <div class="text-xs text-fg/60 truncate">${rev.snapshot?.storeName ?? ""}</div>
            </div>
            <button data-restore="${rev.id}" type="button" class="rounded-xl bg-primary text-primaryFg px-3 py-2 text-xs font-medium shadow hover:bg-primary/90">Restaurar</button>
          </div>
        `);
        list.appendChild(row);
      });
      root.addEventListener("click", async (e) => {
        const id = e.target.closest("button[data-restore]")?.getAttribute("data-restore");
        if (!id) return;
        const revisions = loadRevisions();
        const rev = revisions.find((x) => x.id === id) ?? null;
        if (!rev?.snapshot) return;
        Object.assign(state, rev.snapshot);
        await saveNow();
        toast("Revisão restaurada.", { type: "success" });
        setAdminRoute("settings", "general");
      });
      root.querySelector("#clearRevisions").addEventListener("click", () => {
        saveRevisions([]);
        toast("Revisões limpas.", { type: "success" });
        setAdminRoute("settings", "revisions");
      });
      root.querySelector("#resetLocal").addEventListener("click", () => {
        const ok = window.confirm("Isso vai apagar alterações locais do preview (catálogo editado, revisões, pedidos e carrinho) neste navegador. Continuar?");
        if (!ok) return;
        localStorage.removeItem(OVERRIDES_KEY);
        localStorage.removeItem(REVISIONS_KEY);
        localStorage.removeItem(ORDERS_KEY);
        localStorage.removeItem(ADMIN_SESSION_KEY);
        localStorage.removeItem("tempero_cart_v1");
        toast("Dados locais apagados. Recarregando…", { type: "success" });
        window.setTimeout(() => window.location.reload(), 250);
      });
      return root;
    }

    if (subTab === "general") panel.appendChild(renderGeneral());
    else if (subTab === "revisions") panel.appendChild(renderRevisions());
    else panel.appendChild(renderWizard());
  }

  function rerenderCurrent() {
    const cur = route();
    const t = cur.query.get("tab") ?? "dashboard";
    if (t === "dashboard") return showDashboard().catch((e) => toast(toErrorMessage(e), { type: "error" }));
    if (t === "orders") return showOrders().catch((e) => toast(toErrorMessage(e), { type: "error" }));
    if (t === "products") return showProducts().catch((e) => toast(toErrorMessage(e), { type: "error" }));
    if (t === "settings") return showSettings().catch((e) => toast(toErrorMessage(e), { type: "error" }));
    return showDashboard().catch((e) => toast(toErrorMessage(e), { type: "error" }));
  }

  const storageHandler = (e) => {
    if (e.key !== ORDERS_KEY) return;
    const t = route().query.get("tab") ?? "dashboard";
    if (t === "dashboard" || t === "orders") rerenderCurrent();
  };
  window.addEventListener("storage", storageHandler);

  await rerenderCurrent();
  setView(node);
}

async function render() {
  renderCartCount();
  const r = route();
  if (r.path === "/") return viewHome();
  if (r.path === "/catalogo") return viewCatalog();
  if (r.path === "/produto") return viewProduct();
  if (r.path === "/carrinho") return viewCart();
  if (r.path === "/checkout") return viewCheckout();
  if (r.path === "/sucesso") return viewSuccess();
  if (r.path === "/admin") return viewAdmin();
  setRoute("#/");
}

window.addEventListener("hashchange", () => render().catch((e) => toast(toErrorMessage(e), { type: "error" })));
render().catch((e) => toast(toErrorMessage(e), { type: "error" }));
