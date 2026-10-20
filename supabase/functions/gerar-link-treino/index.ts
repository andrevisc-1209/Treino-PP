// Edge Function: gerar-link-treino   (JWT do personal)
//
// POST { plano_id, validade_horas?: 24|48|72, sem_prazo?: true (= teto de 30 dias) } -> { link, expira_em }. O link (https://…/treino/<token>) abre a página PÚBLICA onde o aluno,
// sem conta, vê o treino e registra o que fez (Edge Function treino-publico). Vale 48 h por padrão (24/48/72 h ou sem prazo, à escolha do personal) e é de uso único.
// O token fica em treino.links_treino_assincrono (só service_role). Se já existe um link do treino
// ainda válido e sem uso, devolve o mesmo (não acumula links a cada clique em "enviar").
//
// Segredo opcional: SITE_URL (padrão: domínio de produção).

import { createClient } from 'npm:@supabase/supabase-js@2'
import { expiraEmDaValidade, validadeDoPedido } from '../_shared/execucao.ts'
import { respostaDoLimite, verificarLimite } from '../_shared/rateLimit.ts'

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

  const auth = req.headers.get('Authorization')
  if (!auth) return json(req, { error: 'Não autenticado.' }, 401)
  // "Como o personal": o RLS garante que o plano é de um aluno dele.
  const cliente = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
    db: { schema: 'treino' },
  })
  const { data: userData, error: userError } = await cliente.auth.getUser()
  if (userError || !userData.user) return json(req, { error: 'Não autenticado.' }, 401)
  // 20/hora por personal, falha ABERTA: se o banco do limite cair, o envio de treino ao aluno não pode parar.
  const bloqueio = respostaDoLimite(await verificarLimite(`gerar-link:${userData.user.id}`, 20, 3600), 'aberta', cors(req), 'Muitas tentativas. Aguarde alguns minutos e tente de novo.')
  if (bloqueio) return bloqueio

  let body: { plano_id?: unknown; validade_horas?: unknown; sem_prazo?: unknown }
  try {
    body = await req.json()
  } catch {
    return json(req, { error: 'Corpo da requisição inválido.' }, 400)
  }
  if (typeof body.plano_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.plano_id)) return json(req, { error: 'Treino inválido.' }, 400)

  const validade = validadeDoPedido(body.validade_horas, body.sem_prazo)
  if (validade === undefined) return json(req, { error: 'Validade inválida.' }, 400)
  const expiraEm = expiraEmDaValidade(validade)

  const { data: plano } = await cliente.from('planos').select('id, aluno_id, professional_id, active').eq('id', body.plano_id).maybeSingle()
  if (!plano) return json(req, { error: 'Treino não encontrado.' }, 404)
  if (!plano.active) return json(req, { error: 'Este treino está inativo.' }, 409)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { db: { schema: 'treino' } })

  const { data: existente } = await admin
    .from('links_treino_assincrono')
    .select('id, token')
    .eq('plano_id', plano.id)
    .is('usado_em', null)
    .or(`expira_em.is.null,expira_em.gt.${new Date().toISOString()}`)
    .order('criado_em', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (existente) {
    // Reenvio: o prazo passa a ser o escolhido agora (a contagem recomeça).
    const { error: errPrazo } = await admin.from('links_treino_assincrono').update({ expira_em: expiraEm }).eq('id', existente.id)
    if (errPrazo) {
      console.error('gerar-link-treino: falha ao atualizar prazo', errPrazo.message)
      return json(req, { error: 'Não foi possível gerar o link.' }, 500)
    }
    return json(req, { link: `${SITE_URL}/treino/${existente.token}`, expira_em: expiraEm })
  }

  const { data: novo, error } = await admin
    .from('links_treino_assincrono')
    .insert({ plano_id: plano.id, aluno_id: plano.aluno_id, professional_id: plano.professional_id, expira_em: expiraEm })
    .select('token')
    .single()
  if (error || !novo) {
    console.error('gerar-link-treino: falha ao gravar link', error?.message)
    return json(req, { error: 'Não foi possível gerar o link.' }, 500)
  }
  return json(req, { link: `${SITE_URL}/treino/${novo.token}`, expira_em: expiraEm })
})
