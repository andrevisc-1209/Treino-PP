import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { dataSP, hojeSP } from '@/lib/datas'
import type { FormaPagamento } from '@/features/financeiro/api'
import { fimDoPacote, type Pacote } from './pacote'

export type PacoteComPresencas = { pacote: Pacote & { fatura_id: string | null }; presencas: number }

const COLUNAS = 'id, aluno_id, qtd_aulas, valor, validade_dias, inicio, aulas_anteriores, status, fatura_id'

type PresencaLinha = { aluno_id: string; aula: { starts_at: string } | null }

/** Presenças que contam no pacote: aula da agenda com o aluno presente, desde o dia de início (treino à distância não conta). */
export function contarPresencas(pacotes: Pacote[], presencas: PresencaLinha[]): Map<string, number> {
  const porAluno = new Map<string, number>()
  for (const p of pacotes) {
    const n = presencas.filter((x) => x.aluno_id === p.aluno_id && x.aula && dataSP(x.aula.starts_at) >= p.inicio).length
    porAluno.set(p.aluno_id, n)
  }
  return porAluno
}

/** Pacotes ativos (um por aluno) com a contagem de presenças; chave = aluno_id. Uma consulta para a lista toda. */
export async function buscarPacotesAtivos(): Promise<Map<string, PacoteComPresencas>> {
  const { data: pacotes, error } = await supabase.from('aluno_pacotes').select(COLUNAS).eq('status', 'ativo')
  if (error) throw error
  const lista = (pacotes ?? []) as PacoteComPresencas['pacote'][]
  const mapa = new Map<string, PacoteComPresencas>()
  if (lista.length === 0) return mapa
  const menorInicio = lista.reduce((m, p) => (p.inicio < m ? p.inicio : m), lista[0].inicio)
  const { data: presencas, error: errP } = await supabase
    .from('aula_participantes')
    .select('aluno_id, aula:aulas!inner(starts_at)')
    .in('aluno_id', lista.map((p) => p.aluno_id))
    .eq('status', 'presente')
    .is('execucao_id', null)
    // o corte exato (dia de início em São Paulo) é feito em contarPresencas
    .gte('aula.starts_at', `${menorInicio}T00:00:00-03:00`)
  if (errP) throw errP
  const contagens = contarPresencas(lista, (presencas ?? []) as unknown as PresencaLinha[])
  for (const p of lista) mapa.set(p.aluno_id, { pacote: p, presencas: contagens.get(p.aluno_id) ?? 0 })
  return mapa
}

export function usePacotesAtivos() {
  // sem cache: as presenças mudam a cada aula e o contador precisa estar certo na lista e na trava
  return useQuery({ queryKey: ['pacotes-ativos'], queryFn: buscarPacotesAtivos, staleTime: 0 })
}

/** Como o pacote foi (ou vai ser) pago: recebido na data informada, ou a receber com vencimento nela. */
export type PagamentoPacote = { recebido: boolean; data: string; forma: FormaPagamento }

export type SalvarPacoteInput = {
  aluno_id: string
  qtd_aulas: number
  valor: number
  validade_dias: number
  aulas_anteriores: number
}

function invalidar(qc: QueryClient, alunoId: string) {
  qc.invalidateQueries({ queryKey: ['pacotes-ativos'] })
  qc.invalidateQueries({ queryKey: ['aluno-cobranca', alunoId] })
  qc.invalidateQueries({ queryKey: ['alunos-cobranca'] })
  qc.invalidateQueries({ queryKey: ['faturas'] })
  qc.invalidateQueries({ queryKey: ['faturas-aluno', alunoId] })
  qc.invalidateQueries({ queryKey: ['participacoes-cobraveis-todas'] })
}

/** A venda vira uma fatura: já paga (com data e forma) ou aberta com o vencimento escolhido. */
async function criarFaturaDoPacote(profId: string, input: SalvarPacoteInput, inicio: string, pagamento: PagamentoPacote): Promise<string> {
  const { data, error } = await supabase
    .from('faturas')
    .insert({
      professional_id: profId,
      aluno_id: input.aluno_id,
      periodo_inicio: inicio,
      periodo_fim: fimDoPacote({ inicio, validade_dias: input.validade_dias }),
      modelo: 'pacote',
      qtd_aulas: input.qtd_aulas,
      valor_aulas: input.valor,
      ajuste: 0,
      total: input.valor,
      vencimento: pagamento.recebido ? null : pagamento.data,
      ...(pagamento.recebido ? { status: 'paga', paga_em: pagamento.data, forma_pagamento: pagamento.forma } : {}),
    })
    .select('id')
    .single()
  // UNIQUE (aluno, início): já existe cobrança começando neste mesmo dia
  if (error?.code === '23505') throw new Error('Este aluno já tem uma cobrança que começa hoje. Cancele a fatura anterior ou renove amanhã.')
  if (error) throw error
  return data.id as string
}

/** Cria o pacote já com a fatura da venda. Se o pacote falhar depois da fatura, a fatura é desfeita. */
async function venderPacote(input: SalvarPacoteInput, pagamento: PagamentoPacote): Promise<void> {
  const { data: u } = await supabase.auth.getUser()
  if (!u.user) throw new Error('Sessão expirada')
  const inicio = hojeSP()
  const faturaId = await criarFaturaDoPacote(u.user.id, input, inicio, pagamento)
  const { error } = await supabase.from('aluno_pacotes').insert({ professional_id: u.user.id, ...input, inicio, fatura_id: faturaId })
  if (error) {
    await supabase.from('faturas').delete().eq('id', faturaId)
    throw error
  }
  // quem vira aluno de pacote deixa a cobrança por aula/mensal (senão entraria no fechamento de ciclo)
  const { error: errCobranca } = await supabase.from('aluno_cobranca').update({ ativo: false }).eq('aluno_id', input.aluno_id)
  if (errCobranca) throw errCobranca
}

/**
 * Encerra o pacote ativo e fecha o "ciclo" dele: as presenças do pacote são ligadas à fatura da venda, que passa a listar as
 * aulas no relatório. O período da fatura termina no dia do encerramento se ele vier antes do prazo.
 */
export async function encerrarPacoteComRelatorio(alunoId: string): Promise<void> {
  const { data: pacote, error } = await supabase.from('aluno_pacotes').select(COLUNAS).eq('aluno_id', alunoId).eq('status', 'ativo').maybeSingle()
  if (error) throw error
  if (!pacote) return
  const p = pacote as PacoteComPresencas['pacote']
  if (p.fatura_id) {
    const { data: linhas, error: errL } = await supabase
      .from('aula_participantes')
      .select('id, aula:aulas!inner(starts_at)')
      .eq('aluno_id', alunoId)
      .eq('status', 'presente')
      .is('execucao_id', null)
      .is('fatura_id', null)
      .gte('aula.starts_at', `${p.inicio}T00:00:00-03:00`)
    if (errL) throw errL
    const ids = ((linhas ?? []) as unknown as { id: string; aula: { starts_at: string } | null }[]).filter((l) => l.aula && dataSP(l.aula.starts_at) >= p.inicio).map((l) => l.id)
    if (ids.length > 0) {
      const { error: errU } = await supabase.from('aula_participantes').update({ fatura_id: p.fatura_id }).in('id', ids)
      if (errU) throw errU
    }
    const hoje = hojeSP()
    const fim = fimDoPacote(p)
    if (hoje < fim) {
      const { error: errF } = await supabase.from('faturas').update({ periodo_fim: hoje < p.inicio ? p.inicio : hoje }).eq('id', p.fatura_id)
      if (errF) throw errF
    }
  }
  const { error: errE } = await supabase.from('aluno_pacotes').update({ status: 'encerrado', encerrado_em: new Date().toISOString() }).eq('id', p.id)
  if (errE) throw errE
}

export type EditarPacoteInput = SalvarPacoteInput & { pacote: PacoteComPresencas['pacote'] }

/** Atualiza o pacote ativo; enquanto a fatura não está paga, ela acompanha a quantidade, o valor e o prazo. */
async function editarPacote({ pacote, ...input }: EditarPacoteInput): Promise<void> {
  const { aluno_id: _aluno, ...alteravel } = input
  void _aluno
  if (pacote.fatura_id) {
    const { data: f, error } = await supabase.from('faturas').select('status').eq('id', pacote.fatura_id).maybeSingle()
    if (error) throw error
    if (f && (f.status === 'aberta' || f.status === 'enviada')) {
      const { error: errF } = await supabase
        .from('faturas')
        .update({ qtd_aulas: input.qtd_aulas, valor_aulas: input.valor, total: input.valor, periodo_fim: fimDoPacote({ inicio: pacote.inicio, validade_dias: input.validade_dias }) })
        .eq('id', pacote.fatura_id)
      if (errF) throw errF
    }
  }
  const { error } = await supabase.from('aluno_pacotes').update(alteravel).eq('id', pacote.id)
  if (error) throw error
}

/** Pacote novo (com a fatura da venda) ou edição do ativo. Na venda o pagamento é obrigatório. */
export function useSalvarPacote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { dados: SalvarPacoteInput; pagamento?: PagamentoPacote; editando?: PacoteComPresencas['pacote'] }) => {
      if (input.editando) return editarPacote({ ...input.dados, pacote: input.editando })
      if (!input.pagamento) throw new Error('Informe se o pacote já foi recebido.')
      return venderPacote(input.dados, input.pagamento)
    },
    onSuccess: (_d, vars) => invalidar(qc, vars.dados.aluno_id),
  })
}

/** Renovar: encerra o pacote atual (com relatório) e vende um novo, com cobrança nova. */
export function useRenovarPacote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { dados: SalvarPacoteInput; pagamento: PagamentoPacote }) => {
      await encerrarPacoteComRelatorio(input.dados.aluno_id)
      await venderPacote(input.dados, input.pagamento)
    },
    onSuccess: (_d, vars) => invalidar(qc, vars.dados.aluno_id),
  })
}

/** Encerra o pacote ativo sem renovar (ao trocar de modelo, ou quando o aluno parou). */
export function useEncerrarPacote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (alunoId: string) => encerrarPacoteComRelatorio(alunoId),
    onSuccess: (_d, alunoId) => invalidar(qc, alunoId),
  })
}
