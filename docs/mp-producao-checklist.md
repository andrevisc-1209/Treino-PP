# Mercado Pago em produção — checklist

O código só aceita credenciais de **produção**. Nada de token em arquivo ou PR: tudo em **Supabase Secrets**.

## 1. Secrets (Supabase → Project Settings → Edge Functions → Secrets, projeto `avgrnvpvjhymsrnapfgu`)

| Secret | Valor |
|---|---|
| `MP_ACCESS_TOKEN` | Access Token de **produção** da aplicação (`APP_USR-…`). Um token `TEST-…` é recusado (503/500 nos logs). |
| `MP_WEBHOOK_SECRET` | "Chave secreta" de **produção** do webhook (Mercado Pago → Sua integração → Webhooks). |
| `SITE_URL` (opcional) | Padrão `https://treino.personalperto.com.br`. |

Pode apagar `MP_ACCESS_TOKEN_TEST` e `MP_TEST_PAYER_EMAIL` (não são mais lidos).

## 2. Webhook no painel do Mercado Pago

- **URL (modo produção):** `https://avgrnvpvjhymsrnapfgu.supabase.co/functions/v1/mp-webhook`
  (a função fica no domínio do Supabase; `treino.personalperto.com.br` é o site estático e **não** serve `/functions/v1`).
- **Eventos:** Pagamentos (e os de assinatura, enquanto houver recorrentes legados).
- A preferência de pagamento também manda `notification_url` com o mesmo endereço, e as `back_urls`
  (`/checkout/success|failure|pending`) apontam para `https://treino.personalperto.com.br`.

## 3. Redeploy das functions

```bash
supabase functions deploy mp-subscribe --project-ref avgrnvpvjhymsrnapfgu
supabase functions deploy mp-webhook --no-verify-jwt --project-ref avgrnvpvjhymsrnapfgu
```

(`supabase functions deploy --project-ref avgrnvpvjhymsrnapfgu` sem nome publica todas.)

## 4. Teste com dinheiro real

1. Numa conta de personal de teste, abra a tela de assinatura e escolha o plano **mensal (R$ 15,00)** — é o menor valor possível:
   o preço vem do servidor (`PLANOS` em `supabase/functions/_shared/mp.ts`) e não existe plano de R$ 0,01.
2. Pague com **Pix** (ou cartão). Use outra conta do Mercado Pago como pagador: o MP não deixa a conta vendedora pagar a si mesma.
3. Depois do teste, devolva o valor em Mercado Pago → Atividades → o pagamento → **Devolver** (um reembolso gera o evento
   `refunded`, que cancela a assinatura — esperado).

## 5. Como verificar

- **Supabase → Edge Functions → `mp-subscribe` → Logs:** `criando preferência` e `resposta do MP` com `status: 201` e
  `host` `www.mercadopago.com.br` (não `sandbox.`). Se aparecer `token de teste`/`live_mode=false`, o secret está errado.
- **`mp-webhook` → Logs:** `mp-webhook recebido: {"type":"payment",…}` seguido de nenhum erro. `assinatura inválida` (401) =
  `MP_WEBHOOK_SECRET` diferente do painel; `webhook sem segredo configurado` (500) = secret ausente.
- **Banco:** `SELECT status, plano, assinatura_fim, mp_payment_id FROM treino.assinaturas WHERE professional_id = '<id>';`
  deve mostrar `status = 'ativa'` e `assinatura_fim` no futuro.
- **Painel do MP → Webhooks → Notificações:** a entrega deve aparecer com resposta 200.

## 6. Se algo falhar

| Sintoma | Causa provável |
|---|---|
| "Pagamento indisponível no momento" | `MP_ACCESS_TOKEN` ausente ou com prefixo `TEST-` (veja o log de `mp-subscribe`) |
| 401 no webhook | `MP_WEBHOOK_SECRET` não é o de produção |
| Pago mas plano não ativou | evento "Pagamentos" não marcado no painel, ou URL do webhook errada |
