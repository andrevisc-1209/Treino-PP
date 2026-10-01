// Edge Function: admin-actions
//
// Única ação do painel admin que precisa mesmo de server-side com
// service_role: gerar o link de reset de senha via Supabase Auth Admin
// API (supabase.auth.admin.generateLink). As outras ações do painel
// (alterar trial, alterar plano, listar personais) são funções SQL
// SECURITY DEFINER (ver migration 20261007000000_admin_role.sql) — não
// precisam de Edge Function nem de service_role.
//
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são injetadas automaticamente
// pelo ambiente de Edge Functions do Supabase — não precisa configurar
// como secret manualmente.
//
// Segurança: nunca confia no frontend. Valida o JWT de quem chamou e
// confere is_admin no banco (com um client separado, autenticado como o
// chamador, sujeito a RLS) antes de usar o client admin pra qualquer coisa.

import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APP_URL = 'https://treino.personalperto.com.br/'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': APP_URL.replace(/\/$/, ''),
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse({ error: 'Método não permitido.' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return jsonResponse({ error: 'Não autenticado.' }, 401)

  // Client "como o chamador" — sujeito a RLS, só pra confirmar quem é e
  // se é admin (professionals_self_read já deixa cada um ler a própria
  // linha, incluindo is_admin).
  const clienteChamador = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
    db: { schema: 'treino' },
  })

  const { data: userData, error: userError } = await clienteChamador.auth.getUser()
  if (userError || !userData.user) return jsonResponse({ error: 'Não autenticado.' }, 401)

  const { data: professional, error: profError } = await clienteChamador.from('professionals').select('is_admin').eq('id', userData.user.id).single()

  if (profError || !professional?.is_admin) return jsonResponse({ error: 'Acesso restrito ao admin.' }, 403)

  let body: { acao?: string; email?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Corpo da requisição inválido.' }, 400)
  }

  if (body.acao !== 'reset_senha' || !body.email) {
    return jsonResponse({ error: 'Ação desconhecida.' }, 400)
  }

  // Client admin — só a partir daqui, e só pra essa chamada específica.
  const clienteAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: linkData, error: linkError } = await clienteAdmin.auth.admin.generateLink({
    type: 'recovery',
    email: body.email,
    options: { redirectTo: `${APP_URL}definir-senha` },
  })

  if (linkError) return jsonResponse({ error: linkError.message }, 400)

  await clienteAdmin.schema('treino').from('admin_logs').insert({
    admin_id: userData.user.id,
    acao: 'reset_senha',
    target_professional_id: null,
    detalhes: { email: body.email },
  })

  return jsonResponse({ ok: true, actionLink: linkData.properties?.action_link ?? null })
})
