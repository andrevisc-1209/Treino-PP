// Edge Function: gerar-link-treino   (JWT do personal)
//
// POST { plano_id } -> { link }. O link (https://…/treino/<token>) abre a página PÚBLICA onde o aluno,
// sem conta, vê o treino e registra o que fez (Edge Function treino-publico). Vale 7 dias e é de uso único.
// O token fica em treino.links_treino_assincrono (só service_role). Se já existe um link do treino
// ainda válido e sem uso, devolve o mesmo (não acumula links a cada clique em "enviar").
//
// Segredo opcional: SITE_URL (padrão: domínio de produção).

import { createClient } from 'npm:@supabase/supabase-js@2'

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

  const auth = req.headers.get('Authorization')
  if (!auth) return json(req, { error: 'Não autenticado.' }, 401)
  // "Como o personal": o RLS garante que o plano é de um aluno dele.
  const cliente = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
    db: { schema: 'treino' },
  })
  const { data: userData, error: userError } = await cliente.auth.getUser()
  if (userError || !userData.user) return json(req, { error: 'Não autenticado.' }, 401)

  let body: { plano_id?: unknown }
  try {
    body = await req.json()
  } catch {
    return json(req, { error: 'Corpo da requisição inválido.' }, 400)
  }
  if (typeof body.plano_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.plano_id)) return json(req, { error: 'Treino inválido.' }, 400)

  const { data: plano } = await cliente.from('planos').select('id, aluno_id, professional_id, active').eq('id', body.plano_id).maybeSingle()
  if (!plano) return json(req, { error: 'Treino não encontrado.' }, 404)
  if (!plano.active) return json(req, { error: 'Este treino está inativo.' }, 409)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { db: { schema: 'treino' } })

  const { data: existente } = await admin
    .from('links_treino_assincrono')
    .select('token')
    .eq('plano_id', plano.id)
    .is('usado_em', null)
    .gt('expira_em', new Date().toISOString())
    .order('criado_em', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (existente) return json(req, { link: `${SITE_URL}/treino/${existente.token}` })

  const { data: novo, error } = await admin
    .from('links_treino_assincrono')
    .insert({ plano_id: plano.id, aluno_id: plano.aluno_id, professional_id: plano.professional_id })
    .select('token')
    .single()
  if (error || !novo) {
    console.error('gerar-link-treino: falha ao gravar link', error?.message)
    return json(req, { error: 'Não foi possível gerar o link.' }, 500)
  }
  return json(req, { link: `${SITE_URL}/treino/${novo.token}` })
})
