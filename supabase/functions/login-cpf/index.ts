// Edge Function: login-cpf  (pública: verify_jwt = false no config.toml)
//
// POST { cpf, password, captchaToken } — entrar com CPF e senha.
// O CPF é resolvido para o e-mail AQUI, no servidor: o e-mail nunca volta ao navegador e nenhuma resposta diz se o CPF existe.
// Qualquer falha de credencial (CPF sem conta, senha errada, conta só do Google, e-mail não confirmado) devolve a MESMA resposta (401).
// Captcha: o token do Turnstile é repassado ao Supabase Auth, que o confere (Dashboard > Auth > Attack Protection).
// Tempo: falha de credencial responde só depois de PISO_FALHA_MS (o tempo não revela se o CPF existe).
// Limites: por IP e por CPF, janela fixa, falha FECHADA. Só atrasam: não trancam a conta (ninguém tranca o personal só sabendo o CPF).
// Nunca logar CPF, e-mail ou senha.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { verificarLimite } from '../_shared/rateLimit.ts'
import { ipDoCliente } from '../_shared/consentimento.ts'
import { classificarErroAuth, esperaAteOPiso, falhaLogin, LIMITE_CPF, LIMITE_IP, LIMITE_SEM_IP, lerPedido, MSG_LIMITE, type FalhaLogin } from '../_shared/loginCpf.ts'

const APP_URL = 'https://treino.personalperto.com.br'
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
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
}

const falha = (req: Request, f: FalhaLogin) => json(req, f.corpo, f.status)

Deno.serve(async (req) => {
  const inicio = Date.now()
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) })
  if (req.method !== 'POST') return json(req, { error: 'Método não permitido.' }, 405)

  let corpo: unknown
  try {
    corpo = await req.json()
  } catch {
    return falha(req, falhaLogin('pedido'))
  }
  const pedido = lerPedido(corpo)
  if (!pedido) return falha(req, falhaLogin('pedido'))

  // Limites ANTES de qualquer consulta ao CPF; a mensagem é a mesma exista a conta ou não.
  const ip = ipDoCliente(req.headers)
  const limiteIp = ip ? LIMITE_IP : LIMITE_SEM_IP
  const chaveIp = `login-cpf:ip:${ip ?? 'sem-ip'}`
  const resultados = [await verificarLimite(chaveIp, limiteIp.max, limiteIp.janelaSeg), await verificarLimite(`login-cpf:cpf:${pedido.cpf}`, LIMITE_CPF.max, LIMITE_CPF.janelaSeg)]
  if (resultados.includes('erro')) return json(req, { error: 'Serviço temporariamente indisponível. Tente de novo em instantes.' }, 503)
  if (resultados.includes('excedido')) return json(req, { error: MSG_LIMITE }, 429)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { db: { schema: 'treino' } })
  const { data: personal, error: erroBusca } = await admin.from('professionals').select('email').eq('cpf', pedido.cpf).maybeSingle()
  if (erroBusca) {
    console.error('login-cpf: falha ao buscar o CPF', erroBusca.code)
    return json(req, { error: 'Serviço temporariamente indisponível. Tente de novo em instantes.' }, 503)
  }

  // Sem conta para o CPF: faz o MESMO caminho (ida ao Auth com e-mail que não existe) para o tempo e o captcha não denunciarem.
  const email = personal?.email || `sem-conta-${crypto.randomUUID()}@invalid.example`
  const auth = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await auth.auth.signInWithPassword({ email, password: pedido.password, options: { captchaToken: pedido.captchaToken } })

  if (error || !data.session || !personal?.email) {
    const destino = error ? classificarErroAuth(error) : 'credenciais'
    if (error && destino === 'credenciais' && error.code !== 'invalid_credentials' && error.code !== 'email_not_confirmed') console.error('login-cpf: erro inesperado do Auth', error.status, error.code)
    // Falha de credencial só responde depois do piso de tempo: existe/não existe levam o mesmo tempo (e adiar ajuda contra adivinhação).
    if (destino === 'credenciais') await new Promise((r) => setTimeout(r, esperaAteOPiso(Date.now() - inicio)))
    return falha(req, falhaLogin(destino))
  }

  return json(req, { session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token } })
})
