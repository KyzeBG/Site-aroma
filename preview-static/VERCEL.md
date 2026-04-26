## Deploy do preview no Vercel (sem localhost)

Este preview é 100% estático: lê `preview-data.json` e persiste alterações do “admin” no `localStorage` do navegador.

### 1) Subir para o Vercel
1. Suba este repositório para o GitHub (ou GitLab/Bitbucket).
2. No Vercel: **Add New → Project** e selecione o repositório.
3. Em **Root Directory**, escolha: `preview-static`
4. Em **Framework Preset**, deixe como **Other**.
5. **Build Command**: vazio
6. **Output Directory**: vazio (Vercel serve os arquivos estáticos do diretório raiz selecionado)
7. Deploy.

### 2) O que funciona no deploy
- Catálogo, busca, filtros, página de produto e carrinho.
- Checkout em modo demo (Pix mock) com “confirmar pagamento” (mock).
- Admin demo (login: `admin@tempero.com` / `admin123456`) salva configurações no `localStorage`.

### 3) Atualizar catálogo
Quando quiser reimportar os produtos, rode na raiz do repo:

```powershell
& .\.tools\node-v20.18.1-win-x64\node.exe .\scripts\import-infinitepay-aroma.mjs --target preview --write
```

Depois faça commit/push para disparar novo deploy no Vercel.

