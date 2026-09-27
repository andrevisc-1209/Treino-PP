# Templates de e-mail (Supabase)

Os e-mails de convite e de redefinição de senha são configurados no painel do
Supabase, não no código do app. Estes arquivos são o HTML pronto pra colar lá.

## Onde colar

1. Abra o projeto no [Supabase Dashboard](https://supabase.com/dashboard).
2. **Authentication → Email Templates**.
3. Em **Invite user**, cole o conteúdo de `convite.html` no campo de corpo (HTML) e
   use o assunto sugerido no comentário no topo do arquivo.
4. Em **Reset password**, cole o conteúdo de `redefinir-senha.html` da mesma forma,
   com o assunto sugerido no topo do arquivo.
5. Salve cada template.

## Detalhes

- Layout em tabela (largura 600px, CSS inline) — compatível com clientes de e-mail
  que não suportam CSS moderno (Outlook, Gmail app, etc.).
- Logo servida por `https://andrevisc-1209.github.io/Treino-PP/brand/logo-email.png`
  (arquivo em `public/brand/logo-email.png` no repo, publicado pelo GitHub Pages
  junto com o resto do app — só existe depois do primeiro deploy do site).
- Cor do botão (`#367c39`) é a mesma de `--color-brand` em `src/index.css` — se o
  token mudar lá, atualize aqui também (são arquivos estáticos, não leem CSS).
- `{{ .ConfirmationURL }}` é a variável que o Supabase substitui automaticamente
  pelo link de ação — não renomear.
