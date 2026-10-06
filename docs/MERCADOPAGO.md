# Mercado Pago — Checkout Pro (Pix, cartão e boleto)

Fluxo: `PlanoModal` (escolhe o plano) → Edge Function `mp-subscribe` cria uma
**Preference** (`POST /checkout/preferences`) e devolve `{ init_point }` → o app
redireciona para a tela hospedada pelo Mercado Pago → o MP volta para
`/checkout/success|failure|pending` (`RetornoCheckoutPage`) e avisa o
`mp-webhook` (`type: payment`), que ativa o plano em `treino.assinaturas`.

É **pagamento avulso**: não há renovação automática. Cada pagamento aprovado
compra `periodDays` (Mensal 30, Trimestral 90, Semestral 180); pagar de novo
antes do fim soma ao que resta. Nenhum dado de cartão passa pelo nosso código.

> Substitui o fluxo anterior (Preapproval + Card Payment Brick). Assinaturas
> recorrentes já existentes continuam sendo sincronizadas pelo webhook
> (`subscription_preapproval` / `subscription_authorized_payment`) durante a
> transição.

## Segurança

- O cliente manda só `{ plano }`. Valor e período vêm do servidor (`PLANOS` em
  `supabase/functions/_shared/mp.ts` + JWT). Vínculo: `external_reference` e
  `metadata.user_id = auth.uid()`.
- Quem ainda tem assinatura **recorrente** ativa (`mp_subscription_id`) leva 409.
- O webhook busca o pagamento na API do MP (`GET /v1/payments/{id}`; o evento só
  traz o id), confere que o valor pago ≥ preço do plano e valida o `x-signature`
  quando `MP_WEBHOOK_SECRET` existe (regras abaixo).
- Idempotência: `treino.assinaturas.mp_payment_id` guarda o último pagamento
  aplicado; o mesmo `payment_id` reenviado não soma o período duas vezes.

## O que cada status de pagamento faz

| `payment.status` | Efeito em `treino.assinaturas` |
|---|---|
| `approved` | `status = ativa`, `plano`, `assinatura_fim` = max(agora, fim atual) + período, `mp_payment_id` |
| `pending` / `in_process` (Pix/boleto aguardando) | nada — o acesso atual (trial/ativa) é mantido; libera quando virar `approved` |
| `rejected` / `cancelled` | nada — uma tentativa que falhou não derruba quem já tem acesso |
| `refunded` / `charged_back` | `status = cancelada`, só se for o pagamento vigente (`mp_payment_id`) |

## Assinatura do webhook (`x-signature`)

| Ambiente | Regra |
|---|---|
| Produção (`MP_ACCESS_TOKEN` definido) | HMAC obrigatório. Inválida/ausente → 401. Sem `MP_WEBHOOK_SECRET` → 500 (falha fechada). |
| Sandbox (só `MP_ACCESS_TOKEN_TEST`) | Válida → processa. Ausente/inválida/sem segredo → **loga aviso e processa**. |

`supabase/config.toml` fixa `verify_jwt = false` pro `mp-webhook`.

## Configuração

Projeto Supabase: `avgrnvpvjhymsrnapfgu`.

1. **Migration** (SQL Editor, **antes do merge**): `supabase/migrations/20261013000000_assinaturas_mp_payment_id.sql`
   (além da `20261010000000_mp_subscription_id.sql`, se ainda não rodou).
2. **Secrets do Supabase** (nunca em arquivo/PR): `MP_ACCESS_TOKEN` (produção) ou
   `MP_ACCESS_TOKEN_TEST` (sandbox), `MP_WEBHOOK_SECRET`; `MP_TEST_PAYER_EMAIL` só no sandbox.
   `SITE_URL` é opcional (padrão `https://treino.personalperto.com.br`; usado nas `back_urls`).
   **A chave pública do MP (`VITE_MP_PUBLIC_KEY`) não é mais usada.**
3. **Deploy das functions**:
   ```bash
   supabase functions deploy mp-subscribe --project-ref avgrnvpvjhymsrnapfgu
   supabase functions deploy mp-webhook --no-verify-jwt --project-ref avgrnvpvjhymsrnapfgu
   ```
4. **Painel do MP** → Webhooks: marque o evento **Pagamentos** (além dos de assinatura,
   enquanto houver recorrentes) em `https://avgrnvpvjhymsrnapfgu.supabase.co/functions/v1/mp-webhook`.
   A preferência também manda `notification_url` com esse endereço.

## Sandbox

- Com token de teste a function devolve `sandbox_init_point`. O MP exige comprador
  de teste (`MP_TEST_PAYER_EMAIL`); crie via `POST https://api.mercadopago.com/users/test_user`
  com `{"site_id":"MLB"}`.
- Cartão de teste que funcionou: **Visa 4509 9535 6623 3704**, CVV 123, validade futura,
  titular `APRO`, CPF `12345678909`.

## Por que sem `preapproval_plan_id`

Preço e período ficam no servidor (`PLANOS`); os planos criados na API do MP não são usados.
