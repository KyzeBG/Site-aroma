# Design Tokens — Aroma dos Temperos

## Paleta (Hex)

| Token | Hex | Uso |
| --- | --- | --- |
| color.base.white | #FFFFFF | Cor primária (base/fundos) |
| color.brand.brown | #8B4513 | Cor secundária (marca/ações) |
| color.brand.brownAlt | #A0522D | Acentos, hover, detalhes |
| color.text.ink | #1A120B | Texto principal (light) |
| color.surface.muted | #F7F1EA | Fundos suaves, hover em cards |
| color.surface.card | #FFFBF6 | Superfícies (cards/inputs) |
| color.border.warm | #E7D9C8 | Bordas e divisórias (light) |
| color.accent.spice | #D2691E | Destaques (dark / ênfase) |
| color.danger.red | #DC2626 | Ações destrutivas |

## Tokens semânticos (CSS vars)

### Light
- `--bg`: #FFFFFF
- `--fg`: #1A120B
- `--muted`: #F7F1EA
- `--card`: #FFFBF6
- `--border`: #E7D9C8
- `--ring`: #8B4513
- `--primary`: #8B4513
- `--primary-fg`: #FFFFFF
- `--accent`: #A0522D
- `--accent-fg`: #FFFFFF
- `--danger`: #DC2626
- `--danger-fg`: #FFFFFF

### Dark
- `--bg`: #0B0B0B
- `--fg`: #FFFFFF
- `--muted`: #1A120B
- `--card`: #14100C
- `--border`: #2A2017
- `--ring`: #A0522D
- `--primary`: #A0522D
- `--primary-fg`: #FFFFFF
- `--accent`: #D2691E
- `--accent-fg`: #0B0B0B
- `--danger`: #DC2626
- `--danger-fg`: #FFFFFF

## Animações de botões (padrão)

- Duração: 200–300ms (padrão 240ms no preview estático)
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out “snappy”)
- Estados:
  - Hover: mudanças de cor/sombra suaves
  - Active: leve “press” (translateY + scale)
  - Focus: `:focus-visible` com ring na cor `--ring`

