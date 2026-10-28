import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { dataSP } from '@/lib/datas'
import type { Pacote } from './pacote'

export type PacoteComPresencas = { pacote: Pacote; presencas: number }

const COLUNAS = 'id, aluno_id, qtd_aulas, valor, validade_dias, inicio, aulas_anteriores, status'

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
export function usePacotesAtivos() {
  return useQuery({
    queryKey: ['pacotes-ativos'],
    queryFn: async () => {
      const { data: pacotes, error } = await supabase.from('aluno_pacotes').select(COLUNAS).eq('status', 'ativo')
      if (error) throw error
      const lista = (pacotes ?? []) as Pacote[]
      const mapa = new Map<string, PacoteComPresencas>()
      if (lista.length === 0) return mapa
      const menorInicio = lista.reduce((m, p) => (p.inicio < m ? p.inicio : m), lista[0].inicio)
      const { data: presencas, error: errP } = await supabase
        .from('aula_participantes')
        .select('aluno_id, aula:aulas!inner(starts_at)')
        .in('aluno_id', lista.map((p) => p.aluno_id))
        .eq('status', 'presente')
        .is('execucao_id', null)
        // folga de 1 dia para o fuso: o corte exato (dia de início em São Paulo) é feito em contarPresencas
        .gte('aula.starts_at', `${menorInicio}T00:00:00-03:00`)
      if (errP) throw errP
      const contagens = contarPresencas(lista, (presencas ?? []) as unknown as PresencaLinha[])
      for (const p of lista) mapa.set(p.aluno_id, { pacote: p, presencas: contagens.get(p.aluno_id) ?? 0 })
      return mapa
    },
  })
}

export type SalvarPacoteInput = {
  aluno_id: string
  qtd_aulas: number
  valor: number
  validade_dias: number
  aulas_anteriores: number
  /** dia de início; só vale na criação (editar o pacote não mexe no início) */
  inicio?: string
}

/**
 * Cria o pacote do aluno ou atualiza o ativo. O aluno de pacote não usa a cobrança por aula/mensal: se havia uma ativa,
 * ela é desligada (senão ele entraria no fechamento de ciclo e nos avisos de ciclo).
 */
export function useSalvarPacote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: SalvarPacoteInput) => {
      const { data: u } = await supabase.auth.getUser()
      if (!u.user) throw new Error('Sessão expirada')
      const { data: ativo, error: errAtivo } = await supabase.from('aluno_pacotes').select('id').eq('aluno_id', input.aluno_id).eq('status', 'ativo').maybeSingle()
      if (errAtivo) throw errAtivo
      const { inicio, ...campos } = input
      if (ativo) {
        const { aluno_id: _ignorado, ...alteravel } = campos
        void _ignorado
        const { error } = await supabase.from('aluno_pacotes').update(alteravel).eq('id', ativo.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('aluno_pacotes').insert({ professional_id: u.user.id, ...campos, ...(inicio ? { inicio } : {}) })
        if (error) throw error
      }
      const { error: errCobranca } = await supabase.from('aluno_cobranca').update({ ativo: false }).eq('aluno_id', input.aluno_id)
      if (errCobranca) throw errCobranca
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['pacotes-ativos'] })
      qc.invalidateQueries({ queryKey: ['aluno-cobranca', vars.aluno_id] })
      qc.invalidateQueries({ queryKey: ['alunos-cobranca'] })
    },
  })
}

/** Encerra o pacote ativo do aluno (ao trocar para cobrança por aula ou mensal). */
export function useEncerrarPacote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (alunoId: string) => {
      const { error } = await supabase.from('aluno_pacotes').update({ status: 'encerrado', encerrado_em: new Date().toISOString() }).eq('aluno_id', alunoId).eq('status', 'ativo')
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pacotes-ativos'] }),
  })
}
