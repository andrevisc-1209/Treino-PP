# Auditoria de segurança — Treino PP

Data da auditoria: 16/10/2026 · Última atualização: 16/10/2026 (PR "fechar gaps lotes 1 e 2")
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

## ⚠️ Risco aceito
- **Sessão em `localStorage`**: token legível por XSS. Mitigado por não haver sinks de XSS no código e pela CSP. Aceito enquanto o app for SPA sem backend de sessão.
- **`frame-ancestors` e `X-Content-Type-Options` via `<meta>`**: os browsers ignoram; o GitHub Pages não permite headers. Só mudam com proxy (ex.: Cloudflare). Aceito por ora.
- **Crons protegidos só por `CRON_SECRET`** (`verify_jwt = false`): a comparação (`segredoCronValido`, `_shared/notificacoes.ts:70`) já é em tempo constante e exige 16+ caracteres. Risco residual: vazamento do segredo — mitigar com rotação periódica no Vault.
- **Dependências de dev com CVE** (`sharp`, `source-map-js`): produção tem 0 vulnerabilidades; só afeta o build.

## 🔍 Revisão manual pendente
- **`CHECK` de tamanho nas tabelas centrais** (`alunos`, `professionals`, `exercicios`, `planos`...): o app escreve direto pelo PostgREST e não há limite de tamanho no banco. Exige análise dos dados existentes (PR separada).
- **Rate limit do Supabase Auth**: confirmar no dashboard (Auth → Rate Limits e Attack Protection/captcha) e o JWT expiry real (3600 s).
- **Chave do Google Maps** (`VITE_GOOGLE_MAPS_API_KEY`, pública no bundle): confirmar restrição por referrer a `treino.personalperto.com.br` e só à Places API.
- **Buckets do Storage**: o app não usa; confirmar no dashboard que não há buckets criados à mão.
- **Estado real do banco**: conferir RLS ligada, `anon` sem SELECT e policies fora do histórico (a tabela `assinaturas` nasceu fora das migrations).
- **CSP em produção**: validar fluxos logados (Turnstile, Google Places, ViaCEP, Realtime, PDF) com o console aberto.
- **Rate limiting real e webhook do Mercado Pago**: monitorar 429 e reenvios do mesmo IP.

## Verificado sem achados
- `anon` sem acesso a tabelas do schema `treino`; todas as tabelas com RLS nas migrations; funções `SECURITY DEFINER` com `REVOKE` de PUBLIC.
- Nenhum secret no repositório nem no histórico git (299 commits varridos); `VITE_*` só com valores públicos.
- Nenhum `dangerouslySetInnerHTML`/`innerHTML`; e-mails com `escaparHtml`; sem SQL dinâmico nas migrations; sem upload de arquivos.
- `mp-webhook`: HMAC obrigatório, idempotente por `mp_payment_id`.
- Pentest por leitura: `send-whatsapp` sem JWT → 401; `admin-actions` sem `is_admin` → 403; cron sem segredo → 401; `professional_id` nunca vem do body.
