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

## Atualização — Login social (Google)

- ✅ **Código implementado** (PR `feat/social-login`): botão "Continuar com
  Google" em `LoginPage.tsx` (login e cadastro), via
  `src/components/SocialLoginButtons.tsx` e `supabase.auth.signInWithOAuth()`;
  `src/features/auth/AuthCallbackPage.tsx` trata o retorno em `/auth/callback`
  (pede o nome se for a primeira vez, senão manda pra `/`). O botão do Facebook
  foi implementado e depois removido a pedido (PR `fix/remove-facebook-compact-turnstile`)
  — só Google por enquanto.
- 🔴 **Bloqueado**: André precisa (1) ativar o provider Google em Supabase →
  Authentication → Providers, colando Client ID/Secret (Google Cloud Console);
  (2) adicionar `https://treino.personalperto.com.br/auth/callback` em Supabase
  → Authentication → URL Configuration → Redirect URLs (ou o padrão
  `https://treino.personalperto.com.br/**`).
  Detalhes exatos na descrição da PR `feat/social-login`.

## Atualização — "8 melhorias" (PRs feat/cadastro-personal-robusto, feat/arquivar-apagar-alunos, etc.)

- ✅ Cadastro do personal completo (nome, CPF, telefone, WhatsApp opt-in, senha
  forte, confirmar senha) + onboarding pós-Google/convite exigindo esses campos
  — `feat/cadastro-personal-robusto` (migration `20261001000000_perfil_personal.sql`,
  já rodada).
- ✅ Arquivar/apagar alunos com menu ⋯ e aba "Arquivados" —
  `feat/arquivar-apagar-alunos`.
- ✅ Logout também em Configurações (antes só existia em Alunos) —
  `src/features/agenda/ConfiguracoesPage.tsx`.
- ❌➡️✅ **Item "bug: campos sem espaço" — investigado, bug não existe.**
  Audit completo em todo `src/` (todo input de texto livre, todo `onKeyDown`,
  todo `.trim()`/`.replace()` que pudesse rodar durante a digitação): nenhum
  handler bloqueia ou remove espaço em tempo real. O único `onKeyDown` do app
  inteiro é em `AulaCard.tsx` (ativa o card com a tecla Espaço, padrão de
  acessibilidade pra elemento clicável — não é um input de texto). Todo
  `.trim()` encontrado roda em submit/salvar ou em filtro de busca, nunca no
  `onChange` de um campo. Se alguém ainda reproduzir isso, preciso do campo
  específico e do navegador/teclado usado pra investigar de novo.
- ✅ Local de treino com Google Places autocomplete — `feat/local-treino-places`
  (migration `20261002000000_locais_treino.sql`, já rodada;
  `VITE_GOOGLE_MAPS_API_KEY` já está no GitHub Secrets).
- ✅ Slider no pré/pós-treino (troca dos chips 0–10 por `<input
  type="range">`, mantendo a cor por polaridade) — `feat/slider-pre-pos-treino`.
- ⏳ Ainda falta: consentimento por e-mail/WhatsApp com status
  pendente/enviado/aceito (extensão de `treino.consentimentos`).

## 💰 Trial + Assinaturas (feat/trial-assinatura)

- ✅ **Trial de 15 dias automático no cadastro**: migration
  `20261004000000_assinaturas.sql` cria `treino.assinaturas` e estende o
  trigger `handle_new_user()` (já existente) pra inserir a linha de trial
  junto com o professional — sem precisar de Edge Function separada. Inclui
  backfill pra quem já tinha conta antes desta migration.
- ✅ `useAssinatura()` (`src/features/assinatura/useAssinatura.ts`):
  `status`, `diasRestantesTrial`, `plano`, `assinaturaFim`, `estaAtivo`.
- ✅ `TrialBanner.tsx`: aparece no topo enquanto em trial ativo, some quando
  expira ou já tem assinatura.
- ✅ `PlanoModal.tsx`: os 3 planos (mensal/trimestral/semestral), botão
  "Assinar" abre WhatsApp com a mensagem pré-preenchida (placeholder —
  **falta o número real do WhatsApp de suporte**, ver TODO no arquivo).
- ✅ `AssinaturaGuard.tsx`: bloqueia o app inteiro (tela "Seu trial expirou" +
  modal de planos) quando `estaAtivo === false`. Aplicado uma vez só em
  `RequireAuth.tsx` (todas as rotas autenticadas passam por lá), não em cada
  página separadamente.
- **Decisão de segurança que difere do prompt original**: a tabela
  `treino.assinaturas` tem RLS **só de leitura** pra `authenticated` (sem
  INSERT/UPDATE/DELETE via client). O pedido original tinha uma policy `FOR
  ALL`, que deixaria qualquer profissional logado dar `PATCH` direto na REST
  API e setar `status = 'ativa'` nele mesmo, de graça. A única escrita hoje é
  o trigger (`SECURITY DEFINER`, roda como dono da tabela). Quando o Mercado
  Pago entrar, a confirmação de pagamento também precisa ser uma function/
  Edge Function `SECURITY DEFINER` (webhook), nunca um UPDATE vindo do
  client.
- ⚠️ **Achado durante o merge**: `treino.assinaturas` já existia no banco —
  criada fora do histórico de migrations (provavelmente colando o SQL do
  rascunho original direto no SQL Editor antes de pedir pra eu implementar),
  **com o RLS inseguro (`FOR ALL`)** descrito acima já ativo em produção.
  Confirmamos junto (colunas, constraints e grants) e reescrevi a migration
  pra corrigir com `ALTER`/`DROP POLICY`/`REVOKE` em vez de `CREATE TABLE` —
  remove a policy insegura, revoga os grants de escrita que o default
  privilege do schema deu de graça pra `authenticated`, renomeia `criado_em`
  → `created_at`, corrige a FK (apontava pra `auth.users`, agora aponta pra
  `treino.professionals` como o resto do schema) e adiciona os `NOT NULL`
  que faltavam. Sem perda de dado — a tabela não tinha nenhuma linha ainda.
- 🔴 **Bloqueado**: rodar a migration corrigida (ver abaixo) e você me passar
  o número real de WhatsApp pra colar em `PlanoModal.tsx`.

## 💳 Pagamento — Mercado Pago (pendente)
- [ ] Criar conta Mercado Pago do app em https://www.mercadopago.com.br/developers
- [ ] Obter PUBLIC_KEY + ACCESS_TOKEN (sandbox primeiro)
- [ ] Edge Function `create-preference` — cria preferência de pagamento MP
- [ ] Webhook `/auth/mp-webhook` — recebe notificação de pagamento e atualiza assinatura
- [ ] Testar fluxo completo em sandbox antes de ir pra produção

## 🎨 UX: Pix, acesso ao perfil, CPF (feat/ux-perfil-pix-cpf)

- ✅ Seletor UF → Cidade no Pix (`src/lib/ibge.ts`, API pública do IBGE,
  `ConfiguracoesPage.tsx`) — testado ao vivo, seleção de estado carrega as
  cidades de verdade (ex.: RJ → Niterói confirmado).
- ✅ Card "Receber via Pix" na Hoje (`src/features/agenda/PixCard.tsx`):
  chave mascarada (`mascararChavePix` em `src/lib/pix.ts`), copiar
  (clipboard + toast "Copiado!"), compartilhar (`navigator.share`, com
  fallback pra clipboard se o navegador não suportar). Mostra "Configurar
  Pix" quando ainda não tem chave salva.
  - **Achado corrigido durante o teste ao vivo**: a primeira versão tratava
    "professional sem linha em `professional_config` ainda" (query retorna
    `null`, não erro) igual a "carregando" — o card não aparecia nem o link
    "Configurar Pix". Corrigido pra distinguir `isLoading` de `data: null`.
- ✅ "Perfil" no bottom nav → `/configuracoes` (6º item). Não dupliquei com
  um avatar clicável no header da Hoje — o ícone de engrenagem que já
  existia lá cobre o mesmo destino.
- ✅ CPF: borda vermelha + "CPF inválido" no blur, botão de submit
  desabilitado enquanto inválido — tanto no cadastro aberto (`LoginPage.tsx`)
  quanto no perfil obrigatório pós-Google/convite (`PerfilObrigatorioForm.tsx`).
- ✅ Unicidade de CPF: `idx_professionals_cpf` (unique index parcial, só
  quando `cpf IS NOT NULL`) + `mapearErroSupabase` reconhece a violação e
  devolve "CPF já cadastrado..." (mesmo tratamento pra e-mail, se algum dia
  tiver constraint).
  - **Limitação honesta**: no fluxo de cadastro aberto, o CPF é gravado
    *dentro* do trigger `handle_new_user()` durante o `signUp()`. Se ele
    colidir com o índice único, o Supabase Auth devolve um erro genérico
    ("Database error saving new user"), não o `23505` com o detalhe da
    coluna — o GoTrue não repassa o erro original do Postgres pra cá. Mapeei
    esse padrão em `mapearErroAuth` com uma mensagem honesta ("CPF ou
    e-mail já cadastrados"), mas não é tão preciso quanto o caminho que
    passa por uma `UPDATE` normal (ex.: `PerfilObrigatorioForm.tsx`), onde o
    erro chega limpo.
- ⚠️ Corrigi o nome da tabela do pedido original: pedia `treino.perfis`
  (não existe) — usei `treino.professionals`, que é onde o campo `cpf`
  já vive desde a PR de cadastro do personal.

Pendente: rodar `supabase/migrations/20261005000000_unique_cpf.sql`.
