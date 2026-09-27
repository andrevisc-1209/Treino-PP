# Status Treino-PP — 2026-09-27

Auditoria feita direto no checkout local (já era o repo, sem precisar clonar),
`npm install` + `npm run dev` rodando, mais checagens ao vivo em
`treino.personalperto.com.br` e na API REST do Supabase (só com a anon/publishable
key — nunca `service_role`). Cada item abaixo diz como foi verificado.

## ✅ CONFIRMADO FEITO

- **Migration `aceites_termos` rodada em produção.** Não dá pra fazer
  `SELECT * FROM aceites_termos` com a anon key (RLS bloqueia leitura anônima), mas dá
  pra distinguir "tabela não existe" de "existe mas sem permissão": comparei o erro da
  REST API pra `aceites_termos` com o de uma tabela que sei que existe
  (`professionals`) e com uma que não existe — os dois primeiros retornam o mesmo
  `42501 permission denied for schema treino`, o terceiro retorna
  `PGRST205 (tabela não encontrada)`. `aceites_termos` bate com o padrão de "existe".
- **RLS nas tabelas principais** — as 4 migrations que criam tabelas
  (`20260924000000`, `20260925000000`, `20260926000000`, `20260930000000`) têm
  `ENABLE ROW LEVEL SECURITY` correspondente pra toda `CREATE TABLE`. Não confirmei
  isso *ao vivo* no banco (precisaria do Dashboard), só que as migrations, se
  rodadas como estão, cobrem RLS em tudo.
- **Login end-to-end funciona em produção**, testado agora com a conta de teste fixa
  (`e2e/.env.e2e`) contra `treino.personalperto.com.br` — login e redirecionamento
  pra `/` confirmados via script Playwright avulso (não vi a senha, só o resultado).
- **Layout mobile com bottom nav** (Hoje/Agenda/Alunos/Financeiro/Meus treinos),
  confirmado com screenshot ao vivo em produção, 390px.
- **Identidade visual** (`docs/BRAND.md`): existe e documenta Navy `#0F2537`
  (`--color-accent`) e a origem do verde `#4CAF50` do PP (com o motivo de existir
  `--color-brand` = `#367c39` em vez do `#4CAF50` cru — contraste AA), Montserrat +
  Open Sans, logo com proveniência rastreada até `~/PersonalPerto2`. Aplicada em
  login, splash e ícones — confirmado visualmente.
- **Turnstile em todos os fluxos de auth** (login, cadastro, recuperar senha,
  reenvio) — confirmado no código (`LoginPage.tsx`, 4 usos de `<Turnstile />`).
- **`CLAUDE.md`** existe na raiz do repo (não em `docs/`) com stack, convenções de
  git/commit, banco de dados, segurança, testes e UX — ver nota na seção "não
  iniciado" sobre o local do arquivo.
- **Site key do Turnstile carregando corretamente do secret do GitHub** —
  confirmei que o bundle de produção (`index-vji3TLit.js`, build mais recente) tem a
  site key nova (`0x4AAAAAAFFdBlT_DhRWR647`) embutida.

## 🔴 BLOQUEADORES (quem faz + o que precisa)

1. **Turnstile ainda quebrado em produção — error 400020, mesmo com o site key
   novo.** (André — Cloudflare Dashboard)
   Isso não é bug de código: o widget carrega, o script do Cloudflare carrega, mas
   `window.turnstile.render()` é rejeitado pelo próprio Cloudflare. Achado
   importante: **havia um service worker (PWA) servindo um bundle antigo em cache**,
   o que mascarou a investigação — depois de desregistrar o SW e forçar reload,
   confirmei que a página *está* carregando o bundle novo com a key nova, e o erro
   400020 **persiste** mesmo assim. Ou seja: **o problema "resolvido" não foi
   resolvido** — o que parecia ter sido corrigido era só o cache do SW mostrando a
   key antiga. Precisa conferir no Cloudflare Dashboard → Turnstile → esse widget →
   **Domains**, se `treino.personalperto.com.br` está cadastrado exatamente (sem
   `www`, sem erro de digitação) — um widget novo não herda os domínios do antigo.
   Também vale reconferir se a site key foi colada sem espaço/caractere extra.
   Em `localhost`, o erro é outro (**110200 — domínio não autorizado**), esperado:
   `localhost` provavelmente não foi cadastrado nesse widget novo.

2. **Não sei se os Email Templates foram colados no Supabase.** (André — Supabase
   Dashboard → Authentication → Email Templates) Os HTMLs prontos existem em
   `docs/email-templates/` (convite, redefinir senha), mas não tenho como verificar
   se alguém colou eles no Dashboard sem acesso a ele.

3. **SMTP próprio (Resend) — não sei se foi configurado.** (André — Resend +
   Vercel DNS + Supabase Dashboard) O guia existe (`docs/SMTP.md`), passo a passo
   completo, mas não achei nenhum indício no código/config de que o Resend já esteja
   ativo (não existe Edge Function, não tem `RESEND_API_KEY` em lugar nenhum do
   repo/GitHub Secrets — o que é esperado pelo desenho do guia, já que a API key vai
   direto no Supabase Dashboard, não no código). Preciso que você confirme se já
   fez isso ou não.

4. **Contas de teste em `auth.users`** — não dá pra verificar quantas/quais ainda
   existem sem `service_role`, que eu não uso. Pelo histórico desta sessão, pelo
   menos `teste-cadastro-aberto@example.com` foi criada (onda cadastro-aberto) e
   ficou órfã — só você consegue limpar isso pelo Dashboard.

## ❌ NÃO INICIADO

- `src/pages/LandingPage.tsx` — não existe (nem a pasta `src/pages/`; o projeto usa
  `src/features/*`).
- Painel admin (`AdminPage.tsx` ou similar) — não existe.
- Login com Google (OAuth) — nenhuma referência a `signInWithOAuth`/Google no
  código.
- Dark mode — sem toggle, sem `prefers-color-scheme`, nada no código.
- Integração WhatsApp além do que já existia (ícone/link de contato) — não avaliado
  a fundo nesta rodada, fora do escopo pedido.
- **Nota sobre `docs/CLAUDE.md` vs `CLAUDE.md`**: o checklist pedia `docs/CLAUDE.md`
  — o arquivo existe, mas na raiz do repo (`CLAUDE.md`), não em `docs/`. Não criei
  uma segunda cópia; se você quiser especificamente em `docs/`, me avise.
- **`<Turnstile />` não tem prop `theme`** (light/dark) — só tem `size`
  (`normal`/`compact`). Não é um bug, nunca foi pedido antes; incluído aqui só
  porque o checklist perguntava.
- **Não existe rota `/auth/forgot-password`** — "esqueci minha senha" é um modo
  (`mode === 'recuperar'`) dentro de `/login`, não uma rota separada. O widget do
  Turnstile aparece lá também (nesse modo).
- `public/logo.png` não existe — a logo está em `src/assets/brand/*.png` (com
  proveniência documentada em `docs/BRAND.md`) e `public/brand/logo-email.png` (só
  a usada nos templates de e-mail). Isso é intencional, não uma lacuna.

## ⚠️ Achado à parte (não pedido, mas relevante)

Ao navegar direto pra `/login` em produção, a mesma URL às vezes retorna `200` e às
vezes `404`, de forma intermitente (visto repetidas vezes durante esta auditoria).
Não impede o app de funcionar (o carregamento seguinte sempre funciona), mas é uma
inconsistência real no roteamento/cache do GitHub Pages com domínio custom que vale
investigar — não teve tempo de aprofundar nesta rodada.

## 🎯 PRÓXIMAS 3 TASKS (ordem de prioridade)

1. **Resolver o Turnstile 400020 de vez** (conferir domínio exato do widget novo no
   Cloudflare Dashboard) — responsável: **André** — estimativa: 15 min
2. **Confirmar/configurar o SMTP próprio (Resend)** seguindo `docs/SMTP.md` —
   responsável: **André** — estimativa: 30 min
3. **Colar os templates de e-mail prontos** (`docs/email-templates/`) no Supabase
   Dashboard — responsável: **André** — estimativa: 15 min

## Atualização — Login social (Google + Facebook)

- ✅ **Código implementado** (PR `feat/social-login`): botões "Continuar com
  Google"/"Continuar com Facebook" em `LoginPage.tsx` (login e cadastro), via
  `src/components/SocialLoginButtons.tsx` e `supabase.auth.signInWithOAuth()`;
  `src/features/auth/AuthCallbackPage.tsx` trata o retorno em `/auth/callback`
  (pede o nome se for a primeira vez, senão manda pra `/`).
- 🔴 **Bloqueado**: André precisa (1) ativar os providers Google e Facebook em
  Supabase → Authentication → Providers, colando Client ID/Secret de cada um
  (Google Cloud Console / Meta for Developers); (2) adicionar
  `https://treino.personalperto.com.br/auth/callback` em Supabase → Authentication
  → URL Configuration → Redirect URLs (ou o padrão `https://treino.personalperto.com.br/**`).
  Detalhes exatos na descrição da PR `feat/social-login`.
