import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const STORE_HANDLE = "aroma-dos-temperos";
const STORE_API = `https://infinitepay-invoice-api.services.production.infinitepay.io/social_commerce/store/${STORE_HANDLE}`;

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--write") out.write = true;
    else if (a === "--dry-run") out.write = false;
    else if (a === "--target") out.target = argv[++i];
    else if (a === "--file") out.file = argv[++i];
  }
  return out;
}

function slugify(input) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 80);
}

function parseVariantFromName(name) {
  const raw = name.trim();
  const lowered = raw.toLowerCase();

  const exclude =
    lowered.includes("teste") ||
    lowered.includes("test ") ||
    lowered.includes("test-") ||
    lowered.includes("fict") ||
    lowered.includes("amostra");

  const weightMatch = raw.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|gr)\b/i);
  const mlMatch = raw.match(/(\d+(?:[.,]\d+)?)\s*(ml|l)\b/i);
  const unitMatch = raw.match(/(\d+)\s*(un|und|unid)\b/i);

  let label = "Padrão";
  let weightGrams = null;
  let type = null;
  let quantity = null;

  if (weightMatch) {
    const n = Number(String(weightMatch[1]).replace(",", "."));
    const unit = weightMatch[2].toLowerCase();
    const grams = unit === "kg" ? Math.round(n * 1000) : Math.round(n);
    weightGrams = Number.isFinite(grams) ? grams : null;
    label = weightGrams ? `${weightGrams >= 1000 ? weightGrams / 1000 + "kg" : weightGrams + "g"}` : weightMatch[0];
  } else if (mlMatch) {
    const n = Number(String(mlMatch[1]).replace(",", "."));
    const unit = mlMatch[2].toLowerCase();
    const ml = unit === "l" ? Math.round(n * 1000) : Math.round(n);
    type = "volume_ml";
    quantity = Number.isFinite(ml) ? ml : null;
    label = quantity ? `${quantity}ml` : mlMatch[0];
  } else if (unitMatch) {
    const n = Number(unitMatch[1]);
    type = "unidades";
    quantity = Number.isFinite(n) ? n : null;
    label = quantity ? `${quantity} un` : unitMatch[0];
  }

  let baseName = raw;
  baseName = baseName.replace(/(\d+(?:[.,]\d+)?)\s*(kg|g|gr|ml|l)\b/gi, "").trim();
  baseName = baseName.replace(/(\d+)\s*(un|und|unid)\b/gi, "").trim();
  baseName = baseName.replace(/\s{2,}/g, " ").trim();
  baseName = baseName.replace(/[—–-]\s*$/g, "").trim();
  baseName = baseName.replace(/\s*\(\s*\)\s*/g, "").trim();
  baseName = baseName || raw;

  return { exclude, baseName, label, weightGrams, type, quantity };
}

function buildBenefits(categoryName) {
  const c = (categoryName || "").toLowerCase();
  if (c.includes("piment")) return ["Picância equilibrada", "Aroma marcante", "Use no dia a dia"];
  if (c.includes("erv")) return ["Aromas naturais", "Versátil para receitas", "Sabor mais fresco"];
  if (c.includes("gr")) return ["Textura e crocância", "Ideal para mixes", "Prático para cozinhar"];
  if (c.includes("aç")) return ["Toque doce na medida", "Para sobremesas e bebidas", "Uso versátil"];
  if (c.includes("frut")) return ["Energia e praticidade", "Ótimo para lanches", "Combina com receitas"];
  return ["Aroma intenso", "Ingredientes selecionados", "Sabor de verdade"];
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { Accept: "application/json" }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

async function fetchAllByCategory(categories) {
  const items = [];
  for (const c of categories) {
    let page = 1;
    for (;;) {
      const url = `${STORE_API}?per_page=100&page=${page}&product_type=physical&categories=${encodeURIComponent(
        c.id
      )}`;
      const json = await fetchJson(url);
      const data = Array.isArray(json.data) ? json.data : [];
      items.push(...data.map((d) => ({ ...d, _category: c })));
      if (!json.meta?.next_page) break;
      page = json.meta.next_page;
    }
  }
  return items;
}

function consolidate(items) {
  const byBase = new Map();
  for (const it of items) {
    const sp = it?.info?.sales_product;
    if (!sp) continue;

    const name = String(sp.name ?? "").trim();
    if (!name) continue;

    const parsed = parseVariantFromName(name);
    if (parsed.exclude) continue;

    const baseKey = slugify(parsed.baseName);
    if (!baseKey) continue;

    const priceCents = sp.variations?.[0]?.promotional_price ?? sp.variations?.[0]?.price ?? null;
    if (!Number.isFinite(priceCents)) continue;

    const entry = byBase.get(baseKey) ?? {
      baseKey,
      baseName: parsed.baseName,
      category: it._category,
      photo: sp.photo ?? null,
      variants: []
    };

    entry.variants.push({
      sourceName: name,
      label: parsed.label,
      weightGrams: parsed.weightGrams,
      type: parsed.type,
      quantity: parsed.quantity,
      priceCents: Number(priceCents)
    });

    if (!entry.photo && sp.photo) entry.photo = sp.photo;
    if (!entry.category && it._category) entry.category = it._category;

    byBase.set(baseKey, entry);
  }

  const products = [];
  const usedSlugs = new Set();
  for (const entry of byBase.values()) {
    const sortedVariants = entry.variants
      .slice()
      .sort((a, b) => (a.weightGrams ?? 0) - (b.weightGrams ?? 0) || a.label.localeCompare(b.label));

    const basePrice = Math.min(...sortedVariants.map((v) => v.priceCents));

    let slug = slugify(entry.baseName);
    if (!slug) slug = entry.baseKey;
    if (usedSlugs.has(slug)) slug = `${slug}-${crypto.createHash("sha1").update(entry.baseKey).digest("hex").slice(0, 6)}`;
    usedSlugs.add(slug);

    const productId = crypto.randomUUID();
    const variants = sortedVariants.map((v) => ({
      id: crypto.randomUUID(),
      label: v.label,
      weightGrams: v.weightGrams ?? null,
      type: v.type ?? null,
      quantity: v.quantity ?? null,
      priceDeltaCents: v.priceCents - basePrice,
      stock: 100
    }));

    products.push({
      id: productId,
      name: entry.baseName,
      slug,
      description: `Produto importado da loja Aroma dos Temperos. Selecione a variação desejada antes de adicionar ao carrinho.`,
      benefits: buildBenefits(entry.category?.name),
      priceCents: basePrice,
      promoPriceCents: null,
      stock: 100,
      isActive: true,
      categoryId: entry.category ? `infinitepay-${entry.category.id}` : null,
      images: entry.photo
        ? [{ url: String(entry.photo), alt: entry.baseName, sortOrder: 0 }]
        : [],
      variants,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  products.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  return products;
}

async function updatePreviewJson(filePath, categories, products) {
  const raw = await fs.readFile(filePath, "utf8");
  const db = JSON.parse(raw);
  const now = new Date().toISOString();

  db.settings = db.settings ?? {};
  db.settings.storeName = "Aroma dos Temperos";
  db.settings.logoUrl = "/brand/aroma-dos-temperos.jpg";

  db.categories = categories.map((c) => ({
    id: `infinitepay-${c.id}`,
    name: c.name,
    slug: slugify(c.name) || `cat-${c.id}`
  }));

  db.products = products;
  db.updatedAt = now;

  await fs.writeFile(filePath, JSON.stringify(db, null, 2) + "\n", "utf8");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const write = args.write !== false;

  const root = process.cwd();
  const target = args.target ?? "preview";

  const base = await fetchJson(`${STORE_API}?per_page=1&page=1&product_type=physical`);
  const categories = Array.isArray(base.categories) ? base.categories : [];

  const items = await fetchAllByCategory(categories);
  const products = consolidate(items);

  const validation = {
    categories: categories.length,
    rawItems: items.length,
    products: products.length,
    variants: products.reduce((acc, p) => acc + p.variants.length, 0)
  };

  if (!write) {
    process.stdout.write(JSON.stringify({ validation, categories, products: products.slice(0, 5) }, null, 2) + "\n");
    return;
  }

  const targets = [];
  if (target === "preview" || target === "both") {
    targets.push(path.join(root, "preview-static", "preview-data.json"));
  }
  if (target === "api-preview" || target === "both") {
    targets.push(path.join(root, "apps", "api", "preview-data.json"));
  }
  if (args.file) {
    targets.length = 0;
    targets.push(path.isAbsolute(args.file) ? args.file : path.join(root, args.file));
  }

  if (targets.length === 0) throw new Error("no_target_files");

  for (const f of targets) {
    await updatePreviewJson(f, categories, products);
  }

  process.stdout.write(JSON.stringify({ ok: true, validation, wrote: targets }, null, 2) + "\n");
}

main().catch((e) => {
  process.stderr.write(String(e?.stack ?? e) + "\n");
  process.exitCode = 1;
});

