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
| 1 | Navegação global (bottom nav 5 itens + FAB padrão) | ✅ feito |
| 2 | Hoje / Home (micro-dashboard + Pix colapsável) | ✅ feito |
| 3 | Alunos (busca fixa, swipe, treino no rodapé, pull-to-refresh) | ✅ em revisão — `docs/ux-modulos/03-alunos.md` |
| 4 | Financeiro (carrossel, chips rolável, gráfico) | ✅ em revisão — `docs/ux-modulos/04-financeiro.md` |
| 5 | Meus treinos / Exercícios (sistema × meus, chips) | ✅ em revisão — `docs/ux-modulos/05-exercicios.md` |
| 6 | Configurações (acordeões, salvar único, teclado) | ✅ em revisão — `docs/ux-modulos/06-configuracoes.md` |
| 7 | Pós-treino (resumo em blocos, recordes, compartilhar imagem) | ✅ em revisão — `docs/ux-modulos/07-pos-treino.md` |
| 8 | Pré-treino (wizard: chips, badge, rodapé fixo, animação, modal no desktop) | ⏳ a fazer |
| 9 | Aula avulsa: data/hora mínimas (não permite passado) | ⏳ a fazer |
| 10 | Pós-treino (formulário): chips de PSE/avaliação + modal unificado no desktop | ✅ em revisão |
| 11 | Pós-treino: métricas (exercícios, reps, % do planejado, evolução, destaque, sequência) | ✅ em revisão — `docs/ux-modulos/07-pos-treino.md` |
| 12 | Landing com identidade Personal Perto (logo, seção "Quem faz", contatos, rodapé) | ✅ feito |
| 13 | Preços novos (15/39/60) + selo Mercado Pago + logo PP no checkout | ✅ em revisão |
| 14 | Checkout Pro (Pix/cartão/boleto) no lugar do Preapproval — `docs/MERCADOPAGO.md` | ✅ em revisão — **rodar migration `20261013…` antes do merge** |
| 15 | Consentimento LGPD de saúde por e-mail com confirmação por link — `docs/CONSENTIMENTO_SAUDE.md` | ✅ em revisão — **rodar migration `20261014…` antes do merge** |
| 16 | Consentimento de saúde: e-mail humanizado, canal WhatsApp e reenvio com motivo — `docs/CONSENTIMENTO_SAUDE.md` | ✅ em revisão — **rodar migration `20261015…` antes do merge** |
| 17 | Painel de consentimentos LGPD (Configurações → Consentimentos LGPD) + canal e histórico de envios — `docs/CONSENTIMENTO_SAUDE.md` | ✅ em revisão — **rodar migration `20261016…` antes do merge** |
| 18 | Admin: consentimentos LGPD agregados por personal — `docs/ADMIN.md` | ✅ em revisão — **rodar migration `20261017…` antes do merge** |
| 19 | Treino multimodalidade — Fase 1 (modalidade, presencial/assíncrono, envio por WhatsApp) — `docs/MODALIDADES.md` | ✅ em revisão — **rodar migration `20261020…` antes do merge** |
| 20 | Treino multimodalidade — Fase 2 (link público do aluno, check-off por modalidade, aba Execuções, planejados multimodalidade) — `docs/MODALIDADES.md` | ✅ em revisão — **rodar migration `20261021…` antes do merge** |
| 21 | Treino multimodalidade — Fase 3 (aba Performance, selo na lista de alunos, atividade recente) — `docs/MODALIDADES.md` | ✅ em revisão — **rodar migration `20261022…` antes do merge** |
| 22 | Histórico unificado (musculação presencial) + sino de notificações com Realtime — `docs/MODALIDADES.md` | ✅ em revisão — **rodar migration `20261023…` antes do merge** |
| 23 | Ajustes de UX: abas Histórico unificado, datas dd/mm/aaaa, escolha presencial/assíncrono ao iniciar, blocos de treino — `docs/MODALIDADES.md` | ✅ em revisão (sem migration, sem deploy) |
| 24 | Natação: biblioteca de exercícios + modelos + mar aberto — `docs/MODALIDADES.md` | ✅ em revisão — **rodar migration `20261024…` antes do merge** |
| 25 | Fix: "+ Criar treino" do "Escolher treino" abre o Novo treino do aluno | ✅ em revisão |
| 26 | Corrida e ciclismo estruturados + Brick; modalidades não usadas ocultas — `docs/MODALIDADES.md` | ✅ em revisão — **rodar migration `20261025…` antes do merge e redeploy de `treino-publico`** |
| 27 | Perfil de triatleta (foco, prova alvo, data) + volume semanal por disciplina — `docs/MODALIDADES.md` | ✅ em revisão — **rodar migration `20261026…` antes do merge** |
| 28 | Nome da prova alvo (selo da ficha usa o nome) | ✅ em revisão — **rodar migration `20261027…` antes do merge** |
| 29 | Card de clima na Hoje (Open-Meteo, cidade do personal) — `docs/MODALIDADES.md` | ✅ em revisão — **deploy da função `clima`** |
| 30 | Grupo "Reabilitação / Prep Física" (23 exercícios, fases I e II) na biblioteca de musculação | ✅ em revisão — **rodar migration `20261028…` antes do merge** |
| 31 | Modelos prontos ao criar o treino (corrida, ciclismo, brick; natação ganhou Técnica 2.000 m e Resistência 3.000 m) — `docs/MODALIDADES.md` | ✅ em revisão — **rodar migration `20261029…` antes do merge**. Musculação: sem modelos do sistema ainda |
| 32 | Modelos prontos de musculação (Full Body, HIIT + Abdômen, Treinos A/B/C) com exercícios da biblioteca — `docs/MODALIDADES.md` | ✅ em revisão — **rodar migration `20261030…` antes do merge** |
| 33 | Modelos de natação migrados de TypeScript para `treino.templates_treino` (mesmos 10 modelos, mesma UX) | ✅ em revisão — **rodar migration `20261031…` antes do merge** |
| 34 | "Novo exercício" para todas as modalidades (Modalidade > Tipo > Exercício), com filtro por modalidade na aba Exercícios — `docs/MODALIDADES.md` | ✅ em revisão — **rodar migration `20261032…` antes do merge** |
| 35 | "Meus exercícios" no seletor de corrida, ciclismo e brick (vira bloco do treino) + ✕ para fechar o seletor de modelos — `docs/MODALIDADES.md` | ✅ em revisão (sem migration; usa a `20261032…` da PR de exercícios) |
| 36 | Fix: seletor de modelos da natação (✕, só modelos) e selo "Carregar exercícios do treino planejado" só em musculação | ✅ em revisão (sem migration) |
| 37 | Agenda: cabeçalho mostra o dia selecionado + notificação "Ciclo encerrado" no sino (botão Encerrar mês) | ✅ em revisão — **rodar migration `20261033…` antes do merge** (só a notificação; o cabeçalho não depende dela) |
| 38 | Cadastro/Configurações com CEP (ViaCEP) → bairro, cidade e UF; coluna `bairro` em professionals | ✅ em revisão — **rodar migration `20261034…` antes do merge** |
| 39 | Mercado Pago só em produção (sem fallback de sandbox) + checklist — `docs/mp-producao-checklist.md` | ✅ em revisão — **secrets, webhook no painel e redeploy de `mp-subscribe`/`mp-webhook`** |
| 40 | Configurações: nome e telefone editáveis, seção Assinatura (status, plano, prazo, valor) e WhatsApp ativado por padrão no cadastro | ✅ em revisão (sem migration) |
| 41 | Fechar ciclo: erro de ciclo duplicado tratado, itens com data/modalidade/local e PDF "Baixar relatório" (jsPDF) | ✅ em revisão (sem migration) |
| 42 | Relatório do ciclo em PDF com a identidade visual (cabeçalho verde com logo, tabela zebrada, blocos de ajuste e total, rodapé) | ✅ em revisão (sem migration) |
| 43 | Relatório completo do ciclo: recibo + relatório num PDF só (resumo, treinos, tabela, gráficos, total) | ✅ em revisão (sem migration) |
| 44 | Consentimento de saúde: registro do IP do aceite (tabela só da plataforma) e termo v1.2 — `docs/CONSENTIMENTO_SAUDE.md` | ✅ em revisão — **rodar migration `20261035…` antes do merge e redeploy de `confirmar-consentimento-saude`** |
| 45 | Medidas corporais (altura, peso, % gordura, circunferências) só com o consentimento do aluno; termo v1.3 | ✅ em revisão — **redeploy de `confirmar-consentimento-saude`** |
| 46 | Treino à distância: renomeia "assíncrono", cobrança por aluno (valor próprio, modelo por aula), quantidades no mensal, check-in/cobrança do presencial de outras modalidades, histórico "N/M itens feitos" e termo v1.4 | ✅ em revisão — **rodar migration `20261036…` antes do merge; redeploy de `treino-publico` e `confirmar-consentimento-saude`** |
| 47 | Termos de Uso v1.1 e Política de Privacidade v1.3 no app (texto revisado e alinhado ao que o app faz) | ✅ em revisão (sem migration) — revisar com assessoria jurídica antes do lançamento |
| 48 | Encarregado (DPO) identificado na Política de Privacidade (v1.4) | ✅ em revisão (sem migration) |
| 49 | WhatsApp do personal: base com Evolution API (`send-whatsapp`, mensagem de teste em Configurações) — `docs/WHATSAPP.md` | ✅ em revisão — **secrets `EVOLUTION_API_URL`/`EVOLUTION_API_KEY`/`EVOLUTION_INSTANCE` e deploy de `send-whatsapp`**; eventos a definir |
| 50 | WhatsApp do personal, fase 2: briefing diário, pagamento/vencimento do plano, resumo semanal e aluno inativo (pg_cron) — `docs/WHATSAPP.md` | ✅ em revisão — **migration `20261037…`, secret `CRON_SECRET`, deploy de 4 functions e `supabase/cron/whatsapp.sql`** |
| 51 | Mensagens de WhatsApp escaláveis e em tom humano (briefing, resumo semanal, avisos agrupados) e cron 5h30 BRT | ✅ em revisão — **redeploy de `daily-briefing`, `avisos-diarios`, `weekly-summary` e recriar os jobs (`supabase/cron/whatsapp.sql`)** |
| 52 | WhatsApp, fase 3: cobrança de aluno vencida (1/3/7 dias) e aluno concluiu treino à distância — `docs/WHATSAPP.md` | ✅ em revisão — **migration `20261038…`, deploy de `avisos-financeiros` e `aviso-treino-concluido`, jobs em `supabase/cron/whatsapp.sql`** |
| 53 | Fix: botões do wizard (✏️ de Cobrança/Horários) enviavam o formulário do aluno; `Button` com type="button" por padrão e teste que impede `<button>` sem type | ✅ em revisão (sem migration) |
| 54 | Remove o aviso "Modelo inicial — revisar com assessoria jurídica" dos Termos de Uso, da Política de Privacidade e do termo de consentimento do aluno (textos aprovados) | ✅ em revisão (sem migration) |

**PR 1**: "Perfil" saiu da bottom nav (6 → 5 itens) e virou uma engrenagem no canto superior direito
de Hoje, Agenda, Alunos, Financeiro, Exercícios e Treinos planejados (`LinkConfiguracoes`, 48px). O
botão de criar vira FAB (`Fab` em `ui.tsx`, 56px, acima da nav, alinhado ao conteúdo) em Alunos,
Agenda, Exercícios e Treinos planejados; "Sair" continua em Configurações (o ícone de logout solto
no topo de Alunos foi trocado pela engrenagem). Item do checklist geral ainda não aplicado:
pull-to-refresh e teclado em formulários entram junto das PRs de cada módulo.

PR: [feat/ux-navegacao-global](https://github.com/andrevisc-1209/Treino-PP/pull/55)

**PR 2**: sem aulas hoje, a Hoje mostra `ResumoSemAulas` (aulas hoje/semana, alunos ativos, próximas 3
aulas agendadas dos próximos 7 dias, alunos sem treino há +7 dias, botão de aula avulsa). "Pendentes
de confirmação" do pedido virou "Próximas aulas" (agendadas e ainda por acontecer): o modelo não
tem confirmação do aluno. `PixCard` fica recolhido por padrão (56px) e lembra a escolha em
`localStorage`. `CardMetrica` virou componente compartilhado (Alunos + Hoje).

PR: [feat/ux-hoje](https://github.com/andrevisc-1209/Treino-PP/pull/56)

### 20.1 Bug: aula sem alunos abria um menu vazio (iPhone)

Aula agendada **sem participantes** (ou com todos já registrados) abria um painel branco vazio ao tocar
nela (Hoje/Agenda): as ações só apareciam com aluno "previsto". Corrigido: `descreverMenuAula`
(`menuAula.ts`, com teste de que o menu nunca fica vazio) — aviso do motivo + Cancelar/Remarcar, que são
da aula inteira. Não era específico do iPhone: reproduzido em viewport de celular e vale pra qualquer tela.

PR: [fix/aula-sem-participantes-menu-vazio](https://github.com/andrevisc-1209/Treino-PP/pull/61)


## 21. Auditoria de segurança

Relatório completo em [docs/SECURITY-AUDIT.md](SECURITY-AUDIT.md).

- ✅ **Crítica**: `professionals.is_admin` era gravável pelo próprio personal (escalada para admin). Migration
  `20261039000000_proteger_is_admin.sql` (GRANT de UPDATE por coluna + trigger).
- ✅ **Alta**: `admin-actions` não devolve mais o link de recuperação (envia e-mail ao personal).
- ✅ **Médias**: CSP via meta (build) e rate limiting nas funções públicas (migration `20261040000000_rate_limit.sql`).
- ✅ Gaps dos lotes 1 e 2 (.gitignore, JWT expiry documentado, console fora do build, CORS sem localhost, nome no WhatsApp, `WITH CHECK` das tabelas filhas — migration `20261041000000`).
- ⏳ Pendentes: `CHECK` de tamanho nas tabelas centrais (PR própria), headers reais (proxy), `npm audit fix` (dev), confirmações no dashboard.


## 22. Pré-treino com zero, objetivo esportivo e resultado do treino à distância

- 🔍 **Pré-treino com valor 0**: não reproduzido. Inserir sessão com os 4 campos em 0 (e o fluxo completo com plano/exercícios) funciona no banco; o front trata 0 como válido (`!= null`). Adicionado teste de regressão (`prontidao.test.ts`). Aguardando a mensagem de erro exata para achar a causa.
- ✅ **Objetivo esportivo**: novas opções Futebol, Futevôlei, Trilha / Caminhada, Vôlei e Outros (último). A coluna é TEXT com CHECK: migration `20261042000000_modalidade_foco_novas_opcoes.sql`.
- ✅ **Treino à distância**: volume calculado ao concluir (natação: metros dos blocos marcados; musculação: kg·rep), tempo de execução opcional (h + min → `duracao_minutos`) e linha-resumo "📏 4.600 m | ⏱ 45 min" no detalhe do treino concluído. Gravado em `execucoes_assincrono.detalhes_execucao.resultado` (não existe coluna `resultado`); cálculo refeito no servidor (`treino-publico`).

## 23. Treino à distância para todas as modalidades + validade do link

- ✅ **Musculação à distância**: o filtro estava na tela "Escolher treino" (`NovaSessaoPage`): só treinos de outras modalidades abriam a folha "Presencial / À distância"; musculação ia direto para a sessão presencial. Agora todas as modalidades abrem a folha (a Edge Function e a página pública já aceitavam qualquer modalidade).
- ✅ **Validade do link**: 24h / 48h (padrão) / 72h / sem prazo, escolhida pelo personal (lembra a última); `expira_em` agora aceita NULL = sem prazo (migration `20261043000000_expiracao_link_treino.sql`; links antigos mantêm o prazo que já tinham). Link vencido → 410 + "Este treino não está mais disponível. Entre em contato com seu personal.". Banner de prazo na página do aluno (âmbar com menos de 6h). Mensagem do WhatsApp ao aluno ganha "⏰ Você tem até …".


## 24. Correções da revisão adversarial (itens 1 a 6)

- ✅ Envio de consentimento por e-mail: limite por personal, e-mail confirmado, nomes limpos.
- ✅ Rate limit: falha fechada nas rotas sensíveis, chave limitada, limpeza diária (`supabase/cron/rate_limit.sql`); `ipDoCliente` só com `cf-connecting-ip`.
- ✅ "Sem prazo" do link do treino à distância = no máximo 30 dias.
- ✅ CSP mais restrita (`src/config/csp.ts`).
- ✅ Grants mínimos ao `authenticated` (migration `20261044000000`), guarda de RLS/GRANT no CI e teste de isolamento (`supabase/tests/isolamento.sql`).
- ⏳ Itens 7 e 8 (admin-actions, CHECK de tamanho); etapa 2 dos grants (tirar DELETE/UPDATE não usados).


## 25. admin-actions e limites de tamanho (itens 7 e 8 da revisão)

- ✅ `admin-actions`: e-mail validado, destinatário precisa ser personal cadastrado, 10 ações/h por admin, auditoria antes da ação.
- ✅ Limites de tamanho no banco (42 `CHECK ... NOT VALID`, migration `20261045000000`), Zod do aluno alinhado e mensagem de erro própria.
- ⏳ MFA do admin; limites de quantidade por conta; `VALIDATE CONSTRAINT` dos limites após conferir `supabase/tests/limites_violadores.sql`.


## 26. Verificação de posse do telefone (WhatsApp)

- ✅ Código de 6 dígitos por WhatsApp para provar a posse do telefone (Configurações › Dados pessoais, com selo "Verificado ✓ / Não verificado"). Sem verificação a plataforma não envia notificações (avisos, resumo, teste). Migration `20261046000000`; funções `solicitar-verificacao-phone` e `confirmar-verificacao-phone`.
- Contas existentes precisam verificar o telefone uma vez (sem backfill).
- ⏳ Itens seguintes da 2ª revisão: idempotência do webhook do Mercado Pago, rate limit em `mp-subscribe`/`clima`/`gerar-link-treino`, enumeração de CPF.


## 27. Idempotência dos pagamentos do Mercado Pago

- ✅ Cada pagamento só credita uma vez, mesmo reentregue fora de ordem (tabela `pagamentos_processados`, migration `20261047000000`; lógica em `_shared/pagamento.ts`). Falha ao creditar desfaz a reivindicação.
- ⏳ Opcional: tratar 404 do MP (recurso inexistente) como "ignorado" (200) para não gerar reenvios; rate limit em `mp-subscribe`/`clima`/`gerar-link-treino`; enumeração de CPF.


## 28. Rate limit em mp-subscribe, clima e gerar-link-treino

- ✅ `mp-subscribe` 10/h (falha fechada), `gerar-link-treino` 20/h e `clima` 30/h (falha aberta) por personal; `clima` com cache por cidade de 3 h. Sem migration.
- ⏳ Última da 2ª revisão: enumeração de CPF (validar dígito, mensagem genérica, RPC com limite). Opcional: 404 do MP como "ignorado".


## 29. Enumeração e validação de CPF

- ✅ CPF validado no banco (`treino.cpf_valido` + `CHECK NOT VALID`), gravação pela RPC `atualizar_cpf` (5/dia, mensagem genérica) e `REVOKE UPDATE (cpf)` do cliente — migration `20261048000000`. Mensagem de colisão do CPF no front agora é genérica.
- ⏳ Última da 2ª revisão concluída. Opcional: 404 do MP como "ignorado"; `VALIDATE CONSTRAINT` do CPF e dos limites de tamanho depois de conferir os violadores.


## 30. Fechamento da 3ª revisão (plano G → B → C → D → A → E → F)

- ✅ **G**: `VALIDATE CONSTRAINT` dos 42 limites de tamanho e do CPF (migration `20261049000000`), com guard no CI.
- ✅ **B**: cadastro não confirma quais e-mails têm conta (mesma tela de confirmação, mensagens genéricas); mensagem de CPF já cadastrado orienta a recuperar a conta (decisão de produto).
- ✅ **C**: provas de aceite não fabricáveis pelo cliente (migration `20261050000000`, RPC `registrar_aceite_termos`, checkbox no completar perfil, guard de versões no CI).
- ✅ **D**: dado clínico (lesão, cirurgia, medicamentos, altura, peso) só com consentimento ativo, imposto pelo banco (migration `20261051000000`); salvamento do aluno reordenado; revogação limpa todos os campos clínicos.
- ✅ **A**: assinatura imposta pelo servidor (modo leitura depois do trial, com banner), RPC `revogar_consentimento`, migration `20261052000000`.
- ✅ **E1**: cadastro do autenticador do admin (`/admin/seguranca`) e tela de desafio no painel (sem exigência no servidor).
- ✅ **E2**: `is_admin()` e `admin-actions` exigem `aal2` (migration `20261053000000`); sem autenticador o painel leva a `/admin/seguranca`.
- ⏳ F (grants, etapa 2). Depois: login com CPF (funcionalidade separada).


## 31. Correção: cobrança do aluno perdida no cadastro (erro "Valor inválido para este campo")

- ✅ O cadastro de aluno novo só validava o valor da cobrança; **dia do ciclo (1–28) e vencimento (0–30)** estouravam o CHECK do banco, o aluno era salvo **sem cobrança** e o erro ficava na etapa 2 enquanto a pessoa já estava na 3 (ex.: ao enviar o consentimento por e-mail: o e-mail saía, a tela mostrava o erro genérico). Agora `validarCobranca` usa os limites do banco no cadastro e na ficha, a mensagem diz qual campo estourou e o erro de "aluno salvo, mas sem cobrança" aparece mesmo fora da etapa 2.


## 32. Aviso no consentimento declarado pelo personal

- ✅ O botão "O aluno já consentiu pessoalmente ou por escrito" pede confirmação explícita (a prova é do personal), grava `method = 'papel'` e a ficha mostra quem registrou o consentimento (aluno pelo link × declarado por você × antigo).
- ✅ Jurídico: cláusula dos Termos sobre o consentimento colhido fora da plataforma — ver #37.


## 33. Correção: erro do reset de senha do admin aparecia genérico e duplicado

- ✅ O reset de senha do painel admin mostrava "Algo deu errado" duas vezes (toast da mutation + toast local) e escondia o motivo real devolvido pela Edge Function. Agora o motivo aparece uma vez, com o texto da função (`ErroAmigavel`/`mensagemDaFuncao`), o que também ajuda a achar a causa de um eventual erro no envio.


## 34. admin-actions: motivo do erro no reset de senha

- ✅ A função registra status, código e mensagem do Auth quando o envio do e-mail de redefinição falha e devolve uma mensagem específica quando é limite de envio (429): "Aguarde um minuto…". Antes só o status ia para o log e o painel mostrava sempre o mesmo texto.
- ✅ Função antiga `dynamic-handler` (cópia esquecida do admin, sem a exigência do segundo fator) apagada do projeto. Depois de cada deploy, conferir no dashboard que a lista de Edge Functions só tem as do repositório.


## 35. Correção: reset de senha do admin bloqueado por CORS

- ✅ A `admin-actions` liberava só `authorization, content-type` na pré-checagem CORS; o supabase-js também manda `apikey` e `x-client-info`, então o navegador bloqueava o POST (a função só recebia o OPTIONS, sem nenhum erro no log) e o painel mostrava o texto de reserva "Não foi possível enviar o e-mail de redefinição.". Lista corrigida (igual à das outras funções) e teste que exige os quatro cabeçalhos em toda função com CORS.


## 37. Termos e Política: consentimento colhido fora da plataforma

- ✅ Os Termos (3.1) diziam que o consentimento era obtido "pelo link gerado pela plataforma" e o 3.2 que a plataforma registrava o aceite de cada aluno com IP, o que não vale para a opção "termo em papel". **Termos 1.2**: o link é o caminho preferencial, mas o termo escrito colhido e guardado pelo personal é admitido (3.1); nova cláusula 3.2.1 (a plataforma só registra a declaração do personal, sem verificar o documento; a prova, a guarda e a apresentação à ANPD/aluno são do personal; a plataforma não guarda cópia). **Política 1.5**: mesma distinção em "dados de saúde" e "mecanismo de consentimento".
- ⚠️ **Rodar a migration `20261054000000_versoes_termos_consentimento_externo.sql` no SQL Editor ANTES do merge** (registra as versões 1.2 e 1.5; sem ela o cadastro novo é recusado).
- ✅ Redação aprovada pelo jurídico em 22/10/2026 (era minuta do desenvolvimento). Não existe re-aceite forçado: quem já tem conta continua com o aceite da versão antiga; só cadastros e convites novos aceitam a 1.2/1.5.

## 36. Aviso de demora na confirmação do segundo fator (admin)

- ✅ Se a verificação do código passar de 8 s, a tela do MFA mostra "Está demorando mais que o normal. Continue aguardando, não precisa digitar o código de novo." (o botão segue em "Confirmando…"). Antes parecia travada e levava a digitar o código outra vez.


## 38. Grants mínimos, etapa 2 (UPDATE/DELETE que ninguém usa)

- ✅ Migration `20261055000000_grants_minimos_etapa2.sql`: tira de `authenticated` 9 privilégios que o app nunca usa nas tabelas com policy ALL (`pesos` UPDATE+DELETE; DELETE em `sessao_series`, `horarios_fixos`, `aluno_cobranca`, `aula_participantes`, `sessoes`, `professional_config`; UPDATE em `aluno_locais_treino` e `horario_alunos`). Escolha cruzando o código (front e funções SECURITY INVOKER) com `pg_stat_user_tables`; ficaram de fora o que tem uso real (`exercicios` UPDATE, `faturas` DELETE) ou dúvida (`sessao_exercicios` UPDATE). `supabase/grants_cliente.test.ts` falha se o front passar a usar um verbo revogado.
- ⚠️ **Rodar a migration no SQL Editor ANTES do merge.** Depois do merge, usar o app a 390px (alunos, agenda, financeiro, treino) com a conta E2E.


## 39. Login com CPF (Edge Function `login-cpf`)

- ✅ A tela de entrada tem um campo único **CPF ou e-mail** (máscara de CPF enquanto só há números; com "@" segue o fluxo de e-mail de sempre). Com CPF, o app chama a função `login-cpf`: ela resolve o CPF para o e-mail **no servidor** (o e-mail nunca volta ao navegador), entra com a senha e devolve só a sessão. Qualquer falha de credencial (CPF sem conta, senha errada, conta só do Google, e-mail não confirmado) devolve a MESMA resposta 401; a ida ao Auth é feita mesmo sem conta e toda falha de credencial só responde depois de 3 s (medido em produção: com conta ~2,0 s, sem conta ~1,2 s, então o tempo denunciava quem tem conta). Limites só atrasam, não trancam: 10 tentativas/15 min por CPF e 30/h por IP (falha fechada), com a mesma mensagem exista o CPF ou não.
- ⚠️ **Achado: o captcha do login por senha não era conferido pelo Supabase Auth** (login direto na API sem token, e com token falso, passou da verificação). A função repassa o token do Turnstile ao Auth, então **só protege de verdade depois de ligar o captcha no painel**: Authentication → Attack Protection → Enable CAPTCHA protection (Turnstile + secret key, colocada por você no painel). Isso também fecha a brecha do login por e-mail e do cadastro.
- ⚠️ **Ordem:** (1) deploy da função `login-cpf` (`supabase functions deploy login-cpf --project-ref avgrnvpvjhymsrnapfgu`, a partir da main); (2) merge; (3) testar o login com CPF; (4) só então ligar o captcha no Auth e conferir de novo o login (e-mail e CPF) e o cadastro. Efeito colateral de (4): scripts de teste que entram por senha sem token deixam de funcionar.
- Sem migration.


## 40. login-cpf: limite por IP mais folgado

- ✅ O limite por IP do login com CPF subiu de 30 para **100 por hora** (sem IP identificado: 300). Em Wi-Fi de academia/estúdio e CGNAT de operadora vários personais saem pelo mesmo IP e se bloqueavam sem culpa (os testes ao vivo esgotaram os 30 do IP e o celular do dono, na mesma rede, recebeu "Muitas tentativas"). A proteção de cada conta continua no limite por CPF (10 em 15 min). Redeploy da função `login-cpf`; sem migration.


## 41. Correção: captcha do Turnstile reiniciado depois de cada envio

- ✅ Com o captcha ligado no Auth (#39), o cadastro mostrava "Verificação de segurança falhou. Recarregue a página e tente de novo." O token do Turnstile vale para **uma única verificação** e o widget não era reiniciado: depois do primeiro envio (com sucesso ou erro) ele seguia mostrando "Sucesso!" com um token gasto, e o reenvio ia sem token. Agora o `Turnstile` aceita `reiniciar` e a tela do login pede token novo após cada uso (login por e-mail, por CPF, cadastro, reenvio de confirmação e recuperar senha). E, com o captcha ativo, o envio sem token mostra "Aguarde a verificação de segurança terminar…" em vez de chamar a rede e errar.
- Se, numa página recém-carregada e na PRIMEIRA tentativa, o erro continuar, é configuração: conferir no painel do Supabase (Attack Protection) se a Secret key é a do MESMO widget Turnstile cuja Site key está em `VITE_TURNSTILE_SITE_KEY` e se o domínio treino.personalperto.com.br está nos hostnames do widget na Cloudflare.
- ✅ **Causa principal do "Verificação de segurança falhou" (22/10/2026):** o provedor em Authentication → Attack Protection estava em **hCaptcha**, enquanto o app usa **Cloudflare Turnstile** (o log do Auth mostrava `invalid-input-response` em /signup e /token, e a Cloudflare avisava "Siteverify isn't being called for Treino-PP"). Corrigido no painel: provedor **Turnstile by Cloudflare** + Secret key do widget Treino-PP. Depois, cadastro, login por e-mail, login por CPF e "Esqueci minha senha" confirmados no celular.
- Lição para ligar captcha de novo ou trocar de chave: o provedor e a Secret do painel têm de ser os do MESMO widget da Site key em `VITE_TURNSTILE_SITE_KEY`; conferir o log do Auth (Logs → Auth) e o aviso do widget na Cloudflare.

## 42. Grants: UPDATE de sessao_exercicios (fecha a etapa 2)

- ✅ Migration `20261056000000_grants_sessao_exercicios.sql` revoga UPDATE de `authenticated` em `sessao_exercicios`. Os 11 updates das estatísticas eram a FK `plano_exercicio_id ON DELETE SET NULL` (apagar item do plano anula a referência): ação de chave estrangeira, roda com o privilégio do dono e não precisa do grant do cliente; o app nunca atualiza a tabela. `supabase/tests/sessao_exercicios_set_null.sql` prova isso numa transação com ROLLBACK (UPDATE do cliente negado + apagar item do plano continua funcionando e anula a referência).
- ✅ Teste SQL passou (`OK (a)`, `OK (b)`, `OK (c)`), migration aplicada e PR mergeada (23/10/2026): a etapa 2 dos grants mínimos está fechada.


## 43. Rotação do CRON_SECRET

- ✅ `CRON_SECRET` trocado em 23/10/2026: valor novo gerado direto para a área de transferência (nunca impresso), gravado nas Edge Functions (`supabase secrets set`) e no Vault (`vault.update_secret` no nome `cron_secret`). Conferido de ponta a ponta: o banco chamou `aviso-treino-concluido` lendo o segredo do Vault e a função respondeu 200. A sem cabeçalho dá 401.
- Procedimento para a próxima troca: gerar com `openssl rand -hex 32 | pbcopy`, gravar com `"$(pbpaste)"` e colar no SQL do Vault com Cmd+V; provar com `net.http_post` lendo do Vault + `net._http_response`. **Nunca rodar o `openssl` sem `| pbcopy`**: o valor impresso fica no histórico do terminal e do chat (aconteceu uma vez nesta rotação e o valor foi descartado).
- ⏳ Pendentes de painel (dono): criar o alerta de orçamento do Google Cloud; trocar o secret do cliente OAuth "Personal Perto" (aviso de mais de um secret ativo: criar novo, colar no Supabase → Google, testar o login do personal e do admin, desativar os antigos e só depois excluir); e os dois itens da Evolution API (#45). A chave do Google Maps está feita (ver #44).


## 44. Chave do Google Maps restrita

- ✅ A chave `VITE_GOOGLE_MAPS_API_KEY` agora só vale nos sites do dono (saíram `*.vercel.app/*`, `localhost` e duplicados) e só para **Maps JavaScript API** + **Places API**. Detalhes, risco aceito (chave compartilhada com outros apps; Geocoding API removida, com reversão simples) e a melhoria futura (chave só do Treino) no `docs/SECURITY-AUDIT.md`, seção "Chave do Google Maps".
- ⏳ Alerta de orçamento (Faturamento → Orçamentos e alertas) ainda a criar. Conferir no site a busca de endereço do cadastro de local do aluno.


## 45. Evolution API: exposição conferida

- ✅ Conferido de fora, sem credencial (detalhes no `docs/SECURITY-AUDIT.md`): a API exige chave (`401`), `/docs` e `/swagger` não existem (`404`), o HTTP redireciona para HTTPS e a porta direta não responde. Públicos por desenho da Evolution: a página inicial (mostra a versão) e a tela de login do `/manager/`.
- ⏳ **Dono, no Railway (Variables)**: (1) `AUTHENTICATION_API_KEY` aleatória e longa, não de exemplo — é a defesa real, já que o gerenciador é público; (2) sem TCP Proxy configurado. Manter a Evolution atualizada.


## 46. Modo leitura: iniciar treino leva à escolha do plano

- ✅ Com a assinatura vencida o servidor já barra as gravações (migration 20261052), mas o app deixava a pessoa percorrer o fluxo de iniciar treino (prontidão, escolha do plano) e só no fim aparecia o erro técnico do banco (`new row violates row-level security policy "assinatura_ativa_insert" for table "planos"`). Agora `NovaSessaoPage` é protegida por `useModoLeitura`: em modo leitura mostra a tela "Para iniciar um treino, assine o plano" (`BloqueioAssinatura`) já com a escolha do plano aberta e botão Voltar. Todos os caminhos para iniciar (Hoje, Agenda, ficha e lista de alunos, plano) passam por essa rota, então um guarda cobre todos.
- ✅ O erro da policy `assinatura_ativa_*` deixa de aparecer cru: `mapearErroSupabase` devolve "Assine o plano para fazer esta alteração. Suas informações continuam disponíveis para consulta." (texto central em `ERROS.ASSINATURA.modoLeitura`) e a `NovaSessaoPage` passou a usar o mapeador nos 5 pontos que mostravam `error.message` direto.
- Não coberto (por escolha): retomar uma sessão já em andamento e outras ações de gravação (novo aluno, novo treino...) continuam abrindo e, ao gravar, mostram a mensagem acima. Dá para estender o mesmo guarda a essas telas se for desejado.


## 47. UX 1/2: gravações que falham e mensagens (auditoria de UX de 23/10/2026)

- ✅ **Fila offline:** erro que o servidor recusa (assinatura vencida, valor fora do limite, sessão expirada) deixa de ser tratado como "sem sinal". A série continua guardada no aparelho, sai do reenvio automático e aparece em "Séries pendentes" com o motivo em português, com **Tentar de novo** e **Descartar**; erro de rede segue tentando sozinho. `classificarErroSerie` (puro, com testes) separa os dois casos. Antes, uma série recusada era reenviada para sempre e o personal achava que estava salva.
- ✅ **Modo leitura nas gravações:** além de iniciar treino (#46), Novo aluno (botão + e a rota `/alunos/novo`), Novo treino (ficha do aluno), Novo treino planejado, Novo exercício, marcar/adicionar série e Finalizar treino abrem a escolha do plano em vez de começar um fluxo que falharia no fim. A sessão em andamento continua visível, só para consulta. Um `ExigirAssinaturaProvider` único em `RequireAuth` guarda o modal de planos.
- ✅ **Erros crus:** 29 pontos que mostravam `(e as Error).message` passaram para `mapearErroSupabase`; mensagens já escritas em português viraram `ErroAmigavel` (para o mapeador não trocá-las por um genérico). `src/lib/semErroCru.test.ts` falha se alguém voltar a exibir a mensagem crua.
- ✅ **Revisão do cadastro de aluno:** a etapa 5 passou a mostrar **Horários** (antes só Dados, Cobrança e Saúde), com Editar para voltar à etapa 4.
- ✅ **Vocabulário:** "Nota do professor" e "Avaliação do professor" viraram "Personal" (`SessaoPage`).
- ✅ Parte 2/2: ver #48.


## 48. UX 2/2: visual, acessibilidade e aviso de ciclos (auditoria de UX de 23/10/2026)

- ✅ **Login:** "Esqueci minha senha", "Não tem conta? Criar", "Já tenho conta" e "Voltar para o login" passaram de 20 px para 44 px de altura; no login o captcha fica logo acima de "Entrar" e o Google vem depois (separado por "ou"), porque o captcha é só da senha. No cadastro a ordem não mudou. Medido a 375px: nenhum elemento do formulário abaixo de 44 px.
- ✅ **Contraste:** 43 textos em `text-slate-400` (~2,6:1) passaram para `slate-500` (4,8:1) ou `slate-600` (sobre fundo `slate-100`); `slate-400` ficou só em ícone decorativo. Teste novo em `src/lib/contraste.test.ts` falha se texto voltar a usar `slate-400`.
- ✅ **"Ficha incompleta"** na lista de alunos agora diz o que falta: "Sem data de nascimento" (é a única condição que a mostrava).
- ✅ **Hoje:** aviso curto "N alunos com ciclo de cobrança para fechar" (sem lista) que leva ao Financeiro já com o filtro "A fechar". Só conta ciclo **já encerrado** sem fatura (por aula: precisa haver aula cobrável não faturada; mensal: o aluno já tem fatura; fatura cancelada não conta): `src/features/financeiro/cicloPendente.ts`, com testes. No Financeiro essas linhas ganham a etiqueta âmbar "Ciclo encerrado" e vêm primeiro; o filtro "A fechar" continua incluindo também o ciclo em andamento.
- ✅ **Alvos de toque:** botões do painel admin (32 → 44 px), fechar do aviso de instalar o app (24 → 44 px), lixeira dos locais de treino (36 → 44 px) e "Remover" dos horários do cadastro.


## 49. Horário fixo: confirmação ao salvar com conflito

- ✅ Ao salvar um horário fixo (cadastro do aluno, ficha do aluno e edição) que cruza com outro já existente, aparece a confirmação **"Horário já ocupado"** (`ConfirmSheet`) listando os horários que cruzam, com dia, hora e quem está neles ("Seg 07:00 (Paulo Henrique)"), e os botões **Cancelar** e **Salvar mesmo assim**. Antes só havia um aviso amarelo dentro da folha e o Salvar gravava direto. O aviso amarelo agora lista todos os conflitos (não só o primeiro) e avisa que vai pedir confirmação. `conflitosDoHorario` e `descreverConflitos` são puros, com testes (`conflitos.test.ts`).
- Limite conhecido: no cadastro de um aluno novo, os horários ainda não salvos do próprio aluno não entram na comparação (só os já existentes do personal).


## 50. Landing nova (blocos 1–6) e desempenho

- ✅ `public/landing.html` reescrita (PR #153): Hero, O Caos, O Sistema, O aluno vê a curva, A Conta (calculadora + preços) e Fechamento, com GSAP + ScrollTrigger + Lenis (só com `pointer: fine`) e hashes SRI; `prefers-reduced-motion` ou falha dos CDNs deixam tudo no estado final. Selo do **semestral = "Melhor valor"** (igual ao app; "Mais popular" implicaria dado social que não existe). O gráfico leva "(exemplo)" no rótulo.
- ✅ **Desempenho:** a medição em produção (Lighthouse mobile, Slow 4G simulado) deu **LCP 2,7–2,8 s** (meta: 2,5 s; desempenho 90–92), por causa do Tailwind via CDN play (script de ~124 KB que bloqueia a tela e gera o CSS no navegador). O CSS foi **compilado (Tailwind 3.4.17, mesmos tokens) e embutido** no HTML: **0 diferenças** de estilo em 154 elementos × 39 propriedades, a 1280 px e a 375 px, contra a versão do CDN. Medição local depois da troca: **LCP 1,8 s, desempenho 99, acessibilidade 100, boas práticas 100**. Também ganhou os ícones de aba (antes pedia `/favicon.ico` e dava 404 no console).
- ⏳ **Re-medir em produção depois do deploy** (Lighthouse → Mobile → Slow 4G). Regra combinada: se o LCP ficar **≤ 2,5 s**, a migração para o Astro espera até haver mais blocos para migrar de uma vez; se passar de 2,5 s, ela sobe para a próxima sprint.
- **Para mudar classes da landing** é preciso regenerar o CSS embutido: o comando e a configuração estão no comentário no topo do `<head>` do próprio arquivo.
- ⏳ **Analytics da landing desligado** (PostHog, banner de consentimento, UTM e eventos saíram da versão antiga). Decisão: religar só junto com a atualização da **Política de Privacidade na mesma PR** (hoje ela ainda cita o PostHog na página inicial; exige versão nova e migration de `documentos_versoes`). Consistência legal antes de ter analytics cedo.
- ⏳ Testar a landing no celular de verdade antes de divulgar (calculadora e botão "Começar grátis").

- ✅ **Mockups em branco removidos (23/10/2026):** os dois quadros vazios (embaixo do hero e ao lado da lista do Sistema) saíram da landing; a lista do Sistema passou para uma coluna única centralizada. Quando houver prints reais do app (com dados fictícios, em AVIF/WebP), entram em celulares no hero e no Sistema. Briefing do item 05 corrigido: **"Briefing das 5h30 no WhatsApp: você acorda sabendo quem treina hoje, a que horas e onde"** (o briefing diário vai para o personal às 5h30, não para o aluno às 8h).
- Ao regenerar o CSS embutido, trocar só o conteúdo da tag `style` com id "tailwind" (o comentário do topo cita o nome da tag; a tag real é a última ocorrência).

- ✅ **Telas reais do app na landing (23/10/2026):** o hero mostra a tela "Hoje" (data, clima e aulas; recorte antes do card do Pix, sem nomes) e o bloco "O Sistema" mostra, no desktop, uma coluna fixa (sticky) com as telas **Evolução**, **Treinos planejados**, **Financeiro** e **Hoje** (item 05) trocando conforme o item que está no meio da janela (`IntersectionObserver`, independe do GSAP e do movimento reduzido); no celular cada item mostra a própria tela logo abaixo do texto. Imagens em **WebP** (400 px, qualidade 80, embutidas em base64; 57 KB no total contra ~330 KB em PNG) e **empilhadas** (uma `img` por item, troca só de opacidade), sem repetir dados no JS. Mediana do LCP local com as imagens: **2,1 s** (antes: 1,9 s).
- ⏳ **Item 01 (Ficha completa do aluno) ainda sem tela:** o print do "Resumo" mostrava telefone, e-mail e data de nascimento reais. Decisão: o dono refaz o print com **dados fictícios**; quando chegar, entra como `data-item="1"` na pilha (há um comentário no HTML marcando o lugar). Até lá o item 01 mantém a tela atual (Evolução). Os prints originais (com nomes, telefone e e-mail reais) **não** foram commitados.
- Cuidado ao trocar as telas: conferir sempre nome, telefone, e-mail e data de nascimento antes de publicar (landing pública, LGPD).

- ✅ **Hero reescrito (23/10/2026):** título "Você treina. O app cobra, organiza e te avisa."; subtítulo "Ficha, evolução e pagamentos dos seus alunos num lugar só, e um resumo do dia no seu WhatsApp às 5h30."; botões "Testar 15 dias grátis →" e "Ver o app em 30s" (rola para `#sistema`); microtexto "Sem cartão · Cancela quando quiser · Depois, a partir de R$ 10/mês". Cena-prova: celular com a tela "Hoje" (cortado pela borda no mobile, completo no desktop) e uma **notificação de WhatsApp** que entra depois do resto (`back.out`), visível direto com `prefers-reduced-motion` ou sem GSAP. O texto da notificação segue o **formato real do briefing diário** (`supabase/functions/_shared/notificacoes.ts`: "Bom dia, {nome}! 👋 / Você tem N treinos hoje: • Aluno — hora @ local"), com nomes fictícios; não promete "pagamentos que vencem" nem "aluno sem ficha", que o briefing não envia.
- ✅ **Desempenho:** a landing com as telas reais tinha LCP mediano de 2,1 s e, com o hero novo, 2,7 s (o título virou o elemento do LCP, esperando recursos que bloqueiam a tela). Corrigido inlinando o `lenis.css` (243 bytes) e carregando o CSS do Google Fonts sem bloquear a primeira pintura (`preload` + `onload`, com `noscript`): **LCP 0,9 s nas 5 rodadas locais, desempenho 100, acessibilidade 100, boas práticas 100** (Lighthouse mobile, Slow 4G). O texto aparece primeiro com a fonte de reserva e troca quando as fontes chegam (CLS 0,05). **Re-medir em produção.**
- ⏳ Verificar o texto "O app **cobra**": hoje o app gera a fatura e prepara a mensagem de cobrança para o personal enviar pelo WhatsApp; não há cobrança automática ao aluno. Se o produto não cobrar sozinho, trocar por um verbo fiel (ex.: "organiza a cobrança").
- ⏳ Print da ficha do aluno (item 01) com dados fictícios continua pendente (ver acima).

- ✅ **Itens 01 e 05 do Sistema com tela (23/10/2026):** o item 01 (Ficha completa do aluno) usa o print do "Resumo" com **barras opacas cinza** cobrindo o **sobrenome**, o **nascimento** e o **e-mail** (não é desfoque; o pixel original some). O item 05 (Briefing das 5h30) mostra **a mesma notificação de WhatsApp do hero**, clonada do HTML (texto nítido, 0 KB extra): no desktop sobre um fundo escuro dentro da moldura, no celular abaixo do texto. Corrigido junto um defeito da #156: a coluna do celular não acompanhava a rolagem (grid com `items-start` deixava a coluna só do tamanho da moldura, então o `sticky` não tinha por onde deslizar e, nos itens 4 e 5, só aparecia a borda da moldura); agora a coluna estica (`self-stretch`).
- ⚠️ **No print da ficha continuam visíveis** "André" (primeiro nome), o **telefone** `(21) 45255-6656` e demais dados (objetivos, esportes, altura/peso). Por decisão do dono só sobrenome, e-mail e nascimento foram ocultados; o telefone parece número de teste. Trocar/ocultar se for um número real. Lembrete LGPD: conferir sempre nome, telefone, e-mail e nascimento antes de publicar um print.
- Medição local depois destas mudanças: LCP 0,9–1,0 s, desempenho 100, acessibilidade 100, boas práticas 100 (arquivo 116 KB). Re-medir em produção.

- 📌 **Regra (26/10/2026): analytics da landing e Política de Privacidade andam juntos.** A landing nova não tem analytics (PostHog, banner de consentimento, UTM e eventos de rolagem/CTA saíram), mas a Política de Privacidade ainda descreve o PostHog na página inicial. Decisão do dono: **manter o texto como está** (ele diz mais do que o app faz, o lado seguro) e **só alterá-lo na mesma PR que religar o analytics**, para não gerar duas versões seguidas do documento. Quando religar: banner de consentimento antes de qualquer cookie ou gravação, eventos (`scroll_depth`, `cta_click`), UTM, texto da política conferido com o que realmente coleta, **versão nova da política + migration em `documentos_versoes`** (o guard do CI exige) e aprovação do jurídico. Manter o LCP em ≤ 2,5 s (medir com Lighthouse mobile, Slow 4G).


## 51. Arquivar antes de apagar (PR A da reformulação da landing)

- ✅ **Só se apaga aluno já ARQUIVADO.** No app: o menu da lista mostra "Apagar de vez" apenas na aba Arquivados (na aba Ativos aparece a dica "para apagar um aluno de vez, arquive primeiro") e a ficha do aluno ativo só oferece "Arquivar aluno"; o aluno arquivado ganha "Restaurar aluno" e "Apagar de vez". A confirmação mostra **o que será perdido** ("12 sessões de treino, 3 treinos montados e 5 faturas…"), diz que não dá para desfazer e sugere deixar arquivado (`apagarAluno.ts`, com testes).
- ✅ **Trava no banco** (migration `20261057000000_apagar_aluno_exige_arquivado.sql`): `BEFORE DELETE` em `alunos` recusa, para `authenticated`/`anon`, apagar aluno com `active = TRUE` ("Arquive o aluno antes de apagar."). Vale também para uma versão antiga do app ainda instalada. Não afeta o SQL Editor/service_role nem a cascata ao apagar um personal. `supabase/tests/apagar_aluno_exige_arquivado.sql` prova os 3 casos numa transação desfeita.
- ⚠️ **Rodar a migration no SQL Editor ANTES do merge** (e depois o teste SQL). Scripts de teste que apagavam aluno ativo pelo cliente agora precisam arquivar antes.
- Pré-requisito do bloco "histórico completo" da landing. A lixeira de 30 dias (P3) foi adiada por decisão do dono.


## 52. Landing v2 (PR B + C juntas)

- ✅ **Hero:** título "Você treina. O app cuida da rotina."; subtítulo "Alunos ilimitados, histórico completo e briefing diário no WhatsApp. R$ 15/mês."; selo "Sem fidelidade · Não renova sozinho · Sem cartão" (o plano é pagamento avulso, sem renovação automática). Título, descrição e `og:` da página acompanham.
- ✅ **"Um dia na sua rotina"** (antes "O sistema"): 5h30 briefing → ficha → treino → evolução → cobrança, cada momento com a sua tela (as mesmas 5 já embutidas; no desktop a coluna fixa abre no briefing).
- ✅ **Modalidades:** só as 5 que estão ligadas no app (musculação, corrida, natação, ciclismo e brick, "bike → corrida, para triatletas"). Não prometer outras enquanto estiverem com `enabled: false` em `src/types/modalidades.ts`.
- ✅ **Sem refém** (alunos e treinos sem limite, histórico de cada aluno, dados continuam visíveis se parar de pagar e apagar exige arquivar antes, #51), **comparação por categoria** (papel/planilha/WhatsApp × Treino, e "muitos apps cobram por faixa de alunos"; sem nome nem preço de concorrente), **calculadora com custo por aluno** ("Com N alunos, seu custo é R$ X por aluno por mês", sobre o plano mensal de R$ 15), **confiança/LGPD** ("com consentimento do aluno, pelo link do app ou registrado por você"), **nossa história** (só com o que o dono disse, assinada por André Scherer) e **"Comece em 5 minutos" + FAQ** (11 perguntas, incluindo "mesma conta no celular e no computador" e "o que acontece com os dados de um aluno arquivado": guarda o histórico enquanto a conta estiver ativa, em linha com a Política 5.1).
- Medição local (Lighthouse mobile, Slow 4G): **LCP 1,1 s, desempenho 100, acessibilidade 100, boas práticas 100**, 201 KB. Re-medir em produção. A página ficou longa (~12,8 mil px no celular): avaliar enxugar blocos se a rolagem cansar.
- ⏳ **Pendentes do dono:** (1) o print novo da **ficha** com dados fictícios (a ficha no ar ainda é a com barras e mostra o telefone `(21) 45255-6656`); (2) as **dores reais** que viraram funcionalidade, para enriquecer a história de origem (hoje só há o que o dono disse); (3) um print da aba **Histórico** para ilustrar o bloco "sem refém"; (4) **revisão do jurídico** nas frases comparativas e de LGPD antes de divulgar; (5) analytics e Política continuam juntos (#regra de 26/10).

- ✅ **Atualização da landing v2 (26/10/2026):** (1) a **ficha** (item "Antes do treino") agora é o print da **Revisão do cadastro** com dados **fictícios** (nascimento 17/05/1989, telefone `(14) 52556-6566`, e-mail `andrevisc@as.com`), substituindo a versão com barras que ainda mostrava um telefone; o nome "André Scherer" aparece de propósito (é o assinante da história). O outro print enviado (etapa "Dados" do cadastro) não foi usado; serve para ilustrar o "Passo 1 — Cadastre um aluno" se quisermos. (2) **História de origem** com as dores reais: dados dos alunos espalhados, agenda difícil de controlar, financeiro no improviso; sem depoimento nem número, assinada por André Scherer. (3) **Jurídico aprovou** as frases comparativas e a de LGPD.
- ⏳ Ainda aberto: print da aba **Histórico** para o bloco "sem refém" (hoje só texto), medir o LCP em produção e conferir no celular de verdade (calculadora e botão de cadastro).


## 53. Analytics da landing ligado, com Política 1.6 (regra de 26/10: andam juntos)

- ✅ **Analytics (PostHog) na landing, só depois do aceite.** Aviso fixo no rodapé da tela com **Recusar** e **Aceitar** do mesmo peso (44 px), mostrado ~1,5 s depois do carregamento (não disputa o LCP). Antes do aceite **nada do PostHog é carregado** (0 requisições, medido). O sinal **Global Privacy Control** do navegador conta como recusa e o aviso nem aparece. Rodapé: **"Preferências de cookies"** reabre o aviso; ao recusar/revogar, o identificador do PostHog é apagado do navegador (`opt_out_capturing` + `reset`) e nada novo é registrado.
- **O que é coletado (e o que não é):** visita e saída da página (`capture_pageview`/`pageleave`), `cta_click` (seção e texto do botão `/login…`), `section_view` (cada seção, uma vez), `faq_open` (texto da pergunta), `calculadora_usada` (uma vez, só o nome do campo) e as UTMs. **Sem gravação de sessão** (a versão antiga gravava), **sem autocaptura**, **sem cookies** (`persistence: 'localStorage'`), sem `identify` (não liga ao cadastro). Nenhum dado pessoal vai nos eventos.
- ✅ **Política de Privacidade 1.6** (`src/features/legal/textos.ts`, seção 3 e item de PostHog na seção 4): descreve exatamente isso, inclusive que o **IP** é tratado (localização aproximada), a base legal (consentimento, art. 7º, I), o GPC e a revogação por "Preferências de cookies"; tira a frase "dados anônimos" e a "gravação de sessão". **Migration `20261058000000_politica_privacidade_1_6.sql`** registra a versão (sem ela o cadastro novo é recusado). `src/features/legal/landingAnalytics.test.ts` falha se a landing e a política voltarem a divergir (gravação de sessão, cookies, consentimento, GPC, link de revogação).
- ✅ **Histórico no bloco "sem refém":** print da aba Histórico (recorte só da lista e das abas; sem nome nem contato), em duas colunas no desktop.
- ⚠️ **No painel do PostHog (dono):** (1) confirmar que **Session replay** está desligado no projeto (a landing já não envia, mas o texto promete); (2) o texto diz que o IP é tratado para localização aproximada: se preferir **descartar o IP**, ligar "Discard client IP data" em Project settings e ajustar a frase da seção 3; (3) o **jurídico** deve revisar o novo texto da seção 3.
- Medição local (Lighthouse mobile, Slow 4G): LCP 1,1 s, desempenho/acessibilidade/boas práticas 100.


## 54. Central de ajuda dentro do app

- ✅ **Rota `/ajuda`** (Configurações → "Central de ajuda"): 16 artigos em 7 categorias (Começando, Alunos, Treinos, Agenda, Financeiro, Conta e plano, Privacidade), busca sem acento/maiúsculas (todas as palavras precisam aparecer) e artigos em `<details>` (acessível, alvos ≥ 44 px). Os passos usam os rótulos reais do app (conferidos no código).
- ✅ **Contato:** botão "Falar no WhatsApp" com mensagem pronta, sem dados pessoais; o texto pede para não enviar dados de saúde de alunos na conversa.
- ✅ Testes (`artigos.test.ts`): ids únicos, categorias válidas, vocabulário (sem "professor"/"assíncrono") e busca.
- ✅ Link "Precisa de ajuda?" no card de primeiros passos (Hoje).
- ⏳ **Fora por enquanto (decisão do dono):** formulário "Reportar problema" (exige backend/tabela e tratamento LGPD). Os textos descrevem o app de hoje: revisar quando a interface mudar.
- ⚠️ Telas autenticadas não foram testadas ao vivo (o captcha do login bloqueia a automação): validar no celular `/ajuda`, a busca e o botão do WhatsApp.


## 56. Conflito de horário também com horários ainda não salvos

- ✅ No cadastro de aluno novo (etapa Horários), a checagem de conflito agora considera também os horários que o personal já adicionou naquele cadastro e ainda não foram salvos (antes só via os já gravados). Função pura `pendentesComoExistentes` + testes. O aviso nomeia o aluno ("este aluno" se o nome ainda não foi digitado).
- ⚠️ Tela autenticada não testada ao vivo: no celular, adicionar dois horários sobrepostos no cadastro e ver o aviso/confirmação.

## 55. Esqueleto no lugar de "Carregando…"

- ✅ Telas de lista, aba e ficha (Alunos, Aluno, Planos, Modelos, Sessão, Finalizar sessão, Fatura, Financeiro, Fechar ciclo, Agenda, Evolução, Histórico, Exercícios, Consentimentos, Configurações, Assinatura, Cobrança) agora mostram esqueleto (`ListaSkeleton`/novo `PaginaSkeleton`, com `role="status"` e `aria-label="Carregando"`) em vez do texto solto. Reduz o salto de layout.
- Mantido como texto, de propósito: telas de autenticação/admin, seletores dentro de sheets e o consentimento público do aluno.
- ⚠️ Telas autenticadas não testadas ao vivo (captcha do login): conferir no celular com a rede lenta.

## 57. Lixeira de 30 dias para alunos

- ✅ Fluxo novo: **Ativo → Arquivado → Lixeira (30 dias) → apagado de vez**. Em Alunos há a aba **Lixeira** (mostra "Some em N dias", restaurar ou "Apagar agora"); em Arquivados, "Mover para a lixeira" (com confirmação, toast "Desfazer"); na ficha, banner e botões equivalentes. Restaurar da lixeira devolve o aluno para **Arquivados** (de lá, "Restaurar" o reativa).
- ✅ **Migration `20261059_lixeira_alunos.sql`**: coluna `apagado_em`, CHECK (só aluno arquivado), trigger (o banco grava a data com `now()`, impede reativar sem restaurar) e a trava de DELETE do cliente passa a exigir aluno **na lixeira** (substitui a regra "só arquivado" da 20261057). Teste: `supabase/tests/lixeira_aluno.sql` (e o `apagar_aluno_exige_arquivado.sql` foi ajustado).
- ✅ **Limpeza automática:** `supabase/cron/lixeira_alunos.sql` (pg_cron diário 06:30 UTC, apaga `apagado_em` > 30 dias, em cascata).
- ✅ Textos atualizados: central de ajuda e FAQ/bloco "sem refém" da landing.
- Escolha de desenho: o aluno na lixeira continua sendo um aluno **arquivado** com data de lixeira; seus dados (faturas, sessões) não são escondidos das outras telas durante os 30 dias, como já é com qualquer arquivado. Esconder tudo exigiria filtrar ~14 tabelas filhas; fica como evolução, se for necessário.
- ⚠️ Dono: **rodar a migration e depois o `supabase/cron/lixeira_alunos.sql` no SQL Editor** (sem o cron, a lixeira não esvazia sozinha), e rodar os dois testes SQL. Telas autenticadas não testadas ao vivo. Política de Privacidade não mudou (a lixeira cabe em "enquanto a conta estiver ativa"); revisar se o jurídico quiser citar o prazo.


## 58. LCP da landing medido em produção (26/10/2026)

- ✅ Lighthouse mobile (Slow 4G simulado) em `treino.personalperto.com.br/landing.html`, já com analytics e Política 1.6 no ar: **LCP 1,5 s, FCP 1,5 s, TBT 0 ms, CLS 0,051, desempenho 99, acessibilidade 100, boas práticas 100.**
- Regra combinada (LCP ≤ 2,5 s): **migração para Astro segue adiada**. Reavaliar se o LCP passar de 2,5 s ou quando houver mais blocos para migrar de uma vez.
- Ponto de atenção: CLS subiu para 0,051 (limite "bom" é 0,1). Se crescer, olhar o aviso de consentimento do rodapé e as imagens sem dimensão.


## 60. Aluno na lixeira some das demais telas

- ✅ **Migration `20261061_lixeira_esconde_aluno.sql`** (decisão do dono: "tirar da agenda"). Ao mandar o aluno para a lixeira, o banco: remove as **aulas futuras** dele ainda não realizadas/cobradas (e as aulas que ficarem vazias), desvincula e **desativa os horários fixos** que ficarem sem alunos e **desativa a cobrança**. Nada disso volta ao restaurar: ele volta como arquivado e, ao reativar, horário e cobrança precisam ser cadastrados de novo.
- ✅ **Esconde na leitura** (policy `RESTRICTIVE`, nome `lixeira_esconde`) as linhas do aluno na lixeira em `faturas`, `aluno_cobranca`, `aula_participantes`, `notificacoes_professor`, `execucoes_assincrono` e `sessoes`: Financeiro, Agenda/Hoje, métricas, notificações e feed deixam de incluí-lo. Os dados seguem no banco até a limpeza dos 30 dias e **voltam a aparecer se ele for tirado da lixeira**. Atenção: a dívida em aberto dele deixa de aparecer no Financeiro enquanto estiver na lixeira.
- ✅ RPC `resumo_apagar_aluno()` (SECURITY DEFINER, só do próprio personal): a confirmação de "Apagar agora" continua mostrando o que será perdido (a leitura direta passou a ver zero). App atualizado para usá-la.
- ✅ Edge Function `avisos-financeiros`: não avisa cobrança vencida de aluno na lixeira. **Precisa de deploy** da função.
- Sem mudança: briefing, resumo semanal e avisos diários já filtram por aluno ativo ou dependem das aulas futuras (que saem no passo acima).
- ⚠️ Dono: rodar a migration e `supabase/tests/lixeira_esconde_aluno.sql` (esperado `(a) OK` … `(e) OK`), e fazer o deploy de `avisos-financeiros`. Telas autenticadas não testadas ao vivo.

## 59. Reportar problema (central de ajuda)

- ✅ Botão **"Reportar um problema"** na central de ajuda (`/ajuda`): o personal escolhe Problema/Dúvida/Sugestão e escreve (10 a 1500 caracteres). Aviso no formulário: não escrever nome, telefone nem dados de saúde de alunos. O banco guarda só tipo, texto, aparelho/navegador (user agent, até 200) e o personal; **nenhum dado de aluno** e nada de saúde.
- ✅ **Migration `20261060_relatos_problema.sql`**: tabela `treino.relatos` com RLS (personal só insere e lê os próprios; sem editar/apagar), status sempre "novo" na criação, **limite de 5 relatos por hora** por personal e **sem trava de assinatura vencida** (quem está em modo leitura também precisa conseguir pedir ajuda). Funções `admin_relatos()` e `admin_relato_status()` exigem `is_admin()` (MFA).
- ✅ **Painel /admin → "Relatos dos personais"**: lista (abertos primeiro), nome/e-mail/telefone do personal, status Novo/Em andamento/Resolvido e "Responder no WhatsApp". O admin vê dados do personal e o texto dele, nunca de alunos.
- ✅ Mensagens de erro em português para as travas da lixeira (#57) e do limite de relatos (`mapearErroSupabase`).
- ⏳ Sem aviso automático ao admin (WhatsApp/e-mail) quando chega relato novo: hoje é conferir o painel. Possível próxima etapa (Edge Function + pg_net). Política 1.6 já cobre "suporte técnico" e "dados de uso e acesso"; jurídico pode querer citar o relato explicitamente.
- ⚠️ Dono: rodar a migration e o teste `supabase/tests/relatos_problema.sql`. Telas autenticadas não testadas ao vivo.


## 61. Aviso automático ao admin quando chega relato novo

- ✅ Quando um personal envia um relato (#59), o **admin recebe um WhatsApp**: "Novo problema/dúvida/sugestão de {primeiro nome} na central de ajuda. Veja em …/admin → Relatos dos personais." **O texto do relato não vai na mensagem** (texto livre: só no painel), em linha com a regra de privacidade.
- Mecanismo: trigger `AFTER INSERT` em `treino.relatos` → `pg_net` → Edge Function **`avisar-relato`** (verify_jwt desligado, protegida pelo mesmo `CRON_SECRET`/`cron_secret` do Vault dos outros avisos). O trigger **nunca bloqueia** o relato: se pg_net/Vault/função falharem, o relato é gravado e só sai um aviso no log do banco.
- ✅ Migration `20261062_aviso_relato_admin.sql` (tipo `relato_novo` em `whatsapp_log`, fora do "um por dia"; função e trigger) e teste `supabase/tests/aviso_relato_admin.sql`. Texto em `montarRelatoNovo` (com testes).
- ⚠️ Dono: (1) rodar a migration e o teste; (2) **deploy** de `avisar-relato`; (3) o admin precisa ter **WhatsApp ligado e telefone verificado** (Configurações → Notificações), senão o envio é pulado (sem erro); (4) conferir o ponta a ponta mandando um relato real. Alternativa por e-mail ficou de fora (não há remetente de e-mail transacional nas Edge Functions hoje).


## 62. Painel /admin: ajustes de UX, treinos por personal e cidade com Maps (PR A)

Origem: análise de UX do /admin por três ferramentas de IA. Conferi cada ponto no código antes de agir: **P3 (sem confirmação), P6 (KPIs sem rótulo), P8 (sem data do trial) e P20 (só cor) estavam errados** (os modais, rótulos, a coluna "Trial/plano até" e os textos dos status já existiam). P5 (papéis de acesso) fica para quando houver equipe.
- ✅ **"+ 7 dias de trial" agora pede confirmação** (era a única ação do painel sem modal).
- ✅ **Treinos por personal** (só números agregados, sem dados de alunos): montados e realizados, presencial x à distância, e realizados nos últimos 30 dias, na tabela e nos cards do celular. **Migration `20261064_admin_personais_metricas.sql`** (função `admin_personais_metricas()`, exige `is_admin()`/MFA) e teste `supabase/tests/admin_personais_metricas.sql`.
- ✅ **Cidade/UF do personal com link para o Google Maps** (lista de personais e tabela de Cidades); vazio = "Não informado". Sem endereço de aluno.
- ✅ **Relatos:** filtro por status (Em aberto, Novo, Em andamento, Resolvido, Todos, com contagem) e o navegador vira "iPhone · Safari" (texto completo só no tooltip).
- ✅ **Inadimplentes zerado:** uma linha discreta no lugar de um card inteiro.
- ✅ **Contraste:** a pílula "Cancelada" (slate-500 sobre slate-100, ~4,3:1) passou para slate-600; teste novo cobre todas as pílulas do /admin.
- ⏳ **Próximas (PR B):** menu "⋮" por personal no lugar dos 4 botões, abas do painel (Visão geral, Personais, Suporte, Privacidade) e tela de histórico de ações (`admin_logs` já existe no banco). **PR C:** painel financeiro do negócio (receita, conversão de trial, cancelamentos) — propor antes.
- ⚠️ Dono: rodar a migration e o teste SQL. Telas autenticadas não testadas ao vivo.


## 63. Painel /admin: menu "⋮", abas e histórico de ações (PR B)

- ✅ **Menu "⋮" por personal** (folha com Reset de senha, Ajustar trial, Ajustar plano e Corrigir CPF) no lugar dos 4 botões por linha, na tabela e nos cards do celular (alvos ≥ 44 px).
- ✅ **Abas** (na URL, `?aba=`): Visão geral (KPIs, inadimplentes, cidades), Personais, Suporte (com a contagem de relatos em aberto) e Privacidade (consentimentos LGPD e histórico de ações). A busca da lista de personais passou para a URL (`?busca=`).
- ✅ **Histórico de ações do admin** (aba Privacidade): reset de senha, trial, plano e CPF, com quem fez, em quem e quando. **Migration `20261065_admin_historico_acoes.sql`** (função `admin_historico_acoes()`, exige `is_admin()`/MFA; **não devolve `detalhes`**, que guarda e-mail e CPF) e teste `supabase/tests/admin_historico_acoes.sql`.
- ✅ **Relatos:** "Ver cadastro" abre a aba Personais já filtrada pelo e-mail do personal; "Responder no WhatsApp" passa um relato "Novo" para "Em andamento" (resolver continua manual).
- ⏳ **PR C:** painel financeiro do negócio (receita, conversão de trial, cancelamentos), a propor antes de fazer.
- ⚠️ Dono: rodar a migration e o teste SQL. Telas autenticadas (e o MFA do admin) não testadas ao vivo.


## 64. Painel /admin: Financeiro do negócio (PR C)

- ✅ **Aba Financeiro** no /admin: receita do mês e total (REAL, do livro de pagamentos), **receita mensal recorrente estimada** (assinantes ativos × valor mensal equivalente: R$ 15, R$ 13 e R$ 10, marcada "estimativa"), assinantes ativos e trials em curso, **conversão de trial** (já pagaram ÷ trials encerrados) e **não renovaram** (plano pago que venceu).
- ✅ **Decisão do dono:** registrar os pagamentos daqui para frente + estimativa agora. Até esta PR o banco só guardava o id do pagamento (`pagamentos_processados`), sem valor nem data, então **a receita anterior não tem como ser recuperada**; o painel diz "registrada desde DD/MM/AAAA".
- ✅ **Migration `20261066_admin_financeiro.sql`**: tabela `treino.pagamentos_assinatura` (interna, só service_role) e função `admin_financeiro()` (só agregados, exige `is_admin()`/MFA). Teste `supabase/tests/admin_financeiro.sql` e teste de paridade dos preços SQL × `mp.ts`.
- ✅ **Edge Function `mp-webhook`** grava o pagamento no livro depois de creditar (idempotente por `payment_id`) e **remove a linha em estorno/chargeback**; falha no livro nunca derruba o webhook. **Precisa de deploy.**
- Fora do escopo: o financeiro dos personais com seus alunos (já existe no app do personal); nenhuma conciliação com o extrato do Mercado Pago.
- ⚠️ Dono: rodar a migration e o teste, **deploy do `mp-webhook`**, e conferir o primeiro pagamento real aparecendo na aba. Telas autenticadas/MFA não testadas ao vivo.


## 65. Painel /admin: Indicadores (BI) com filtro de período

- ✅ **Aba "Indicadores"** com filtro de período (24 h, 15 dias, Mês, Trimestre, Semestre, Ano; **janelas móveis** terminando agora, guardadas na URL `?periodo=`). Cada número vem comparado com o **período anterior de mesmo tamanho** (seta + sinal + %; "novo" quando não havia base).
- Indicadores (todos agregados, sem dados de alunos): **Crescimento** (novos cadastros, personais ativos, novos pagantes), **Receita** (receita registrada, pagamentos aprovados), **Uso** (alunos cadastrados, treinos montados, treinos realizados presencial x à distância, aulas realizadas, faturas geradas pelos personais), **Retenção** (trials encerrados, trials sem conversão, planos vencidos sem renovar) e **Suporte** (relatos). Para "trials sem conversão" e "planos vencidos", subir é ruim (vermelho).
- Gráfico de evolução (barras: por dia até 31 dias, por semana até 190, por mês no ano) para cadastros, alunos, treinos, pagamentos e receita, com leitura ao passar/focar a barra e **"Ver como tabela"**.
- ✅ **Migration `20261067_admin_bi.sql`**: `admin_bi(p_dias)` (só 1/15/30/90/180/365; exige `is_admin()`/MFA) e a função interna `admin_bi_janela()` (fechada ao cliente). Teste `supabase/tests/admin_bi.sql`; helpers puros testados (`bi.ts`).
- Limites: pagamentos e receita só existem desde o registro de pagamentos (#64); períodos antes disso aparecem zerados. "Ativo" = fez algo no app no período. Cadastros por dia usam o fuso de São Paulo.
- ⚠️ Dono: rodar a migration e o teste SQL. **Não conferi a aba visualmente** (MFA do admin impede a automação): olhar no celular e no desktop, e me mandar print se algo estiver estranho.
- Ideias para depois: filtro por intervalo livre de datas, funil cadastro → telefone verificado → 1º aluno → 1º treino → pagamento, cohort de retenção por mês de cadastro, exportar CSV.


## 66. Painel /admin: logo completa do Personal Perto no cabeçalho

- ✅ O cabeçalho do /admin troca o símbolo pequeno por **a logo completa** (`logo-personal-perto-sm.png`, 320×121) sobre **fundo branco** (a logo tem texto azul-escuro e não aparece no azul do cabeçalho antigo); botões Segurança e Sair em cinza-escuro (contraste AA). Só visual, sem migration.
- ⚠️ Não conferi visualmente (o /admin exige MFA): olhar no celular e no desktop.


## 67. Login e cadastro: ajustes de UX (análise de 3 ferramentas de IA) — PR 1

Conferi cada ponto no código antes de agir. **Falsos:** "Esqueci minha senha" sem contraste (era slate-500 sobre branco, 4,76:1, passa AA; mesmo assim ficou slate-600 e sublinhado), placeholder no lugar do rótulo (o rótulo "CPF ou e-mail" já existia), erro só por cor no checklist (já havia ícone e texto), "sublinhado duplicado" nos termos. **Meia verdade:** o botão "Criar conta" só ficava cinza por senha/CPF (o aceite dos termos nunca o desabilitou).
- ✅ **Turnstile:** sempre tema claro (o bloco preto era o tema "auto" seguindo o modo escuro do aparelho) e `appearance: interaction-only` (só aparece se o Cloudflare pedir um clique). Enquanto não há token o botão diz "Verificando segurança…"; passados 12 s aparece "está demorando… tente de novo" (sem isso, um bloqueio do widget deixaria o botão travado sem explicação).
- ✅ **Google no topo** das duas telas ("Entrar com Google" / "Criar conta com Google") com o divisor "ou entre com CPF ou e-mail" / "ou crie com seus dados".
- ✅ **Checklist de senha** neutro (círculo cinza) até o requisito ser atendido (✓ verde); sem vermelho de erro antes de digitar.
- ✅ **Botão desabilitado explica o motivo** ("Para continuar, informe uma senha que atenda todos os requisitos"); rótulos "Entrando…" e "Criando conta…".
- ✅ Aceite dos termos com alvo de toque ≥ 44 px (linha inteira); "Bairro (opcional)"; "Criar minha conta" vira botão com borda no login.
- Decisões do dono: **manter o WhatsApp ligado por padrão** no cadastro (o envio já exige telefone verificado) e **dividir o cadastro em duas etapas** (PR seguinte).


## 68. Cadastro em duas etapas

- ✅ **Etapa 1 (cadastro):** só Nome, E-mail, Senha (com confirmação e checklist), aceite dos Termos e o seletor de WhatsApp (continua **ligado por padrão**, decisão do dono). Antes eram 10 campos (CPF, telefone, CEP, bairro, cidade e UF também).
- ✅ **Etapa 2 (logo depois de confirmar o e-mail):** nova trava `CompletarPerfilGate` no app autenticado: enquanto faltar **nome, CPF ou telefone**, aparece "Complete seu perfil" (CPF, telefone, CEP) no lugar do app, reaproveitando `PerfilObrigatorioForm` (a mesma tela do login com Google). O WhatsApp começa como o personal deixou no cadastro e o aceite dos Termos **não é pedido de novo** (já registrado na criação da conta). Se a consulta falhar, a trava deixa passar. Critério em `perfilCompleto()` (testado); cidade/UF não entram no critério para não barrar contas antigas sem localização.
- Segurança/antiabuso: o CPF continua único (RPC `atualizar_cpf`, com limite de tentativas) e é exigido **antes de usar o app**, só não mais antes de criar a conta; e-mail confirmado + captcha seguem iguais. O gatilho `handle_new_user` já aceitava CPF e telefone vazios: **sem migration**.
- ⚠️ Dono: testar no celular criar conta com e-mail novo (e-mail de confirmação → "Complete seu perfil" → app) e entrar com uma conta antiga e com Google (não devem ver a trava). Medir o abandono do cadastro continua fora do app (só a landing tem analytics).


## 69. Cadastro: CPF volta para a etapa 1 + tela de e-mail já cadastrado

- ✅ **Decisão do dono: não abrir mão do CPF na primeira etapa.** Etapa 1 = Nome, **CPF**, E-mail, Senha, aceite e WhatsApp. Etapa 2 (depois de confirmar o e-mail) = **telefone e CEP**; o CPF aparece só para conferência, travado (a RPC `atualizar_cpf` aceita repetir o próprio CPF).
- **Como o banco trata mais de uma conta com o mesmo CPF:** índice único (`idx_professionals_cpf`). No cadastro, um CPF já usado faz o gatilho de criação do perfil falhar e o app mostra a mensagem genérica "Não foi possível concluir o cadastro. Se o CPF ou e-mail já estiverem cadastrados, tente entrar ou recuperar a senha" (de propósito, para não revelar quem é cliente). A mesma regra vale no perfil pós-Google (`atualizar_cpf`, 5 tentativas/dia).
- **E-mail já cadastrado:** o Supabase **não cria uma segunda conta**; devolve um usuário "fantasma" e o app mostra a mesma tela de "Confirme seu e-mail" (decisão de segurança contra enumeração, SECURITY-AUDIT). Melhorias desta PR: a tela agora diz que, se o e-mail já tinha conta, nenhum e-mail novo chega, e traz os botões **"Já tenho conta: entrar"** e **"Esqueci minha senha"** (antes só um texto pequeno e um link).
- ⚠️ Dono: testar no celular cadastro com e-mail novo e com um e-mail e um CPF já usados (cada um deve cair na mensagem certa).


## 70. Cadastro: avisa ao digitar se o CPF/e-mail já tem conta

- ✅ Ao terminar de digitar o **CPF** (válido) ou o **e-mail** (válido), com pequena espera, o cadastro consulta a nova Edge Function **`verificar-cadastro`** e, se já existe conta, mostra "Já existe uma conta com este CPF/e-mail" com os botões **Entrar** (leva ao login com o CPF/e-mail já preenchido) e **Esqueci minha senha**. O botão "Criar conta" fica bloqueado e explica o motivo. **Nada da conta aparece** (o aviso não mostra o e-mail do CPF nem o CPF do e-mail).
- ✅ No **"Complete seu perfil"** o CPF digitado que é de outra conta também avisa na hora (a função ignora a própria conta) e bloqueia o "Concluir".
- ✅ Função com limite de 40 consultas/IP/hora, falha fechada; se a consulta falhar, o cadastro segue sem o aviso. Testes das regras puras (`verificarCadastro.test.ts`). **Risco aceito (enumeração) registrado em `docs/SECURITY-AUDIT.md`.**
- ✅ Recuperar a senha **pelo CPF**: feito no #72.
- ⚠️ Dono: **deploy da função `verificar-cadastro`** (`--no-verify-jwt` já vem do `config.toml`) e testar no celular com CPF e e-mail já usados e com novos.


## 71. Cadastro: WhatsApp só no passo 2 e rótulos de login

- ✅ O seletor de **WhatsApp saiu do cadastro** (passo 1) e ficou **só no "Complete seu perfil"**, logo abaixo do telefone (é o telefone que o WhatsApp usa), com texto explicando o que chega ("agenda do dia e avisos do app; você desliga quando quiser"). **Segue ligado por padrão** (decisão do dono); vale para todo mundo que passa por essa tela (e-mail, Google e convite). Antes aparecia nas duas telas.
- ✅ Os botões "Já tenho conta" viraram **"Ir para o login"** (tela de confirmar e-mail) e **"Fazer login"** (rodapé do cadastro).

## 72. Recuperar senha pelo CPF

- ✅ A tela "Recuperar senha" agora aceita **CPF ou e-mail** (mesmo campo do login, com máscara de CPF). Com e-mail, segue o fluxo de antes. Com CPF, chama a nova Edge Function **`recuperar-senha-cpf`**, que acha o e-mail do cadastro no servidor e pede ao Auth o link de redefinição. **O e-mail não volta ao navegador** e a resposta é sempre a mesma ("Se houver uma conta com esse CPF, enviamos o link ao e-mail do cadastro"), exista a conta ou não; falha de captcha e limite continuam com mensagem própria.
- ✅ Proteções: captcha (Turnstile, conferido pelo Auth), limite de **3 pedidos/CPF/hora** (ninguém enche a caixa de e-mail de outra pessoa sabendo o CPF) e 30/IP/hora, falha fechada; tempo mínimo de resposta de 1,5 s para não revelar quem tem conta; CPF e e-mail nunca vão para log. Regras puras em `_shared/recuperarSenha.ts` com testes.
- ⚠️ Dono: **deploy da função** (sem migration): `npx supabase functions deploy recuperar-senha-cpf --project-ref avgrnvpvjhymsrnapfgu` (o `--no-verify-jwt` vem do `config.toml`). Testar no celular: Esqueci minha senha → digitar o CPF → o e-mail de redefinição chega no e-mail do cadastro.
- Não testado ao vivo por mim: o envio real do e-mail (exige o captcha do navegador e conta de verdade).

## 73. E-mails automáticos: título em português e logo em fundo branco

- ✅ Os três templates do Supabase (`confirmacao-cadastro`, `convite`, `redefinir-senha`) e o e-mail de consentimento de saúde passaram a ter cabeçalho **branco** com a logo colorida (antes ficava sobre azul-escuro e a logo, transparente, perdia contraste) e filete verde.
- ⚠️ Dono: o título "Confirm your email address" é o **assunto**, que fica num campo do painel (não no HTML). Em Supabase → Authentication → Email Templates, **colar o HTML novo e preencher "Subject"** em português em cada template (assuntos no topo de cada arquivo). Rever também, se ativos, os templates "Magic link", "Change email address" e "Reauthentication": ficam em inglês por padrão.

## 74. Clima: volume de chuva esperado para o dia

- ✅ O card de clima da tela inicial passa a mostrar, junto da probabilidade, **quanto deve chover no dia** ("chuva 96% · ~8 mm"; garoa fraca vira "< 1 mm"; abaixo de 0,1 mm não aparece). O dado vem do Open-Meteo (`precipitation_sum` do dia) na função `clima`; respostas antigas em cache (sem o campo) simplesmente não mostram o volume.
- ✅ O aviso diário do WhatsApp com a agenda também cita o volume quando o aviso de chuva (≥ 40%) aparece: "88% de chance de chuva hoje, cerca de 8,3 mm (23–27°C)".
- ⚠️ Dono: **deploy das funções `clima` e `daily-briefing`** (sem migration). Não testado ao vivo por mim: o card exige login.

## 75. E-mails: logo com fundo branco embutido (modo escuro)

- ✅ No modo escuro do Gmail/Outlook o cabeçalho branco era escurecido e a logo transparente ficava ilegível. Nova imagem `public/brand/logo-email-branco.png` (PNG opaco, fundo branco) em todos os e-mails, e `color-scheme: light only` nos templates e no e-mail de consentimento.
- ⚠️ Dono: **colar de novo os 3 templates** no Supabase (Email Templates) e **redeploy** de `enviar-consentimento-saude`. A imagem só passa a existir no ar depois do deploy do site (merge desta PR).

## 76. Funil de marketing no app (PostHog) + Política de Privacidade 1.7

- ✅ **Quatro eventos no app**, para ver onde o cadastro trava: `cadastro_aberto` (abriu o formulário), `cadastro_enviado` (enviou; ainda falta confirmar o e-mail), `perfil_concluido` ("Complete seu perfil", vale também para quem entra pelo Google) e `aluno_cadastrado` (ativação). Junto com os da landing (`cta_click` etc.) o funil vai da visita ao primeiro aluno. **Pagamento não é medido aqui**: já está no Financeiro do admin (livro de pagamentos).
- ✅ **A escolha de consentimento é a mesma da landing** (mesma origem, mesma chave `treino_cookie_consent`): quem aceitou na página inicial já chega "aceito"; a origem da campanha (UTM) que a landing registrou acompanha os eventos do app. Nada é carregado antes do aceite; o sinal GPC conta como recusa. Quem chega direto ao login vê o aviso (Recusar/Aceitar do mesmo peso, 44 px). **"Preferências de cookies"** em Configurações reabre o aviso e permite revogar (apaga o identificador do PostHog do aparelho).
- **Limites de privacidade (valem por desenho):** sem `identify` (nunca liga ao nome, e-mail ou CPF), sem gravação de sessão, sem autocaptura, sem pageview do app, sem cookies, nenhum evento leva dado de aluno ou de saúde. `posthog-js` entra como dependência e só é carregado (import dinâmico) depois do aceite.
- ✅ **Política de Privacidade 1.7** (seção 3 e item de PostHog na seção 4) descreve exatamente isso. `landingAnalytics.test.ts` agora também confere o app: falha se a política e o código divergirem (inclusive se um quinto evento aparecer sem a política citá-lo). **Migration `20261068000000_politica_privacidade_1_7.sql`** registra a versão (sem ela o cadastro novo é recusado).
- ⚠️ **Rodar a migration no SQL Editor ANTES do merge.** No painel do PostHog (dono): montar o funil (Product analytics → Funnels) com `cta_click` → `cadastro_aberto` → `cadastro_enviado` → `perfil_concluido` → `aluno_cadastrado`; conferir que Session replay está desligado; revisão do jurídico da seção 3 nova.
- Não testado ao vivo por mim: eventos chegando ao PostHog (evitei enviar dados de teste ao projeto de produção); testei o aviso a 390px, a recusa e a persistência, e que nada do PostHog é requisitado antes do aceite.

## 77. Marketing: posicionamento e plano inicial

- ✅ `docs/MKT-POSICIONAMENTO.md` (v1): meta de 100 pagantes com a conta do funil (hipóteses a validar no PostHog), público (autônomo primeiro; assessoria de corrida/natação/triathlon depois), dores, promessa e três pilares (preço, funcionalidade, confiança), objeções e respostas, canais por ordem de retorno e plano dos primeiros 30 dias.
- 📌 Conclusão principal: **R$ 300/mês de anúncio rende ~1–2 pagantes/mês**; os 100 pagantes dependem de prospecção direta no WhatsApp, Instagram orgânico, indicação e parcerias. A verba serve para impulsionar o conteúdo que já funcionou.
- ⏳ Do dono: prazo da meta, quantos personais já usam hoje, prints com dados fictícios, decisão sobre indicação (1 mês grátis?), quem grava os Reels, revisão do jurídico (frases comparativas).
- ⏳ Próximos documentos: calendário de conteúdo de 30 dias (roteiros de Reels) e mensagens de prospecção por WhatsApp.

## 78. Marketing: calendário de conteúdo, prospecção no WhatsApp e meta recalibrada

- ✅ `docs/MKT-POSICIONAMENTO.md` v2 com as respostas do dono: **100 pagantes em 3 meses**, partindo de base zero (2 testes parados) e uma pessoa só. Meta tratada como **esticada**: piso 25, provável 50, esticado 100, com marcos de cadastros (≈100 em 30 dias, ≈350 em 60, ≈670 em 75). Se no dia 30 houver menos de 60 cadastros, o cenário provável passa a 50.
- ✅ `docs/MKT-CALENDARIO-30-DIAS.md`: 12 Reels em 4 semanas (2 de dor para 1 de produto), regras (dados fictícios, sem concorrente pelo nome, sem prometer resultado, app não cobra o aluno), legendas-modelo, uso dos R$ 300 só a partir da semana 4 no Reels que melhor performar.
- ✅ `docs/MKT-WHATSAPP-PROSPECCAO.md`: regras anti-spam e LGPD, funil de conversa em 6 etapas com as mensagens, respostas às objeções e planilha de acompanhamento.
- ✅ Três prints com dados fictícios em `docs/marketing/prints/` (lista de alunos, editar aluno, revisão).
- ✅ **Indicação decidida:** 1 mês grátis para quem indica e para quem entra, liberado quando o indicado cadastra **mais de 2 alunos**.
- ⏳ **PR de indicação (migration):** código de indicação no cadastro + regra no banco que concede o mês ao indicado e ao indicador. A fazer na semana 3 do plano. Antes: o dono decide o teto por indicador (sugestão: 6 meses grátis).
- ⏳ Do dono: falar com os 2 testes parados, capturar telas fictícias de agenda, fatura/mensagem pronta, briefing e evolução, e montar o funil no PostHog.

## 79. Importar alunos por planilha (CSV)

- ✅ **Alunos → "Importar alunos de uma planilha"** (rota `/alunos/importar`). O personal baixa o **modelo CSV** (nome, telefone, e-mail, nascimento, sexo, objetivos; uma linha de exemplo fictícia), preenche e envia. **Só o nome é obrigatório.** Até **50 alunos por vez** e 200 KB por arquivo.
- ✅ **Só dados básicos.** Nada de saúde (lesão, cirurgia, medicamentos, altura: só com o consentimento do aluno, depois, na ficha), nem cobrança nem horários. O banco já barra dado clínico sem consentimento; a importação nem tenta gravar esses campos.
- ✅ **Revisão antes de gravar:** quantas linhas foram lidas, cada uma como **Pronto / Com aviso / Já existe / Com erro**. Erro = sem nome (fica de fora). Telefone, e-mail, nascimento ou sexo inválidos **não travam**: o campo entra vazio e a linha mostra o aviso. Objetivo que não está na lista do app entra como "Outros" com a observação. **Duplicado** = mesmo nome (sem acento/caixa) e mesmo telefone, contra a base **e** dentro da planilha; vem desmarcado, dá para marcar.
- ✅ **Gravação em uma chamada** (tudo ou nada) e **"Desfazer a importação"** na tela final (arquiva, manda para a lixeira e apaga de vez só os ids criados naquela hora; pede confirmação).
- ✅ **Leitura tolerante:** separador `;`, `,` ou tab; aspas; BOM; UTF-8 e Windows-1252 (Excel antigo); datas `dd/mm/aaaa`, `d/m/aa` e `aaaa-mm-dd`; cabeçalhos com sinônimos ("celular", "WhatsApp", "data de nascimento"…) e colunas desconhecidas ignoradas. Telefone sai com a máscara do app.
- **Medição:** dispara o evento `aluno_cadastrado` (ativação) uma vez por importação; **não criei evento novo** para não mudar a Política de Privacidade (os quatro eventos citados nela continuam os mesmos). Dá para contar importações como evento próprio depois, junto com uma versão 1.8 da Política.
- **Indicação:** alunos importados contam para o "mais de 2 alunos" (decisão do dono).
- ⚠️ Sem migration e sem deploy. **Não testado ao vivo por mim:** a tela exige login com captcha; testei as regras de leitura/validação (12 testes) e a tipagem, não o fluxo no celular. Validar: baixar o modelo, abrir no Excel/Planilhas, preencher, salvar como CSV, importar, conferir a revisão e testar "Desfazer".
- ✅ **Correção (26/10):** planilha exportada do Google Planilhas com **título na 1ª linha** ("modelo-alunos") dava "Não achei a coluna nome". Agora o cabeçalho é procurado nas 5 primeiras linhas, o separador é detectado olhando as primeiras 6 linhas e o número da linha mostrado é o da planilha; objetivo escrito pela metade ("Saúde") casa com o único objetivo que começa assim.
- ✅ **Correção (26/10, 2):** (1) o botão **"Importar N alunos"** ficava **escondido atrás da barra de navegação** de baixo (Hoje/Agenda/Alunos…); agora fica logo acima dela. (2) **Objetivos só da lista do app**: o que não está na lista (e o "Outros", que pede descrição) **não é gravado**; a revisão avisa "ficou de fora (escolha na ficha)". Antes virava "Outros" com o texto digitado na planilha, o que deixava texto livre entrar na base. Coluna `objetivo_notes` não é mais preenchida pela importação.
- ✅ **Porta de entrada (26/10):** o card "Primeiros passos" da tela Hoje ganhou o link "Tem uma planilha de alunos? Importe de uma vez" enquanto o primeiro aluno não foi cadastrado (ativação é o gargalo do funil).
- ✅ **Correção (26/10, 3):** o aviso "Entram só nome, telefone…" da tela de importação quebrava em duas colunas (o parágrafo era `flex` e o negrito virava item separado); agora é um bloco com o ícone ao lado e o texto num parágrafo só.
- ⏳ Fora desta versão: Excel (.xlsx), corrigir linha dentro do app (hoje: ignorar ou corrigir na planilha e reenviar), importar cobrança e horários.

## 80. Programa de indicação: 1 mês grátis para quem indica e para quem entra

- ✅ **Regra (decidida pelo dono):** o personal indica outro personal; quando o indicado cria a conta pelo link e **cadastra 3 ou mais alunos (nomes diferentes)**, **os dois ganham 1 mês grátis**. **Teto de 6 meses por indicador** (sugestão minha, ajustável em `treino.indicacao_teto()`); o indicado sempre ganha. Alunos importados por planilha contam.
- ✅ **No app:** Configurações → card **"Indique um personal e ganhem 1 mês grátis"** com o botão de WhatsApp (mensagem pronta), "Copiar link" e o placar (concluídas, em andamento, meses ganhos de 6). Quem foi indicado vê o progresso ("cadastre 3 alunos…"). O link é `…/login?ref=CÓDIGO&utm_source=indicacao&utm_medium=personal`; o código fica guardado no aparelho até a pessoa entrar e é registrado logo depois ("indicação registrada"). Quem indica **nunca vê** nome, e-mail ou CPF do indicado.
- ✅ **Como o mês é dado:** coluna `assinaturas.bonus_ate` = acréscimo **depois** do trial ou da assinatura vigente (não mexe em status, plano nem no webhook do Mercado Pago); `treino.assinatura_ativa()` vale também enquanto `now() < bonus_ate`. O cliente lê o veredito do servidor, então o modo leitura respeita o bônus.
- ✅ **Banco** (migration `20261069000000_indicacao.sql`): `codigo_indicacao` (todos os personais atuais ganham um), `indicacoes` (sem acesso direto do cliente), RPCs `registrar_indicacao` (conta com até 7 dias, uma vez, nunca o próprio código) e `minhas_indicacoes`, trigger que concede ao 3º aluno. Teste em `supabase/tests/indicacao.sql` (a)–(g).
- ✅ **Textos legais:** Termos **1.3** (nova cláusula 2.7, regras do programa) e Política **1.8** (código de indicação e a ligação entre as duas contas). A migration registra as duas versões (sem isso o cadastro novo é recusado). **Pedir revisão do jurídico** da cláusula 2.7. Risco de fraude e mitigação em `docs/SECURITY-AUDIT.md`.
- ⚠️ **Rodar a migration no SQL Editor ANTES do merge**, e depois o teste `supabase/tests/indicacao.sql` (esperado: "(a) OK" … "(g) OK").
- Limites conhecidos: se a pessoa abrir o e-mail de confirmação em **outro aparelho**, o código guardado se perde e a indicação não conta (o link da indicação precisa ser aberto no mesmo aparelho do cadastro). No painel admin, quem tem mês grátis aparece pela data de fim do trial/assinatura (não pelo bônus).
- ⏳ Aviso ao indicador quando o mês é concedido (notificação/WhatsApp), painel de indicações no admin e a documentação para a landing ("Indique e ganhe").
- Não testado ao vivo por mim (login com captcha): validar no celular com duas contas (a minha indicando uma nova).

## 81. Aviso no sino quando o mês grátis da indicação é concedido

- ✅ Quem foi **indicado** e quem **indicou** recebem um aviso no sino (e um toast em tempo real): "Você ganhou 1 mês grátis". Se o indicador já chegou ao teto de meses, o aviso diz isso com clareza ("Indicação concluída… você já chegou ao limite de 6 meses; quem entrou ganhou o dele"). O botão "Ver indicações" leva às Configurações. Nenhum aviso traz nome, e-mail ou CPF de ninguém.
- ✅ Banco (migration `20261070000000_aviso_indicacao_concedida.sql`): `notificacoes_professor.aluno_id` passa a ser opcional **só** para o tipo novo `indicacao_concedida` (os outros tipos continuam exigindo aluno); um aviso por pessoa por indicação; o trigger de concessão cria os avisos na mesma transação. Teste: `supabase/tests/indicacao.sql` ganhou o item (h).
- ⚠️ **Rodar a migration no SQL Editor ANTES do merge** (e o teste atualizado: esperado "(a) OK" … "(h) OK").

## 82. Admin: painel de indicações, mês grátis visível e revogação

- ✅ **Mês grátis visível:** na lista de Personais (tabela e cartões) a data de fim do acesso passa a ser a do bônus quando ele é o que sustenta o acesso, com a etiqueta "mês grátis". Quem tem mês grátis vigente **deixa de aparecer como inadimplente** e não entra nos contadores "trial expirando" e "inadimplentes" da Visão geral.
- ✅ **Aba "Indicações"**: totais (indicações, em andamento, concedidas, revogadas, meses grátis dados, com sinal de abuso), ranking de quem mais indica e as 50 mais recentes. **Sinais de abuso:** mesmo telefone nas duas contas, concedida em menos de 1 hora depois de criar a conta, 3+ concedidas em 24 horas por indicador. Só nomes de personais e números (nada de aluno, e-mail ou CPF).
- ✅ **Revogar indicação** (botão com confirmação): tira 30 dias de bônus do indicado e do indicador (se ele ganhou), marca como "revogada" (continua contando no teto) e grava no histórico de ações (aparece como "Indicação revogada"). Base: Termos 2.7 (fraude/abuso).
- ✅ Banco (migration `20261071000000_admin_indicacoes.sql`): `admin_bonus_personais()`, `admin_indicacoes()`, `admin_revogar_indicacao()` (todas exigem admin + MFA), status `revogada`. Teste: `supabase/tests/admin_indicacoes.sql` (a)–(e), que simula o token do MFA.
- ⚠️ **Rodar a migration no SQL Editor ANTES do merge**, e depois o teste (esperado "(a) OK" … "(e) OK"). Não testado ao vivo por mim: /admin exige MFA.

## 83. Landing: "Indique e ganhe"

- ✅ Sob os preços, uma linha discreta: "Indique um colega: quando ele cadastrar 3 alunos, vocês dois ganham 1 mês grátis. Como funciona" (o link abre a pergunta do FAQ, que começa fechada), e a pergunta nova **"Tem programa de indicação?"** no FAQ, com a regra e o link para os Termos de Uso.
- ✅ `src/features/legal/landingIndicacao.test.ts` falha se a landing e a cláusula 2.7 dos Termos divergirem (3 alunos, 1 mês, até 6 meses) ou se a landing prometer dinheiro/comissão.
- ⚠️ **Antes do merge: o jurídico deve rever a cláusula 2.7 dos Termos (já no ar desde a #192) e este texto da landing**, porque a landing é pública. Validado a 390px: o link abre o FAQ e não há rolagem horizontal. Sem migration e sem deploy do banco.

## 84. Indicação só para usuário novo (correção)

- 🐞 **Furo encontrado no teste do dono:** uma pessoa que **já tinha conta e alunos** registrou o código e, ao cadastrar mais um aluno, a regra "3 alunos" já estava cumprida: o mês grátis saiu para os dois.
- ✅ **Correção (migration `20261072000000_indicacao_so_usuario_novo.sql`):** (1) `registrar_indicacao` só aceita conta **sem nenhum aluno** (nem arquivado nem na lixeira) e criada há até 7 dias; senão devolve `nao_novo`; (2) o trigger de concessão só conta alunos **criados depois do registro** da indicação (com nomes diferentes, fora da lixeira). Teste `supabase/tests/indicacao.sql` ganhou (i) e (j).
- ✅ Para desfazer a concessão indevida do teste: aba **Indicações** do /admin → **Revogar** (tira 30 dias das duas pontas e grava no histórico).
- ⚠️ **Rodar a migration no SQL Editor ANTES do merge** e depois o teste (esperado "(a) OK" … "(j) OK"). A cláusula 2.7 dos Termos segue valendo (a regra nova é mais estreita que "até 7 dias"; o texto já falava em "cadastra 3 alunos").

## 85. Indicação só para conta criada DEPOIS do link

- 🐞 Mesmo depois do item 84, uma conta **já existente**, criada há poucos dias e sem alunos, ainda podia ser aceita (a regra era "conta com até 7 dias e sem alunos"), por exemplo se a pessoa abrisse o link e entrasse na própria conta.
- ✅ **Regra nova:** o app guarda o **momento em que o link foi aberto** (só se a pessoa NÃO está logada; quem já tem sessão não guarda nada) e manda ao servidor **quantos segundos** se passaram desde então (só o relógio do aparelho, não depende de ele estar certo). O servidor exige `created_at` da conta **depois** de "link aberto em" (tolerância de 1 minuto); link aberto há mais de 48 h expira; conta anterior ao link ou com algum aluno = `nao_novo` (o app avisa: "A indicação vale só para contas criadas depois de abrir o link"). Os 3 alunos continuam contando só depois do registro.
- ✅ Migration `20261073000000_indicacao_conta_criada_depois_do_link.sql`: **remove** a função antiga `registrar_indicacao(texto)` (um app antigo não consegue pular a regra) e cria a de 2 parâmetros. Testes: `supabase/tests/indicacao_conta_nova.sql` (a)–(f) e o `indicacao.sql` atualizado para a assinatura nova.
- **Limite conhecido:** como o aparelho informa os segundos, quem forja isso burla a regra, mas já estaria criando conta nova mesmo assim (custo: 30 dias, teto de 6 por indicador; o admin vê os sinais e pode revogar). O bloqueio forte contra conta existente continua no servidor (`created_at`).
- ⚠️ **Rodar a migration no SQL Editor ANTES do merge**, e depois os dois testes. A cláusula 2.7 dos Termos já fala em "cria a conta com o código": a regra nova é mais estreita que "até 7 dias" e não muda o texto.
- ⚠️ **Depois do deploy do app:** quem abriu um link ANTES deste deploy tem o código guardado no formato antigo e será ignorado (precisa abrir o link de novo).

## 86. Marketing: pacote da semana 1

- ✅ `docs/marketing/semana-1/CHECKLIST.md` (27 a 31/10/2026, dia a dia, com os marcos da semana), `reels.md` (3 roteiros cronometrados: "Aluno sumiu", "Esqueci de falar", "Agenda às 5h30", com falas, texto na tela e legendas) e `leads.csv` (planilha de acompanhamento).
- 📌 **Antes de divulgar:** o primeiro pagamento real no Mercado Pago ainda não foi confirmado (ver `docs/mp-producao-checklist.md`); é o item 1 do checklist.
- ⏳ Do dono: capturar duas telas com dados fictícios (fatura com mensagem pronta; evolução do aluno), gravar os Reels, falar com os 2 personais que testaram e montar o funil no PostHog.
- ⏳ Depois da semana: me mandar os números e as objeções para ajustar a mensagem e o calendário da semana 2.

## 87. Exclusão da própria conta (LGPD, art. 18, VI)

- ✅ **No app:** Configurações → "Excluir minha conta". A tela explica o que é apagado, o que fica guardado, o prazo e o plano pago; o botão **Confirmar exclusão** só habilita ao digitar **EXCLUIR** (o banco confere de novo). Mostra o **protocolo** (EXC-aaaa-XXXXXXXX) e a data prevista, e manda um **e-mail** com protocolo e prazo (Resend).
- ✅ **No ato:** a conta é bloqueada (modo leitura no banco e o app só abre a tela "Sua conta está em exclusão"), o WhatsApp é desligado e **todas as sessões são encerradas**. Até a data prevista (30 dias) o personal pode **cancelar** entrando no app (volta tudo, inclusive o WhatsApp). Conta de administrador não se exclui por aqui.
- ✅ **Em 30 dias** (job diário no pg_cron): apaga **de verdade** login, perfil, alunos, treinos, fichas, avaliações, agenda, faturas dos alunos, consentimentos e aceites. **Fica só** o livro dos pagamentos do plano ao Treino PP (valor, data, plano, id do pagamento) por 5 anos, **sem nome, CPF ou e-mail** (`titular_anonimo`), a solicitação (protocolo/datas, sem dado pessoal) e o log do admin sem vínculo e sem `detalhes`.
- **Diferenças em relação ao rascunho recebido (decisões que o jurídico deve confirmar):** (1) a tabela de personais é `treino.professionals`; (2) os **alunos são apagados, não anonimizados** (o personal é o controlador; o app é operador, não há por que guardar); (3) **só o livro de pagamentos do plano é retido**: as faturas que o personal emite aos alunos são dele e vão embora, e o **registro de consentimento do aluno também é apagado** com a conta (a Política antiga dizia guardar; a 1.9 passou a dizer o contrário); (4) **logs de auditoria: 6 meses** (Política 5.1, Marco Civil), não 5 anos; (5) a carência de 30 dias tem **cancelamento** (usa o status `cancelled`); (6) o job é SQL (pg_cron), sem Edge Function agendada.
- ✅ **Textos legais:** Termos **1.4** (cláusula 2.8) e Política **1.9** (5.1 e 6). Teste `src/features/legal/exclusaoConta.test.ts` falha se tela, banco e textos divergirem (30 dias, EXCLUIR, retenção, versões).
- ✅ **Também:** `indicacoes.indicado_id` e `pagamentos_assinatura.professional_id` viraram opcionais (`ON DELETE SET NULL`) e o painel de indicações aceita "Conta excluída".
- ⚠️ **Ordem para o dono:** (1) rodar a migration `20261074000000_exclusao_de_conta.sql` ANTES do merge; (2) rodar o teste `supabase/tests/exclusao_de_conta.sql` (esperado "(a) OK" … "(h) OK"); (3) deploy da função `npx supabase functions deploy excluir-conta --project-ref avgrnvpvjhymsrnapfgu`; (4) **agendar o job** uma vez: `supabase/cron/exclusao_de_conta.sql`; (5) jurídico revisar Termos 2.8, Política 5.1/6 e a citação do CTN (arts. 174 e 195). Sem o job agendado nada é apagado depois dos 30 dias.
- ⏳ Fora desta versão: **exportar os dados antes de excluir** (portabilidade, art. 18, V), aviso ao admin dos pedidos pendentes, e e-mail de "exclusão concluída". Não testado ao vivo por mim: exige conta autenticada; o fluxo foi coberto pelo teste SQL e pelos testes de regras.

## 88. Exportar alunos em CSV (portabilidade)

- ✅ **Alunos → "Exportar alunos (CSV)"** (link discreto abaixo de "Importar…") e, na tela **Excluir minha conta**, um botão "Antes de excluir" para levar uma cópia. Baixa os alunos **ativos e arquivados** (fora da lixeira) em `alunos-aaaa-mm-dd.csv`, com `;` e acentos certos no Excel.
- ✅ **Mesmas colunas do modelo da importação** (nome, telefone, e-mail, nascimento dd/mm/aaaa, sexo, objetivos com `|`) mais `situacao` (ativo/arquivado, ignorada na importação): o arquivo volta pela importação (há teste de ida e volta).
- ✅ **Só dados básicos; nada de saúde** (lesão, cirurgia, medicamentos, altura): o CSV é um arquivo solto no aparelho, sem a proteção do app. Texto na tela e no aviso depois do download. **Proteção contra fórmula de planilha**: nome que começa com `=`, `+`, `-` ou `@` ganha um apóstrofo na frente (senão o Excel executaria ao abrir).
- ⏳ **Não coberto:** cópia **completa** (treinos, fichas, avaliações, faturas, dados de saúde) para o art. 18, V: hoje o titular pede ao Encarregado (contato@personalperto.com.br). Se quiser no app, precisa de decisão sobre onde o arquivo sai (e-mail com link expirável, por exemplo).
- Sem migration e sem deploy. Não testado ao vivo (login com captcha): validar no celular baixar o CSV, abrir no Excel/Planilhas e importar de volta.

## 89. Termos de Uso 1.5 (importação, exportação e dois alinhamentos)

- ✅ **3.5** importação de alunos por planilha (base legal, só dados básicos, sem saúde, sem lista de terceiros, limite de 50, o app lê o arquivo no aparelho e não o guarda, dá para desfazer); **3.6** exportação (arquivo sem saúde, responsabilidade do personal, art. 46); **2.5** fim do período = **modo de consulta** (antes dizia "acesso suspenso", o que o app não faz); **3.2** prova de aceite do aluno eliminada com a conta (alinha com a Política 1.9).
- ✅ Teste `termosImportacao.test.ts` (o limite de 50 e as promessas dos Termos batem com o código) e `versoesRegistradas.test.ts` (**falha se a versão atual dos Termos ou da Política não estiver registrada em alguma migration**: sem a linha, o cadastro novo é recusado).
- 📄 `docs/TERMOS-SUGESTOES.md`: sugestões **não aplicadas** com texto proposto (mensagens aos alunos, link do treino à distância, pagamentos personal↔aluno, uso aceitável e suspensão, lixeira, suporte) e pontos para o jurídico (Beta, limite de responsabilidade, **re-aceite de versão nova por quem já tem conta**, citação do CTN).
- ⚠️ **Rodar a migration `20261075000000_termos_1_5.sql` ANTES do merge** (registra a versão 1.5; sem ela o cadastro novo é recusado) e **mandar o texto para o jurídico antes de mergear**. Sem teste SQL (é só um INSERT).

## 90. Termos de Uso 1.6 (sugestões A a F do jurídico)

- ✅ Aprovado pelo jurídico (28/10/2026): **1.4** a plataforma não recebe, não intermedeia e não repassa valores entre personal e aluno (igual ao que a landing já diz); **2.9** uso aceitável e suspensão (conta falsa, burlar limites, mensagem indesejada; aviso ao usuário, e saída pela exportação da 3.6); **3.7** mensagens aos alunos (o personal decide o envio e responde pela autorização; sem dado de saúde); **3.8** link do treino à distância (sem senha, validade de 24 horas a 30 dias, enviar só ao próprio aluno); **3.9** lixeira de 30 dias; **9** suporte: Central de ajuda, botão "Reportar um problema" e contato@personalperto.com.br.
- ✅ Testes (`termosImportacao.test.ts`) ligam as promessas ao código: validade do link (`VALIDADES_HORAS`, `VALIDADE_MAXIMA_HORAS`), lixeira (`LIXEIRA_DIAS`) e o texto do botão de suporte. `versoesRegistradas.test.ts` exige a migration da versão.
- 📌 **Sem re-aceite por enquanto** (decisão do dono: a base de hoje é de testes). Reabrir antes de ter clientes reais: quem já tem conta não é chamado a aceitar versões novas; só quem se cadastra aceita a vigente.
- ⏳ Ainda sem texto: "fase Beta" (1.3) e o limite de responsabilidade (6.2), que o jurídico avalia. `docs/TERMOS-SUGESTOES.md` fica como histórico (A a F já aplicadas).
- ⚠️ **Rodar a migration `20261076000000_termos_1_6.sql` ANTES do merge** (registra a versão 1.6; sem ela o cadastro novo é recusado).

## 91. Importar alunos com ajuda de uma IA (prompt + colar texto) e Termos 1.7

- ✅ Na tela de importação: **"Seus alunos estão bagunçados? Use uma IA"**: botão **Copiar prompt para IA** + 3 passos + **aviso de privacidade** (dados pessoais vão a um serviço de terceiros; só nome, telefone, e-mail, nascimento, sexo e objetivos; nunca saúde, CPF ou senhas; chat temporário; o personal responde, Termos 3.5) e uma caixa **"Cole aqui a resposta da IA"** que entra na mesma revisão do arquivo (sem precisar salvar como CSV).
- ✅ **O prompt vem do código** (`promptIA.ts`): cabeçalho, limite de 50 e lista de objetivos são os da importação (se mudarem, o prompt muda junto; "Outros" fica de fora). Manda a IA **nunca inventar**, deixar vazio o que não souber, não deduzir sexo pelo nome e ignorar saúde, CPF, endereço, senha e mensalidade. **O exemplo do prompt é lido pela própria importação nos testes.** O texto colado perde o bloco de código (```csv) que a IA costuma devolver.
- ✅ **Termos 1.7** (aprovado pelo jurídico): a 3.5 diz que quem usa IA ou outro serviço de terceiros para preparar a planilha responde por esse envio. Teste liga o texto à tela.
- ⚠️ **Rodar a migration `20261077000000_termos_1_7.sql` ANTES do merge** (registra a versão; sem ela o cadastro novo é recusado). Sem deploy. Não testado ao vivo (login com captcha): validar no celular copiar o prompt, colar numa IA com uma lista fictícia, colar a resposta e conferir a revisão.
- ✅ **Teste real com uma IA (28/10/2026):** a resposta à lista bagunçada de teste saiu muito boa (8 alunos, **sem inventar nada, sem saúde, CPF nem mensalidade**, repetida descartada, telefone sem DDD e e-mail quebrado deixados vazios) e a importação a leu sem erro nem aviso (`respostaIA.test.ts`, com a resposta real). Dois acertos no prompt: **nome só da pessoa**, com maiúsculas e sem apelido/descrição entre parênteses (a IA deixou "Fernanda (a loira da academia)"), e **sexo preenchido quando a lista diz explicitamente** (feminino, mulher, masculino, homem), nunca deduzido pelo nome.
- ✅ **2ª rodada com a IA (28/10/2026):** nomes e sexo ficaram certos ("João Pedro", "Fernanda", "Paulo"), mas a IA **perdeu a data "15/11/89"** (achou o ano de 2 dígitos "incompleto") e **os objetivos "emagrecer e ganhar massa"** (não são os nomes exatos do app). Prompt ajustado: ano com 2 dígitos pode ir como está (o app completa) e a data só fica vazia se faltar dia/mês ou houver só a idade; e entram **equivalências explícitas** (emagrecer = Perder peso, ganhar massa = Hipertrofia, alongamento = Mobilidade/flexibilidade…), "e só elas", sem a IA adivinhar. Um teste garante que toda equivalência aponta para um objetivo que existe no app.
- ✅ **3ª rodada com a IA (28/10/2026):** Carla (objetivos) e Ana (nascimento `15/11/89` → 1989) voltaram inteiras; nomes limpos; sem saúde, CPF nem mensalidade; a importação lê os 8 sem erro nem aviso e tolera a célula a mais no fim da última linha. Sobrou o **sexo da Fernanda vazio** (a lista dizia "mulher"): o prompt ganhou um **exemplo de entrada e saída** ("Fernanda, mulher… → F"), cuja saída o teste lê pela importação.
- 🐞→✅ **4ª rodada, lista de 60 alunos (28/10/2026):** a IA devolveu **52 linhas** (o prompt pedia no máximo 50) e a importação **recusava tudo** ("limite é 50"), travando o personal. **Agora a importação lê os 50 primeiros e guarda o resto**: na revisão avisa ("Sua lista tem 52 alunos; esta importação traz os 50 primeiros"), e na tela final aparece **"Importar os N restantes"**, que reabre a revisão com o texto que sobrou (já com cabeçalho). O limite de 50 por importação continua (Termos 3.5). A tela também orienta **mandar de 20 a 30 alunos por vez** (a IA erra mais em lista longa).
- ⚠️ **Limite da IA em lista longa (aceito, aparece na revisão do personal):** das 52 linhas, a IA **perdeu o nascimento do Samuel (27/03/1989) e da Michele (29/12/1991) e o sexo da Michele ("mulher")**; todo o resto saiu certo (nada de saúde, CPF nem mensalidade; objetivos pelas equivalências; telefones sem DDD e e-mails quebrados vazios; Carla repetida e `=SOMA` descartados). A revisão do app não consegue saber o que a IA omitiu: por isso a orientação de lotes menores.
- ✅ **5ª rodada, outra IA, mesma lista de 60 (28/10/2026):** **respeitou o limite** (49 linhas) e **avisou dos 10 que ficaram de fora** (o que o prompt pede) e acertou os nascimentos do Samuel e da Michele e o sexo dela. Erros: **copiou o telefone da Fernanda para a Ana** (contaminação entre alunos), **"consertou" o e-mail quebrado da Ana** (o prompt manda deixar vazio) e **pôs o "F" da Fernanda na coluna objetivos**. Respostas: (1) o **app agora avisa telefone repetido entre alunos diferentes** (na lista e contra quem já está cadastrado; só aviso, nunca erro, porque pai e filho podem dividir o número): é a defesa que não depende da IA; (2) o **prompt ganhou três regras**: dado de um aluno nunca vai para outro, não consertar telefone/e-mail/data com erro, e cada coluna só recebe o seu tipo de valor. A "Fernanda" com "F" em objetivos já saía como aviso ("Objetivo F não está na lista") e sexo vazio para o personal completar.
- ✅ **6ª e 7ª rodadas, Gemini e ChatGPT com o prompt apertado (28/10/2026):** os três erros da 5ª rodada **sumiram nas duas** (nenhum telefone trocado entre alunos, nenhum e-mail "consertado", "F" na coluna certa). **Gemini:** 49 linhas, **avisou dos 10 que ficaram de fora**, acertou o nascimento do Samuel e da Michele; manteve a linha lixo "SOMA(A1:A2) Teste" e largou o fixo da Marlene. **ChatGPT:** sem a linha lixo e com o fixo da Marlene, mas **largou o nascimento do Samuel**. A importação ganhou o **aviso de "nome com número ou símbolo (parece sobra de planilha)"**, que pega a linha lixo e também apelidos entre parênteses; omissão de dado pela IA continua sem rastro (por isso a orientação de lotes de 20 a 30).
- ⏳ Ideia futura: aceitar o CSV de contatos do Google (colunas "First Name", "Phone 1 - Value").

## 92. "Traga seus alunos": landing e onboarding (estratégia de ativação)

- 🎯 **Ideia-mãe:** "Traga seus alunos em minutos", resposta direta à objeção "dá trabalho migrar". **Promessa exata:** não temos IA própria; damos o **modelo de planilha** e o **prompt pronto** para a IA que o personal já usa (ChatGPT, Gemini, Claude) e ele **confere antes de gravar**. Nada de "importação automática com IA" (um teste da landing falha se esse texto aparecer).
- ✅ **Landing (esta PR):** seção nova **"Já tem seus alunos em algum lugar? Traga em minutos."** logo depois de "O que você usa hoje × o Treino", com 3 caminhos (planilha com **modelo para baixar** em `/modelo-alunos.csv`, "está tudo bagunçado" com as IAs citadas, e "um por um") e uma **ilustração da revisão com dados fictícios** em HTML; linha de apoio no hero; **Passo 1 vira "Traga seus alunos"**; pergunta nova no FAQ com o **cuidado de privacidade** (só dados básicos; nunca saúde, CPF ou senha; chat temporário; a IA pode errar). Os links internos do FAQ abrem a pergunta.
- 🔧 **Detalhe técnico:** o CSS da landing é Tailwind **compilado e embutido** no HTML (sem varredura automática); ao mudar classes é preciso **regenerar** o bloco `<style id="tailwind">` (procedimento no comentário do próprio arquivo). Feito aqui; nenhuma classe antiga sumiu.
- ✅ `landingImportacao.test.ts`: a landing diz o mesmo que o app e os Termos (limite de 50, só dados básicos, aviso de terceiros), usa só dados fictícios, não promete "importação automática" nem "IA do Treino", e o modelo estático é **idêntico** ao que o app baixa.
- ✅ Marketing: Reels 4 ("Traga seus alunos em 2 minutos"), linha na prospecção do WhatsApp e a objeção "dá trabalho migrar" atualizada.
- ⚠️ **Jurídico deve rever o texto da landing e a citação do ChatGPT, Gemini e Claude antes do merge (a landing é pública).** Sem migration e sem deploy de função. Depois do deploy do site: abrir `/modelo-alunos.csv` e conferir a seção a 390px.
- ⏳ **PR 2 (app):** "Primeiros passos" com a linha "Traga vários alunos de uma vez", estado vazio da tela de Alunos com 3 botões, tela de importação com dois cartões (planilha | IA) e próximo passo depois de importar.

## 93. Onboarding no app: "Traga seus alunos" (estratégia de ativação, parte do app)

- ✅ **"Primeiros passos" (tela Hoje):** sob "Cadastre seu primeiro aluno" entra uma linha própria, de destaque: **"Ou traga vários de uma vez (planilha ou ajuda de uma IA)"** (levava um link sublinhado no fim do cartão). Some quando o primeiro aluno é cadastrado.
- ✅ **Tela de Alunos vazia:** em vez de "toque no +", o cartão **"Traga seus alunos"** com 3 caminhos: **Tenho uma planilha**, **Minha lista está bagunçada** (abre direto no caminho da IA: `/alunos/importar?via=ia`) e **Cadastrar um aluno**. Em modo leitura (assinatura vencida) os botões abrem os planos, como o "+" já fazia.
- ✅ **Tela de importação:** **duas abas** no topo ("Tenho uma planilha" | "Está tudo bagunçado, com ajuda de uma IA") em vez de uma página longa com a IA lá embaixo; abre na aba certa conforme a entrada (`?via=ia`).
- ✅ **Depois de importar:** cartão **"Agora, o que falta"** (valor da cobrança e horários ficam na ficha; link para montar um treino planejado) e botão "Ver meus alunos e completar as fichas".
- 📊 **Medição sem evento novo:** a importação já dispara `aluno_cadastrado`; a métrica é o funil existente (`perfil_concluido` → `aluno_cadastrado`). Evento novo exigiria Política nova.
- ⚠️ Sem migration e sem deploy de função. **Não testado ao vivo por mim** (login com captcha): validar no celular com conta nova sem alunos: card "Primeiros passos", estado vazio, as duas abas e o "Agora, o que falta".

## 94. Excluir a conta sem o banner de trial

- 🐞 Visto no uso real (28/10/2026): depois de pedir a exclusão, a tela "Pedido registrado" ainda mostrava o banner **"Você tem 14 dias de trial… Assinar agora"** no topo (e a barra de navegação de baixo): contraditório logo depois de a pessoa pedir para sair.
- ✅ A rota `/configuracoes/excluir-conta` entra no **modo foco** (sem navegação global nem avisos do topo). A lista de rotas do modo foco saiu do `RequireAuth` para `modoFoco.ts`, com teste.
- ✅ **Validado ao vivo pelo dono:** o e-mail de exclusão chegou (duas contas de teste, protocolos `EXC-2026-X3RW6DT6` e `EXC-2026-B62GA8S4`), a tela "Sua conta está em exclusão" abre com a data (27/11/2026) e o protocolo, e a solicitação aparece como `pending` no banco, sem erro. Falta só testar o **cancelamento** e a **exclusão forçada** em conta de teste.

## 95. Importação: o caminho da IA vem primeiro

- ✅ Pedido do dono depois de validar o onboarding: na tela **Importar alunos** a aba **"Está tudo bagunçado, com ajuda de uma IA"** passa a ser a **primeira e a padrão** (antes abria em "Tenho uma planilha"). O estado vazio da tela de Alunos e o cartão de Primeiros passos seguem a mesma ordem (IA primeiro). Quem clica em "Tenho uma planilha" cai direto no caminho da planilha (`?via=planilha`).
- ✅ `via.ts` com teste: só `?via=planilha` abre a planilha; sem parâmetro ou valor estranho abre a IA.
- Sem migration e sem deploy. Não testado ao vivo por mim (login com captcha): abrir Alunos → Importar alunos e conferir a ordem das abas e o padrão.


## 96. UX do primeiro uso (1/2): Hoje com foco na ativação, banner de teste e adicionar alunos

- 🎯 **Origem:** auditoria de UX feita por ChatGPT e Gemini sobre 6 telas de conta nova (28/10/2026). Os pontos conferidos no código e aceitos pelo dono; os que contradiziam o produto foram **rejeitados** (renomear Financeiro para "Cobranças", "cobrança automática por WhatsApp", "importar do WhatsApp": o app não cobra o aluno nem integra com o WhatsApp).
- ✅ **Tela Hoje com foco único** (wireframe do ChatGPT): enquanto o personal tem **menos de 3 alunos**, aparece só o cartão **"Vamos organizar seus alunos?"** com progresso (0 de 3 cadastrados), o botão **"Adicionar meus alunos"**, os três caminhos (**IA primeiro**, planilha, cadastrar um) e **"Sua rotina"** (Agenda e Treinos planejados). Ficam escondidos até lá: checklist de 4 itens, aviso do Pix e os 3 contadores zerados. **"Agora não"** dispensa o cartão (para quem tem 1 ou 2 alunos de verdade).
- ✅ **Depois dos 3 alunos:** volta o checklist, agora **"Comece por aqui"** e **"N de 4 etapas concluídas"** (antes "4 de 4 pra completar" lia-se como tudo concluído), com **alunos primeiro e Pix por último**; "Ótimo! Agora marque sua primeira aula." quando ainda não há aula; e uma linha **"Indique um personal"** na Hoje.
- ✅ **Banner de teste:** linha compacta **"Teste grátis: N dias restantes ›"** só na tela Hoje (toca e abre os planos); nas outras telas **não aparece** até os **últimos 5 dias**, quando volta o banner completo com "Assinar agora" em qualquer tela. A condição comercial segue em Configurações → Assinatura.
- ✅ **Aviso "Instale o app"** só depois do primeiro aluno e com o benefício dito ("abre mais rápido e fica a um toque").
- ✅ **Tela "Adicionar alunos"** (era "Importar alunos"): abas **"Colar lista com ajuda de IA"** (primeira) e **"Importar planilha"**, mais **"Cadastrar individualmente"** como terceiro caminho. Indicação: **"Indique um personal: vocês dois ganham 1 mês grátis"** (a concordância estava errada).
- 📊 **Medição sem evento novo:** o tempo até o 3º aluno sai do funil atual (`aluno_cadastrado` repetido). Os eventos novos sugeridos pelo ChatGPT exigiriam nova Política de Privacidade.
- ⚠️ Sem migration e sem deploy de função. **Não testado ao vivo por mim** (login com captcha): validar com conta sem alunos (cartão, "Agora não", progresso 1 e 2 de 3, banner compacto) e com conta com 3 alunos.

## 97. UX do primeiro uso (2/2): estados vazios iguais, navegação e acabamentos

- 🎯 Segunda metade da auditoria de UX (ChatGPT e Gemini, 28/10/2026). O dono decidiu **tratar todos os estados vazios do mesmo jeito**.
- ✅ **Componente `EstadoVazio`** (ícone, título que diz o que fazer, uma frase e UM botão), usado em: **Treinos planejados** ("Monte seu primeiro treino planejado" + "Criar treino planejado"), **Agenda** (conta sem alunos: "Sua agenda começa aqui" + "Adicionar meus alunos"; com alunos: "Nenhuma aula neste dia" + "Marcar aula") e **Financeiro** (sem alunos: "Organize suas cobranças"; com alunos mas sem cobrança: "Defina a cobrança dos seus alunos"). O texto solto "Nenhum aluno aqui." sumiu (agora só aparece "Nenhum aluno neste filtro." quando é o caso) e o gráfico vazio vira uma frase ("os valores e o gráfico aparecem conforme suas cobranças forem registradas"). Financeiro **não** promete que o app processa pagamento: só organiza e prepara a mensagem.
- ✅ **Barra inferior:** **"Meus treinos" virou "Treinos"** (vocabulário fixo) e a ordem ficou **Hoje · Agenda · Alunos · Treinos · Financeiro** (proposta do ChatGPT; ele recomendou medir o acesso antes de trocar Treinos e Financeiro de lugar, mas a base de hoje é de testes: reavaliar com uso real). Teste trava rótulos e ordem.
- ✅ **Alvos de toque da Agenda de 36 para 44 px** (setas, abas Dia/Semana e "Hoje"): violavam a regra do projeto. Teste trava a volta.
- ✅ **Configurações:** grupo **"Privacidade e conta"** (Consentimentos de saúde dos alunos (LGPD), Preferências de cookies, Excluir minha conta) separado do "Indique…" e da Central de ajuda; "Sair" por último; o rótulo jurídico "Consentimentos LGPD" ganhou a finalidade.
- ❌ **Não feito de propósito:** faixa de dias deslizante na Agenda (esforço médio), "Usar um modelo" em Treinos (não há biblioteca de modelos nessa tela; os modelos prontos só existem ao montar o treino de um aluno), "Cobranças" no lugar de Financeiro e "cobrança automática" (contradizem o produto), eventos novos de funil (exigiriam Política nova).
- ⚠️ Sem migration e sem deploy. **Não testado ao vivo por mim** (login com captcha): validar com conta sem alunos as telas Agenda, Treinos e Financeiro vazias, a barra inferior, as setas da Agenda e Configurações.

## 98. UX: "Usar um modelo pronto" em Treinos e faixa de dias na Agenda

- 🔁 **Correção do item 97:** eu havia dito que **não existia biblioteca de modelos** na tela de Treinos planejados. **Existe**: a folha "Novo treino planejado" já tem "Começar de um modelo" (modelos prontos do sistema para musculação, corrida, ciclismo e brick). O que faltava era um **atalho no estado vazio**.
- ✅ **Treinos planejados vazio:** dois botões, **"Criar do zero"** e **"Usar um modelo pronto"** (abre a folha de criação já com o seletor de modelos aberto; um sinal de uso único evita reabrir o seletor nas criações seguintes, já que a folha desmonta o conteúdo ao fechar). `EstadoVazio` ganhou o botão secundário.
- ✅ **Agenda, visão Dia: faixa dos 7 dias da semana** (Seg a Dom) acima do dia aberto: o dia escolhido em destaque, **hoje** marcado, **ponto nos dias com aula**; toque escolhe o dia e **arrastar para o lado troca de semana**; alvos de 56 px de altura; rótulo de leitor de tela ("Quarta, 28 de outubro: 2 aulas (hoje)"). Usa a mesma consulta da visão Semana (cache compartilhado). As setas "‹ ›" continuam andando de dia em dia.
- ✅ Testes: `faixaDeDias.test.ts` (semana de segunda a domingo, hoje/selecionado/contagem, rótulo e direção do deslize).
- ⚠️ Sem migration e sem deploy. **Não testado ao vivo por mim** (login com captcha): validar o atalho do estado vazio (e que o "+" não reabre o seletor) e a faixa na Agenda, inclusive o deslize no celular.

## 99. "Usar um modelo pronto" com todas as modalidades

- 🐞 Visto no uso real (28/10/2026): o atalho "Usar um modelo pronto" (item 98) só mostrava os modelos de **musculação**, porque a criação começa nessa modalidade e o seletor ficava preso a ela.
- ✅ No atalho, o seletor ganha **abas de modalidade** (**Musculação, Corrida, Ciclismo e Brick**: as habilitadas no app que têm modelo do sistema). Ao escolher um modelo de outra modalidade, o formulário **troca a modalidade sozinho** e carrega os blocos do modelo. Pelo botão normal "Começar de um modelo" (dentro da criação), o seletor segue mostrando só a modalidade do formulário.
- ℹ️ **Natação fica fora do atalho:** (correção no item 100: esta afirmação estava errada.)
- ✅ Teste `atalhoDeModelo.test.ts`: as abas são só as modalidades habilitadas com modelo do sistema, na ordem do catálogo.
- ⚠️ Sem migration e sem deploy. **Não testado ao vivo por mim** (login com captcha): abrir Treinos planejados vazio → "Usar um modelo pronto" → trocar de aba (Corrida/Ciclismo/Brick) → "Usar este modelo" e conferir que a criação abre na modalidade certa com os blocos.

## 100. Modelos de natação no atalho "Usar um modelo pronto"

- 🐞 Visto no uso real (28/10/2026): faltavam os modelos de natação nas abas do atalho. O item 99 dizia que eles eram só de exercícios; na verdade são **treinos completos** (10 modelos: piscina/mar × iniciante/intermediário/avançado) em `treino.templates_treino`.
- ✅ Nova aba **Natação** no atalho (depois de Musculação). O cartão mostra nível · ambiente · nº de exercícios. Ao escolher, o formulário muda para natação e carrega ambiente e exercícios do modelo (ids novos; pede confirmação se já havia exercícios na mesma modalidade).
- ✅ O botão "Começar de um modelo" dentro do formulário de natação continua como antes (não duplica o botão do formulário).
- ✅ Testes em `atalhoDeModelo.test.ts` (abas incluem natação; conversão modelo → dados do formulário).
- ⚠️ Sem migration e sem deploy. **Não testado ao vivo por mim** (login com captcha): Treinos planejados vazio → "Usar um modelo pronto" → aba Natação → "Usar este modelo" e conferir ambiente e exercícios.

## 101. Auditoria de UX com conta em uso (ChatGPT + Gemini) · PR 1: Hoje com a próxima aula em foco

- 📋 Segunda rodada de auditoria (conta com 32 alunos). Plano em 6 PRs: **1 Hoje**, 2 Financeiro ("Ação necessária" e R$ 0,00 escondido), 3 Alunos (fila "sem treino" por faixas 8–14/15–30/30+, ordenação, sem "lesão" na lista), 4 Agenda (semana com toque no dia, nomes sem ambiguidade, horário compartilhado), 5 Treinos planejados (busca, filtro por modalidade, rascunho vazio), 6 Sino (agrupar e marcar como lidas).
- ✅ **PR 1, Hoje:** card **Próxima aula** no topo (horário, alunos, "Lugar · Bairro", Começar). O destaque avança sozinho: aula em andamento fica em foco até terminar; ao ser realizada/cancelada passa para a próxima; aula que passou do horário sem registro aparece como **Atrasada** (texto + ícone, não só cor) e só vira destaque se não sobrar nenhuma por vir. Outras aulas no mesmo horário viram "+ N aulas neste horário" (aviso neutro: pode ser dupla ou grupo, não é conflito).
- ✅ "Próximas aulas" em lista compacta com o link **Ver agenda**; realizadas e canceladas ao fim, esmaecidas. Sem aula pendente: "Sem mais aulas por fazer hoje".
- ✅ Clima em formato compacto (temperatura, chuva com mm, UV, vento e dica); Pix (já recolhido), Atividade recente (3 itens + "Ver todas") e Indique um personal ficam abaixo das aulas; o aviso de ciclos para fechar também desce.
- ✅ Endereço enxuto nos cartões da Hoje; o **endereço completo** aparece ao abrir a aula (menu da aula) e continua inteiro na Agenda.
- ℹ️ **Fora do escopo (ideia de produto):** estado "Confirmada / A confirmar" da aula. Hoje a aula só tem `agendada/realizada/cancelada`; confirmar exigiria campo novo, migration e fluxo do aluno.
- ✅ Testes `proximaAula.test.ts` (destaque, atrasada, mesmo horário, ordem, local curto). Sem migration e sem deploy. **Não testado ao vivo por mim** (login com captcha): validar a 390px com aulas passadas, em andamento e futuras no mesmo dia.

## 102. Auditoria de UX com conta em uso · PR 2: Financeiro mostra o que exige ação

- (Segue o plano das 6 PRs descrito no item 101.)
- ✅ Bloco **Ação necessária** logo abaixo dos três totais: "N faturas em atraso · R$ X" e "N ciclos encerrados para fechar", cada um com botão que abre a lista já filtrada (Em atraso / A fechar). Se não há nada a fazer, o bloco some.
- ✅ **R$ 0,00 fora da lista por padrão:** ciclo em aberto sem aula (aluno "por aula" sem aula no ciclo) fica atrás do botão **Mostrar sem valor (N)**. Conferido na regra de ciclo: esses registros são legítimos (ciclo ainda vazio), não erro de geração, por isso ficam acessíveis em vez de sumir. Ciclo **já encerrado** continua visível mesmo zerado (falta fechá-lo); mensal nunca é "sem valor".
- ✅ Ordem da lista: **em atraso**, depois **ciclos encerrados**, depois o resto. Cada linha mostra nome e **valor em destaque**, com modelo, nº de aulas e data de fechamento na linha de baixo; o status segue em texto (A fechar, Ciclo encerrado, Enviada, Paga, Em atraso), nunca só cor.
- ✅ Gráfico de 6 meses mais baixo quando há valor em até 2 meses.
- ✅ Testes `listaFinanceiro.test.ts` (sem valor, prioridade, ação necessária). Sem migration e sem deploy. **Não testado ao vivo por mim** (login com captcha): conferir a 390px a conta com faturas em atraso, ciclos encerrados e alunos "por aula" sem aula.

## 103. Auditoria de UX com conta em uso · PR 3: Alunos com fila "sem treino", ordenação e lista sem dado de saúde

- (Segue o plano das 6 PRs do item 101.)
- ✅ **O "28" virou fila:** tocar no card "Sem treino há +7 dias" filtra a lista; abaixo da busca há filtros com contador (**Sem treino +7 dias, 8–14, 15–30, mais de 30 dias e Nunca treinou**; faixa sem aluno não aparece). Ao filtrar, quem está há mais tempo sem treinar vem primeiro. "Nunca treinou" separa quem acabou de entrar (ou foi importado) de quem sumiu: era a maior parte do número em contas com muitos alunos novos.
- ✅ O corte é "mais de 7 dias" (8 ou mais), igual ao texto do card; o contador do card e a lista saem da mesma conta, então nunca divergem.
- ✅ **Ordenar por:** Nome (A–Z, padrão), Mais tempo sem treino ou Cobrança pendente primeiro (fatura em atraso ou ciclo encerrado, o mesmo critério do "Ação necessária" do Financeiro).
- 🔒 **LGPD:** a indicação "lesão" saiu do cartão da lista de alunos; continua só na ficha, onde há consentimento. (Objetivo e idade seguem na lista.)
- ✅ **Ficha do aluno:** o cartão de consentimento LGPD com o botão **Revogar** desceu para o fim da página, junto de Arquivar, longe das ações de uso diário. A confirmação que explica o que será apagado já existia e foi mantida.
- ✅ Testes `filaAlunos.test.ts` (dias, limites das faixas, contadores, ordenação). Sem migration e sem deploy. **Não testado ao vivo por mim** (login com captcha): conferir a 390px a lista com muitos alunos, o toque no card, os filtros e a ordenação.

## 104. Auditoria de UX com conta em uso · PR 4: Agenda mais fácil de ler

- (Segue o plano das 6 PRs do item 101.)
- ✅ **Semana → dia:** tocar no cabeçalho de um dia (na grade do tablet e na lista do celular) abre aquele dia na visão Dia, com a lista detalhada.
- ✅ **Nomes na grade semanal:** prenome quando é único entre os alunos da semana; **"Paulo G." / "Paulo P."** (prenome + inicial do último sobrenome) só quando dois alunos dividem o prenome; nome inteiro se nem assim se distinguem. O nome pode quebrar em 2 linhas (antes cortava com "…") e o nome completo está no rótulo de acessibilidade do botão.
- ✅ **Horário compartilhado:** na visão Dia, aulas que começam juntas ganham o aviso neutro "N aulas neste horário" (pode ser dupla, grupo ou alunos em paralelo).
- ✅ **Conflito de verdade:** só quando o **mesmo aluno** está previsto em duas aulas que se cruzam no tempo; aparece como "Conflito: Nome em outra aula neste horário" (texto + ícone) no cartão do dia e da semana, e como "Conflito" na grade. Aula cancelada ou participante que cancelou não conta; aulas seguidas (uma termina quando a outra começa) também não.
- ✅ Local em "Lugar · Bairro" nos cartões da Agenda; o endereço completo aparece ao abrir a aula.
- ℹ️ **Não feito:** "Confirmada / A confirmar" (a aula não guarda confirmação; seria produto novo com migration) e botão "Começar" nos cartões da Agenda (o início segue pelo menu da aula e pela tela Hoje).
- ✅ Testes `leituraDaAgenda.test.ts` (abreviar nomes, agrupar horários, conflito do mesmo aluno). Sem migration e sem deploy. **Não testado ao vivo por mim** (login com captcha): conferir a 390px e em tablet a semana com dois alunos de mesmo prenome e duas aulas no mesmo horário.

## 105. Auditoria de UX com conta em uso · PR 5: Treinos planejados com busca e filtro

- (Segue o plano das 6 PRs do item 101.)
- ✅ **Busca** por nome **ou por exercício** (sem diferenciar acento e maiúscula) e **filtro por modalidade** com contador ("🏊 Natação (1)", "Todos (12)"). Os dois só aparecem a partir de **6 treinos planejados** (com menos, a lista cabe na tela e a busca seria ruído); o filtro de modalidade só aparece se há mais de uma modalidade na biblioteca. Se a modalidade filtrada deixa de existir (ex.: excluiu o último treino dela), o filtro volta para "Todos" sozinho.
- ✅ **Rascunho:** treino de musculação sem nenhum exercício agora diz "Rascunho · sem exercícios · continuar editando ›" (âmbar, em texto), em vez do "toque para adicionar".
- ✅ Cartão mais compacto: no máximo **2** exemplos de exercício (eram 3).
- ℹ️ **Não feito:** "arquivar" treino planejado (hoje há Editar, Duplicar e Excluir; arquivar exigiria coluna nova e migration). Fica como ideia caso a biblioteca cresça.
- ✅ Testes `biblioteca.test.ts` (busca, modalidade, rascunho, contagem). Sem migration e sem deploy. **Não testado ao vivo por mim** (login com captcha): conferir a 390px com 6 ou mais treinos, busca por exercício e filtro por modalidade.

## 106. Auditoria de UX com conta em uso · PR 6: Sino com notificações agrupadas

- (Última PR do plano descrito no item 101.)
- ✅ A lista do sino agora tem grupos: **Pedem sua ação** (ciclo encerrado, em destaque), **Novidades** (ex.: mês grátis da indicação), **Treinos concluídos** (3 à vista + "Ver todos") e **Anteriores** (lidas, recolhidas).
- ✅ **Marcar como lidos** nos treinos concluídos (só esse grupo); o botão "Marcar todas como lidas" continua no topo.
- ✅ **Selo do sino:** vermelho só quando há notificação que **pede ação**; com apenas treinos concluídos e novidades fica cinza, para o vermelho voltar a significar "faça algo". O número continua sendo o total de não lidas.
- ✅ Rótulo de acessibilidade do sino informa quantas pedem ação.
- ✅ Testes `agrupar.test.ts` (grupos, ordem, contagem). Sem migration e sem deploy. **Não testado ao vivo por mim** (login com captcha): gerar um treino concluído e um ciclo encerrado e conferir os grupos, o selo e "Marcar como lidos".
- 🏁 Com esta PR fecha o plano de 6 PRs da auditoria (itens 101 a 106). Ideias de produto que ficaram de fora: confirmação de aula pelo aluno e arquivar treino planejado.

## 107. Importar e exportar alunos: botões lado a lado

- 🐞 Visto no uso real (28/10/2026): na lista de Alunos, "Importar alunos de uma planilha" e "Exportar alunos (CSV)" eram dois links sublinhados soltos, com um vão grande entre eles, e pareciam erro da tela.
- ✅ Agora são **dois botões secundários lado a lado** (ícone + texto, 44 px de altura): **Importar planilha** e **Exportar CSV**. O aviso da exportação ("N alunos exportados…") aparece abaixo, na largura toda. Em modo somente leitura (assinatura vencida), Importar continua abrindo os planos.
- ⚠️ Sem migration e sem deploy. **Não testado ao vivo por mim** (login com captcha): conferir a 390px a linha dos dois botões e o aviso depois de exportar.

## 108. Alerta quando o tempo informado foge do usual

- 💡 Pedido do dono (28/10/2026): o tempo alimenta histórico e Performance, então um tempo absurdo (cronômetro esquecido, horas digitadas em minutos) suja os números.
- ✅ Se o tempo for **menor que 20 min ou de 3 h para cima**, abre a pergunta **"O tempo está correto?"** ("Você informou 3 h 20 min, um tempo bem longo para um treino…") com **Corrigir** (volta ao campo) e **Está certo, continuar**. Nunca bloqueia; **tempo em branco não gera alerta** (dá para pular).
- ✅ Vale em todas as modalidades e em todos os pontos que gravam duração: conclusão do treino de musculação (PosTreino), edição da sessão, resultado das outras modalidades no presencial, página do aluno à distância, **duração da aula** no horário fixo e na aula avulsa (mensagem trocada para "define o espaço que a aula ocupa na agenda").
- ⚙️ Os limites ficam em `duracaoAtipica.ts` (`DURACAO_MINIMA_MIN`, `DURACAO_MAXIMA_MIN`): se ciclismo, brick ou natação em mar pedirem um teto maior, é uma constante por modalidade.
- ✅ A folha de confirmação ganhou `textoCancelar` opcional ("Corrigir"). Testes `duracaoAtipica.test.ts`. Sem migration e sem deploy. **Não testado ao vivo por mim** (login com captcha): informar 10 min, 200 min, 45 min e em branco em cada tela.

## 109. Pré e pós-treino em todas as modalidades (e opção de pular)

- 💡 Pedido do dono (28/10/2026): só a musculação presencial tinha as perguntas de pré-treino (Prontidão) e pós-treino (PSE); as outras modalidades e o treino à distância não. E, em qualquer caso, **dar a opção de pular**.
- ✅ **Musculação presencial:** o pré-treino ganhou **"Pular perguntas e iniciar treino"** (celular e tablet); a sessão começa sem as 4 respostas (colunas vazias, prontidão não calculada). No pós-treino o **PSE deixou de ser obrigatório** ("Opcional: pode pular"); sem PSE o resumo mostra a duração no lugar da carga interna e some a linha de PSE na imagem de compartilhar. A duração continua obrigatória (alimenta histórico e Performance).
- ✅ **Outras modalidades no presencial e no link à distância (inclusive musculação à distância):** bloco **"Como você está hoje? (opcional)"** com as 4 perguntas (sono, estresse, fadiga, dor muscular), com **Responder** ou **Pular** (dá para responder só algumas), e bloco **PSE (0–10)** ao final com **Limpar resposta**. Modalidades que já têm RPE (corrida, ciclismo, brick) mantêm só o RPE para não perguntar duas vezes.
- ✅ **Onde fica salvo (sem migration):** dentro de `detalhes_execucao.resultado` da execução: `pre_sono`, `pre_estresse`, `pre_fadiga`, `pre_dor` e `pse` (inteiros 0–10). No histórico do aluno aparecem como "Prontidão: X/10" (quando as 4 existem) e "PSE: N/10"; respostas parciais aparecem uma a uma.
- 🔒 **LGPD:** a prontidão é dado de bem-estar; segue a regra do projeto (não vai para WhatsApp, e-mail, admin nem logs). O jurídico confirmou que o consentimento atual cobre o envio pelo link do aluno.
- 🚀 **Deploy necessário:** a validação do servidor mudou (`supabase/functions/_shared/execucao.ts`): **fazer o deploy da função `treino-publico`** depois do merge. Sem o deploy, o link do aluno continua funcionando, mas descarta as respostas de pré e PSE (a validação antiga ignora chaves desconhecidas).
- ℹ️ O gráfico de prontidão da aba Evolução continua lendo só as sessões de musculação presencial (as respostas das outras modalidades aparecem no histórico, não no gráfico).
- ✅ Testes: `prontidaoExecucao.test.ts`, validação do servidor em `execucao.test.ts`, `descreverExecucao` em `modalidades.test.ts`. **Não testado ao vivo por mim** (login com captcha): musculação presencial pulando o pré e o PSE; corrida/natação no presencial respondendo e pulando; link à distância (musculação e outra) com e sem respostas, conferindo no histórico do aluno.

## 110. Auditoria de UX · sobras 3, 4, 5 e 7: Alunos, Agenda e Hoje

- (Fecha as sobras da auditoria dos itens 101 a 106. A **confirmação de aula** ("Confirmada / A confirmar") foi **descartada pelo dono**: quem manda na agenda é o personal e ele faz o contato; o sistema fica como está.)
- ✅ **Cartões de aluno:** ações à vista, **WhatsApp** (com texto) e **▶ Treino**, a 44 px; o "⋮" e o deslizar continuam. O chip "Sem valor definido" saiu de cada cartão: no topo da lista há um aviso único ("N alunos sem valor definido · Ver quais") que filtra a lista.
- ✅ **Ficha, aba Resumo:** o bloco **Dados** não mostra mais linhas vazias ("—"); **Cobrança** vira valor + uma linha de ciclo, e sem valor mostra o botão **Definir valor**; **Financeiro** abre com uma frase de status colorida e a **próxima ação** ("1 fatura em atraso · R$ 120 → Ver fatura", "Ciclo atual aberto → Ver ciclo atual", "R$ X a receber", "Em dia"); **Avaliações** mostra só a última, com "Ver todas (N)".
- ✅ **Agenda:** os cartões do dia ganharam **▶ Começar** (mesma regra da Hoje, agora num só lugar: `comecarAula.ts`) e **WhatsApp com texto** (também na Hoje).
- ✅ **Hoje, Atividade recente:** treino concluído com **observação do aluno ainda não lida** (a mesma do sino) sobe para o topo com o selo "Nova observação"; ao abrir a observação, a notificação é marcada como lida. A observação continua só na tela do personal.
- ✅ Testes: `comecarAula.test.ts`, `priorizarAtividade.test.ts`, `statusAluno.test.ts`. Sem migration e sem deploy. **Não testado ao vivo por mim** (login com captcha): conferir a 390px a lista de Alunos (botões e aviso), uma ficha com fatura em atraso, o Começar na Agenda e o feed da Hoje com uma observação nova.

## 111. Auditoria de UX · sobra 6: textos mínimos e erro com "Tentar de novo"

- (Fecha a sobra 6 da auditoria dos itens 101 a 106.) O contraste de `text-slate-400` já tinha guarda em `contraste.test.ts`, então esse ponto estava resolvido.
- ✅ **Nenhum texto abaixo de 12 px:** os 4 `text-[11px]` (rótulo do card de métrica, chips da escala, selo do sino, legenda do pós-treino) passaram para `text-xs`. Novo teste `tamanhoTexto.test.ts` impede `text-[10px]`/`text-[11px]` daqui para a frente.
- ✅ **`ErroComRetry`:** erro de carregamento deixa de ser uma linha vermelha solta e vira uma caixa com a mensagem em português simples e o botão **Tentar de novo** (44 px), aplicada em **Hoje, Agenda (dia e semana, que não tratavam erro), Alunos, Treinos planejados, Exercícios e Financeiro**. No Financeiro, com erro, as telas de "organize suas cobranças" deixam de aparecer por engano.
- ℹ️ **Offline:** já existe a faixa global "Sem conexão. Algumas ações podem falhar." (`OfflineBanner`); o retry cobre o resto. Telas de admin e o seletor de modelos continuam com a mensagem simples.
- ✅ Sem migration e sem deploy. **Não testado ao vivo por mim** (login com captcha): ligar o modo avião e abrir Alunos/Agenda/Financeiro para ver o erro e tocar em "Tentar de novo" com a rede de volta.

## 112. Arquivar treino planejado

- ✅ Pedido da auditoria de UX (sobra 2): o treino planejado ganha **Arquivar** no "⋮" (com toast **Desfazer**). O arquivado sai da lista e de todos os seletores (escolher treino do aluno, criar treino a partir de modelo, checklist de primeiro uso) **sem apagar nada**; os treinos já aplicados aos alunos não mudam.
- ✅ Na tela, o botão **Arquivados (N)** (só aparece se houver) abre a lista dos arquivados, onde dá para **Restaurar** (no "⋮") ou **Excluir** de vez. Se todos estiverem arquivados, a tela avisa em vez de mostrar o "Monte seu primeiro treino".
- 🗄️ **Migration** `20261078000000_arquivar_treino_planejado.sql`: coluna `treino.modelos.arquivado_em` (anulável; NULL = ativo). RLS e GRANT da tabela já cobrem a coluna. Teste em `supabase/tests/arquivar_treino_planejado.sql` (dono arquiva e restaura; outro personal não enxerga nem arquiva).
- ⚠️ **Rodar a migration ANTES do merge:** o app passa a filtrar por `arquivado_em`; sem a coluna, a lista de Treinos planejados falha ao carregar. Sem deploy de função.
- ⚠️ **Não testado ao vivo por mim** (login com captcha): arquivar, desfazer, abrir Arquivados, restaurar e confirmar que o treino arquivado some ao escolher treino para um aluno.

## 113. Aula avulsa: local com busca de endereço do Google

- 🐞 Visto no uso real (28/10/2026): ao marcar uma **aula avulsa**, o campo Local era um texto comum e não buscava endereço no Google (o horário fixo e os locais do aluno já buscavam).
- ✅ O campo Local da aula avulsa agora usa o mesmo **autocomplete do Google Places** do horário fixo ("Nome — endereço" depois de escolher; texto livre continua valendo). Os **4 locais usados mais recentemente** viram atalhos em chips (antes eram a lista escondida do `datalist`), e tocar num deles preenche o campo.
- ℹ️ Sem a chave `VITE_GOOGLE_MAPS_API_KEY` o campo segue como texto simples (comportamento do componente). Sem migration e sem deploy. **Não testado ao vivo por mim** (login com captcha): em Agenda → Nova aula, digitar um endereço e escolher uma sugestão; tocar num local recente; marcar a aula e conferir o local no cartão.

## 114. Mensagem de WhatsApp do treino à distância com padrão único

- 🐞 Visto no uso real (28/10/2026): a mensagem que vai pelo WhatsApp com o treino à distância estava confusa e sem padrão (emoji de "💪" solto, o nome do treino entre aspas no meio de uma frase, seções sem destaque, o link grudado num emoji e uma frase de prazo longa).
- ✅ Novo modelo, o mesmo para todas as modalidades: saudação (`Olá, Ana! 👋`); título em destaque (`🏃 *Longão* · Corrida`); resumo (natação: ambiente e distância; corrida/ciclismo/brick: total); seções em negrito do WhatsApp (`📋 *Treino*`, `📋 *Exercícios*`, `📋 *Detalhes*`); bloco **`✅ *Quando terminar, registre aqui:*`** com o **link sozinho na linha** (o WhatsApp só mostra a prévia do link assim) e **`⏰ Válido até 29/10/2026 às 14:54`**; fecho com `Qualquer dúvida, é só me chamar!` e o nome do personal.
- 🔒 Conteúdo igual ao de antes: só o que o personal montou, sem dado de saúde do aluno.
- ℹ️ Os `�` no texto colado na conversa vêm da cópia do preview do aplicativo (o emoji se perde ao colar), não do texto enviado: o gerador monta os emojis normalmente. Se continuar aparecendo `�` direto no WhatsApp do aluno, me avise com um print da conversa.
- ✅ Testes de padrão em `modalidades.test.ts` (saudação, negrito, link isolado, prazo, assinatura). Sem migration e sem deploy. **Não testado ao vivo por mim** (login com captcha): enviar um treino à distância de musculação, corrida e natação e olhar a mensagem no WhatsApp.

## 115. Enviar treino à distância: copiar a mensagem e colar no WhatsApp

- 🐞 Visto no uso real (28/10/2026, print do WhatsApp Business): a mensagem aberta pelo link `wa.me?text=` chegava com os **emojis corrompidos ("�")**. Corrijo a explicação do item 114: o problema **não** era a cópia do preview; o WhatsApp (conforme aparelho/aplicativo) estraga os emojis que passam pelo texto do link, e o padrão visual novo, sozinho, não resolve isso.
- ✅ Novo fluxo: depois de escolher a validade, abre a folha **"Mensagem para o aluno"** com o texto pronto (editável) e três ações: **Copiar e abrir WhatsApp** (copia e abre a conversa do aluno; é só colar), **Só copiar mensagem** e, como plano B, **Abrir WhatsApp com o texto pronto** (o jeito antigo). Colar mantém emojis, negrito e quebras de linha intactos.
- ✅ Vale nos dois pontos de envio (aba Treinos do aluno e "Tipo de sessão" ao iniciar). Antes, o segundo nem tinha onde mostrar a folha.
- ✅ A janela não é mais aberta antes da rede (não precisa mais do truque contra bloqueio de pop-up): o WhatsApp só abre no toque do botão.
- ✅ Sem migration e sem deploy. **Não testado ao vivo por mim** (login com captcha): enviar um treino à distância, tocar em "Copiar e abrir WhatsApp", colar e conferir os emojis; testar "Só copiar" e o plano B.

## 116. Previsão de ganho do mês no Financeiro

- 💡 Pedido do dono (28/10/2026): ter previsibilidade de ganho sem poluir a tela.
- ✅ Um **quarto cartão no carrossel do topo, "Previsto no mês"** (só aparece se há alunos com cobrança); ao tocar, abre a folha com a conta aberta: **Já recebido** (faturas pagas no mês) + **A receber** (abertas e enviadas) + **Realizado, ainda sem fatura** (aulas já dadas a alunos "por aula") + **Mensalidades do ciclo** (alunos "mensal" ainda sem fatura cobrindo o ciclo) + **Aulas agendadas até o fim do mês** (previstos × valor por aula, marcada como **estimativa**) = **Previsto no mês**.
- ✅ Aluno sem cobrança definida fica fora da conta e a folha avisa quantos são, com atalho para definir os valores. Rodapé: pagamentos podem cair no mês seguinte e a projeção muda com falta/cancelamento.
- ✅ Cálculo puro em `previsaoDoMes.ts` (testado: recebido do mês, a receber sem canceladas, mensal só "por aula" para realizado, mensalidade uma vez e sem duplicar fatura, projeção só de agendadas e previstos, arredondamento, último dia do mês). Sem migration e sem deploy.
- ⚠️ **Não testado ao vivo por mim** (login com captcha): conferir o cartão e a folha a 390 px com uma conta que tenha aluno "por aula" com aulas agendadas e realizadas, um mensalista e uma fatura em atraso, e comparar a soma com o que você espera.

## 117. Lembretes de renovação do plano pago (app, e-mail e WhatsApp)

- ✅ **Teste de pagamento real (28/10/2026):** assinatura mensal de R$ 15,00 paga por Pix no Mercado Pago, liberada no app (Status Ativo, acesso até 27/11/2026) e **R$ 14,85 líquidos** na conta (taxa de ~1% no Pix). Ciclo completo validado: cobrança, webhook, liberação e dinheiro na conta.
- 🐞 Lacuna encontrada: o pagamento é **avulso e não renova sozinho** e só havia um WhatsApp 3 dias antes (que depende de opt-in e telefone verificado). Quem esquecia perdia a gravação sem aviso; dentro do app nada avisava quem já pagava.
- ✅ **No app:** para assinatura ativa, linha compacta na Hoje a **7 dias** do fim ("Seu acesso vai até 27/11 · faltam 5 dias · Renovar") e **banner completo nos últimos 3 dias**, em qualquer tela, abrindo os planos. O fim considera o mês grátis de indicação (vale o que for mais tarde).
- ✅ **E-mail** (Resend, no endereço do cadastro, sem depender de WhatsApp): **5 dias antes, 1 dia antes e no dia do vencimento**, com botão "Renovar agora", explicando que não renova sozinho e que, vencido, os dados continuam visíveis mas não grava. Só nome, plano e data; nenhum dado de aluno ou de saúde. Chave de idempotência por personal, prazo e dia (se o job rodar duas vezes, não duplica).
- ✅ **WhatsApp:** **3 dias antes** (já existia) e **1 dia antes** ("vence amanhã", pedido do dono). Segue as regras de sempre (opt-in, telefone verificado, uma mensagem por tipo por dia).
- 🚀 **Deploy necessário:** função **`avisos-diarios`** (usa o segredo `RESEND_API_KEY`, o mesmo do e-mail de exclusão de conta). **Conferir** que o agendamento diário está ativo: `select jobname, schedule, active from cron.job;`. Sem migration.
- ✅ Testes: `renovacao.test.ts` (dias de calendário em São Paulo, mês grátis, quem recebe o quê e quando, textos e escape do e-mail), `renovacaoBannerRegra.test.ts`. **Não testado ao vivo por mim** (captcha e precisa de assinatura perto do fim): simular com uma conta de teste cujo `assinatura_fim` esteja a 5, 3 e 1 dia (SQL no PR) e rodar a função uma vez à mão.

## 118. Correção do e-mail de renovação: data repetida

- 🐞 Visto no teste ao vivo (28/10/2026): o e-mail dizia "vai até **segunda, 02/nov, 02/11/2026**" (a data apareceu duas vezes, porque o dia da semana vinha junto com a data abreviada).
- ✅ Agora: "vai até **segunda, 02/11/2026**", no texto e no HTML. Teste novo garante a data uma só vez. Sem migration. **Deploy:** função `avisos-diarios` (o texto do e-mail é montado nela).

## 119. Renovação em um toque: link direto no WhatsApp e no e-mail

- 💡 Sugestão após o teste ao vivo dos lembretes (item 117): a mensagem do WhatsApp mandava o personal "abrir Configurações › Assinatura", sem link.
- ✅ O WhatsApp de renovação (3 e 1 dia antes) agora termina com o **link sozinho na última linha** (o WhatsApp mostra a prévia): `https://treino.personalperto.com.br/configuracoes?secao=assinatura`. O botão **"Renovar agora"** do e-mail usa o mesmo link.
- ✅ O app entende `?secao=assinatura` (também `dados`, `localizacao`, `aulas`, `pix`, `notificacoes`): abre as Configurações **com essa seção já expandida**, em vez de cair no acordeão fechado.
- 🚀 **Deploy:** função `avisos-diarios` (os textos são montados nela). Sem migration. Testes atualizados em `notificacoes.test.ts` e `renovacao.test.ts`. **Não testado ao vivo por mim:** tocar no link no WhatsApp e no e-mail e conferir que a seção Assinatura abre expandida.

## 120. Hoje: clima de volta logo abaixo da data

- 🐞 Visto no uso real (28/10/2026): depois da reorganização do item 101, o clima ficou perto do fim da Hoje (abaixo das aulas e do Pix) e ninguém via.
- ✅ O clima (compacto: temperatura, chuva com mm, UV, vento e a dica) volta para **logo abaixo da data**, antes do aviso "Sem mais aulas por fazer hoje" / do card Próxima aula e dos cards de primeiro uso. Pix, Atividade recente e Indique um personal seguem abaixo das aulas. Só muda a ordem na tela; sem migration e sem deploy. **Não testado ao vivo por mim** (captcha): abrir a Hoje a 390 px e conferir o clima sob a data.

## 121. Admin: cidade abre a lista de personais daquela cidade

- 💡 Pedido do dono (28/10/2026): clicar na cidade levava direto ao Google Maps; ele queria ver quais personais são dali.
- ✅ Na **Visão geral** (tabela de cidades) e na **lista de Personais** (tabela e cartões), tocar na cidade abre a aba **Personais já filtrada** (`/admin?aba=personais&cidade=Curitiba/PR`), com o chip "Cidade: Curitiba/PR · 3 personais" e o botão **Limpar filtro ✕**. O link do Google Maps virou um pequeno ícone de mapa ao lado. A busca por nome/e-mail e o filtro de status continuam valendo em conjunto. "Não informado" lista quem não cadastrou cidade.
- 🔒 Só dados do personal (como já era); nada de alunos. Sem migration e sem deploy. Testes em `personais.test.ts`. **Não testado ao vivo por mim** (login com captcha e MFA do admin): clicar numa cidade da Visão geral, conferir a lista e limpar o filtro.
- 🗺️ Parte do plano do BI do admin (v1): esta PR é a 1 de 2; a 2 traz meta de pagantes, funil de ativação, lista de ação e origem do cadastro.

## 122. BI do admin v1 (meta, funil, lista de ação, cidades e origem)

- 💡 Pedido do dono (28/10/2026): análises com gráficos e filtros por período. Parte 1 foi o item 121 (cidade abre a lista de personais). Esta é a parte 2, dentro da aba **Indicadores** (que já tinha 15 números com comparação e gráfico diário; nada foi removido).
- ✅ **Meta de pagantes:** progresso até **100 pagantes em 26/01/2027** (constantes em `biV1.ts`), com "faltam N; preciso de X por semana; nos últimos 7 dias entraram Y", **MRR estimado** e a curva de quem já pagou, acumulada.
- ✅ **Quem precisa de ação agora** (lista, só dados do personal): **teste acabando em até 5 dias sem 3 alunos**, **pagante sem nenhuma atividade há 7 dias ou mais** e **plano vencendo em até 7 dias**, cada um com botão de **WhatsApp** (abre a conversa, sem texto pronto). O fim do acesso considera o mês grátis de indicação.
- ✅ **Funil de ativação** do grupo que se cadastrou no período: cadastrou → completou o perfil → 1º aluno → 3 alunos → pagou, com % sobre o início e sobre a etapa anterior, **mediana de tempo** até cada etapa e a etapa de **maior perda**. Aluno entra só como contagem por personal.
- ✅ **Por cidade** (cadastros, ativados com 3+ alunos, pagantes, conversão; a cidade abre a lista de personais) e **por origem do cadastro**, com um campo de **investimento** que calcula o **custo por pagante**.
- ✅ **Filtros** do funil, das cidades e das origens: cidade, situação (trial, pagante, vencido, cancelado) e origem; o período é o seletor que já existia (24 h a 1 ano). A meta e a lista de ação são sempre globais.
- 🗄️ **Migration** `20261079000000_admin_bi_v1.sql`: colunas `origem_source/medium/campaign` em `professionals`; `registrar_origem_cadastro()`; `admin_bi_v1()` e `admin_lista_acao()` (exigem admin com MFA, cada uma com uma função interna `*_dados` fechada ao cliente). Teste: `supabase/tests/admin_bi_v1.sql`.
- ⚠️ **Rodar a migration ANTES do merge** (sem ela a aba Indicadores mostra erro nas seções novas; as antigas continuam).
- 🔒 **A origem ainda NÃO é registrada:** a Política de Privacidade hoje diz que a origem da campanha não é ligada ao cadastro. Texto proposto para o jurídico em `docs/POLITICA-ORIGEM-DO-CADASTRO.md`. Até a aprovação, todos aparecem como "direto". Depois: nova versão da Política + ligar o registro (código pronto e testado, só falta ligar).
- ✅ Testes: `biV1.test.ts` (meta, ritmo, funil, gargalo, custo, lista). A migration foi validada em um Postgres de teste (PGlite) com os mesmos casos de `supabase/tests/admin_bi_v1.sql`. **Não testado ao vivo por mim** (admin exige captcha e MFA).
