# Auditoria de segurança — Treino PP

Data: 16/10/2026 · Escopo: front (Vite/React), Edge Functions (Deno), migrations/RLS, dependências.
Nenhum valor de secret é reproduzido neste documento; achados apontam apenas arquivo e linha.

## Premissas corrigidas
- **Hospedagem**: o app é publicado no **GitHub Pages** (domínio próprio), não na Vercel. Não é possível definir
  cabeçalhos HTTP de resposta (CSP, X-Frame-Options, X-Content-Type-Options) no Pages.
- **Sessão**: o Supabase JS guarda a sessão em `localStorage`; não há cookies próprios do app, então
  HttpOnly/Secure/SameSite não se aplicam.

## Resumo
| Severidade | Qtde | Situação |
|---|---|---|
| CRÍTICA | 1 | Corrigida nesta PR (migration 20261039) |
| ALTA | 1 | Mitigada pela correção crítica; ajuste adicional recomendado |
| MÉDIA | 3 | Próxima PR / revisão manual |
| BAIXA | 2 | Próxima PR |

## Achados

### [CRÍTICA] Qualquer personal logado pode se tornar admin (`professionals.is_admin` gravável)
**Arquivo**: `supabase/migrations/20260924000000_create_treino_schema.sql` (policy `professionals_self_update` ~l.304;
`GRANT ... UPDATE ON ALL TABLES` l.274 e `ALTER DEFAULT PRIVILEGES` l.276); coluna criada em
`supabase/migrations/20261007000000_admin_role.sql` (l.23).
**Descrição**: a policy permite atualizar a própria linha e o GRANT de UPDATE cobria todas as colunas, inclusive
`is_admin`. Confirmado por teste somente-leitura com a conta de teste fixa (UPDATE sem efeito aceito pelo PostgREST).
**Impacto**: um `UPDATE professionals SET is_admin = true` pela REST API libera as funções `admin_*` (listar
personais, alterar trial/plano) e a Edge Function `admin-actions`, que gera link de recuperação de senha de qualquer
e-mail → **tomada de conta de qualquer personal**.
**Correção**: `supabase/migrations/20261039000000_proteger_is_admin.sql` — GRANT de UPDATE só nas colunas que o app edita
(`name, cpf, phone, whatsapp_opt_in, uf, cidade, bairro`) + trigger que bloqueia alteração de `is_admin` por
`authenticated`/`anon`. **Rodar a migration no SQL Editor ANTES do merge.** Depois, validar que Configurações segue salvando.

### [ALTA] `admin-actions` devolve o link de recuperação de senha na resposta
**Arquivo**: `supabase/functions/admin-actions/index.ts` (ação `reset_senha`, retorno de `actionLink`).
**Descrição**: usa service_role para `generateLink('recovery')` de qualquer e-mail informado e devolve o link ao chamador.
**Impacto**: combinada com o achado crítico era tomada de conta; mesmo com admin legítimo, o link em texto trafega pelo
navegador e fica em logs/histórico, e o admin passa a poder assumir a conta do personal.
**Correção**: enviar o e-mail de redefinição pelo fluxo padrão (`resetPasswordForEmail`) sem devolver o link, registrando
a ação em `admin_logs`. Não alterado nesta PR (muda o fluxo do admin) — **necessita revisão manual** da decisão de produto.

### [MÉDIA] Sem cabeçalhos de segurança / CSP
**Arquivo**: `index.html` (sem `<meta http-equiv="Content-Security-Policy">`); hospedagem GitHub Pages.
**Descrição**: não há CSP nem proteção contra clickjacking; não encontrei sinks de XSS (`dangerouslySetInnerHTML`, `eval`).
**Impacto**: defesa em profundidade ausente: um XSS futuro teria acesso ao token em `localStorage`.
**Correção**: adicionar CSP via `<meta>` (sem `frame-ancestors`, que só vale por header) ou colocar um proxy (Cloudflare) na
frente para headers reais. **Necessita revisão manual** (testar PWA, Turnstile, Mercado Pago, Supabase).

### [MÉDIA] Rate limiting nas funções públicas
**Arquivo**: `supabase/functions/treino-publico/`, `confirmar-consentimento-saude/` (`verify_jwt = false` em `supabase/config.toml`).
**Descrição**: acesso protegido por token de alta entropia, mas sem limite de tentativas por IP. Envio de consentimento já
tem intervalo mínimo de 1 min por aluno.
**Impacto**: enumeração/abuso de volume (baixo, dado o tamanho do token).
**Correção**: limite por IP na borda (Cloudflare) ou tabela de contagem. **Necessita revisão manual** — não validei o tamanho do token nem o comportamento sob carga.

### [MÉDIA] Funções de cron com `verify_jwt = false` dependem só de `CRON_SECRET`
**Arquivo**: `supabase/config.toml` (daily-briefing, avisos-diarios, weekly-summary, avisos-financeiros, aviso-treino-concluido); `supabase/functions/_shared/notificacoes.ts` (`segredoCronValido`).
**Descrição**: autorização por header `x-cron-secret`. Funciona e nega sem o segredo.
**Impacto**: vazamento do segredo permitiria disparar WhatsApp em massa.
**Correção**: comparação em tempo constante e rotação periódica do segredo (Vault). **Necessita revisão manual** da comparação.

### [BAIXA] Dependências de desenvolvimento com CVE (`sharp`, `source-map-js`)
**Arquivo**: `package-lock.json`. `npm audit` de produção: 0 vulnerabilidades; 2 "high" apenas em dev (build).
**Impacto**: não chega ao bundle publicado.
**Correção**: `npm audit fix` em PR própria, com build e testes.

### [BAIXA] Sessão em `localStorage`
**Arquivo**: configuração do cliente Supabase (`src/lib/supabase.ts`).
**Descrição/Impacto**: token legível por qualquer XSS. Sem XSS conhecido.
**Correção**: manter sem sinks de XSS e adicionar CSP (ver achado acima).

## Verificado sem achados
- `anon` sem acesso a nenhuma tabela do schema `treino`; RLS ativa nas tabelas.
- `gerar-link-treino`: JWT + cliente com escopo do usuário para checar dono do plano; service_role só para gravar o token.
- `enviar-consentimento-saude`: JWT, aluno checado via RLS, e-mail validado e HTML escapado (`escaparHtml`), intervalo mínimo entre envios, token anterior invalidado.
- `mp-webhook`: assinatura HMAC obrigatória e idempotência por `mp_payment_id`.
- `assinaturas`: INSERT/UPDATE/DELETE revogados de `authenticated`.
- Nenhum secret encontrado no repositório; `.env` fora do git.

## Não testado
- Rate limiting real, headers em produção, `mp-webhook` com payload forjado em produção e fluxo completo do admin após a migration.
