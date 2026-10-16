// Edge Function: mp-subscribe  (Checkout Pro)
//
// Recebe { plano } e cria uma Preference no Checkout Pro do Mercado Pago, que
// aceita Pix, cartão e boleto numa tela hospedada pelo MP. Devolve { init_point }
// e o app redireciona o navegador pra lá. Pagamento avulso: sem renovação
// automática — cada pagamento aprovado compra o período do plano (ver o webhook).
//
// Segurança: o cliente só informa o NOME do plano. Valor, período e identidade do
// personal vêm do servidor (tabela PLANOS + JWT). O vínculo é external_reference
// e metadata.user_id = auth.uid(). Quem ainda tem assinatura RECORRENTE ativa
// (legado, Preapproval) é barrado pra não cobrar em duplicidade.
//
// Segredos: MP_ACCESS_TOKEN (produção; token "TEST-" é recusado); SITE_URL opcional (padrão: domínio de produção).

import { createClient } from 'npm:@supabase/supabase-js@2'
import { ehPlano, PLANOS, tokenMpValido } from '../_shared/mp.ts'

const APP_URL = 'https://treino.personalperto.com.br'
const SITE_URL = (Deno.env.get('SITE_URL') || APP_URL).replace(/\/+$/, '')
// localhost só se ALLOW_LOCALHOST_CORS=true (nunca definido em produção).
const ORIGENS_PERMITIDAS = [APP_URL, ...(Deno.env.get('ALLOW_LOCALHOST_CORS') === 'true' ? ['http://localhost:5173'] : [])]

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

  const token = Deno.env.get('MP_ACCESS_TOKEN')
  if (!tokenMpValido(token)) {
    console.error('mp-subscribe: MP_ACCESS_TOKEN ausente ou é um token de teste (TEST-)')
    return json(req, { error: 'Pagamento indisponível no momento.' }, 503)
  }

  const auth = req.headers.get('Authorization')
  if (!auth) return json(req, { error: 'Não autenticado.' }, 401)
  const cliente = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
  const { data: userData, error: userError } = await cliente.auth.getUser()
  if (userError || !userData.user?.email) return json(req, { error: 'Não autenticado.' }, 401)
  const user = userData.user
  const payerEmail = user.email

  let body: { plano?: unknown }
  try {
    body = await req.json()
  } catch {
    return json(req, { error: 'Corpo da requisição inválido.' }, 400)
  }
  if (!ehPlano(body.plano)) return json(req, { error: 'Plano inválido.' }, 400)
  const slug = body.plano
  const plano = PLANOS[slug]

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { db: { schema: 'treino' } })

  const { data: atual } = await admin.from('assinaturas').select('status, mp_subscription_id').eq('professional_id', user.id).maybeSingle()
  if (atual?.status === 'ativa' && atual.mp_subscription_id) {
    return json(req, { error: 'Você já tem uma assinatura recorrente ativa.' }, 409)
  }

  const preferencia = {
    items: [{ id: slug, title: plano.reason, quantity: 1, unit_price: plano.amount, currency_id: 'BRL' }],
    payer: { email: payerEmail },
    external_reference: user.id,
    metadata: { user_id: user.id, plan_slug: slug, period_days: plano.periodDays },
    back_urls: {
      success: `${SITE_URL}/checkout/success`,
      failure: `${SITE_URL}/checkout/failure`,
      pending: `${SITE_URL}/checkout/pending`,
    },
    auto_return: 'approved',
    notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mp-webhook`,
    statement_descriptor: 'TREINO PP',
  }
  // Diagnóstico: o payload vai pro log SEM o e-mail do comprador (só o domínio) e sem token.
  console.log('mp-subscribe: criando preferência', JSON.stringify({ payer_dominio: payerEmail.split('@')[1] ?? null, preferencia: { ...preferencia, payer: { email: '***@' + (payerEmail.split('@')[1] ?? '') } } }))
  const resp = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify(preferencia),
  })
  const mp = await resp.json().catch(() => ({}))
  const link: unknown = mp.init_point
  console.log('mp-subscribe: resposta do MP', JSON.stringify({ status: resp.status, preference_id: mp.id ?? null, live_mode: mp.live_mode ?? null, host: typeof link === 'string' ? new URL(link).host : null }))
  // Produção: a preferência tem que nascer live_mode=true; se vier de teste, não manda o personal pagar.
  if (resp.ok && mp.live_mode === false) {
    console.error('mp-subscribe: preferência criada em modo de teste (live_mode=false) — verifique o MP_ACCESS_TOKEN')
    return json(req, { error: 'Pagamento indisponível no momento.' }, 503)
  }
  if (!resp.ok || typeof link !== 'string') {
    console.error('mp-subscribe: falha ao criar preferência', resp.status, mp?.message, JSON.stringify(mp?.cause ?? null))
    return json(req, { error: 'Não foi possível abrir o pagamento. Tente novamente.' }, 502)
  }
  return json(req, { init_point: link })
})
