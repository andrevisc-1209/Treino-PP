// Edge Function: mp-subscribe  (Checkout Bricks / Checkout Transparente)
//
// Recebe { plano, card_token } — o card_token é gerado no navegador pelo Brick
// do Mercado Pago (os dados do cartão nunca passam por aqui) — e cria a
// assinatura JÁ autorizada no MP. Devolve { subscription_id, status }.
//
// Segurança: o cliente só informa o NOME do plano e o token do cartão. Valor,
// periodicidade, e-mail e identidade do personal vêm do servidor (tabela PLANOS
// + JWT). O vínculo é external_reference = auth.uid(). Quem já tem assinatura
// ativa no MP é barrado (evita cobrança em duplicidade).
//
// Segredo: MP_ACCESS_TOKEN_TEST (sandbox) ou MP_ACCESS_TOKEN (produção).

import { createClient } from 'npm:@supabase/supabase-js@2'
import { atualizacaoDoPreapproval, ehPlano, PLANOS, tokenDeCartaoValido } from '../_shared/mp.ts'

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
  // ("Both payer and collector must be real or test users"). MP_TEST_PAYER_EMAIL
  // só vale sem MP_ACCESS_TOKEN (ou seja, nunca em produção).
  const payerEmail = (!tokenProducao && Deno.env.get('MP_TEST_PAYER_EMAIL')) || user.email

  let body: { plano?: unknown; card_token?: unknown }
  try {
    body = await req.json()
  } catch {
    return json(req, { error: 'Corpo da requisição inválido.' }, 400)
  }
  if (!ehPlano(body.plano)) return json(req, { error: 'Plano inválido.' }, 400)
  if (!tokenDeCartaoValido(body.card_token)) return json(req, { error: 'Dados do cartão inválidos.' }, 400)
  const plano = PLANOS[body.plano]

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { db: { schema: 'treino' } })

  const { data: atual } = await admin.from('assinaturas').select('status, mp_subscription_id').eq('professional_id', user.id).maybeSingle()
  if (atual?.status === 'ativa' && atual.mp_subscription_id) {
    return json(req, { error: 'Você já tem uma assinatura ativa.' }, 409)
  }

  const resp = await fetch('https://api.mercadopago.com/preapproval', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify({
      reason: plano.reason,
      external_reference: user.id,
      payer_email: payerEmail,
      card_token_id: body.card_token,
      back_url: `${APP_URL}/`,
      status: 'authorized',
      auto_recurring: { frequency: plano.frequency, frequency_type: 'months', transaction_amount: plano.amount, currency_id: 'BRL' },
    }),
  })
  const mp = await resp.json().catch(() => ({}))
  if (!resp.ok || !mp.id) {
    console.error('mp-subscribe: falha no MP', resp.status, mp?.message, JSON.stringify(mp?.cause ?? null))
    return json(req, { error: 'Pagamento não aprovado. Confira os dados do cartão ou tente outro cartão.' }, 402)
  }

  // Libera o acesso na hora; o webhook confirma/atualiza depois (idempotente).
  const alvo = atualizacaoDoPreapproval(mp)
  if (alvo) {
    const { error } = await admin.from('assinaturas').update(alvo.atualizacao).eq('professional_id', alvo.professionalId)
    if (error) console.error('mp-subscribe: falha ao gravar assinatura', error.message)
  }
  return json(req, { subscription_id: String(mp.id), status: mp.status })
})
