// Edge Function: agenda-publica  (pública: verify_jwt = false no config.toml)
//
// POST { slug, acao: 'consultar' | 'pedir', ... } — a página /agenda/:slug, em que um visitante (sem conta) pede uma aula.
// - consultar: devolve o primeiro nome do personal, a cidade, a duração e as VAGAS abertas das próximas semanas (só data e hora livres;
//   nunca aulas, alunos ou qualquer dado de outra pessoa). Link desligado, inexistente ou de personal sem assinatura ativa = { estado: 'indisponivel' }.
// - pedir: confere o captcha (Turnstile), valida o corpo, confere que o horário ainda é uma vaga e grava o pedido em treino.pedidos_agenda.
//   Quem decide é o personal (aprovar vira aula no app). Limites com falha fechada: por IP, por telefone e pedidos pendentes por personal.
// Tudo passa por service_role AQUI — as tabelas não têm acesso anônimo.
// Segredos: TURNSTILE_SECRET_KEY (captcha). Resposta de erro sempre genérica: não ajuda quem testa.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { ipDoCliente } from '../_shared/consentimento.ts'
import { limiteExcedido, resposta429, resposta503, verificarLimite } from '../_shared/rateLimit.ts'
import { verificarTurnstile } from '../_shared/turnstile.ts'
import { montarPedidoAula } from '../_shared/notificacoes.ts'
import { enviarAoPersonal } from '../_shared/whatsappPersonal.ts'
import {
  calcularVagas,
  dataEHoraSP,
  MAX_PEDIDOS_POR_IP_HORA,
  MAX_PEDIDOS_POR_TELEFONE_DIA,
  MAX_PENDENTES_POR_PERSONAL,
  primeiroNome,
  slugValido,
  somarDiasISO,
  vagaDisponivel,
  validarPedido,
} from '../_shared/agendaPublica.ts'

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

const INDISPONIVEL = { estado: 'indisponivel' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) })
  if (req.method !== 'POST') return json(req, { error: 'Método não permitido.' }, 405)

  const ip = ipDoCliente(req.headers)
  // Consulta: limite por IP, falha aberta (rota de leitura de baixo risco).
  if (ip && (await limiteExcedido(`agenda-publica:ip:${ip}`, 60))) return resposta429(cors(req))

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json(req, { error: 'Corpo da requisição inválido.' }, 400)
  }
  const acao = body.acao === 'pedir' ? 'pedir' : 'consultar'
  if (!slugValido(body.slug)) return json(req, INDISPONIVEL)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { db: { schema: 'treino' } })

  const { data: cfg } = await admin
    .from('professional_config')
    .select('professional_id, duracao_padrao_min, intervalo_min, antecedencia_horas, horizonte_semanas, agenda_publica_ativa')
    .eq('agenda_publica_slug', body.slug)
    .maybeSingle()
  if (!cfg || !cfg.agenda_publica_ativa) return json(req, INDISPONIVEL)
  const professionalId = cfg.professional_id as string

  const [{ data: assinatura }, { data: personal }] = await Promise.all([
    admin.from('assinaturas').select('status, trial_fim, assinatura_fim').eq('professional_id', professionalId).maybeSingle(),
    admin.from('professionals').select('name, cidade, uf').eq('id', professionalId).maybeSingle(),
  ])
  const agora = new Date()
  const assinaturaAtiva =
    !!assinatura &&
    ((assinatura.status === 'trial' && !!assinatura.trial_fim && new Date(assinatura.trial_fim) > agora) ||
      (assinatura.status === 'ativa' && (!assinatura.assinatura_fim || new Date(assinatura.assinatura_fim) > agora)))
  if (!assinaturaAtiva || !personal) return json(req, INDISPONIVEL)

  // Vagas: disponibilidade menos aulas e bloqueios, já com a antecedência mínima do personal.
  const hoje = dataEHoraSP(agora).data
  const parametros = {
    duracaoMin: cfg.duracao_padrao_min ?? 60,
    intervaloMin: cfg.intervalo_min ?? 0,
    antecedenciaHoras: cfg.antecedencia_horas ?? 3,
    horizonteSemanas: cfg.horizonte_semanas ?? 4,
  }
  const ate = somarDiasISO(hoje, parametros.horizonteSemanas * 7 - 1)
  const [{ data: janelas }, { data: aulas }, { data: bloqueios }] = await Promise.all([
    admin.from('disponibilidade_semanal').select('weekday, start_time, end_time').eq('professional_id', professionalId),
    admin
      .from('aulas')
      .select('starts_at, duration_min, status')
      .eq('professional_id', professionalId)
      .neq('status', 'cancelada')
      .gte('starts_at', `${hoje}T00:00:00-03:00`)
      .lte('starts_at', `${somarDiasISO(ate, 1)}T00:00:00-03:00`),
    admin.from('agenda_bloqueios').select('data_inicio, data_fim').eq('professional_id', professionalId).gte('data_fim', hoje),
  ])
  const vagas = calcularVagas({
    janelas: janelas ?? [],
    aulas: aulas ?? [],
    bloqueios: bloqueios ?? [],
    parametros,
    agora,
    de: hoje,
    ate,
    antecedenciaHoras: parametros.antecedenciaHoras,
  })

  if (acao === 'consultar') {
    const cidade = [personal.cidade?.trim(), personal.uf?.trim()].filter(Boolean).join('/')
    return json(req, { estado: 'ok', nome_personal: primeiroNome(personal.name), cidade: cidade || null, duracao_min: parametros.duracaoMin, vagas: vagas.slice(0, 300) })
  }

  // ---------- pedir ----------
  const v = validarPedido(body)
  if (!v.ok) return json(req, { error: v.erro }, 400)

  const captcha = await verificarTurnstile(body.turnstile, ip, Deno.env.get('TURNSTILE_SECRET_KEY'))
  if (captcha === 'sem_segredo' || captcha === 'erro') {
    if (captcha === 'sem_segredo') console.error('agenda-publica: falta o segredo TURNSTILE_SECRET_KEY')
    return resposta503(cors(req))
  }
  if (captcha === 'invalido') return json(req, { error: 'Não foi possível confirmar que você não é um robô. Tente de novo.' }, 400)

  const vaga = vagaDisponivel(vagas, v.pedido.dataISO, v.pedido.hora)
  if (!vaga) return json(req, { estado: 'vaga_indisponivel', error: 'Esse horário não está mais disponível. Escolha outro.' }, 409)

  // Limites (falha fechada).
  if (ip) {
    const porIp = await verificarLimite(`agenda-publica:pedir:ip:${ip}`, MAX_PEDIDOS_POR_IP_HORA, 3600)
    if (porIp === 'erro') return resposta503(cors(req))
    if (porIp === 'excedido') return resposta429(cors(req))
  }
  const porTelefone = await verificarLimite(`agenda-publica:pedir:tel:${v.pedido.telefone}`, MAX_PEDIDOS_POR_TELEFONE_DIA, 86400)
  if (porTelefone === 'erro') return resposta503(cors(req))
  if (porTelefone === 'excedido') return resposta429(cors(req))

  const { count: pendentes } = await admin.from('pedidos_agenda').select('id', { count: 'exact', head: true }).eq('professional_id', professionalId).eq('status', 'pendente')
  if ((pendentes ?? 0) >= MAX_PENDENTES_POR_PERSONAL) {
    return json(req, { error: 'Este personal está com muitos pedidos em aberto. Tente de novo em alguns dias.' }, 429)
  }

  const { data: criado, error } = await admin
    .from('pedidos_agenda')
    .insert({
      professional_id: professionalId,
      visitante_nome: v.pedido.nome,
      visitante_telefone: v.pedido.telefone,
      mensagem: v.pedido.mensagem,
      inicio: new Date(`${vaga.dataISO}T${vaga.inicio}:00-03:00`).toISOString(),
      duracao_min: parametros.duracaoMin,
    })
    .select('id')
    .single()
  // 23505 = o mesmo telefone já pediu esse horário e o pedido está pendente: tratamos como enviado (idempotente)
  if (error && error.code !== '23505') {
    console.error('agenda-publica: falha ao gravar o pedido', error.message)
    return json(req, { error: 'Não foi possível enviar agora. Tente novamente.' }, 500)
  }

  // Avisa o personal (sino do app e WhatsApp da plataforma). Falha aqui NUNCA derruba o pedido, que já está gravado.
  if (!error && criado) {
    const texto = montarPedidoAula(vaga.dataISO, vaga.inicio)
    try {
      const { error: errAviso } = await admin
        .from('notificacoes_professor')
        .insert({ professional_id: professionalId, tipo: 'pedido_aula', payload: { pedido_id: criado.id, inicio: `${vaga.dataISO}T${vaga.inicio}` } })
      if (errAviso && errAviso.code !== '23505') console.error('agenda-publica: pedido gravado, mas o aviso do sino falhou', errAviso.message)
      await enviarAoPersonal(admin, professionalId, 'pedido_aula', texto, { umPorDia: false })
    } catch (e) {
      console.error('agenda-publica: pedido gravado, mas o aviso falhou', (e as Error).message)
    }
  }
  return json(req, { estado: 'enviado', nome_personal: primeiroNome(personal.name) })
})
