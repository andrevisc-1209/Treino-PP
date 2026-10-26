// Edge Function: verificar-cadastro  (pública: verify_jwt = false no config.toml)
//
// POST { campo: 'cpf' | 'email', valor } → { existe: boolean }
// Usada no cadastro e no "Complete seu perfil": assim que o CPF ou o e-mail é digitado, o app avisa se já existe conta e leva a
// pessoa para entrar ou recuperar a senha. NUNCA devolve dado da conta (nem o e-mail do CPF, nem o CPF do e-mail).
// Se quem chama está logado (Authorization com a sessão), a própria conta é ignorada (o perfil pós-Google confere o CPF de si mesmo).
// Limite por IP, falha FECHADA (503 → o app segue sem o aviso). Nunca logar CPF nem e-mail.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { verificarLimite } from '../_shared/rateLimit.ts'
import { ipDoCliente } from '../_shared/consentimento.ts'
import { escaparIlike, LIMITE_VERIFICACAO, LIMITE_VERIFICACAO_SEM_IP, lerPedidoVerificacao } from '../_shared/verificarCadastro.ts'

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
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) })
  if (req.method !== 'POST') return json(req, { error: 'Método não permitido.' }, 405)

  const pedido = lerPedidoVerificacao(await req.json().catch(() => null))
  if (!pedido) return json(req, { error: 'Pedido inválido.' }, 400)

  const ip = ipDoCliente(req.headers)
  const limite = ip ? LIMITE_VERIFICACAO : LIMITE_VERIFICACAO_SEM_IP
  const lim = await verificarLimite(`verificar-cadastro:ip:${ip ?? 'sem-ip'}`, limite.max, limite.janelaSeg)
  if (lim === 'erro') return json(req, { error: 'Serviço temporariamente indisponível.' }, 503)
  if (lim === 'excedido') return json(req, { error: 'Muitas consultas. Aguarde alguns minutos.' }, 429)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { db: { schema: 'treino' } })

  // sessão opcional: ignora a própria conta (o apikey anônimo do app não é uma sessão de usuário e getUser devolve erro: segue sem ignorar)
  let meuId: string | null = null
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (token) {
    const { data } = await admin.auth.getUser(token)
    meuId = data.user?.id ?? null
  }

  let consulta = admin.from('professionals').select('id', { count: 'exact', head: true })
  consulta = pedido.campo === 'cpf' ? consulta.eq('cpf', pedido.cpf) : consulta.ilike('email', escaparIlike(pedido.email))
  if (meuId) consulta = consulta.neq('id', meuId)
  const { count, error } = await consulta
  if (error) {
    console.error('verificar-cadastro: falha na consulta', error.code)
    return json(req, { error: 'Serviço temporariamente indisponível.' }, 503)
  }
  return json(req, { existe: (count ?? 0) > 0 })
})
