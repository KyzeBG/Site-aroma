# Tempero Gourmet — E-commerce Full-Stack

Stack:
- Web: Next.js (App Router) + TailwindCSS
- API: Node.js + Express + Prisma
- DB: PostgreSQL (via Docker)

## Requisitos
- Node.js 20+ (inclui npm)
- Docker Desktop (para Postgres)

## Subir o banco
1) Copie `apps/api/.env.example` para `apps/api/.env` e ajuste `JWT_SECRET` e `SETTINGS_ENCRYPTION_KEY`.
2) Suba o Postgres:
   - `docker compose up -d`

## Rodar API
1) Entre em `apps/api`
2) Instale deps: `npm i`
3) Gere Prisma: `npm run prisma:generate`
4) Migre + seed: `npm run prisma:migrate` (ou `npx prisma migrate dev`)
5) Dev: `npm run dev`

## Rodar Web
1) Copie `apps/web/.env.example` para `apps/web/.env`
2) Entre em `apps/web`
3) Instale deps: `npm i`
4) Dev: `npm run dev`

## Admin
- URL: `http://localhost:3000/admin`
- Credenciais seed (padrão):
  - Email: `admin@tempero.com`
  - Senha: `admin123456`

## Integrações
- Frete: Melhor Envio (cotação via API v2)
- Pagamento Pix: Mercado Pago (Checkout Transparente via API)

Se não configurar tokens, o sistema opera em modo mock (checkout completo para testes).

