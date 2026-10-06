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
// Segredos: MP_ACCESS_TOKEN_TEST (sandbox) ou MP_ACCESS_TOKEN (produção);
// SITE_URL opcional (padrão: domínio de produção).

import { createClient } from 'npm:@supabase/supabase-js@2'
import { ehPlano, PLANOS } from '../_shared/mp.ts'

const APP_URL = 'https://treino.personalperto.com.br'
const SITE_URL = (Deno.env.get('SITE_URL') || APP_URL).replace(/\/+$/, '')
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

  const resp = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify({
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
    }),
  })
  const mp = await resp.json().catch(() => ({}))
  // Em sandbox (token de teste) o checkout correto é o sandbox_init_point.
  const link: unknown = tokenProducao ? mp.init_point : (mp.sandbox_init_point ?? mp.init_point)
  if (!resp.ok || typeof link !== 'string') {
    console.error('mp-subscribe: falha ao criar preferência', resp.status, mp?.message, JSON.stringify(mp?.cause ?? null))
    return json(req, { error: 'Não foi possível abrir o pagamento. Tente novamente.' }, 502)
  }
  return json(req, { init_point: link })
})
