import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const p = path.join(root, "preview-static", "preview-data.json");
const raw = fs.readFileSync(p, "utf8");
const data = JSON.parse(raw);

const categories = Array.isArray(data.categories) ? data.categories : [];
const products = Array.isArray(data.products) ? data.products : [];

const errors = [];

function assert(cond, msg) {
  if (!cond) errors.push(msg);
}

assert(categories.length > 0, "Sem categorias.");
assert(products.length > 0, "Sem produtos.");

const catIds = new Set(categories.map((c) => c.id));
const prodIds = new Set();
const slugs = new Set();

for (const p of products) {
  assert(p && typeof p === "object", "Produto inválido.");
  assert(typeof p.id === "string" && p.id.length > 5, `Produto sem id: ${p?.name ?? "?"}`);
  assert(!prodIds.has(p.id), `ID duplicado: ${p.id}`);
  prodIds.add(p.id);

  assert(typeof p.slug === "string" && p.slug.length > 1, `Slug inválido: ${p.id}`);
  assert(!slugs.has(p.slug), `Slug duplicado: ${p.slug}`);
  slugs.add(p.slug);

  assert(typeof p.name === "string" && p.name.length > 1, `Nome inválido: ${p.id}`);
  assert(typeof p.priceCents === "number" && Number.isFinite(p.priceCents), `Preço inválido: ${p.slug}`);
  assert(p.categoryId == null || catIds.has(p.categoryId), `categoryId inválido: ${p.slug}`);

  const variants = Array.isArray(p.variants) ? p.variants : [];
  assert(variants.length >= 1, `Produto sem variações: ${p.slug}`);
  const vIds = new Set();
  for (const v of variants) {
    assert(typeof v.id === "string" && v.id.length > 5, `Variação sem id: ${p.slug}`);
    assert(!vIds.has(v.id), `Variação duplicada no produto ${p.slug}: ${v.id}`);
    vIds.add(v.id);
    assert(typeof v.label === "string" && v.label.length > 0, `Variação sem label: ${p.slug}`);
    assert(typeof v.priceDeltaCents === "number" && Number.isFinite(v.priceDeltaCents), `priceDelta inválido: ${p.slug}`);
  }
}

if (errors.length) {
  console.error("Falhou validação do preview-data.json:");
  for (const e of errors) console.error("-", e);
  process.exit(1);
}

console.log(`OK: ${products.length} produtos, ${categories.length} categorias, JSON válido.`);

