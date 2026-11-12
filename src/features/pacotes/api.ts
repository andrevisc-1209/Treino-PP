import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { dataSP } from '@/lib/datas'
import type { FormaPagamento } from '@/features/financeiro/api'
import { traduzirErroFinanceiro } from '@/features/financeiro/erroFinanceiro'
import type { Pacote } from './pacote'

export type PacoteComPresencas = { pacote: Pacote & { fatura_id: string | null }; presencas: number }

const COLUNAS = 'id, aluno_id, qtd_aulas, valor, validade_dias, inicio, aulas_anteriores, status, fatura_id, conta_distancia'

type PresencaLinha = { aluno_id: string; aula: { starts_at: string } | null }
type ExecucaoLinha = { aluno_id: string; concluido_em: string }

/** Treinos à distância que gastam aula: só nos pacotes em que o personal ligou essa opção, desde o dia de início. */
export function contarTreinosADistancia(pacotes: Pacote[], execucoes: ExecucaoLinha[]): Map<string, number> {
  const porAluno = new Map<string, number>()
  for (const p of pacotes) {
    if (!p.conta_distancia) continue
    porAluno.set(p.aluno_id, execucoes.filter((e) => e.aluno_id === p.aluno_id && dataSP(e.concluido_em) >= p.inicio).length)
  }
  return porAluno
}

/** Presenças que contam no pacote: aula da agenda com o aluno presente, desde o dia de início (aula de treino à distância não conta; natação, corrida e demais modalidades presenciais contam). */
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
    .eq('aula.tipo', 'presencial')
    // o corte exato (dia de início em São Paulo) é feito em contarPresencas
    .gte('aula.starts_at', `${menorInicio}T00:00:00-03:00`)
  if (errP) throw errP
  const contagens = contarPresencas(lista, (presencas ?? []) as unknown as PresencaLinha[])
  // treino à distância gasta aula só se o personal ligou a opção no pacote
  const comDistancia = lista.filter((p) => p.conta_distancia)
  let aDistancia = new Map<string, number>()
  if (comDistancia.length > 0) {
    const { data: execs, error: errE } = await supabase
      .from('execucoes_assincrono')
      .select('aluno_id, concluido_em')
      .in('aluno_id', comDistancia.map((p) => p.aluno_id))
      .eq('origem', 'link')
      .eq('status', 'concluido')
      .gte('concluido_em', `${comDistancia.reduce((m, p) => (p.inicio < m ? p.inicio : m), comDistancia[0].inicio)}T00:00:00-03:00`)
    if (errE) throw errE
    aDistancia = contarTreinosADistancia(comDistancia, (execs ?? []) as ExecucaoLinha[])
  }
  for (const p of lista) mapa.set(p.aluno_id, { pacote: p, presencas: (contagens.get(p.aluno_id) ?? 0) + (aDistancia.get(p.aluno_id) ?? 0) })
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
  conta_distancia: boolean
}

function invalidar(qc: QueryClient, alunoId: string) {
  qc.invalidateQueries({ queryKey: ['pacotes-ativos'] })
  qc.invalidateQueries({ queryKey: ['aluno-cobranca', alunoId] })
  qc.invalidateQueries({ queryKey: ['alunos-cobranca'] })
  qc.invalidateQueries({ queryKey: ['faturas'] })
  qc.invalidateQueries({ queryKey: ['faturas-aluno', alunoId] })
  qc.invalidateQueries({ queryKey: ['participacoes-cobraveis-todas'] })
}

/** Os dados da venda/renovação no formato das funções do banco (fatura da venda: já paga, com data e forma, ou aberta com o vencimento). */
function paramsDaVenda(input: SalvarPacoteInput, pagamento: PagamentoPacote) {
  return {
    p_aluno_id: input.aluno_id,
    p_qtd_aulas: input.qtd_aulas,
    p_valor: input.valor,
    p_validade_dias: input.validade_dias,
    p_aulas_anteriores: input.aulas_anteriores,
    p_conta_distancia: input.conta_distancia,
    p_recebido: pagamento.recebido,
    p_data: pagamento.data,
    p_forma: pagamento.recebido ? pagamento.forma : null,
  }
}

/**
 * Cria o pacote já com a fatura da venda e desliga a cobrança por aula/mensal do aluno: tudo numa transação no banco (se a rede cair no
 * meio, não sobra fatura sem pacote nem pacote com a cobrança por aula ainda ligada).
 */
async function venderPacote(input: SalvarPacoteInput, pagamento: PagamentoPacote): Promise<void> {
  const { error } = await supabase.rpc('vender_pacote', paramsDaVenda(input, pagamento))
  if (error) throw traduzirErroFinanceiro(error)
}

/**
 * Encerra o pacote ativo e fecha o "ciclo" dele, numa transação: as presenças do pacote são ligadas à fatura da venda, que passa a listar
 * as aulas no relatório, e o período da fatura termina no dia do encerramento se ele vier antes do prazo.
 */
export async function encerrarPacoteComRelatorio(alunoId: string): Promise<void> {
  const { error } = await supabase.rpc('encerrar_pacote', { p_aluno_id: alunoId })
  if (error) throw traduzirErroFinanceiro(error)
}

export type EditarPacoteInput = SalvarPacoteInput & { pacote: PacoteComPresencas['pacote'] }

/** Atualiza o pacote ativo; enquanto a fatura não está paga, ela acompanha a quantidade, o valor e o prazo (tudo numa transação). */
async function editarPacote({ pacote, ...input }: EditarPacoteInput): Promise<void> {
  const { error } = await supabase.rpc('editar_pacote', {
    p_pacote_id: pacote.id,
    p_qtd_aulas: input.qtd_aulas,
    p_valor: input.valor,
    p_validade_dias: input.validade_dias,
    p_aulas_anteriores: input.aulas_anteriores,
    p_conta_distancia: input.conta_distancia,
  })
  if (error) throw traduzirErroFinanceiro(error)
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
      // encerrar + vender na mesma transação: se a venda nova falhar, o pacote antigo continua ativo
      const { error } = await supabase.rpc('renovar_pacote', paramsDaVenda(input.dados, input.pagamento))
      if (error) throw traduzirErroFinanceiro(error)
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
