# Mercado Pago — Assinaturas

Fluxo: `PlanoModal` → Edge Function `mp-subscribe` → checkout hospedado do MP →
webhook `mp-webhook` → `treino.assinaturas`.

## Por que sem `preapproval_plan_id`

Assinatura **com plano associado** exige `card_token_id` (cartão tokenizado no
frontend via MP.js). Sem plano, o MP devolve o `init_point` do checkout
hospedado — e preserva `external_reference` (= `auth.uid()` do personal), que é
como o webhook acha a linha certa. Valor e periodicidade ficam em
`supabase/functions/_shared/mp.ts` (`PLANOS`), não no cliente. Os 3 planos
criados na API do MP (ids abaixo) **não são usados** pelo código; podem ser
desativados no painel.

## Configuração (uma vez)

Projeto Supabase: `avgrnvpvjhymsrnapfgu`.

1. **Migration** (SQL Editor): `supabase/migrations/20261010000000_mp_subscription_id.sql`
2. **Secrets** (nunca em arquivo/PR):
   ```bash
   supabase secrets set --project-ref avgrnvpvjhymsrnapfgu MP_ACCESS_TOKEN_TEST=<access token de teste>
   # depois de cadastrar o webhook no painel do MP (passo 4), a chave secreta dele:
   supabase secrets set --project-ref avgrnvpvjhymsrnapfgu MP_WEBHOOK_SECRET=<assinatura secreta do webhook>
   ```
   Em produção, usar `MP_ACCESS_TOKEN` (tem prioridade sobre `_TEST`).
3. **Deploy**:
   ```bash
   supabase functions deploy mp-subscribe --project-ref avgrnvpvjhymsrnapfgu
   supabase functions deploy mp-webhook --no-verify-jwt --project-ref avgrnvpvjhymsrnapfgu
   ```
   `mp-webhook` precisa de `--no-verify-jwt` (quem chama é o MP, sem JWT).
4. **Painel do MP** → Suas integrações → Webhooks → URL:
   `https://avgrnvpvjhymsrnapfgu.supabase.co/functions/v1/mp-webhook`, eventos
   **Planos e assinaturas** (`subscription_preapproval`) e **Pagamentos
   recorrentes** (`subscription_authorized_payment`).

## Mapeamento de status

| MP (`preapproval.status`) | `treino.assinaturas.status` |
|---|---|
| `authorized` | `ativa` (+ `plano` pela periodicidade, `assinatura_fim` = próxima cobrança + 5 dias) |
| `cancelled` | `cancelada` |
| `paused` | `expirada` |
| `pending` | ignorado |

## Teste em sandbox

Comprador de teste: criar em `POST /users/test_user` (site `MLB`) ou no painel;
no checkout, entrar com esse usuário. Cartão de teste: 5031 4332 1540 6351, CVV
123, validade futura (11/30). O app (`/` com trial) → "Assinar agora" → plano →
checkout → volta pra `/login?status=sucesso`. O `status` na URL **não** prova
pagamento: a fonte de verdade é o webhook.
