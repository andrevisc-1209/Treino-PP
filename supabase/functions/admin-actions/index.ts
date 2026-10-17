// Edge Function: admin-actions
//
// Única ação do painel admin que precisa mesmo de server-side com
// service_role: disparar o e-mail de reset de senha (o link nunca volta na resposta) e gravar admin_logs. As outras ações do painel
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
import { normalizarEmailAdmin } from '../_shared/adminAcoes.ts'
import { resposta429, resposta503, verificarLimite } from '../_shared/rateLimit.ts'

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

  // 10 ações por hora por admin (falha fechada): admin comprometido não vira disparador de e-mail.
  const limite = await verificarLimite(`admin-actions:user:${userData.user.id}`, 10, 3600)
  if (limite === 'erro') return resposta503(CORS_HEADERS)
  if (limite === 'excedido') return resposta429(CORS_HEADERS)

  let body: { acao?: unknown; email?: unknown }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Corpo da requisição inválido.' }, 400)
  }

  const email = normalizarEmailAdmin(body.email)
  if (body.acao !== 'reset_senha' || !email) {
    return jsonResponse({ error: 'Ação desconhecida ou e-mail inválido.' }, 400)
  }

  // Client admin (service_role): só para achar o alvo e gravar a trilha de auditoria.
  const clienteAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  // O destinatário PRECISA ser um personal cadastrado: o admin não serve de relé de e-mail para endereços quaisquer.
  const { data: alvo, error: errAlvo } = await clienteAdmin.schema('treino').from('professionals').select('id').eq('email', email).maybeSingle()
  if (errAlvo) {
    console.error('admin-actions: falha ao buscar o personal', errAlvo.message)
    return jsonResponse({ error: 'Não foi possível concluir a ação.' }, 500)
  }
  if (!alvo) return jsonResponse({ error: 'Personal não encontrado.' }, 404)

  // Auditoria ANTES da ação: se o log não gravar, a ação não acontece.
  const { error: errLog } = await clienteAdmin.schema('treino').from('admin_logs').insert({
    admin_id: userData.user.id,
    acao: 'reset_senha',
    target_professional_id: alvo.id,
    detalhes: { email },
  })
  if (errLog) {
    console.error('admin-actions: falha ao gravar o log de auditoria', errLog.message)
    return jsonResponse({ error: 'Não foi possível registrar a ação.' }, 500)
  }

  // generateLink NÃO envia e-mail e devolveria o link a quem chama (tomada de conta se interceptado).
  // resetPasswordForEmail manda o e-mail de recuperação direto ao personal (SMTP/template do Supabase Auth)
  // e não devolve link algum. Client anônimo e sem sessão: o envio é do próprio Auth.
  const clienteAuth = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false } })
  const { error: linkError } = await clienteAuth.auth.resetPasswordForEmail(email, { redirectTo: `${APP_URL}definir-senha` })
  if (linkError) {
    console.error('admin-actions: falha ao enviar e-mail de redefinição', linkError.status ?? '')
    return jsonResponse({ error: 'Não foi possível enviar o e-mail de redefinição.' }, 400)
  }

  return jsonResponse({ success: true, email })
})
