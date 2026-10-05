// Edge Function: mp-subscribe
//
// Cria uma assinatura "pending" no Mercado Pago e devolve o init_point
// (checkout hospedado do MP) pro frontend redirecionar.
//
// Segurança: o cliente só informa o NOME do plano. Valor, periodicidade,
// e-mail e identidade do personal vêm do servidor (tabela PLANOS + JWT) —
// nada que o cliente mande decide quanto cobrar nem quem recebe a assinatura.
// O vínculo com o personal é external_reference = auth.uid(), que o webhook
// usa pra achar a linha em treino.assinaturas.
//
// Segredo: MP_ACCESS_TOKEN_TEST (sandbox) ou MP_ACCESS_TOKEN (produção).

import { createClient } from 'npm:@supabase/supabase-js@2'
import { ehPlano, PLANOS } from '../_shared/mp.ts'

const APP_URL = 'https://treino.personalperto.com.br'
const ORIGENS_PERMITIDAS = [APP_URL, 'http://localhost:5173']

function cors(req: Request) {
  const origem = req.headers.get('Origin') ?? ''
  return {
    'Access-Control-Allow-Origin': ORIGENS_PERMITIDAS.includes(origem) ? origem : APP_URL,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) })
  if (req.method !== 'POST') return json(req, { error: 'Método não permitido.' }, 405)

  const tokenProducao = Deno.env.get('MP_ACCESS_TOKEN')
  const token = tokenProducao ?? Deno.env.get('MP_ACCESS_TOKEN_TEST')
  if (!token) return json(req, { error: 'Pagamento indisponível no momento.' }, 503)

  const auth = req.headers.get('Authorization')
  if (!auth) return json(req, { error: 'Não autenticado.' }, 401)
  const cliente = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
  const { data: userData, error: userError } = await cliente.auth.getUser()
  if (userError || !userData.user?.email) return json(req, { error: 'Não autenticado.' }, 401)
  const user = userData.user
  // Sandbox: o MP só aceita comprador que também seja usuário de TESTE
  // ("Both payer and collector must be real or test users"), então o e-mail de
  // login do app é recusado. MP_TEST_PAYER_EMAIL só vale sem MP_ACCESS_TOKEN
  // (ou seja, nunca em produção).
  const payerEmail = (!tokenProducao && Deno.env.get('MP_TEST_PAYER_EMAIL')) || user.email

  let body: { plano?: unknown }
  try {
    body = await req.json()
  } catch {
    return json(req, { error: 'Corpo da requisição inválido.' }, 400)
  }
  if (!ehPlano(body.plano)) return json(req, { error: 'Plano inválido.' }, 400)
  const plano = PLANOS[body.plano]

  // Obs.: assinatura COM plano associado (preapproval_plan_id) exige card_token_id
  // (cartão tokenizado no frontend via MP.js). Sem plano, o MP devolve o
  // init_point de checkout hospedado — é o fluxo usado aqui.
  const resp = await fetch('https://api.mercadopago.com/preapproval', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reason: plano.reason,
      external_reference: user.id,
      payer_email: payerEmail,
      back_url: `${APP_URL}/login?plano=${body.plano}&status=sucesso`,
      status: 'pending',
      auto_recurring: { frequency: plano.frequency, frequency_type: 'months', transaction_amount: plano.amount, currency_id: 'BRL' },
    }),
  })
  const mp = await resp.json().catch(() => ({}))
  if (!resp.ok || !mp.init_point) {
    console.error('mp-subscribe: falha no MP', resp.status, mp?.message)
    return json(req, { error: 'Não foi possível iniciar o pagamento. Tente de novo.' }, 502)
  }
  return json(req, { init_point: mp.init_point })
})
