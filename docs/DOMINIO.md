# Domínio próprio (D2)

O app saiu de `https://andrevisc-1209.github.io/Treino-PP/` para o domínio próprio
**`https://treino.personalperto.com.br/`**, servido pelo GitHub Pages com custom domain.

## DNS

Registro CNAME criado no DNS de `personalperto.com.br`:

```
treino.personalperto.com.br  CNAME  andrevisc-1209.github.io.
```

## GitHub Pages

- **Settings → Pages → Custom domain**: `treino.personalperto.com.br`.
- **Enforce HTTPS**: ativar assim que o certificado for emitido (o GitHub cuida disso
  automaticamente depois que o DNS propaga).
- `public/CNAME` (com o conteúdo `treino.personalperto.com.br`) precisa continuar no
  repo — sem ele, o próximo deploy do GitHub Pages apaga a configuração de domínio.
- O app agora é publicado na raiz do domínio (`vite base: '/'`), não mais em
  `/Treino-PP/`.

## Supabase (Authentication → URL Configuration)

Atualizar assim que o domínio novo estiver no ar:

- **Site URL**: `https://treino.personalperto.com.br/`
- **Redirect URLs**: adicionar `https://treino.personalperto.com.br/` (manter
  `http://localhost:5173` para o dev local). O endereço antigo
  (`https://andrevisc-1209.github.io/Treino-PP/`) pode ser removido depois que o
  domínio novo estiver validado em produção.

Enquanto o Site URL não for atualizado, os links de confirmação de e-mail e de
redefinição de senha enviados pelo Supabase continuam apontando pro domínio antigo.

## PWA instalado

O `scope`/`start_url` do manifest mudou de `/Treino-PP/` para `/` — isso muda a
identidade do PWA aos olhos do navegador. **Quem já instalou o app no endereço antigo
precisa desinstalar e reinstalar pelo domínio novo**; o app antigo instalado deixa de
funcionar (aponta pra uma URL que não existe mais nesse formato).

## Referências

- `docs/CAPTCHA.md` (quando existir): domínios do Turnstile devem incluir
  `treino.personalperto.com.br` e `localhost`.
- `docs/SMTP.md` (quando existir): verificar o **subdomínio**
  `treino.personalperto.com.br` no Resend (não o domínio raiz
  `personalperto.com.br`), remetente `nao-responda@treino.personalperto.com.br` — pra
  não interferir no SPF do e-mail principal do Personal Perto.
