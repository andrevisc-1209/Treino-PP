# Auditoria de segurança — Treino PP

Data da auditoria: 16/10/2026 · Última atualização: 22/10/2026 (PR "enumeração e validação de CPF")
Escopo: front (Vite/React), Edge Functions (Deno), migrations/RLS, dependências.
Nenhum valor de secret é reproduzido neste documento; achados apontam apenas arquivo e linha.

## Premissas corrigidas
- **Hospedagem**: GitHub Pages (domínio próprio), não Vercel. Não dá para definir cabeçalhos HTTP de resposta.
- **Sessão**: o Supabase JS guarda a sessão em `localStorage`; não há cookies do app (HttpOnly/Secure/SameSite não se aplicam).

## ✅ Corrigido

### PR #114 — [CRÍTICA] Personal virava admin (`professionals.is_admin` gravável)
**Arquivo**: `supabase/migrations/20260924000000_create_treino_schema.sql` (policy `professionals_self_update`, GRANT de UPDATE na tabela inteira); coluna em `20261007000000_admin_role.sql`.
**Impacto**: `UPDATE ... SET is_admin = true` pela REST API liberava as funções `admin_*` e o `admin-actions` (tomada de conta).
**Correção**: `20261039000000_proteger_is_admin.sql` — GRANT de UPDATE por coluna + trigger `tg_bloquear_is_admin`.

### PR #115 — [ALTA] `admin-actions` devolvia o link de recuperação de senha
**Arquivo**: `supabase/functions/admin-actions/index.ts`.
**Correção**: usa `resetPasswordForEmail` (o `generateLink` não envia e-mail); resposta `{ success, email }`; o painel não exibe link.

### PR #115 — [MÉDIA] Sem CSP
**Arquivo**: `vite.config.ts` (plugin `htmlCspPlugin`, só no build, sem `unsafe-eval`) + meta `referrer`.

### PR #115 — [MÉDIA] Sem rate limiting nas funções públicas
**Correção**: `20261040000000_rate_limit.sql` + `_shared/rateLimit.ts`: `mp-webhook` 30/min/IP, `send-whatsapp` 10/min/personal, `treino-publico` e `confirmar-consentimento-saude` 60/min/IP (429 + `Retry-After`).

### Esta PR — gaps dos lotes 1 e 2
- **`.gitignore`**: passa a cobrir `.env.*` (exceto `.env.example`), incluindo `.env.production`.
- **`supabase/config.toml`**: `[auth] jwt_expiry = 3600` documentado no repositório (referência; o projeto é remoto).
- **Console em produção** (BAIXA): `esbuild.drop: ['console', 'debugger']` só no build (`vite.config.ts`).
- **Erro interno exposto** (BAIXA): `admin-actions` não devolve mais a mensagem do Auth; loga no servidor e responde mensagem fixa.
- **Formatação do WhatsApp em nomes** (BAIXA): `nomeLimpo` remove `* _ ~` e crases dos nomes vindos do banco (`_shared/notificacoes.ts`).
- **CORS com localhost em produção** (BAIXA): `localhost:5173` só entra se `ALLOW_LOCALHOST_CORS=true` (nunca definido em produção), nas 7 funções chamadas pelo navegador.
- **`WITH CHECK` das tabelas filhas** (BAIXA): `20261041000000_with_check_tabelas_filhas.sql` fecha as colunas FK que apontavam sem checagem para linhas de outro personal (`aula_participantes.execucao_id`, `planos.modelo_origem_id`, `sessao_exercicios.plano_exercicio_id`, `sessoes.aula_id`, `execucoes_assincrono` presencial: `sessao_id`/`plano_id`/`link_id`). Não existe tabela `pagamentos`; `consentimento_evidencias` não tem policy de cliente. As demais tabelas já estavam corretas.

### PR "correções da revisão adversarial" — itens 1 a 6 (revisão como invasor)
1. **[ALTA] E-mail com a nossa marca sem limite por personal** (`enviar-consentimento-saude`): limite de 20/h e 60/dia por personal (falha fechada), exige e-mail confirmado e limpa links/quebras de linha dos nomes no corpo do e-mail (`nomeSeguroParaEmail`).
2. **[ALTA] Separação entre personais só pela RLS**: migration `20261044000000_grants_minimos_authenticated.sql` — tabelas futuras não recebem mais grant automático ao cliente; as atuais ficam só com os verbos que alguma policy permite. Guarda no CI (`supabase/migrations.test.ts`: toda tabela nova precisa de RLS e GRANT/REVOKE explícito) e teste de isolamento por SQL (`supabase/tests/isolamento.sql`). **Etapa futura:** tirar DELETE/UPDATE de tabelas com policy `ALL` que o app nunca usa (exige mapear funções `SECURITY INVOKER`).
3. **[MÉDIA] IP forjável no rate limit**: `ipDoCliente` usa só `cf-connecting-ip` (a Cloudflare o sobrescreve; confirmado nos registros do `rate_limit`). `x-forwarded-for` e `x-real-ip` deixaram de ser usados.
4. **[MÉDIA] Rate limit falhava aberto e a tabela era inflável**: `verificarLimite` distingue `erro` de `excedido`; `mp-webhook` (503, o Mercado Pago reenvia) e o envio de consentimento por e-mail falham fechados; chave limitada a 120 caracteres; limpeza diária em `supabase/cron/rate_limit.sql`.
5. **[MÉDIA] Link "sem prazo" era credencial eterna**: "Sem prazo" passou a ter teto de 30 dias (`expira_em` não é mais gravado nulo).
6. **[MÉDIA] CSP frouxa**: `src/config/csp.ts` — scripts sem `'unsafe-inline'`/`'unsafe-eval'`, `connect-src` com o host exato do Supabase (lido de `VITE_SUPABASE_URL` no build) e `img-src` só com os domínios do Google Places/Maps.

### PR "admin-actions e limites de tamanho" — itens 7 e 8 da revisão adversarial
7. **[MÉDIA-BAIXA] `admin-actions`**: valida o e-mail (`normalizarEmailAdmin`), exige que o destinatário seja um personal cadastrado (404 caso contrário), limita a 10 ações/hora por admin (falha fechada) e grava `admin_logs` com o alvo **antes** de agir (se o log falhar, a ação é abortada). **Pendente:** MFA (AAL2) para o admin — precisa antes de uma tela de cadastro do segundo fator.
8. **[MÉDIA-BAIXA] Sem limite de tamanho nas colunas de texto livre**: migration `20261045000000_limites_de_tamanho.sql` — 42 `CHECK ... NOT VALID` (texto em caracteres; JSONB em 64 KB), válidos para gravações novas sem varrer dados antigos; consulta de violadores em `supabase/tests/limites_violadores.sql`; Zod do formulário de aluno alinhado e mensagem "Texto longo demais" no erro 23514 dos limites. **Pendente:** limites de **quantidade** por conta (decisão de produto) e `VALIDATE CONSTRAINT` depois de limpar eventuais dados antigos.

### PR "verificação de posse do telefone" — 2ª revisão como invasor, item 1
- **[ALTA] A plataforma mandava WhatsApp para qualquer número cadastrado**: o telefone é digitado pelo próprio personal e, com `whatsapp_opt_in` ligado (padrão no cadastro), os avisos e o botão de teste saíam para ele sem prova de posse (spam/assédio pelo número da plataforma, com texto controlado pelo invasor). Migration `20261046000000_phone_verification.sql` + Edge Functions `solicitar-verificacao-phone` e `confirmar-verificacao-phone`: código de 6 dígitos por WhatsApp (10 min, hash no banco, 5 tentativas), limites com falha fechada (3/h por personal, 3/dia por número entre contas, 5 confirmações/h). O envio (`decidirEnvio`, `send-whatsapp`, crons) exige `phone_verified_at`; trocar o telefone pelo cliente zera a verificação (trigger). Contas existentes ficam não verificadas (sem backfill).

### PR "idempotência dos pagamentos" — 2ª revisão como invasor, item 2
- **[MÉDIA] Reentrega fora de ordem do webhook creditava o plano de novo**: a idempotência só comparava o `payment_id` com o último gravado em `assinaturas.mp_payment_id` (`mp.ts`, `decidirPagamento`). Se o Mercado Pago reentregasse o pagamento A depois de o B, A somava outro período. Migration `20261047000000_pagamentos_processados.sql` (tabela interna só `service_role`, semeada com os pagamentos vigentes) + `_shared/pagamento.ts` (`aplicarPagamento`): cada pagamento é reivindicado com `INSERT ... ON CONFLICT DO NOTHING` antes de creditar, e a reivindicação é **desfeita** se creditar falhar (o MP reenvia e o pagamento não se perde).

### PR "rate limit em mp-subscribe, clima e gerar-link-treino" — 2ª revisão como invasor, item 3
- **[MÉDIA] Funções autenticadas sem limite que chamam serviços externos**: uma conta gratuita podia martelar `mp-subscribe` (cada chamada cria uma preferência no Mercado Pago) e `clima` (duas chamadas ao Open-Meteo), a ponto de estourar a cota do Mercado Pago ou fazer o Open-Meteo bloquear o IP do servidor. Agora: `mp-subscribe` 10/h por personal (falha **fechada**), `gerar-link-treino` 20/h (falha aberta), `clima` 30/h (falha aberta) mais cache por cidade de 3 h (`_shared/cacheTtl.ts`). `respostaDoLimite` concentra a regra 429/503 e é testada.

### PR "enumeração e validação de CPF" — 2ª revisão como invasor, item 4
- **[MÉDIA-BAIXA] Enumeração de CPF e CPF sem validação no servidor**: o banco aceitava qualquer texto como CPF (API e metadados do cadastro) e o `UPDATE` direto de `cpf` devolvia "CPF já cadastrado" sem limite, confirmando quem é personal da plataforma. Migration `20261048000000_cpf_validacao_e_rpc.sql`: `treino.cpf_valido` (módulo 11) + `CHECK ... NOT VALID`, RPC `atualizar_cpf` (única via do cliente: `auth.uid()`, 5 tentativas/dia, mensagem genérica na colisão) e `REVOKE UPDATE (cpf)`. No front, a mensagem de colisão passou a ser genérica.
- **Risco aceito que continua**: enquanto o CPF for único, qualquer cadastro/gravação é um "oráculo" (a medida encarece, não elimina) e não há prova de posse do CPF (quem cadastra primeiro o reserva); a correção para o dono real é `admin_alterar_cpf`.

### PR "validar constraints" — plano de fechamento da 3ª revisão, item G
- **Constraints `NOT VALID` agora totais**: migration `20261049000000_validar_constraints.sql` valida os 42 limites de tamanho e `professionals_cpf_valido_chk`. Guard no CI: toda constraint `NOT VALID` precisa ter um `VALIDATE CONSTRAINT` em migration posterior.

### PR "mensagens de cadastro" — plano de fechamento da 3ª revisão, item B
- **[MÉDIA-BAIXA] O cadastro confirmava quais e-mails já têm conta**: `LoginPage.tsx` desfazia a proteção do Supabase ("Este e-mail já está cadastrado" quando `identities` vem vazio) e `errosAuth.ts` tinha mensagens próprias para `user_not_found` e `email_exists`. Agora o caso mostra a **mesma tela de confirmação** de um cadastro novo (com a orientação "Já tem conta? Entre ou use Esqueci minha senha"), e `user_not_found`/`email_exists`/`identity_already_exists` viram mensagens genéricas que não distinguem a existência da conta.
- **Decisão de produto (risco aceito)**: a colisão de CPF no completar perfil passou a dizer "Este CPF já está cadastrado na plataforma. Se for você, entre com seu e-mail ou use Esqueci minha senha." — ajuda o dono legítimo, mas confirma que o CPF é cliente (o limite de 5 tentativas/dia da RPC `atualizar_cpf` e o captcha continuam). Substitui a mensagem genérica da PR #124 neste ponto.

## ⚠️ Risco aceito
- **Sessão em `localStorage`**: token legível por XSS. Mitigado por não haver sinks de XSS no código e pela CSP. Aceito enquanto o app for SPA sem backend de sessão.
- **`frame-ancestors` e `X-Content-Type-Options` via `<meta>`**: os browsers ignoram; o GitHub Pages não permite headers. Só mudam com proxy (ex.: Cloudflare). Aceito por ora.
- **Crons protegidos só por `CRON_SECRET`** (`verify_jwt = false`): a comparação (`segredoCronValido`, `_shared/notificacoes.ts:70`) já é em tempo constante e exige 16+ caracteres. Risco residual: vazamento do segredo — mitigar com rotação periódica no Vault.
- **Dependências de dev com CVE** (`sharp`, `source-map-js`): produção tem 0 vulnerabilidades; só afeta o build.

## 🔍 Revisão manual pendente
- **Rate limit do Supabase Auth**: confirmar no dashboard (Auth → Rate Limits e Attack Protection/captcha) e o JWT expiry real (3600 s).
- **Chave do Google Maps** (`VITE_GOOGLE_MAPS_API_KEY`, pública no bundle): confirmar restrição por referrer a `treino.personalperto.com.br` e só à Places API.
- **Buckets do Storage**: o app não usa; confirmar no dashboard que não há buckets criados à mão.
- **MFA do admin** (tela de cadastro do segundo fator + exigência de AAL2 em `admin-actions`) e **limites de quantidade por conta** (alunos/treinos no trial).
- **Google Places/Maps e Turnstile sob a CSP nova**: validar em produção com o console aberto (um host bloqueado aparece no console e é só acrescentar).
- **Estado real do banco**: rodar `supabase/tests/isolamento.sql` antes e depois da migration 20261044; conferir RLS ligada, `anon` sem SELECT e policies fora do histórico (a tabela `assinaturas` nasceu fora das migrations).
- **CSP em produção**: validar fluxos logados (Turnstile, Google Places, ViaCEP, Realtime, PDF) com o console aberto.
- **Rate limiting real e webhook do Mercado Pago**: monitorar 429 e reenvios do mesmo IP.

## Verificado sem achados
- `anon` sem acesso a tabelas do schema `treino`; todas as tabelas com RLS nas migrations; funções `SECURITY DEFINER` com `REVOKE` de PUBLIC.
- Nenhum secret no repositório nem no histórico git (299 commits varridos); `VITE_*` só com valores públicos.
- Nenhum `dangerouslySetInnerHTML`/`innerHTML`; e-mails com `escaparHtml`; sem SQL dinâmico nas migrations; sem upload de arquivos.
- `mp-webhook`: HMAC obrigatório, idempotente por `mp_payment_id`.
- Pentest por leitura: `send-whatsapp` sem JWT → 401; `admin-actions` sem `is_admin` → 403; cron sem segredo → 401; `professional_id` nunca vem do body.
