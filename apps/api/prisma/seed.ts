import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@tempero.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin123456";

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      storeName: "Tempero Gourmet",
      primaryColor: "#8B4513",
      backgroundColor: "#FAEBD7",
      accentColor: "#D2691E",
      pixDiscountPercent: 5,
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
    }
  });

  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, passwordHash }
  });

  const cat = await prisma.category.upsert({
    where: { slug: "temperos" },
    update: {},
    create: { name: "Temperos", slug: "temperos" }
  });

  const product = await prisma.product.upsert({
    where: { slug: "pimenta-preta-grao" },
    update: {},
    create: {
      name: "Pimenta Preta em Grãos",
      slug: "pimenta-preta-grao",
      description:
        "Pimenta preta premium em grãos, ideal para moer na hora e elevar qualquer receita.",
      benefits: [
        "Aroma intenso",
        "Ideal para moer na hora",
        "Seleção premium"
      ],
      priceCents: 2490,
      promoPriceCents: null,
      stock: 100,
      categoryId: cat.id,
      images: {
        create: [
          {
            url: "https://images.unsplash.com/photo-1601655781320-205e34c27b06?auto=format&fit=crop&w=1600&q=80",
            alt: "Pimenta preta em grãos"
          }
        ]
      },
      variants: {
        create: [
          { label: "50g", weightGrams: 50, stock: 50 },
          { label: "100g", weightGrams: 100, stock: 50, priceDeltaCents: 900 }
        ]
      }
    }
  });

  void product;
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

