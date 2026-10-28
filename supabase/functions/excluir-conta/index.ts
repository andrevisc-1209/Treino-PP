// Edge Function: excluir-conta  (JWT do personal; verify_jwt padrão = ligado)
//
// POST { confirmacao: "EXCLUIR" } — o personal pede a exclusão da PRÓPRIA conta (LGPD, art. 18, VI), dentro do app.
//   1. o pedido é registrado pelo banco COMO o personal (RPC treino.solicitar_exclusao_conta: confere o "EXCLUIR", recusa conta admin,
//      bloqueia a conta em modo leitura, desliga os avisos de WhatsApp e gera o protocolo; idempotente);
//   2. manda o e-mail com protocolo e prazo (Resend). Se o e-mail falhar, o pedido continua valendo e o app mostra o protocolo;
//   3. invalida TODAS as sessões do personal (logout em todos os aparelhos). O personal ainda pode entrar para CANCELAR até a data prevista.
// A exclusão de verdade é feita 30 dias depois pelo job diário treino.finalizar_exclusoes_vencidas() (supabase/cron/exclusao_de_conta.sql).
// Limite por usuário, falha FECHADA. Nunca logar e-mail, nome ou CPF.
//
// Segredos: RESEND_API_KEY (a mesma do SMTP). Remetente fixo: "Treino PP <noreply@personalperto.com.br>".

import { createClient } from 'npm:@supabase/supabase-js@2'
import { confirmacaoValida, lerSolicitacao, montarEmailExclusao } from '../_shared/exclusaoConta.ts'
import { verificarLimite } from '../_shared/rateLimit.ts'

const APP_URL = 'https://treino.personalperto.com.br'
const ORIGENS_PERMITIDAS = [APP_URL, ...(Deno.env.get('ALLOW_LOCALHOST_CORS') === 'true' ? ['http://localhost:5173'] : [])]
const FROM = 'Treino PP <noreply@personalperto.com.br>'

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

  const auth = req.headers.get('Authorization')
  const token = (auth ?? '').replace(/^Bearer\s+/i, '')
  if (!auth || !token) return json(req, { error: 'Não autenticado.' }, 401)

  // cliente "como o personal": o banco confere quem é pelo JWT
  const cliente = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
    db: { schema: 'treino' },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData, error: userError } = await cliente.auth.getUser(token)
  if (userError || !userData.user) return json(req, { error: 'Não autenticado.' }, 401)
  const user = userData.user

  let corpo: { confirmacao?: unknown }
  try {
    corpo = await req.json()
  } catch {
    return json(req, { error: 'Corpo da requisição inválido.' }, 400)
  }
  if (!confirmacaoValida(corpo.confirmacao)) return json(req, { error: 'Digite EXCLUIR para confirmar.' }, 400)

  const lim = await verificarLimite(`excluir-conta:user:${user.id}`, 5, 3600)
  if (lim === 'erro') return json(req, { error: 'Serviço temporariamente indisponível. Tente de novo em instantes.' }, 503)
  if (lim === 'excedido') return json(req, { error: 'Muitas tentativas. Aguarde alguns minutos.' }, 429)

  const { data, error } = await cliente.rpc('solicitar_exclusao_conta', { p_confirmacao: 'EXCLUIR' })
  if (error) {
    // P0001 = regra de negócio com mensagem pronta em português (ex.: conta de administrador)
    if (error.code === 'P0001') return json(req, { error: error.message }, 400)
    console.error('excluir-conta: falha ao registrar o pedido', error.code)
    return json(req, { error: 'Não foi possível registrar o pedido agora. Tente de novo.' }, 500)
  }
  const solicitacao = lerSolicitacao(data)
  if (!solicitacao) {
    console.error('excluir-conta: resposta inesperada do banco')
    return json(req, { error: 'Não foi possível registrar o pedido agora. Tente de novo.' }, 500)
  }

  // e-mail com protocolo e prazo (só na primeira vez; pedido repetido não reenvia)
  let emailEnviado = false
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!solicitacao.ja_existia && resendKey && user.email) {
    try {
      const msg = montarEmailExclusao({ protocolo: solicitacao.protocolo, prevista_em: solicitacao.prevista_em, appUrl: APP_URL })
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: FROM, to: [user.email], subject: msg.assunto, html: msg.html, text: msg.texto }),
      })
      emailEnviado = resp.ok
      if (!resp.ok) console.error('excluir-conta: Resend recusou', resp.status)
    } catch {
      console.error('excluir-conta: falha de rede ao enviar o e-mail')
    }
  }

  // logout em todos os aparelhos (a sessão desta chamada também acaba)
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error: erroSaida } = await admin.auth.admin.signOut(token, 'global')
  if (erroSaida) console.error('excluir-conta: não conseguiu encerrar as sessões', erroSaida.status)

  return json(req, { protocolo: solicitacao.protocolo, prevista_em: solicitacao.prevista_em, email_enviado: emailEnviado })
})
