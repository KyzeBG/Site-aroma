# Manual de Estilo — Tempero Gourmet

## Objetivo
- Interface premium, minimalista e gourmet
- Mobile-first e altamente legível
- Consistência visual entre loja e admin
- Acessibilidade alinhada a WCAG 2.1 AA

## Tokens (Design System)
Os tokens são aplicados via CSS variables e usados no Tailwind como `bg-bg`, `text-fg`, `border-border`, `bg-primary`, `bg-accent`, etc.

### Cores
- `bg`: fundo principal
- `card`: superfícies elevadas (cards, modais)
- `muted`: superfícies neutras (chips, skeletons)
- `fg`: texto principal
- `border`: linhas e divisórias
- `primary`: ações principais e CTAs
- `accent`: destaque “gourmet” (selo, badge, detalhes)
- `danger`: feedback destrutivo

### Tipografia
- Títulos: `font-serif` (Playfair Display)
- Texto: `font-sans` (Inter)
- Hierarquia recomendada:
  - H1: 30–48px (mobile/desktop)
  - H2: 22–28px
  - Body: 14–16px
  - Helper: 12px

### Espaçamento e Layout
- Contêiner: `max-w-6xl` com `px-4`
- Cards: radius 22px, borda leve e sombra suave
- Listas: espaçamento vertical 8–12px

## Componentes Base (UI)
- `Button`: variantes `primary`, `secondary`, `outline`, `ghost`, `danger`
- `Card`: superfície padrão para blocos
- `Input/Textarea`: campos acessíveis com foco visível
- `Badge`: micro-informação (Pix OFF, frete, status)
- `Toast`: feedback imediato sem bloquear a navegação
- `ThemeToggle`: modo claro/escuro por classe `dark`

## Navegação
- Header com menu claro (desktop) + menu lateral (mobile)
- Breadcrumbs em páginas internas e admin
- CTAs sempre consistentes:
  - Primário: comprar/checkout
  - Secundário: categorias/carrinho

## UX e Performance
- Preferir feedback imediato (toast + botões com estado de loading)
- Transições curtas e consistentes (`transition-colors`, `duration-200/300`)
- Imagens com `loading="lazy"` e tamanhos responsivos

## Acessibilidade (WCAG 2.1 AA)
- Contraste: evitar textos abaixo de `text-fg/60` em áreas críticas
- Foco visível: `:focus-visible` e `ring` consistente
- Labels: inputs com labels e/ou placeholders não como único rótulo
- Navegação por teclado: menu mobile fecha com `Esc`
- Skip link: “Pular para o conteúdo”

## A/B Testing (base)
- Experimentos simples com persistência local (exposição por variante)
- Recomendações:
  - 1 hipótese por experimento
  - medir conversão no CTA principal e conclusão de checkout

