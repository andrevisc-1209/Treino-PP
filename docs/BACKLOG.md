# Backlog

## 1. Identidade visual Personal Perto

| Item | Descrição | Status |
|---|---|---|
| 1.1 | Fonte da marca (logo, paleta, fonte lidos do repo do PP) — `docs/BRAND.md` | ✅ feito |
| 1.2 | Tokens de marca (CSS vars, contraste AA, fonte) | ✅ feito |
| 1.3 | Onde a logo aparece (login, Hoje, Treino concluído, splash) | ✅ feito |
| 1.4 | Ícones (PWA, favicon, apple-touch-icon) gerados por script | ✅ feito |
| 1.5 | Nome do app centralizado (`src/config/app.ts`) | ✅ feito |
| 1.6 | Templates de e-mail (convite, redefinir senha) | ✅ feito |

PR: [feat/identidade-pp](https://github.com/andrevisc-1209/Treino-PP/pull/19)

## 5. Cadastro aberto (D3)

Decisão de produto: o cadastro de personal é aberto (não é mais por convite) — quem quiser, cria conta.

| Item | Descrição | Status |
|---|---|---|
| 5.1 | Cadastro aberto por padrão (`VITE_ALLOW_SIGNUP=true`), sem texto de "acesso por convite" | ✅ feito |
| 5.2 | Termos de Uso + Política de Privacidade (aceite obrigatório no cadastro, versão e data gravados) | ⚠️ feito no código — falta rodar a migration `aceites_termos` no Supabase |
| 5.3 | Tela "Confirme seu e-mail" com reenvio (espera de 60s entre envios) | ✅ feito |
| 5.4 | Anti-spam (Cloudflare Turnstile via captcha nativo do Supabase Auth) | ✅ feito no código — falta configurar site key/secret key pra ativar |
| 5.5 | Checklist de onboarding no primeiro acesso (Pix → 1º aluno → horário fixo → 1º treino planejado) | ✅ feito |
| 5.6 | Erros do `supabase.auth` em português (login, cadastro, recuperação, reenvio) + tela de e-mail não confirmado no login | ✅ feito |
| 5.7 | Captcha (Turnstile) em todos os fluxos de auth (login, "esqueci minha senha", reenvio, além do cadastro) + `docs/CAPTCHA.md` e `docs/SMTP.md` | ✅ feito no código — falta configurar site key/secret key (`docs/CAPTCHA.md`) e o SMTP próprio (`docs/SMTP.md`) |

PR: [feat/cadastro-aberto](https://github.com/andrevisc-1209/Treino-PP/pull/20), [feat/auth-robusto](https://github.com/andrevisc-1209/Treino-PP/pull/23)

## 6. Domínio próprio (D2)

D2 = GitHub Pages com domínio próprio `treino.personalperto.com.br` (em vez de
`andrevisc-1209.github.io/Treino-PP/`). Detalhes em `docs/DOMINIO.md`.

| Item | Descrição | Status |
|---|---|---|
| 6.1 | Base do app na raiz (vite base, router, manifest, ícones, favicons, splash) | ✅ feito |
| 6.2 | `public/CNAME` com `treino.personalperto.com.br` | ✅ feito |
| 6.3 | `APP_URL` centralizada em `src/config/app.ts`, usada no `emailRedirectTo`/`redirectTo` | ✅ feito |
| 6.4 | Logo dos templates de e-mail apontando pro domínio novo | ✅ feito |
| 6.5 | `docs/DOMINIO.md` (DNS, Pages, Supabase Site URL/Redirect URLs, reinstalar o PWA) | ✅ feito |

Pendente pra depois do deploy no domínio novo (não dá pra fazer nesta PR): apontar o
**Site URL** e os **Redirect URLs** do Supabase pro domínio novo — ver `docs/DOMINIO.md`.

`docs/CAPTCHA.md` e `docs/SMTP.md` foram criados na PR `feat/auth-robusto` (item 5.7),
já com o domínio novo (Turnstile: `treino.personalperto.com.br` + `localhost`; Resend:
subdomínio `treino.personalperto.com.br`, não o domínio raiz).

PR: [chore/dominio-proprio](https://github.com/andrevisc-1209/Treino-PP/pull/22)

## 7. Login social (Google)

| Item | Descrição | Status |
|---|---|---|
| 7.1 | Botão "Continuar com Google" no login e cadastro (`SocialLoginButtons.tsx`) | ✅ feito |
| 7.2 | `signInWithOAuth` + `/auth/callback` (`AuthCallbackPage.tsx`), pede o nome se for a primeira vez | ✅ feito |

O botão do Facebook foi implementado e depois removido a pedido (só Google por
enquanto).

Pendente (fora do código, ver `docs/STATUS.md`): ativar o provider Google no
Supabase (Client ID/Secret) e adicionar
`https://treino.personalperto.com.br/auth/callback` nos Redirect URLs.

PR: [feat/social-login](https://github.com/andrevisc-1209/Treino-PP/pull/26)

## 8. Trial + assinaturas

| Item | Descrição | Status |
|---|---|---|
| 8.1 | Trial de 15 dias automático no cadastro (`treino.assinaturas` + trigger) | ✅ feito |
| 8.2 | `useAssinatura()`, `TrialBanner.tsx`, `PlanoModal.tsx`, `AssinaturaGuard.tsx` | ✅ feito |
| 8.3 | Pagamento (Mercado Pago) | ❌ não iniciado — ver checklist em `docs/STATUS.md` |

RLS de `treino.assinaturas` é só leitura pro professional (decisão de segurança,
detalhada em `docs/STATUS.md` — o pedido original permitia escrita, o que deixaria
qualquer um se auto-declarar "assinatura ativa" de graça).

Pendente: rodar a migration `20261004000000_assinaturas.sql` e definir o número de
WhatsApp real em `PlanoModal.tsx` (hoje é um placeholder).

PR: [feat/trial-assinatura](https://github.com/andrevisc-1209/Treino-PP/pull/34)

## 9. UX: Pix (UF/cidade + card na Hoje), acesso ao perfil, validação de CPF

| Item | Descrição | Status |
|---|---|---|
| 9.1 | Seletor UF → Cidade no Pix (API do IBGE), troca o campo de texto livre | ✅ feito |
| 9.2 | Card "Receber via Pix" na Hoje (chave mascarada, copiar, compartilhar) | ✅ feito |
| 9.3 | Acesso a Configurações no bottom nav ("Perfil") | ✅ feito |
| 9.4 | CPF: borda vermelha + mensagem no blur, botão desabilitado enquanto inválido | ✅ feito |
| 9.5 | Unicidade de CPF (`idx_professionals_cpf`) + mensagens de erro específicas | ✅ feito |

O pedido original referenciava `treino.perfis` (não existe neste projeto — é
`treino.professionals`) e pedia um `src/lib/validators.ts` novo — `validarCPF` já
existia em `src/lib/cpf.ts` desde a PR de cadastro do personal, não dupliquei.
Não adicionei um avatar clicável no header da Hoje (item pedido) porque o ícone de
engrenagem que já existe lá já cobre esse acesso, e agora o bottom nav também tem
"Perfil" — um terceiro caminho pra mesma tela pareceu redundante.

Pendente: rodar a migration `20261005000000_unique_cpf.sql`.

PR: [feat/ux-perfil-pix-cpf](https://github.com/andrevisc-1209/Treino-PP/pull/35)

## 10. Segurança e UX de cadastro (senha, WhatsApp, CPF imutável, e-mail duplicado)

| Item | Descrição | Status |
|---|---|---|
| 10.1 | Botão de olho na senha + checklist ao vivo (4 regras) + botão desabilitado até tudo verde | ✅ feito |
| 10.2 | Toggle de WhatsApp como switch (liga/desliga na hora, sem confirmação) | ✅ feito |
| 10.3 | CPF não editável em Configurações (campo travado) + trigger no banco bloqueando UPDATE | ✅ feito |
| 10.4 | **Bug real corrigido**: e-mail já cadastrado (via Google) era aceito silenciosamente no cadastro manual | ✅ corrigido |

**Item 10.4 é o mais importante desta leva** — bug de verdade, reproduzido e confirmado
ao vivo contra o Supabase real antes e depois da correção. Causa: quando o Supabase
tem alguma proteção de confirmação ativa, `signUp()` pra um e-mail que já existe não
retorna erro — devolve um "usuário" falso com `identities: []` e sem sessão, pra não
vazar quem já tem conta. O código tratava `!error && !session` só como "precisa
confirmar o e-mail", então um e-mail duplicado passava pela tela "Confirme seu
e-mail" como se fosse um cadastro novo — sem nunca criar de fato uma segunda conta
(a chamada não erra, mas também não duplica nada no banco), só dando a falsa
impressão de sucesso. Corrigido detectando `identities.length === 0` antes de cair
no caminho de "aguardando confirmação". Não usei o `traduzirErroAuth` novo do
pedido — o mapeamento de erros já existia e já cobria "User already registered"
(`mapearErroAuth`, `src/lib/errosAuth.ts`); o problema nunca foi o mapeamento de
erro, foi essa chamada específica que não retorna erro nenhum.

**Não consigo verificar duplicatas eu mesmo** — `auth.users` não é acessível pela
anon key (nem deveria ser). Pela mecânica do bug (o Supabase devolve um "usuário
fake" sem criar linha nova, não uma duplicata de verdade), a suspeita é de que não
exista nenhuma linha duplicada — mas isso precisa ser confirmado rodando a query
abaixo no SQL Editor:

```sql
SELECT email, COUNT(*) FROM auth.users GROUP BY email HAVING COUNT(*) > 1;
```

Se aparecer algum e-mail com `COUNT(*) > 1`, me avisa qual — decido com você como
resolver (provavelmente apagar a conta mais recente/sem dados pelo Dashboard).

PR: [feat/cadastro-ux-seguranca](https://github.com/andrevisc-1209/Treino-PP/pull/36)

## 11. UX de treino: Places no horário, sliders de toque, cronômetro opcional, nascimento obrigatório

| Item | Descrição | Status |
|---|---|---|
| 11.1 | Google Places no campo "Local" do horário fixo | ✅ feito |
| 11.2 | **Bug real corrigido**: sliders de pré/pós-treino reagiam a qualquer tap, sem distinguir de arraste | ✅ corrigido |
| 11.3 | Cronômetro opcional no treino (pergunta ao entrar, pausa/retoma, persiste ao navegar) | ✅ feito |
| 11.4 | Data de nascimento obrigatória no cadastro do aluno (14–100 anos) | ✅ feito |

**Item 11.2 tem dois bugs reais, não só o pedido original**: além do tap simples
mudando o valor (o pedido), a reescrita inicial (pra resolver isso) introduziu um bug
novo — `onChange` disparava a cada `pointermove` durante o arraste, e o
`NovaSessaoPage.tsx` avança de pergunta a cada `onChange`, então um arraste só
conseguia "pular" várias perguntas de uma vez (testei ao vivo, reproduzi, só a
primeira pergunta ficava respondida). Corrigido chamando `onChange` só uma vez, no
`pointerup`.

**Não criei a migration do item 4** (`data_nascimento`) — o pedido presumia que a
coluna não existia; `treino.alunos.birth_date` já existe desde a migration inicial
do schema. Só estendi a validação (obrigatório, 14–100 anos, sem data futura).

PR: [feat/ux-treino-ajustes](https://github.com/andrevisc-1209/Treino-PP/pull/37)

## 12. Template de e-mail de confirmação de cadastro + centralização de mensagens de erro

| Item | Descrição | Status |
|---|---|---|
| 12.1 | Novo template "Confirm signup" (`confirmacao-cadastro.html`) — não existia, só havia convite/reset | ✅ feito |
| 12.2 | Saudação com emoji nos templates de reset/confirmação (padronizado com o pedido) | ✅ feito |
| 12.3 | `src/lib/mensagens.ts` com `ERROS.{AUTH,CPF,REDE,FORM}`, usado por `errosAuth.ts`/`erros.ts` e nas validações de CPF/idade | ✅ feito |

**Correções ao pedido original** (premissas que não conferiam com o repo):
- Não existe `public/logo.png`, e `https://treino.personalperto.com.br/logo.png`
  dá 404. A logo já está (e continua) em `public/brand/logo-email.png`, já
  referenciada nos três templates com `width="180"` no cabeçalho navy — o
  pedido de "adicionar a logo" já estava atendido antes desta PR.
- O botão dos e-mails usa `#367c39`, não o `#4CAF50` pedido — `#4CAF50` tem
  contraste de 2,78:1 contra fundo branco (abaixo do mínimo AA de 4,5:1);
  `#367c39` é a correção de acessibilidade já registrada em `docs/BRAND.md`.
  Mantive `#367c39` nos três templates.
- Não existe Edge Function de envio de e-mail neste projeto (Supabase manda
  os e-mails de auth direto via SMTP do Resend, template colado no Dashboard)
  — não criei `supabase/functions/send-email/templates/`.
- Não centralizei **todas** as strings de erro/validação de `src/` — só as
  categorias pedidas (AUTH/CPF/REDE/FORM) e seus pontos de uso reais. Dezenas
  de mensagens de validação de formulário (ex.: `AlunoFormPage.tsx`) já são
  específicas por campo e claras; migrá-las pra um texto genérico teria
  piorado a UX sem necessidade.
- Não tenho acesso ao Supabase Dashboard nem à Management API — não consegui
  fazer o levantamento do texto "antes" nem aplicar os templates; ficam
  documentados em `docs/email-templates/` pra colagem manual.

PR: [feat/mensagens-email-erros](https://github.com/andrevisc-1209/Treino-PP/pull/38)

## 13. Painel administrativo (`/admin`)

| Item | Descrição | Status |
|---|---|---|
| 13.1 | Rota `/admin` com guard próprio (sessão + `is_admin`), fora do bottom nav | ✅ feito |
| 13.2 | Dashboard: cards de resumo, tabela de personais com filtro/busca, tabela de cidades | ✅ feito |
| 13.3 | Ações: reset de senha, alterar trial, alterar plano — com log em `treino.admin_logs` | ✅ feito |
| 13.4 | Todas as leituras via functions `SECURITY DEFINER`, nunca RLS "admin vê tudo" em `alunos` | ✅ feito |

**Correções ao pedido original** (ver `docs/STATUS.md` pra mais detalhes):
- Não criei a conta do admin com `INSERT` direto em `auth.users` + senha em
  texto puro numa migration versionada — commitar uma senha real no git é
  inseguro, e o `INSERT` do pedido nem preenchia colunas que o GoTrue exige
  (teria criado um usuário quebrado). Troquei por convite por e-mail
  (`scripts/admin-convite.mjs`, rodado localmente pelo André com a própria
  `service_role` key, nunca vista por mim) — decisão feita junto com o André.
- `treino.professionals` não tem coluna `professional_id` (é `id`, igual
  `auth.uid()`) — corrigido nas functions.
- Não existe campo de UF/região de atuação no cadastro do personal. "Regiões
  ativas" virou "cidades com Pix configurado"
  (`professional_config.pix_cidade`), aproximação parcial e opcional, marcada
  como tal na UI — decisão feita junto com o André.
- Reset de senha: `generateLink` (Admin Auth API) não manda e-mail sozinho, só
  gera o link — o painel mostra o link pra copiar, em vez de prometer "e-mail
  enviado".

PR: [feat/admin-panel](https://github.com/andrevisc-1209/Treino-PP/pull/39)
PR (redirecionamento + corrigir CPF): [feat/admin-redirect-cpf](https://github.com/andrevisc-1209/Treino-PP/pull/40)
PR (redesign de UX): [feat/admin-redirect-cpf](https://github.com/andrevisc-1209/Treino-PP/pull/41)

### 13.1 Visão geral + inadimplentes no dashboard

- Bloco "Visão geral" (5 cards: profissionais ativos, em trial, trial
  expirando em 3 dias, inadimplentes, total de alunos) e seção colapsável
  "Atenção: Inadimplentes" (lista com dias vencidos coloridos por faixa +
  ação rápida "+ 7 dias de trial"), antes da tabela de personais.
- **Sem migration nova**: os dados já vêm de `treino.admin_listar_personais()`
  (existente desde o item 13); os 5 cards e a lista de inadimplentes são
  derivados no frontend (`useInadimplentes.ts`) a partir do que essa function
  já retorna, em vez de uma query/JOIN nova — o pedido original sugeria um
  hook com JOIN próprio, mas isso duplicaria uma consulta que o painel já faz.
- Status corrigidos: o pedido usava `'ativo'`/`'expirado'` — os valores reais
  de `treino.assinaturas.status` são `'ativa'`/`'expirada'` (ver
  `src/features/assinatura/useAssinatura.ts`).
- "+ 7 dias de trial" soma 7 dias a partir de **agora** (não a partir da data
  de expiração antiga, que pode estar bem no passado) — reativação de fato,
  não só "mover a data vencida um pouco pra frente".

PR: [feat/admin-visao-geral-inadimplentes](https://github.com/andrevisc-1209/Treino-PP/pull/42)

## 14. Retenção e engajamento — métricas em "Meus alunos"

Pedido original tinha 3 partes (onboarding wizard, métricas, agenda semanal).
Investiguei antes de implementar e **duas das três já existiam** — conversei
com o André e decidimos:

- **Onboarding guiado**: não criei o wizard fullscreen nem a coluna
  `onboarding_concluido`. Já existe `OnboardingChecklist.tsx` (mostrado na
  Home) cobrindo a mesma necessidade — calculado ao vivo a partir dos dados
  reais (Pix configurado, 1º aluno, horário fixo, treino planejado), sem flag
  no banco que pudesse ficar desatualizada.
- **Agenda semanal**: não criei nada novo. `/agenda` (`AgendaPage.tsx`) já
  tem visão Dia/Semana, navegação por setas, botão "Hoje", toque na aula abre
  ações (inclui ir pro aluno) — o pedido descrevia uma feature que já existe,
  baseada numa tabela `treino.treinos` que nunca existiu (o real é
  `treino.sessoes` + `treino.aulas`).
- **Métricas do personal**: implementado — 3 cards (Alunos ativos, Treinos
  essa semana, Sem treino há +7 dias) no topo de `AlunosPage.tsx` (não existe
  `DashboardPage.tsx`; a lista de alunos de verdade é essa tela). Sem
  migration: `treino.alunos` usa `professional_id`/`active` (não
  `personal_id`/`ativo`, como o pedido assumia) e não há coluna de "último
  treino" — calculado no frontend a partir de `treino.sessoes` (status
  `concluida`), sem function nova no banco.

PR: [feat/admin-metricas-alunos](https://github.com/andrevisc-1209/Treino-PP/pull/43)

## 15. Avaliação física + gráfico de evolução

Investiguei o schema antes de implementar (`information_schema.columns`
mental via leitura das migrations, já que não tenho acesso ao SQL Editor) e
encontrei sobreposição grande com o que já existe — conversei com o André
antes de criar tabela nova:

- **Sem tabela `treino.avaliacoes` nova.** Já existia `treino.pesos`
  (peso + data), com UI própria na ficha do aluno e já alimentando o
  gráfico "Peso corporal" da aba Evolução. Uma tabela nova duplicaria o
  peso em dois lugares. Em vez disso, uma migration estende `treino.pesos`
  com as colunas novas (`gordura_pct`, `cintura_cm`, `quadril_cm`,
  `peito_cm`, `braco_dir_cm`, `coxa_dir_cm`) — sem mudança de RLS (a
  policy já existente é por linha).
- **Sem coluna de altura na avaliação.** Já existe `treino.alunos.height_cm`
  (definida uma vez no cadastro) — o IMC usa esse campo.
- **Seção "Peso" virou "Avaliações"** na ficha do aluno (mesmo lugar,
  mesmo componente, botão "Nova avaliação"), com os campos novos opcionais
  e lista expansível (tap mostra as medidas).
- **Gráfico de evolução**: em vez de um componente novo
  (`EvolucaoChart.tsx`) coexistindo com o gráfico "Peso corporal" que já
  existe na aba Evolução, troquei esse gráfico por um com seletor de
  métrica (Peso/% Gordura/Cintura/IMC) — mesmo lugar, sem duplicar.
- **Achado ao testar ao vivo**: o eixo Y desses gráficos (peso/IMC/cintura)
  por padrão começa em 0, deixando a linha quase reta pra variações
  pequenas num valor absoluto grande (IMC ~25, por exemplo, numa escala
  0–28). Corrigido com domínio automático com folga (`dataMin`/`dataMax`
  ± 1) só nesse gráfico — os outros gráficos da aba (PSE, carga) não
  tinham esse problema e não foram alterados.

PR: [feat/avaliacoes-fisicas](https://github.com/andrevisc-1209/Treino-PP/pull/44)

## 16. Landing page de marketing em "/"

- `public/landing.html` (estática, isolada do CSS do app). Visitante **deslogado**
  em `/` é levado pra ela; logado continua na home. App instalado (PWA, modo
  standalone) deslogado vai direto pro `/login`, não pra landing.
- CTAs "Criar conta" apontam pra `/login?modo=cadastro` (abre direto na aba de
  cadastro) — `/register` não existe, o cadastro é uma aba do `/login`.
- `vite.config.ts`: `navigateFallbackDenylist` pra `/landing.html`, senão o
  service worker devolveria o `index.html` do app no lugar da landing.
- Botões da landing: `#4CAF50` → `#367c39` (branco sobre `#4CAF50` = 2,78:1,
  reprova AA; mesmo ajuste já documentado em `docs/BRAND.md`).
- Conteúdo alinhado com o produto: trial 15 dias; planos do app (Mensal R$10,
  Trimestral R$27, Semestral R$50, sem anual); frases sobre acesso do aluno
  marcadas "Em breve" (feature confirmada, ainda não lançada).
- LGPD: PostHog só carrega depois do "Aceitar" no banner (consentimento em
  `localStorage`, chave `treino_cookie_consent`); "Recusar" também é
  lembrado. Gravação de sessão com inputs mascarados.
- **Pendente**: citar o PostHog na Política de Privacidade (`/privacidade`);
  texto "Pagamento via Mercado Pago" na landing antes da integração existir
  (hoje os planos são contratados via WhatsApp no `PlanoModal`).

### 16.1 Política de Privacidade + testes da landing

- `src/features/legal/textos.ts`: nova seção sobre o PostHog na landing
  (consentimento explícito, gravação anônima com campos mascarados, recusar no
  banner ou revogar limpando o `localStorage`, link da política do PostHog).
  `PRIVACIDADE_VERSAO` 1.0 → 1.1 (só afeta a versão registrada em novos
  aceites).
- Testado em build de produção (service worker ativo): logado em `/` → home;
  PWA standalone sem sessão → `/login`; service worker antigo → vê o app
  antigo (`/login`) até aceitar a atualização, depois cai na landing.

## 17. Mercado Pago Assinaturas

Ver `docs/MERCADOPAGO.md`. Desvios do pedido original (todos explicados no PR):
tabela é `treino.assinaturas` (não `subscriptions`), status `ativa`/`cancelada`/
`expirada`; assinatura sem `preapproval_plan_id` (plano exige `card_token_id`);
a Edge Function deriva e-mail e identidade do JWT em vez de aceitar do cliente;
o webhook busca o estado na API do MP (o evento só traz o id); sem
`VITE_MP_PLAN_*` (valores ficam no servidor). Pendente: André roda migration,
secrets, deploy, cadastra o webhook e faz o teste de pagamento no checkout.

PR: [feat/mercadopago-assinaturas](https://github.com/andrevisc-1209/Treino-PP/pull/47)

### 17.1 Checkout Transparente (Bricks)

Redirect pro `init_point` substituído pelo Card Payment Brick dentro do
`PlanoModal` (`CheckoutMP.tsx`, carregado sob demanda). `mp-subscribe` agora
recebe `{plano, card_token}` e cria a assinatura `authorized`; a confirmação
aparece no próprio modal. Bug achado testando ao vivo: props/callbacks do Brick
sem identidade estável faziam o SDK recriar o formulário e apagar o que a
pessoa digitava.

PR: [feat/mp-checkout-bricks](https://github.com/andrevisc-1209/Treino-PP/pull/48)

<<<<<<< HEAD
## 19. Recibo de fechamento de ciclo

- `ReciboCiclo.tsx` (tela cheia, via portal): cabeçalho, 4 cartões (aulas, dias, locais, valor),
  timeline de aulas (presença ✓/✗, local, valor), gráficos (frequência semanal, PSE médio por
  semana, nota do personal por treino) e rodapé. Abre sozinho após fechar o ciclo
  (`/financeiro/:id?recibo=1`) e pelo botão "Ver recibo" na fatura.
- "Baixar PDF" = `window.print()` + `@media print` (sem lib externa/CDN). "Compartilhar" = Web
  Share com **texto** (não link: não existe link público e a página exige login do personal),
  com fallback pra copiar o texto.
- LGPD: só PSE e nota do personal (pós-treino). Prontidão/bem-estar fica de fora, e o texto
  compartilhado leva só cobrança e volume de aulas.
- Limite conhecido: `window.print()` pode não funcionar no PWA instalado do iOS (não testado).
- Visual defeito conhecido, **fora desta PR**: os gráficos de `EvolucaoTab.tsx` usam
  `margin={{ left: -20 }}` e cortam o primeiro dígito do eixo Y.

PR: [feat/recibo-ciclo](https://github.com/andrevisc-1209/Treino-PP/pull/51)
=======
## 18. Cidade e UF obrigatórias no cadastro do personal

- `professionals.uf` / `professionals.cidade` (migration `20261011000000`), NULL-áveis no banco
  (contas antigas e login social não têm o dado), obrigatórias no app: cadastro
  aberto (`LoginPage`) e formulário de perfil de convite/login social
  (`PerfilObrigatorioForm`). Editável em Configurações → Dados pessoais.
- `SeletorCidade` (UF → municípios do IBGE) é novo: o seletor do Pix era código
  inline em `ConfiguracoesPage`, não um componente; o do Pix **não foi mexido**
  (tem tratamento próprio de "cidade antiga sem UF" e limite de 15 caracteres).
- Pendente: quem já tem conta não é forçado a preencher (só aviso em Configurações);
  o painel admin ainda mostra a cidade do Pix, não `professionals.cidade`.

PR: [feat/cadastro-uf-cidade](https://github.com/andrevisc-1209/Treino-PP/pull/50)
>>>>>>> origin/main

### 19.1 Refechar ciclo após cancelar a fatura

`useFecharCiclo` apaga a fatura `cancelada` do mesmo aluno + `periodo_inicio` antes de inserir a nova
(a constraint `UNIQUE (aluno_id, periodo_inicio)` vale também para faturas canceladas). Consequência
assumida: o registro da fatura cancelada deixa de existir ao refechar. Alternativa que preservaria o
histórico: trocar o UNIQUE por índice único parcial `WHERE status <> 'cancelada'` (exige migration).

PR: [fix/fechar-ciclo-duplicado](https://github.com/andrevisc-1209/Treino-PP/pull/52)

### 18.1 Pix usa a cidade do perfil

Removidos Estado/Cidade da seção "Recebimento via Pix" (Configurações): o QR/BR Code usa
`professionals.cidade` (Dados pessoais). Sem cidade no perfil: aviso na seção Pix e na fatura (QR
não é gerado). `professional_config.pix_cidade` deixou de ser lida pelo QR; segue sendo gravada
(derivada do perfil, quando existe) só para o painel admin, que ainda agrupa por ela.
Concluído em 18.2.

PR: [fix/pix-usa-cidade-do-perfil](https://github.com/andrevisc-1209/Treino-PP/pull/53)

### 18.2 Remoção de `professional_config.pix_cidade`

Migration `20261012000000`: reescreve `admin_resumo`, `admin_listar_personais` e `admin_regioes`
para usar `professionals.cidade/uf` ("Niterói/RJ", agrupado por UF + cidade) e dropa a coluna.
Front: tira a escrita de `pix_cidade` ao salvar o Pix e ajusta os rótulos do admin
("Cidade", "Cidades (por cadastro)"). **Ordem: mergear → esperar o deploy → rodar a migration.**
A coluna estava em `professional_config` (não em `professionals`, como o pedido dizia).

PR: [feat/remove-pix-cidade](https://github.com/andrevisc-1209/Treino-PP/pull/54)

## 20. Melhorias de UX por módulo (análise de navegação/responsividade)

| PR | Módulo | Status |
|---|---|---|
| 1 | Navegação global (bottom nav 5 itens + FAB padrão) | ✅ em revisão |
| 2 | Hoje / Home | pendente (aguarda aprovação da PR 1) |
| 3 | Alunos | pendente |
| 4 | Financeiro | pendente |
| 5 | Meus treinos / Exercícios | pendente |
| 6 | Configurações | pendente |

**PR 1**: "Perfil" saiu da bottom nav (6 → 5 itens) e virou uma engrenagem no canto superior direito
de Hoje, Agenda, Alunos, Financeiro, Exercícios e Treinos planejados (`LinkConfiguracoes`, 48px). O
botão de criar vira FAB (`Fab` em `ui.tsx`, 56px, acima da nav, alinhado ao conteúdo) em Alunos,
Agenda, Exercícios e Treinos planejados; "Sair" continua em Configurações (o ícone de logout solto
no topo de Alunos foi trocado pela engrenagem). Item do checklist geral ainda não aplicado:
pull-to-refresh e teclado em formulários entram junto das PRs de cada módulo.

PR: [feat/ux-navegacao-global](https://github.com/andrevisc-1209/Treino-PP/pull/55)

