// Edge Function: send-whatsapp  (JWT do personal; verify_jwt padrão = true)
//
// POST { tipo: 'teste' } — manda uma mensagem de teste ao WhatsApp do PRÓPRIO personal (telefone de professionals.phone,
// com whatsapp_opt_in ligado). O número NUNCA vem do corpo da requisição: o cadastro é aberto, então um endpoint que
// aceitasse um número deixaria qualquer conta mandar WhatsApp pela instância da plataforma para qualquer pessoa.
// Notificações de eventos (aluno concluiu treino etc.) não passam por aqui: as Edge Functions que as geram usam
// _shared/whatsapp.ts direto, com o número vindo do banco.
//
// Segredos: EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { limiteExcedido, resposta429 } from '../_shared/rateLimit.ts'
import { configEvolution, enviarTexto, mensagemDeTeste, numeroWhatsApp } from '../_shared/whatsapp.ts'

const APP_URL = 'https://treino.personalperto.com.br'
// localhost só se ALLOW_LOCALHOST_CORS=true (nunca definido em produção).
const ORIGENS_PERMITIDAS = [APP_URL, ...(Deno.env.get('ALLOW_LOCALHOST_CORS') === 'true' ? ['http://localhost:5173'] : [])]
const INTERVALO_TESTE_MS = 30_000
const ultimoTeste = new Map<string, number>() // melhor esforço: vale por instância da function

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
  const cliente = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
    db: { schema: 'treino' },
  })
  const { data: userData, error: userError } = await cliente.auth.getUser()
  if (userError || !userData.user) return json(req, { error: 'Não autenticado.' }, 401)
  const userId = userData.user.id
  // 10/min por personal: o botão de teste dispara mensagem real no WhatsApp.
  if (await limiteExcedido(`send-whatsapp:user:${userId}`, 10)) return resposta429(cors(req))

  let body: { tipo?: unknown }
  try {
    body = await req.json()
  } catch {
    return json(req, { error: 'Corpo da requisição inválido.' }, 400)
  }
  if (body.tipo !== 'teste') return json(req, { error: 'Tipo inválido.' }, 400)

  const cfg = configEvolution(Deno.env)
  if (!cfg) {
    console.error('send-whatsapp: faltam segredos EVOLUTION_API_URL / EVOLUTION_API_KEY / EVOLUTION_INSTANCE')
    return json(req, { error: 'WhatsApp indisponível no momento.' }, 503)
  }

  const { data: perfil } = await cliente.from('professionals').select('name, phone, whatsapp_opt_in').eq('id', userId).maybeSingle()
  if (!perfil?.whatsapp_opt_in) return json(req, { error: 'Ative os alertas por WhatsApp em Configurações › Notificações.' }, 409)
  const numero = numeroWhatsApp(perfil.phone)
  if (!numero) return json(req, { error: 'Cadastre um telefone válido em Configurações › Dados pessoais.' }, 422)

  const agora = Date.now()
  if (agora - (ultimoTeste.get(userId) ?? 0) < INTERVALO_TESTE_MS) return json(req, { error: 'Aguarde alguns segundos para enviar outro teste.' }, 429)
  ultimoTeste.set(userId, agora)

  try {
    await enviarTexto(cfg, numero, mensagemDeTeste(perfil.name))
  } catch (e) {
    // só o status entra no log: nada de número de telefone nem corpo da resposta da Evolution
    console.error('send-whatsapp: falha ao enviar', (e as Error).message)
    return json(req, { error: 'Não foi possível enviar agora. Tente de novo em instantes.' }, 502)
  }
  return json(req, { ok: true })
})
