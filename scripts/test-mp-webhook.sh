#!/usr/bin/env bash
# Simula o aviso do Mercado Pago para o mp-webhook, com a assinatura x-signature calculada como o MP faz.
#
# Uso:   MP_WEBHOOK_SECRET='<chave secreta do webhook>' ./scripts/test-mp-webhook.sh <payment_id> [url]
# Padrão de url: https://avgrnvpvjhymsrnapfgu.supabase.co/functions/v1/mp-webhook
#
# O segredo vem SÓ da variável de ambiente (nunca coloque o valor no arquivo nem no histórico compartilhado).
# O mp-webhook consulta o pagamento na API do Mercado Pago, então o <payment_id> precisa ser real (de um pagamento do app).
# Respostas: 200 "ok" = processou; 200 "pagamento ignorado" = já processado/não aprovado; 401 = assinatura não confere.
set -euo pipefail

ID="${1:?Informe o payment_id: ./scripts/test-mp-webhook.sh <payment_id> [url]}"
URL="${2:-https://avgrnvpvjhymsrnapfgu.supabase.co/functions/v1/mp-webhook}"
: "${MP_WEBHOOK_SECRET:?Defina MP_WEBHOOK_SECRET no ambiente (a chave secreta do webhook, a mesma dos Secrets do Supabase)}"

TS="$(date +%s)000"
REQ="$(uuidgen | tr 'A-Z' 'a-z')"
MANIFEST="id:${ID};request-id:${REQ};ts:${TS};"
V1="$(printf '%s' "$MANIFEST" | openssl dgst -sha256 -hmac "$MP_WEBHOOK_SECRET" | awk '{print $NF}')"

echo "POST ${URL}?data.id=${ID}"
curl -sS -o /dev/stderr -w '\nHTTP %{http_code}\n' -X POST "${URL}?data.id=${ID}" \
  -H "Content-Type: application/json" \
  -H "x-request-id: ${REQ}" \
  -H "x-signature: ts=${TS},v1=${V1}" \
  -d "{\"action\":\"payment.updated\",\"type\":\"payment\",\"data\":{\"id\":\"${ID}\"}}"
