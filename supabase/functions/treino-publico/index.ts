// Edge Function: treino-publico  (pública: verify_jwt = false no config.toml)
//
// POST { token, acao: 'consultar' | 'concluir', detalhes?, notas? } — a página /treino/:token do aluno.
// - consultar: devolve o treino (modalidade, detalhes, exercícios) e só o PRIMEIRO nome do aluno. Nada de
//   telefone, e-mail, ficha de saúde ou dados de outros alunos.
// - concluir: valida o resultado (_shared/execucao.ts), grava em treino.execucoes_assincrono (origem 'link')
//   e marca o link como usado. Uso único: uma segunda tentativa recebe 'usado'.
// Tudo passa por service_role AQUI — as tabelas não têm acesso anônimo.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { linkValido, MODALIDADES, validarExecucao, type Modalidade } from '../_shared/execucao.ts'

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

  let body: { token?: unknown; acao?: unknown; detalhes?: unknown; notas?: unknown }
  try {
    body = await req.json()
  } catch {
    return json(req, { error: 'Corpo da requisição inválido.' }, 400)
  }
  if (typeof body.token !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.token)) return json(req, { estado: 'invalido' })
  const acao = body.acao === 'concluir' ? 'concluir' : 'consultar'

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { db: { schema: 'treino' } })

  const { data: link } = await admin
    .from('links_treino_assincrono')
    .select('id, plano_id, aluno_id, professional_id, expira_em, usado_em')
    .eq('token', body.token)
    .maybeSingle()
  const estado = linkValido(link)
  if (estado !== 'valido' || !link) return json(req, { estado })

  const { data: plano } = await admin
    .from('planos')
    .select('id, name, modalidade, tipo_execucao, modalidade_detalhes, active')
    .eq('id', link.plano_id)
    .maybeSingle()
  if (!plano || !plano.active || !(MODALIDADES as readonly string[]).includes(plano.modalidade)) return json(req, { estado: 'invalido' })
  const modalidade = plano.modalidade as Modalidade

  const { data: itens } = await admin
    .from('plano_exercicios')
    .select('exercicio_id, sets, reps, target_load_kg, rest_seconds, notes, order_index, exercicio:exercicios(name)')
    .eq('plano_id', plano.id)
    .order('order_index')
  const exercicios = ((itens ?? []) as unknown as {
    exercicio_id: string; sets: number; reps: string; target_load_kg: number | null; rest_seconds: number | null; notes: string | null
    exercicio: { name: string } | null
  }[]).map((i) => ({
    exercicio_id: i.exercicio_id,
    nome: i.exercicio?.name ?? 'Exercício',
    series: i.sets,
    repeticoes: i.reps,
    carga_kg: i.target_load_kg,
    descanso_seg: i.rest_seconds,
    observacao: i.notes,
  }))

  if (acao === 'consultar') {
    const [{ data: aluno }, { data: personal }] = await Promise.all([
      admin.from('alunos').select('name').eq('id', link.aluno_id).maybeSingle(),
      admin.from('professionals').select('name').eq('id', link.professional_id).maybeSingle(),
    ])
    return json(req, {
      estado: 'valido',
      treino: { nome: plano.name, modalidade, detalhes: plano.modalidade_detalhes ?? {}, exercicios },
      primeiro_nome_aluno: (aluno?.name ?? '').trim().split(/\s+/)[0] || null,
      nome_personal: personal?.name?.trim() || null,
    })
  }

  const v = validarExecucao(
    modalidade,
    { detalhes: body.detalhes, notas: body.notas },
    exercicios.map((e) => ({ exercicio_id: e.exercicio_id, nome: e.nome, series: e.series })),
  )
  if (!v.ok) return json(req, { error: v.erro }, 400)

  // Uso único: o UPDATE condicional garante que, com dois toques juntos, só um grava.
  const agora = new Date().toISOString()
  const { data: usado, error: errUso } = await admin
    .from('links_treino_assincrono')
    .update({ usado_em: agora })
    .eq('id', link.id)
    .is('usado_em', null)
    .select('id')
  if (errUso) {
    console.error('treino-publico: falha ao marcar link', errUso.message)
    return json(req, { error: 'Não foi possível registrar. Tente novamente.' }, 500)
  }
  if (!usado?.length) return json(req, { estado: 'usado' })

  const { data: execucao, error } = await admin
    .from('execucoes_assincrono')
    .insert({
      plano_id: plano.id,
      plano_nome: plano.name,
      modalidade,
      aluno_id: link.aluno_id,
      professional_id: link.professional_id,
      origem: 'link',
      link_id: link.id,
      concluido_em: agora,
      status: 'concluido',
      detalhes_execucao: v.detalhes,
      notas_aluno: v.notas,
    })
    .select('id')
    .single()
  if (error || !execucao) {
    console.error('treino-publico: falha ao gravar execução', error?.message)
    await admin.from('links_treino_assincrono').update({ usado_em: null }).eq('id', link.id)
    return json(req, { error: 'Não foi possível registrar. Tente novamente.' }, 500)
  }

  // Notifica o personal (sino do app). Não falha a resposta ao aluno: o treino já está registrado.
  // As observações do aluno NÃO vão no payload (texto livre, pode citar dor/lesão): só a marca "tem_notas".
  const { error: errNotif } = await admin.from('notificacoes_professor').insert({
    professional_id: link.professional_id,
    aluno_id: link.aluno_id,
    tipo: 'treino_concluido',
    payload: { execucao_id: execucao.id, plano_nome: plano.name, modalidade, tem_notas: !!v.notas },
  })
  if (errNotif) console.error('treino-publico: treino registrado, mas a notificação falhou', errNotif.message)

  return json(req, { estado: 'concluido' })
})
