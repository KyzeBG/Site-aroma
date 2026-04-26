# Wireframe/Mockup — Adaptação “Raízes & Especiarias” → Tempero Gourmet

Objetivo: replicar o padrão premium/editorial da referência, mas alinhado ao fluxo do projeto atual (Next.js + Carrinho + Checkout + Admin).

## 1) Home (wireframe funcional)

### Desktop
```
TopBar (sticky, altura 28–32px)
  - “Frete calculado na hora” • “5% OFF no Pix” • “Envio rápido para todo Brasil”

Header (sticky)
  [Logo serif]    [Início][Categorias][Kits][Mais vendidos]          [Conta][Carrinho]
  - No hover: underline fino ou bg muted (discreto)

Hero (altura ~520–640px)
  Esquerda:
    Badge “Coleção / Curadoria”
    H1 editorial (serif)
    Subcopy
    CTA Primário (Comprar agora)
    CTA Secundário (Ver kits presente)
    Microcopy: “Pix com desconto • Frete calculado na hora”
  Direita:
    imagem/gradiente (ou foto de especiarias com overlay)

Categorias (cards grandes)
  4 colunas (desktop) / 2 (tablet) / 1–2 (mobile)
  Card:
    imagem (cover)
    rodapé com título e link “ver produtos →”

Mais vendidos
  Grid de cards
  Card:
    imagem
    badge “Mais vendido”
    nome
    preço
    microcopy “Pix OFF”

Benefícios (3 cards)
  “Frete rápido” “Alta qualidade” “Compra segura”

Depoimentos (2 col)
```

### Mobile
```
TopBar (scroll/auto-rotate)

Header
  [☰] Logo (serif)                                 [🛒]

Hero
  Badge
  H1 (serif)
  Subcopy
  CTA Primário (full)
  CTA Secundário (full)

Categorias
  2 col (ou 1 col com cards menores)

Mais vendidos
  2 col
```

## 2) Produto
```
Breadcrumbs: Início / Categoria / Produto

Col 1: Galeria (zoom) + thumbs
Col 2:
  Badges (Pix OFF, Frete calculado)
  Título serif
  Descrição
  Card de compra:
    preço + preço Pix
    variação
    quantidade
    CTA Comprar
  Benefícios (lista)
```

## 3) Carrinho/Checkout
```
Breadcrumbs

Carrinho:
  Lista (cards)
  Resumo (card sticky desktop):
    subtotal
    frete (calcular e escolher)
    total
    CTA Checkout (disabled até frete selecionado)

Checkout:
  Dados cliente + endereço
  Resumo com desconto Pix
  CTA Pix com estado loading
  Feedback visual (toast + status)
```

## 4) Admin (dashboard simplificado)
```
Topo:
  Breadcrumbs + Título + Toggle tema

Layout:
  Sidebar (cards com links) + Conteúdo

Dashboard:
  Cards KPI (Pedidos, Pagos, Faturamento) + mini-gráficos
  Lista de pedidos recentes
  Notificações em tempo real (SSE) para:
    - novo pedido
    - pedido pago

Conteúdo (Home):
  Banner (campos)
  Benefícios (drag-and-drop reorder)
  Depoimentos (drag-and-drop reorder)
  Botão salvar + toast
```

## 5) Melhorias recomendadas (personalizações)
- Implementar top bar como carrossel em mobile (3 mensagens rotativas).
- Substituir fundo branco “puro” por “papel” (bege) para efeito editorial (melhor aderência à referência).
- Inserir um bloco “Kits presente” com 2 cards destacados (a referência já sugere esse CTA).
- Adicionar “Sugestões para você” (personalização futura) com base em categoria visualizada.

