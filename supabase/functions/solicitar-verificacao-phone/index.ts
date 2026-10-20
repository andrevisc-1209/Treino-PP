// Edge Function: solicitar-verificacao-phone   (JWT do personal)
//
// POST { phone } → manda um código de 6 dígitos por WhatsApp para esse número (vale 10 min). Só quem confirma o código
// (confirmar-verificacao-phone) passa a ter `phone_verified_at`, e sem ele a plataforma não envia nenhuma notificação.
//
// O destino vem do corpo, então a mensagem é SEMPRE o mesmo texto fixo (sem conteúdo do usuário) e há dois limites com falha
// fechada: 3 pedidos/hora por personal e 3 pedidos/dia por número (vale entre contas — impede várias contas
// "empurrando" códigos para a mesma pessoa). Não revela se o número já existe em outro perfil.
//
// Segredos: EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { resposta429, resposta503, verificarLimite } from '../_shared/rateLimit.ts'
import { configEvolution, enviarTexto, numeroWhatsApp } from '../_shared/whatsapp.ts'
import { chaveDoNumero, expiraEm, gerarCodigo, hashCodigo, mensagemCodigo, telefoneNacional } from '../_shared/verificacaoPhone.ts'

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

  let body: { phone?: unknown }
  try {
    body = await req.json()
  } catch {
    return json(req, { error: 'Corpo da requisição inválido.' }, 400)
  }
  const nacional = telefoneNacional(body.phone)
  const numero = numeroWhatsApp(nacional)
  if (!nacional || !numero) return json(req, { error: 'Telefone inválido. Use DDD + número.' }, 400)

  // Limites (falha fechada): por personal e por número destino.
  const porPersonal = await verificarLimite(`phone-verif:req:${userId}`, 3, 3600)
  if (porPersonal === 'erro') return resposta503(cors(req))
  if (porPersonal === 'excedido') return json(req, { error: 'Muitos pedidos de código. Tente de novo em uma hora.' }, 429)
  const porNumero = await verificarLimite(`phone-verif:num:${await chaveDoNumero(nacional)}`, 3, 86400)
  if (porNumero === 'erro') return resposta503(cors(req))
  if (porNumero === 'excedido') return resposta429(cors(req))

  const cfg = configEvolution(Deno.env)
  if (!cfg) {
    console.error('solicitar-verificacao-phone: faltam segredos EVOLUTION_API_URL / EVOLUTION_API_KEY / EVOLUTION_INSTANCE')
    return json(req, { error: 'Verificação indisponível no momento.' }, 503)
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { db: { schema: 'treino' } })
  const agora = new Date()

  // Um código por vez: os pendentes anteriores deixam de valer; códigos com mais de 1 dia são apagados.
  await admin.from('phone_verification_codes').update({ used_at: agora.toISOString() }).eq('professional_id', userId).is('used_at', null)
  await admin.from('phone_verification_codes').delete().eq('professional_id', userId).lt('created_at', new Date(agora.getTime() - 86_400_000).toISOString())

  const codigo = gerarCodigo()
  const id = crypto.randomUUID()
  const { error: errInsert } = await admin.from('phone_verification_codes').insert({
    id,
    professional_id: userId,
    phone: nacional,
    code_hash: await hashCodigo(codigo, id),
    expires_at: expiraEm(agora),
  })
  if (errInsert) {
    console.error('solicitar-verificacao-phone: falha ao gravar código', errInsert.message)
    return json(req, { error: 'Não foi possível enviar o código agora.' }, 500)
  }

  try {
    await enviarTexto(cfg, numero, mensagemCodigo(codigo))
  } catch (e) {
    // só o status entra no log (nada de número, código ou corpo da Evolution); a mensagem ao usuário é genérica
    console.error('solicitar-verificacao-phone: falha ao enviar', (e as Error).message)
    await admin.from('phone_verification_codes').delete().eq('id', id)
    return json(req, { error: 'Não foi possível enviar o código. Confira o número e tente de novo.' }, 502)
  }
  return json(req, { ok: true, expira_em: expiraEm(agora) })
})
