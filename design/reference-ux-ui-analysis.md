# Análise de Referência (UX/UI) — Temperos / Especiarias

Este documento foi produzido a partir das capturas de tela fornecidas (home + seções de categorias e “mais vendidos”). Como não houve acesso ao site ao vivo, detalhes como microinterações completas, animações e comportamento de busca/checkout são inferidos a partir dos padrões visuais.

## 1) Características principais (look & feel)

### 1.1 Direção visual
- Estilo: editorial, gourmet, premium, minimalista
- Sensação: sofisticado e calmo, com muito “respiro” (whitespace)
- Hierarquia: foco na tipografia (título grande) + poucos elementos por dobra
- Fotografia: hero com gradiente escuro + seções com cards “limpos” e imagens grandes

### 1.2 Paleta de cores (aproximação)
- Base clara (fundo “papel”): creme/bege muito claro  
  - Sugestão: `#F7F2EC` (bg)
- Texto principal: marrom/graphite bem escuro  
  - Sugestão: `#1E1A16` (fg)
- Hero: marrom escuro com gradiente, fundo “chocolate/terra”  
  - Sugestões: `#2A1D16` → `#3A2A20` (hero)
- Acento: cobre/terra para destaques (links/ícones/chips)  
  - Sugestão: `#B07A55` (accent)
- Bordas: linhas bem sutis, quase “hairline”  
  - Sugestão: `rgba(30, 26, 22, 0.10)`

### 1.3 Tipografia (padrões observados)
- Display / títulos: serif elegante (alto contraste) com tamanhos grandes  
  - Sugestões: Playfair Display, Canela, Cormorant Garamond
- Texto UI / navegação: sans limpa, discreta e pequena  
  - Sugestões: Inter, IBM Plex Sans, Manrope
- Escala típica (desktop):
  - H1: ~56–72px (bem grande, 2 linhas)
  - Body: ~16px com 1.5–1.7 line-height
  - Nav: ~13–14px

## 2) Padrões de navegação e IA (information architecture)

### 2.1 Top bar (faixa de benefícios)
- Uma faixa fina no topo com 3 benefícios:
  - “Frete calculado na hora”
  - “5% de desconto no Pix”
  - “Envio rápido para todo Brasil”
- Separação por bullets/pontos (“•”), linguagem curta e orientada a conversão.

### 2.2 Header
- Logo/brand à esquerda (serif)
- Menu central com poucas categorias principais:
  - Início, Especiarias, Ervas, Pimentas, Kits
- Ícones à direita (provável: conta/login + carrinho) com estilo minimalista
- Padrão: header “limpo”, sem barra de busca evidente, prioriza navegação por categoria.

### 2.3 Home (estrutura)
1) Hero (editorial)
2) Categorias (cards grandes)
3) Mais vendidos (grid)

Isso cria uma jornada linear:
- Entender proposta → escolher categoria → escolher produto.

## 3) Estratégias de conteúdo e conversão

### 3.1 Hero (copy e CTA)
- Label pequeno (chip) no topo do hero: “COLEÇÃO 2026”
- Headline grande (benefício): “Temperos premium direto para sua casa”
- Subcopy enfatiza curadoria e qualidade:
  - “cuidadosamente selecionados… sabor… embalagem… entrega…”
- Dois CTAs:
  - Primário: “Comprar agora”
  - Secundário: “Ver kits presente”
- Microcopy abaixo reforça incentivos: “5% de desconto no Pix • frete calculado na hora”

### 3.2 Categorias (cards)
- Cards altos, com imagem ocupando quase tudo
- Texto no rodapé do card (nome da categoria) + link “ver produtos →”
- O visual favorece clique exploratório (discoverability).

### 3.3 “Mais vendidos”
- Grid de produtos com cards simples (imagem grande)
- Selo “MAIS VENDIDO” como badge (construção de confiança social)
- Tipografia discreta e foco na imagem.

## 4) Componentes UI e interações (inferência)

### 4.1 Componentes observados
- Announcement bar (top benefits)
- Header com navegação e ícones
- Hero com:
  - Chip/Badge (“Coleção 2026”)
  - Título display (serif)
  - 2 botões (primário e secundário)
  - Microcopy de benefícios
- Cards de categoria (imagem + texto)
- Cards de produto (imagem + badge “mais vendido”)

### 4.2 Estados interativos recomendados (para replicar)
- Links (nav): hover com mudança sutil de cor + underline fino opcional
- Botões:
  - Primário: fundo claro/escuro com hover de 4–8% (sem “pular”)
  - Secundário: outline com hover suave (fundo levemente tinted)
- Cards:
  - hover: leve elevação (shadow) + borda um pouco mais evidente
  - focus-visible: ring consistente
- Ícones: hover (opacity) e tooltip acessível

## 5) Especificações técnicas para replicar/adaptar no projeto atual

### 5.1 Tokens (CSS variables) sugeridos
Recomendação: manter tokens por tema e usar Tailwind via `hsl(var(--token))`.

**Light**
- `--bg`: `#F7F2EC`
- `--fg`: `#1E1A16`
- `--muted`: `#EFE7DE`
- `--card`: `#FBF7F2`
- `--border`: `rgba(30,26,22,0.12)`
- `--primary`: `#1E1A16`
- `--primary-fg`: `#FBF7F2`
- `--accent`: `#B07A55`
- `--accent-fg`: `#1E1A16`

**Dark**
- `--bg`: `#0E0B09`
- `--fg`: `#F6F1EA`
- `--muted`: `#171210`
- `--card`: `#120E0C`
- `--border`: `rgba(246,241,234,0.12)`
- `--primary`: `#F6F1EA`
- `--primary-fg`: `#0E0B09`
- `--accent`: `#C58B63`
- `--accent-fg`: `#0E0B09`

### 5.2 Layout e grid
- Container: `max-width: 1200px` (`max-w-6xl`) com padding lateral `16px` (mobile) / `24px` (desktop)
- Spacing vertical: seções com 48–80px entre blocos no desktop, 28–48px no mobile
- Categorias:
  - Desktop: 4 colunas
  - Tablet: 2 colunas
  - Mobile: 1 coluna (cards com altura reduzida)
- Produtos:
  - Desktop: 4 colunas
  - Tablet: 3 colunas
  - Mobile: 2 colunas

### 5.3 Responsividade (requisitos)
- Mobile-first:
  - header: menu vira drawer/bottom sheet
  - CTA primário sempre visível (hero) e com largura total no mobile
  - cards com toque confortável (min 44px)
- Breakpoints recomendados:
  - `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px

### 5.4 Acessibilidade (WCAG 2.1 AA)
- Contraste:
  - Texto sobre hero escuro deve atingir AA (evitar cinza claro demais)
  - Links e botões precisam de contraste mínimo 4.5:1 (texto normal)
- Foco visível:
  - `:focus-visible` com ring consistente (2px + offset)
- Navegação por teclado:
  - drawer do menu fecha com `Esc`
  - trap de foco no drawer (quando aberto)
- Semântica:
  - `nav` com `aria-label`
  - breadcrumbs com `aria-label="Breadcrumb"`
  - labels visíveis em formulários críticos (checkout/admin)
- Motion:
  - respeitar `prefers-reduced-motion`

### 5.5 Performance
- Imagens:
  - Next/Image com sizes corretos e `priority` só no hero
  - preferir WebP/AVIF (quando possível) e lazy-load no restante
- CSS:
  - Tailwind com purge e evitar classes dinâmicas sem necessidade
- JS:
  - reduzir componentes client-only; preferir server components na loja
  - skeletons com `loading.tsx` por rota

### 5.6 SEO
- Metas:
  - title/description por página (Home, categoria, produto)
  - OpenGraph/Twitter cards
- Dados estruturados:
  - JSON-LD Product (preço, disponibilidade, imagens, reviews se houver)
- Indexação:
  - sitemap.xml e robots.txt
- Performance SEO:
  - evitar CLS no hero (definir altura/ratio)

## 6) Wireframe / mockup (baseado na referência)

### 6.1 Desktop (Home)
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Top bar: Frete calculado na hora • 5% Pix • Envio rápido Brasil              │
├──────────────────────────────────────────────────────────────────────────────┤
│ Logo (serif)          Início  Especiarias  Ervas  Pimentas  Kits        [🧑][🛒] │
├──────────────────────────────────────────────────────────────────────────────┤
│ HERO (imagem/gradiente escuro)                                                │
│  [Badge: COLEÇÃO 2026]                                                        │
│  H1 grande serif: “Temperos premium direto para sua casa”                     │
│  Subcopy (2–3 linhas)                                                         │
│  [CTA Primário]  [CTA Secundário]                                             │
│  microcopy: “5% Pix • frete calculado na hora”                                │
├──────────────────────────────────────────────────────────────────────────────┤
│ Categorias                                                                     │
│  [Card Especiarias] [Card Ervas] [Card Pimentas] [Card Kits]                  │
├──────────────────────────────────────────────────────────────────────────────┤
│ Mais vendidos                                                                  │
│  [Prod card][Prod card][Prod card][Prod card]                                 │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Mobile (Home)
```
┌──────────────────────────────┐
│ Top bar (carrossel)          │
├──────────────────────────────┤
│ [☰] Logo               [🛒]  │
├──────────────────────────────┤
│ HERO                          │
│ [Badge]                        │
│ H1 serif (2–3 linhas)          │
│ Subcopy                        │
│ [CTA Primário (full)]          │
│ [CTA Secundário (full)]        │
├──────────────────────────────┤
│ Categorias (2 col ou 1 col)    │
├──────────────────────────────┤
│ Mais vendidos (2 col)          │
└──────────────────────────────┘
```

## 7) Sugestões de melhorias para o projeto atual (além da referência)
- Incluir busca (ícone no header) com autosuggest e fallback para página de resultados.
- Adicionar “Quick add” nos cards de produto (seleção rápida de variação) para aumentar conversão.
- Exibir selos adicionais (ex.: “sem conservantes”, “origem rastreável”) como badges com bom contraste.
- Melhorar prova social:
  - carrossel de depoimentos com foto/primeiro nome (opcional)
  - “mais vendidos desta semana” com contagem/urgência moderada
- Admin:
  - painel de conteúdo com preview ao vivo (side-by-side) e drag-and-drop por seção
  - logs de alterações (quem alterou o quê)

