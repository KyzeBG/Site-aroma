const DATA_URL = "./preview-data.json";
const OVERRIDES_KEY = "aroma_preview_overrides_v1";
const ORDERS_KEY = "aroma_preview_orders_v1";
const ADMIN_SESSION_KEY = "aroma_preview_admin_v1";

function setDataSourceLabel(label) {
  const el = document.getElementById("apiBase");
  if (el) el.textContent = label;
}

setDataSourceLabel("local (preview-data.json)");

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
    productsExtra: []
  };
}

function saveOverrides(next) {
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(next));
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
  const products = [...productsBase, ...productsExtra];
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

function formatBRL(cents) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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
      const unit = (p?.promoPriceCents ?? p?.priceCents ?? 0) + (v?.priceDeltaCents ?? 0);
      return {
        id: crypto.randomUUID(),
        productId: i.productId,
        variantId: i.variantId ?? null,
        nameSnapshot: p?.name ?? "Produto",
        variantSnapshot: v?.label ?? null,
        unitPriceCents: unit,
        quantity: i.quantity ?? 1,
        totalCents: unit * (i.quantity ?? 1)
      };
    });

    const subtotalCents = orderItems.reduce((acc, it) => acc + it.totalCents, 0);
    const shippingCents = Number(payload.shipping?.priceCents ?? 0);
    const discountCents = Number(payload.discountCents ?? 0);
    const totalCents = Math.max(0, subtotalCents + shippingCents - discountCents);

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
      <section class="reveal rounded-3xl overflow-hidden border border-border bg-card shadow relative">
        <div class="relative">
          <img src="${heroImage}" alt="${banner?.title ?? "Temperos e pimentas"}" class="absolute inset-0 h-full w-full object-cover" />
          <div class="absolute inset-0 bg-gradient-to-r from-bg/95 via-bg/75 to-bg/20"></div>
          <div class="relative p-7 sm:p-10">
            <div class="max-w-2xl">
              <div class="flex flex-wrap items-center gap-2">
                <span class="inline-flex items-center rounded-full border border-border bg-bg/60 px-3 py-1 text-xs text-fg/80">${settings.offers.pixDiscountPercent}% OFF no Pix</span>
                <span class="inline-flex items-center rounded-full border border-border bg-bg/60 px-3 py-1 text-xs text-fg/80">Temperos e pimentas</span>
              </div>
              <h1 class="mt-6 font-serif text-4xl sm:text-6xl leading-[1.02]">${banner?.title ?? "Temperos e pimentas com alma artesanal"}</h1>
              <p class="mt-4 text-fg/75 text-sm sm:text-lg">${banner?.subtitle ?? "Seleção terrosa e natural para transformar suas receitas: aromas, intensidade e sabor de verdade."}</p>
              <div class="mt-8 flex flex-col sm:flex-row gap-3">
                <a href="#/catalogo" class="inline-flex items-center justify-center rounded-xl bg-primary text-primaryFg px-6 py-3 text-sm font-medium shadow transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-lg active:translate-y-0">Explorar catálogo</a>
                <a href="#categorias" class="inline-flex items-center justify-center rounded-xl border border-border bg-bg/60 px-6 py-3 text-sm font-medium shadow transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-muted/60 active:translate-y-0">Ver categorias</a>
              </div>
              <div class="mt-4 text-xs text-fg/70">${settings.offers.pixDiscountPercent}% no Pix • Catálogo completo • Ingredientes selecionados</div>
            </div>
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

  const qs = new URLSearchParams();
  if (category) qs.set("category", category);
  if (search) qs.set("search", search);
  const products = await api(`/api/products${qs.toString() ? `?${qs}` : ""}`);

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
    setRoute(`#/catalogo?${next.toString()}`);
  });

  const grid = node.querySelector("#grid");
  products.forEach((p) => {
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
  });
  node.querySelector("#plus").addEventListener("click", () => {
    qty = Math.min(99, qty + 1);
    qtyEl.textContent = String(qty);
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
    return base + (v?.priceDeltaCents ?? 0);
  }

  const priceEl = node.querySelector("#price");
  function refreshPrice() {
    const unit = currentUnit();
    priceEl.textContent = formatBRL(unit);
  }
  refreshPrice();
  variantSel.addEventListener("change", refreshPrice);

  node.querySelector("#buy").addEventListener("click", () => {
    const cart = loadCart();
    const vId = variantSel.value || null;
    const key = cartKey(product.id, vId);
    const idx = cart.findIndex((i) => cartKey(i.productId, i.variantId) === key);
    const unit = currentUnit();
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

  function subtotalCents() {
    return cart.reduce((acc, i) => acc + i.unitPriceCents * i.quantity, 0);
  }

  function selectedShipping() {
    return shippingOptions.find((o) => o.id === selectedShippingId) ?? null;
  }

  function render() {
    const itemsWrap = node.querySelector("#items");
    itemsWrap.innerHTML = "";
    cart.forEach((i) => {
      const row = el(`
        <div class="rounded-2xl border border-border bg-card shadow p-4">
          <div class="flex gap-4">
            <div class="h-20 w-20 rounded-xl bg-muted overflow-hidden shrink-0">
              ${i.imageUrl ? `<img src="${i.imageUrl}" alt="${i.name}" class="h-full w-full object-cover" />` : ""}
            </div>
            <div class="flex-1">
              <div class="font-medium">${i.name}</div>
              ${i.variantLabel ? `<div class="text-xs text-fg/60">${i.variantLabel}</div>` : ""}
              <div class="mt-2 text-sm">${formatBRL(i.unitPriceCents)}</div>
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
    const total = subtotalCents() + shipCents;
    sum.innerHTML = `
      <div class="flex items-center justify-between"><span class="text-fg/70">Subtotal</span><span>${formatBRL(
        subtotalCents()
      )}</span></div>
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

  node.querySelector("#calc").addEventListener("click", () => calcShipping().catch(alert));
  node.querySelector("#checkout").addEventListener("click", () => {
    if (!selectedShippingId) return alert("Calcule o frete antes de continuar.");
    setRoute(`#/checkout?zip=${encodeURIComponent(zip)}&shipId=${encodeURIComponent(selectedShippingId)}`);
  });

  render();
  setView(node);
}

async function viewCheckout() {
  const cart = loadCart();
  if (!cart.length) return setRoute("#/carrinho");

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

  const subtotal = cart.reduce((acc, i) => acc + i.unitPriceCents * i.quantity, 0);
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

  async function startPix() {
    const payload = {
      customer: {
        name: node.querySelector("#name").value,
        email: node.querySelector("#email").value,
        cpf: node.querySelector("#cpf").value,
        phone: node.querySelector("#phone").value
      },
      address: {
        zip: node.querySelector("#zip").value,
        street: node.querySelector("#street").value,
        number: node.querySelector("#number").value,
        complement: node.querySelector("#comp").value || null,
        neighborhood: node.querySelector("#neigh").value,
        city: node.querySelector("#city").value,
        state: (node.querySelector("#state").value || "").toUpperCase()
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

    box.querySelector("#copy").addEventListener("click", () => navigator.clipboard.writeText(pix.copyPaste));
    box.querySelector("#confirm").addEventListener("click", async () => {
      await api(`/api/payment/mock/confirm/${pix.orderId}`, { method: "POST" });
      localStorage.removeItem("tempero_cart_v1");
      renderCartCount();
      setRoute(`#/sucesso?orderId=${encodeURIComponent(pix.orderId)}`);
    });
  }

  node.querySelector("#pix").addEventListener("click", () => startPix().catch(alert));
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
  const node = el(`
    <div class="mx-auto max-w-3xl">
      <h1 class="font-serif text-3xl">Admin</h1>
      <div class="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="rounded-2xl border border-border bg-card shadow p-5">
          <div class="font-medium">Login</div>
          <div class="mt-4 space-y-3">
            <input id="email" class="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60" placeholder="Email" value="admin@tempero.com" />
            <input id="pass" class="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60" placeholder="Senha" type="password" value="admin123456" />
            <button id="login" type="button" class="w-full rounded-xl bg-primary text-primaryFg px-5 py-3 text-sm font-medium shadow transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-lg active:translate-y-0">Entrar</button>
            <div id="msg" class="text-sm text-fg/70"></div>
          </div>
        </div>
        <div class="rounded-2xl border border-border bg-card shadow p-5">
          <div class="font-medium">Ações</div>
          <div class="mt-4 space-y-2 text-sm">
            <button id="dash" type="button" class="w-full rounded-xl border border-border bg-card px-4 py-2 shadow-soft transition-[transform,background-color] duration-200 hover:bg-muted/60 hover:-translate-y-0.5 active:translate-y-0">Dashboard</button>
            <button id="orders" type="button" class="w-full rounded-xl border border-border bg-card px-4 py-2 shadow-soft transition-[transform,background-color] duration-200 hover:bg-muted/60 hover:-translate-y-0.5 active:translate-y-0">Pedidos</button>
            <button id="products" type="button" class="w-full rounded-xl border border-border bg-card px-4 py-2 shadow-soft transition-[transform,background-color] duration-200 hover:bg-muted/60 hover:-translate-y-0.5 active:translate-y-0">Produtos</button>
            <button id="settings" type="button" class="w-full rounded-xl border border-border bg-card px-4 py-2 shadow-soft transition-[transform,background-color] duration-200 hover:bg-muted/60 hover:-translate-y-0.5 active:translate-y-0">Configurações</button>
          </div>
        </div>
      </div>

      <div class="mt-6 rounded-2xl border border-border bg-card shadow p-5 hidden" id="panel"></div>
    </div>
  `);

  const msg = node.querySelector("#msg");
  const panel = node.querySelector("#panel");

  async function doLogin() {
    const email = node.querySelector("#email").value;
    const password = node.querySelector("#pass").value;
    const res = await api("/api/admin/login", { method: "POST", body: JSON.stringify({ email, password }) });
    msg.textContent = `Logado. CSRF ativo.`;
    return res;
  }

  async function showDashboard() {
    const d = await api("/api/admin/dashboard");
    panel.classList.remove("hidden");
    panel.innerHTML = `
      <div class="font-medium">Dashboard</div>
      <div class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="rounded-2xl border border-border bg-bg/40 p-4"><div class="text-xs text-fg/60">Pedidos</div><div class="mt-2 text-2xl font-medium">${d.totalOrders}</div></div>
        <div class="rounded-2xl border border-border bg-bg/40 p-4"><div class="text-xs text-fg/60">Pagos</div><div class="mt-2 text-2xl font-medium">${d.paidOrders}</div></div>
        <div class="rounded-2xl border border-border bg-bg/40 p-4"><div class="text-xs text-fg/60">Faturamento</div><div class="mt-2 text-2xl font-medium">${formatBRL(
          d.revenueCents
        )}</div></div>
      </div>
    `;
  }

  async function showOrders() {
    const orders = await api("/api/admin/orders");
    panel.classList.remove("hidden");
    panel.innerHTML = `<div class="font-medium">Pedidos</div><div class="mt-4 space-y-2 text-sm" id="list"></div>`;
    const list = panel.querySelector("#list");
    orders.forEach((o) => {
      const row = el(`
        <div class="rounded-xl border border-border bg-bg/40 px-4 py-3">
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="font-medium">${o.code}</div>
              <div class="text-xs text-fg/60">${o.status}</div>
            </div>
            <div class="font-medium">${formatBRL(o.totalCents)}</div>
          </div>
        </div>
      `);
      list.appendChild(row);
    });
  }

  async function showProducts() {
    const products = await api("/api/admin/products");
    panel.classList.remove("hidden");
    panel.innerHTML = `<div class="font-medium">Produtos</div><div class="mt-4 space-y-2 text-sm" id="list"></div>`;
    const list = panel.querySelector("#list");
    products.forEach((p) => {
      list.appendChild(
        el(`
          <div class="flex items-center justify-between rounded-xl border border-border bg-bg/40 px-4 py-3">
            <div>
              <div class="font-medium">${p.name}</div>
              <div class="text-xs text-fg/60">${p.slug}</div>
            </div>
            <div class="text-right">
              <div class="font-medium">${formatBRL(p.promoPriceCents ?? p.priceCents)}</div>
              <div class="text-xs text-fg/60">Estoque: ${p.stock}</div>
            </div>
          </div>
        `)
      );
    });
  }

  async function showSettings() {
    const s = await api("/api/admin/settings");
    panel.classList.remove("hidden");
    panel.innerHTML = `
      <div class="font-medium">Configurações</div>
      <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input id="store" class="rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60" placeholder="Nome da loja" value="${s.storeName ?? ""}" />
        <input id="whats" class="rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60" placeholder="WhatsApp" value="${s.whatsapp ?? ""}" />
        <input id="pix" class="rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60" placeholder="Pix desconto (%)" value="${s.pixDiscountPercent ?? 5}" />
        <input id="margin" class="rounded-xl border border-border bg-bg px-3 py-2 text-sm shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60" placeholder="Margem frete (%)" value="${s.shippingMarginPercent ?? 0}" />
      </div>
      <button id="save" type="button" class="mt-4 rounded-xl bg-primary text-primaryFg px-5 py-3 text-sm font-medium shadow transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-lg active:translate-y-0">Salvar</button>
    `;
    panel.querySelector("#save").addEventListener("click", async () => {
      await api("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({
          storeName: panel.querySelector("#store").value,
          whatsapp: panel.querySelector("#whats").value || null,
          pixDiscountPercent: Number(panel.querySelector("#pix").value),
          shippingMarginPercent: Number(panel.querySelector("#margin").value)
        })
      });
      msg.textContent = "Salvo.";
    });
  }

  node.querySelector("#login").addEventListener("click", () => doLogin().catch((e) => (msg.textContent = String(e))));
  node.querySelector("#dash").addEventListener("click", () => showDashboard().catch((e) => alert(e)));
  node.querySelector("#orders").addEventListener("click", () => showOrders().catch((e) => alert(e)));
  node.querySelector("#products").addEventListener("click", () => showProducts().catch((e) => alert(e)));
  node.querySelector("#settings").addEventListener("click", () => showSettings().catch((e) => alert(e)));

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

window.addEventListener("hashchange", () => render().catch((e) => alert(e)));
render().catch((e) => alert(e));
