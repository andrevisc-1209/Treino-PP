// Edge Function: confirmar-consentimento-saude  (pública: verify_jwt = false no config.toml)
//
// POST { token, acao? }   acao: 'consultar' (padrão) | 'confirmar' | 'negar'   (aceita também { token, negar: true })
// - consultar: devolve nomes e a situação do token, SEM alterar nada (abrir o link de um e-mail
//   nunca muda estado — scanners de link e pré-visualização também o abrem).
// - confirmar / negar: exigem o clique no botão da página; gravam o status, marcam o token como
//   usado e, ao confirmar, registram o aceite em treino.consentimentos (method = 'link', com versão e data/hora)
//   e o IP do aparelho em treino.consentimento_evidencias (só service_role; o personal não lê).

import { createClient } from 'npm:@supabase/supabase-js@2'
import { limiteExcedido, resposta429 } from '../_shared/rateLimit.ts'
import { estadoDoToken, ipDoCliente, TERMO_VERSAO } from '../_shared/consentimento.ts'

const APP_URL = 'https://treino.personalperto.com.br'
const ORIGENS_PERMITIDAS = [APP_URL, 'http://localhost:5173']

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

  // Rate limit por IP (60/min): link público com token; barra varredura/abuso.
  const ipLimite = ipDoCliente(req.headers)
  if (ipLimite && (await limiteExcedido(`confirmar-consentimento-saude:ip:${ipLimite}`, 60))) return resposta429(cors(req))

  let body: { token?: unknown; acao?: unknown; negar?: unknown }
  try {
    body = await req.json()
  } catch {
    return json(req, { error: 'Corpo da requisição inválido.' }, 400)
  }
  if (typeof body.token !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.token)) return json(req, { estado: 'invalido' })
  const acao = body.negar === true ? 'negar' : body.acao === 'confirmar' || body.acao === 'negar' ? body.acao : 'consultar'

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { db: { schema: 'treino' } })

  const { data: tok } = await admin
    .from('consentimento_saude_tokens')
    .select('token, aluno_id, expires_at, used_at')
    .eq('token', body.token)
    .maybeSingle()
  if (!tok) return json(req, { estado: 'invalido' })

  const { data: aluno } = await admin
    .from('alunos')
    .select('id, name, professional_id, saude_consentimento_status')
    .eq('id', tok.aluno_id)
    .maybeSingle()
  if (!aluno) return json(req, { estado: 'invalido' })

  const estado = estadoDoToken(tok, aluno.saude_consentimento_status)
  if (estado !== 'valido') return json(req, { estado })

  const { data: personal } = await admin.from('professionals').select('name').eq('id', aluno.professional_id).maybeSingle()
  const nomes = { nome_aluno: aluno.name, nome_personal: personal?.name?.trim() || 'Seu personal' }
  if (acao === 'consultar') return json(req, { estado: 'valido', ...nomes })

  const agora = new Date().toISOString()
  // "used_at IS NULL" no UPDATE: se dois cliques chegarem juntos, só um grava.
  const { data: usado, error: errUso } = await admin
    .from('consentimento_saude_tokens')
    .update({ used_at: agora })
    .eq('token', tok.token)
    .is('used_at', null)
    .select('token')
  if (errUso) {
    console.error('confirmar-consentimento-saude: falha ao marcar token', errUso.message)
    return json(req, { error: 'Não foi possível registrar. Tente novamente.' }, 500)
  }
  if (!usado?.length) return json(req, { estado: 'usado' })

  if (acao === 'confirmar') {
    const { error } = await admin
      .from('alunos')
      .update({ saude_consentimento_status: 'confirmado', saude_consentimento_confirmado_at: agora })
      .eq('id', aluno.id)
    if (error) {
      console.error('confirmar-consentimento-saude: falha ao gravar status', error.message)
      await admin.from('consentimento_saude_tokens').update({ used_at: null }).eq('token', tok.token)
      return json(req, { error: 'Não foi possível registrar. Tente novamente.' }, 500)
    }
    // consented_at (padrão now()) + consent_version = data/hora e versão do termo; o IP vai para a tabela só da plataforma.
    const { data: aceite, error: errAceite } = await admin
      .from('consentimentos')
      .insert({ aluno_id: aluno.id, professional_id: aluno.professional_id, method: 'link', consent_version: TERMO_VERSAO })
      .select('id')
      .single()
    if (errAceite || !aceite) {
      console.error('confirmar-consentimento-saude: status gravado, mas falhou o registro em consentimentos', errAceite?.message)
    } else {
      const { error: errEvidencia } = await admin.from('consentimento_evidencias').insert({ consentimento_id: aceite.id, ip: ipDoCliente(req.headers) })
      if (errEvidencia) console.error('confirmar-consentimento-saude: aceite gravado, mas falhou a evidência (IP)', errEvidencia.message)
    }
    return json(req, { estado: 'confirmado', ...nomes })
  }

  const { error } = await admin.from('alunos').update({ saude_consentimento_status: 'negado' }).eq('id', aluno.id)
  if (error) {
    console.error('confirmar-consentimento-saude: falha ao gravar negativa', error.message)
    await admin.from('consentimento_saude_tokens').update({ used_at: null }).eq('token', tok.token)
    return json(req, { error: 'Não foi possível registrar. Tente novamente.' }, 500)
  }
  return json(req, { estado: 'negado', ...nomes })
})
