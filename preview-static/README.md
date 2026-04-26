# Preview estático (Trae)

Este diretório existe para permitir visualização no Trae mesmo quando o ambiente não consegue rodar Next.js/Postgres.

## Como subir
- `scripts/dev-static-preview.ps1`

Portas:
- Web: `http://localhost:3000`
- API mock: `http://localhost:4000`

## O que tem aqui
- `index.html`: shell do layout (header/footer, toggle de tema, tokens em CSS variables)
- `app.js`: navegação por hash + páginas (home, catálogo, produto, carrinho, checkout Pix mock, sucesso, admin)
- `api.mjs`: API mock com persistência em `preview-data.json`
- `server.mjs`: servidor HTTP estático simples

## Limitações
- Não usa SSR/App Router.
- Checkout é mock (sem Mercado Pago real).
- Serve como protótipo navegável + validação visual.

