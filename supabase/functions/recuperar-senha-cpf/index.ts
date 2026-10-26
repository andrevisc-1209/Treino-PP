// Edge Function: recuperar-senha-cpf  (pública: verify_jwt = false no config.toml)
//
// POST { cpf, captchaToken } → { ok: true, mensagem }
// Envia o link de redefinição de senha ao e-mail do cadastro dono do CPF, sem dizer se o CPF existe e sem devolver o e-mail.
// A resposta é SEMPRE a mesma (e leva ao menos PISO_RECUPERACAO_MS). Captcha conferido pelo Auth. Limite por CPF e por IP, falha FECHADA.
// Nunca logar CPF nem e-mail.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { verificarLimite } from '../_shared/rateLimit.ts'
import { ipDoCliente } from '../_shared/consentimento.ts'
import {
  LIMITE_RECUPERACAO_CPF,
  LIMITE_RECUPERACAO_IP,
  LIMITE_RECUPERACAO_SEM_IP,
  lerPedidoRecuperacao,
  MSG_LIMITE_RECUPERACAO,
  MSG_RECUPERACAO,
  PISO_RECUPERACAO_MS,
} from '../_shared/recuperarSenha.ts'

const APP_URL = 'https://treino.personalperto.com.br'
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
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
}

Deno.serve(async (req) => {
  const inicio = Date.now()
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) })
  if (req.method !== 'POST') return json(req, { error: 'Método não permitido.' }, 405)

  const pedido = lerPedidoRecuperacao(await req.json().catch(() => null))
  if (!pedido) return json(req, { error: 'Informe um CPF válido.' }, 400)

  const ip = ipDoCliente(req.headers)
  const limiteIp = ip ? LIMITE_RECUPERACAO_IP : LIMITE_RECUPERACAO_SEM_IP
  const resultados = [
    await verificarLimite(`recuperar-senha:ip:${ip ?? 'sem-ip'}`, limiteIp.max, limiteIp.janelaSeg),
    await verificarLimite(`recuperar-senha:cpf:${pedido.cpf}`, LIMITE_RECUPERACAO_CPF.max, LIMITE_RECUPERACAO_CPF.janelaSeg),
  ]
  if (resultados.includes('erro')) return json(req, { error: 'Serviço temporariamente indisponível. Tente de novo em instantes.' }, 503)
  if (resultados.includes('excedido')) return json(req, { error: MSG_LIMITE_RECUPERACAO }, 429)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { db: { schema: 'treino' } })
  const { data: personal, error: erroBusca } = await admin.from('professionals').select('email').eq('cpf', pedido.cpf).maybeSingle()
  if (erroBusca) {
    console.error('recuperar-senha-cpf: falha ao buscar o CPF', erroBusca.code)
    return json(req, { error: 'Serviço temporariamente indisponível. Tente de novo em instantes.' }, 503)
  }

  // Sem conta: mesmo caminho (ida ao Auth com e-mail que não existe) para o captcha e o tempo não denunciarem.
  const email = personal?.email || `sem-conta-${crypto.randomUUID()}@invalid.example`
  const auth = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await auth.auth.resetPasswordForEmail(email, { redirectTo: `${APP_URL}/definir-senha`, captchaToken: pedido.captchaToken })

  if (error) {
    const code = error.code ?? ''
    if (code === 'captcha_failed' || /captcha/i.test(error.message ?? '')) return json(req, { error: 'Não foi possível confirmar que você não é um robô. Tente de novo.' }, 400)
    if (error.status === 429 || code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit') return json(req, { error: MSG_LIMITE_RECUPERACAO }, 429)
    // Outros erros do Auth não podem diferenciar conta existente de inexistente: loga só o código e responde como sucesso.
    console.error('recuperar-senha-cpf: erro do Auth', error.status, code)
  }

  await new Promise((r) => setTimeout(r, Math.max(0, PISO_RECUPERACAO_MS - (Date.now() - inicio))))
  return json(req, { ok: true, mensagem: MSG_RECUPERACAO })
})
