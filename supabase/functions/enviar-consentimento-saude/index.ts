// Edge Function: enviar-consentimento-saude
//
// POST { aluno_id, email? } (JWT do personal). Gera um token de uso único (7 dias), grava
// o status 'pendente' e manda ao aluno, via Resend, um e-mail com o link de autorização.
// O token fica em treino.consentimento_saude_tokens (só service_role): nunca volta ao cliente.
//
// Segredos: RESEND_API_KEY (a mesma API key do SMTP do Resend), SITE_URL (opcional),
// CONSENTIMENTO_FROM (opcional; padrão "Treino · Personal Perto <nao-responda@treino.personalperto.com.br>").

import { createClient } from 'npm:@supabase/supabase-js@2'
import { emailValido, expiraEm, montarEmailConsentimento, podeEnviarAgora } from '../_shared/consentimento.ts'

const APP_URL = 'https://treino.personalperto.com.br'
const SITE_URL = (Deno.env.get('SITE_URL') || APP_URL).replace(/\/+$/, '')
const ORIGENS_PERMITIDAS = [APP_URL, 'http://localhost:5173']
const FROM = Deno.env.get('CONSENTIMENTO_FROM') || 'Treino · Personal Perto <nao-responda@treino.personalperto.com.br>'

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

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return json(req, { error: 'Envio de e-mail indisponível no momento.' }, 503)

  const auth = req.headers.get('Authorization')
  if (!auth) return json(req, { error: 'Não autenticado.' }, 401)
  // Cliente "como o personal": o RLS garante que o aluno é dele.
  const cliente = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
    db: { schema: 'treino' },
  })
  const { data: userData, error: userError } = await cliente.auth.getUser()
  if (userError || !userData.user) return json(req, { error: 'Não autenticado.' }, 401)

  let body: { aluno_id?: unknown; email?: unknown }
  try {
    body = await req.json()
  } catch {
    return json(req, { error: 'Corpo da requisição inválido.' }, 400)
  }
  if (typeof body.aluno_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.aluno_id)) return json(req, { error: 'Aluno inválido.' }, 400)

  const { data: aluno } = await cliente
    .from('alunos')
    .select('id, name, email, professional_id, saude_consentimento_status, saude_consentimento_enviado_at')
    .eq('id', body.aluno_id)
    .maybeSingle()
  if (!aluno) return json(req, { error: 'Aluno não encontrado.' }, 404)

  // E-mail novo no payload: grava no aluno antes de enviar.
  let email: string | null = aluno.email
  if (body.email !== undefined && body.email !== null && body.email !== '') {
    if (!emailValido(body.email)) return json(req, { error: 'E-mail inválido.' }, 400)
    email = body.email.trim()
    if (email !== aluno.email) {
      const { error } = await cliente.from('alunos').update({ email }).eq('id', aluno.id)
      if (error) return json(req, { error: 'Não foi possível salvar o e-mail do aluno.' }, 500)
    }
  }
  if (!email || !emailValido(email)) return json(req, { error: 'O aluno precisa ter um e-mail para receber a solicitação.' }, 400)

  if (aluno.saude_consentimento_status === 'confirmado') return json(req, { error: 'O consentimento já foi confirmado.' }, 409)
  if (aluno.saude_consentimento_status === 'negado') return json(req, { error: 'O aluno não autorizou o registro de dados de saúde.' }, 409)
  if (aluno.saude_consentimento_status === 'pendente' && !podeEnviarAgora(aluno.saude_consentimento_enviado_at)) {
    return json(req, { error: 'A solicitação acabou de ser enviada. Aguarde um minuto para reenviar.' }, 429)
  }

  const { data: personal } = await cliente.from('professionals').select('name').eq('id', aluno.professional_id).maybeSingle()
  const nomePersonal = personal?.name?.trim() || 'Seu personal'

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { db: { schema: 'treino' } })

  // Um token por vez: os anteriores deixam de valer.
  await admin.from('consentimento_saude_tokens').delete().eq('aluno_id', aluno.id).is('used_at', null)
  const { data: tok, error: errTok } = await admin
    .from('consentimento_saude_tokens')
    .insert({ aluno_id: aluno.id, expires_at: expiraEm() })
    .select('token')
    .single()
  if (errTok || !tok) {
    console.error('enviar-consentimento-saude: falha ao gravar token', errTok?.message)
    return json(req, { error: 'Não foi possível gerar a solicitação.' }, 500)
  }

  const base = `${SITE_URL}/consentimento/saude?token=${tok.token}`
  const msg = montarEmailConsentimento({
    nomeAluno: aluno.name,
    nomePersonal,
    linkAutorizar: base,
    linkNegar: `${base}&negar=1`,
  })
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [email], subject: msg.assunto, html: msg.html, text: msg.texto }),
  })
  if (!resp.ok) {
    console.error('enviar-consentimento-saude: Resend recusou', resp.status, (await resp.text()).slice(0, 300))
    await admin.from('consentimento_saude_tokens').delete().eq('token', tok.token)
    return json(req, { error: 'Não foi possível enviar o e-mail. Confira o endereço e tente novamente.' }, 502)
  }

  const { error: errStatus } = await admin
    .from('alunos')
    .update({ saude_consentimento_status: 'pendente', saude_consentimento_enviado_at: new Date().toISOString(), saude_consentimento_confirmado_at: null })
    .eq('id', aluno.id)
  if (errStatus) console.error('enviar-consentimento-saude: e-mail enviado, mas falhou ao gravar status', errStatus.message)

  return json(req, { ok: true })
})
