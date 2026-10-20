// Edge Function: confirmar-verificacao-phone   (JWT do personal)
//
// POST { code } → confere o código de 6 dígitos mais recente (não usado, não expirado, com menos de 5 erros) e, se estiver certo
// E o telefone do perfil ainda for o mesmo para o qual o código foi enviado, grava professionals.phone_verified_at.
// Não mexe em whatsapp_opt_in: o envio exige o opt-in E a verificação.
// Limite: 5 tentativas/hora por personal (falha fechada) e 5 erros por código.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { resposta503, verificarLimite } from '../_shared/rateLimit.ts'
import { codigoValido, estadoDoCodigo, hashCodigo, iguais, MAX_TENTATIVAS, telefoneNacional } from '../_shared/verificacaoPhone.ts'

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
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) })
  if (req.method !== 'POST') return json(req, { error: 'Método não permitido.' }, 405)

  const auth = req.headers.get('Authorization')
  if (!auth) return json(req, { error: 'Não autenticado.' }, 401)
  const cliente = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
  const { data: userData, error: userError } = await cliente.auth.getUser()
  if (userError || !userData.user) return json(req, { error: 'Não autenticado.' }, 401)
  const userId = userData.user.id

  let body: { code?: unknown }
  try {
    body = await req.json()
  } catch {
    return json(req, { error: 'Corpo da requisição inválido.' }, 400)
  }
  if (!codigoValido(body.code)) return json(req, { error: 'Digite o código de 6 dígitos.' }, 400)

  const limite = await verificarLimite(`phone-verif:conf:${userId}`, 5, 3600)
  if (limite === 'erro') return resposta503(cors(req))
  if (limite === 'excedido') return json(req, { error: 'Muitas tentativas. Tente de novo em uma hora.' }, 429)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { db: { schema: 'treino' } })

  const { data: linha } = await admin
    .from('phone_verification_codes')
    .select('id, phone, code_hash, expires_at, used_at, attempts')
    .eq('professional_id', userId)
    .is('used_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!linha) return json(req, { error: 'Código inválido ou expirado. Peça um novo código.' }, 400)

  const estado = estadoDoCodigo(linha)
  if (estado === 'expirado' || estado === 'usado') return json(req, { error: 'Código expirado. Peça um novo código.' }, 400)
  if (estado === 'tentativas') return json(req, { error: 'Muitas tentativas erradas. Peça um novo código.' }, 400)

  // Conta a tentativa ANTES de comparar (compare-and-set: dois palpites simultâneos não passam do limite).
  const { data: contou } = await admin
    .from('phone_verification_codes')
    .update({ attempts: linha.attempts + 1 })
    .eq('id', linha.id)
    .eq('attempts', linha.attempts)
    .select('id')
  if (!contou?.length) return json(req, { error: 'Não foi possível conferir agora. Tente de novo.' }, 409)

  const certo = iguais(await hashCodigo(body.code, linha.id), linha.code_hash)
  if (!certo) {
    const restam = MAX_TENTATIVAS - (linha.attempts + 1)
    return json(req, { error: restam > 0 ? 'Código incorreto.' : 'Código incorreto. Peça um novo código.' }, 400)
  }

  // O telefone do perfil precisa ser o mesmo para o qual o código foi enviado (senão a verificação seria de outro número).
  const { data: perfil } = await admin.from('professionals').select('phone').eq('id', userId).maybeSingle()
  if (!perfil || telefoneNacional(perfil.phone) !== linha.phone) {
    return json(req, { error: 'O telefone mudou desde o pedido do código. Peça um novo código.' }, 409)
  }

  // Uso único: se duas confirmações chegarem juntas, só uma grava.
  const agora = new Date().toISOString()
  const { data: usado } = await admin.from('phone_verification_codes').update({ used_at: agora }).eq('id', linha.id).is('used_at', null).select('id')
  if (!usado?.length) return json(req, { error: 'Código já usado. Peça um novo código.' }, 400)

  const { error } = await admin.from('professionals').update({ phone_verified_at: agora }).eq('id', userId)
  if (error) {
    console.error('confirmar-verificacao-phone: falha ao gravar a verificação', error.message)
    await admin.from('phone_verification_codes').update({ used_at: null }).eq('id', linha.id)
    return json(req, { error: 'Não foi possível concluir a verificação. Tente de novo.' }, 500)
  }
  return json(req, { ok: true, verificado_em: agora })
})
