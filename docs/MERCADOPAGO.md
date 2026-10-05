# Mercado Pago — Assinaturas (Checkout Transparente / Bricks)

Fluxo: `PlanoModal` (escolhe o plano) → `CheckoutMP` (Card Payment Brick, dentro
do app) → Edge Function `mp-subscribe` → assinatura criada **já autorizada** no
MP → `treino.assinaturas` atualizada na hora; o webhook `mp-webhook` confirma e
mantém tudo em dia nas renovações/cancelamentos.

O cartão é digitado em iframes seguros do Mercado Pago (campos `secure-fields`):
o nosso código e o nosso servidor só veem um **token** de uso único.

## Segurança

- O cliente manda só `{ plano, card_token }`. Valor, periodicidade, e-mail e
  identidade vêm do servidor (`PLANOS` em `supabase/functions/_shared/mp.ts` +
  JWT). Vínculo: `external_reference = auth.uid()`.
- Quem já tem assinatura `ativa` com `mp_subscription_id` leva 409 (evita
  cobrança em duplicidade).
- O webhook busca o estado na API do MP (o evento só traz o id) e valida o
  `x-signature` quando `MP_WEBHOOK_SECRET` existe.

## Assinatura do webhook (`x-signature`)

| Ambiente | Regra |
|---|---|
| Produção (`MP_ACCESS_TOKEN` definido) | HMAC obrigatório. Inválida/ausente → 401. Sem `MP_WEBHOOK_SECRET` → 500 (falha fechada). |
| Sandbox (só `MP_ACCESS_TOKEN_TEST`) | Válida → processa. Ausente/inválida/sem segredo → **loga aviso e processa**. |

Mesmo sem assinatura o estado nunca vem do corpo do webhook: a function faz GET na
API do MP pelo `data.id`. Todo evento recebido loga `action`, `type` e `data_id`
(Supabase → Edge Functions → mp-webhook → Logs).

`supabase/config.toml` fixa `verify_jwt = false` pro `mp-webhook`, então o deploy
não precisa mais de `--no-verify-jwt` (sem isso, o MP receberia 401).

## Configuração

Projeto Supabase: `avgrnvpvjhymsrnapfgu`.

1. **Migration** (SQL Editor): `supabase/migrations/20261010000000_mp_subscription_id.sql`
2. **Secrets do Supabase** (nunca em arquivo/PR):
   ```bash
   supabase secrets set --project-ref avgrnvpvjhymsrnapfgu MP_ACCESS_TOKEN_TEST=<access token de teste>
   supabase secrets set --project-ref avgrnvpvjhymsrnapfgu MP_TEST_PAYER_EMAIL=<e-mail do comprador de teste>   # só sandbox
   supabase secrets set --project-ref avgrnvpvjhymsrnapfgu MP_WEBHOOK_SECRET=<assinatura secreta do webhook>
   ```
   Em produção use `MP_ACCESS_TOKEN` (tem prioridade sobre `_TEST`; com ele,
   `MP_TEST_PAYER_EMAIL` é ignorado).
3. **Chave pública no front** — `VITE_MP_PUBLIC_KEY`:
   - Dev: em `.env.local` (já ignorado pelo git).
   - Deploy (GitHub Pages): secret de repositório `VITE_MP_PUBLIC_KEY`
     (Settings → Secrets and variables → Actions); `deploy.yml` já repassa.
   - **Precisa ser do mesmo par do access token**: chave de teste ↔
     `MP_ACCESS_TOKEN_TEST`; chave de produção ↔ `MP_ACCESS_TOKEN`. Misturar dá
     erro no pagamento. É pública por design, mas nunca ponha o access token aqui.
   - Sem a variável, o checkout mostra "Pagamento indisponível".
4. **Deploy das functions**:
   ```bash
   supabase functions deploy mp-subscribe --project-ref avgrnvpvjhymsrnapfgu
   supabase functions deploy mp-webhook --no-verify-jwt --project-ref avgrnvpvjhymsrnapfgu
   ```
5. **Painel do MP** → Webhooks, eventos *Planos e assinaturas* e *Pagamentos
   recorrentes*: `https://avgrnvpvjhymsrnapfgu.supabase.co/functions/v1/mp-webhook`

## Sandbox

- O MP exige comprador de teste quando o vendedor é de teste (`Both payer and
  collector must be real or test users`) → `MP_TEST_PAYER_EMAIL`.
- Criar comprador: `POST https://api.mercadopago.com/users/test_user` com
  `{"site_id":"MLB"}` (leva alguns segundos pra propagar).
- Cartão que funcionou neste sandbox: **Visa 4509 9535 6623 3704**, CVV 123,
  validade futura (11/30), titular `APRO` (aprovado), CPF `12345678909`. O
  Mastercard 5031 4332 1540 6351 da doc antiga **não é reconhecido** (a API de
  BIN não o encontra e o Brick recusa o número).

## Mapeamento de status

| MP (`preapproval.status`) | `treino.assinaturas.status` |
|---|---|
| `authorized` | `ativa` (+ `plano` pela periodicidade, `assinatura_fim` = próxima cobrança + 5 dias) |
| `cancelled` | `cancelada` |
| `paused` | `expirada` |
| `pending` | ignorado |

## Por que sem `preapproval_plan_id`

Os 3 planos criados na API do MP não são usados: preço e periodicidade ficam no
servidor (`PLANOS`). Podem ser desativados no painel.
