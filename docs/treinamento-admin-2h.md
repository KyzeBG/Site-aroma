# Treinamento do Painel (2h)

## Objetivo
Capacitar a equipe a operar o painel administrativo do preview (demo) com foco em:
- Edição de anúncios (imagens, variações, descontos por quantidade)
- Configuração da loja (assistente, autosave, revisões/rollback)
- Leitura de métricas e acompanhamento de pedidos (mock)

## Pré-requisitos
- Acesso ao link do site (Vercel)
- Navegador atualizado (Chrome/Edge/Firefox)
- Credenciais do preview (demo): `admin@tempero.com` / `admin123456`

## Agenda (2h)
### 1) Visão geral (10 min)
- Estrutura do site: Home, Catálogo, Produto, Carrinho, Checkout
- Onde o admin vive: `/admin`
- Limitações do preview (salva no navegador/localStorage)

### 2) Dashboard e pedidos (20 min)
- Métricas: pedidos, pagos, faturamento
- Atualização e comportamento “tempo real” (quando pedidos mudam)
- Tabela de pedidos: status e detalhes básicos

### 3) Anúncios: edição profissional (55 min)
- Localizar anúncio (busca e paginação)
- Editar dados: nome, slug, descrição, preço/promo, ativo, categoria
- Imagens:
  - Upload múltiplo (formatos suportados, limite de tamanho)
  - Crop/resize automático (quadrado 1200×1200) e preview
  - Reordenar (drag-and-drop) e alternativa acessível (setas)
- Descontos por variação:
  - Criar faixas por quantidade (% OFF)
  - Preview ao vivo do preço com desconto
  - Regras para evitar conflitos (quantidade mínima repetida)

### 4) Configuração guiada + autosave (25 min)
- Assistente por passos: Loja, Ofertas, Frete
- Indicador de estado (alterado/salvando/salvo)
- Preview das mudanças na loja

### 5) Revisões e rollback (10 min)
- O que é uma revisão
- Restaurar revisão e boas práticas

## Exercícios práticos
- Ajustar Pix para 7%
- Configurar desconto progressivo: 2+ 5%, 4+ 10% em uma variação
- Subir 3 imagens em um anúncio e reordenar
- Restaurar uma revisão após uma alteração

## Checklist de conclusão
- [ ] A equipe consegue editar um anúncio completo
- [ ] A equipe entende como descontos por quantidade afetam o carrinho/checkout
- [ ] A equipe consegue usar o assistente e revisar/rollback

