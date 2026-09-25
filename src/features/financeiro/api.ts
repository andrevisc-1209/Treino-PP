import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type ModeloCobranca = 'por_aula' | 'mensal'

export type AlunoCobranca = {
  aluno_id: string
  professional_id: string
  modelo: ModeloCobranca
  valor_aula: number | null
  valor_mensal: number | null
  dia_ciclo: number
  dias_vencimento: number
  ativo: boolean
}

export function useAlunoCobranca(alunoId: string | undefined) {
  return useQuery({
    queryKey: ['aluno-cobranca', alunoId],
    queryFn: async () => {
      const { data, error } = await supabase.from('aluno_cobranca').select('*').eq('aluno_id', alunoId!).maybeSingle()
      if (error) throw error
      return data as AlunoCobranca | null
    },
    enabled: !!alunoId,
  })
}

export function useAlunosComCobranca() {
  return useQuery({
    queryKey: ['alunos-cobranca'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aluno_cobranca')
        .select('*, aluno:alunos(id, name, phone)')
        .eq('ativo', true)
      if (error) throw error
      return data as (AlunoCobranca & { aluno: { id: string; name: string; phone: string | null } | null })[]
    },
  })
}

export type SalvarCobrancaInput = {
  aluno_id: string
  modelo: ModeloCobranca
  valor_aula: number | null
  valor_mensal: number | null
  dia_ciclo: number
  dias_vencimento: number
}

export function useSalvarAlunoCobranca() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: SalvarCobrancaInput) => {
      const { data: u } = await supabase.auth.getUser()
      if (!u.user) throw new Error('Sessão expirada')
      const { error } = await supabase.from('aluno_cobranca').upsert({
        professional_id: u.user.id,
        ativo: true,
        ...input,
      })
      if (error) throw error
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['aluno-cobranca', vars.aluno_id] })
      qc.invalidateQueries({ queryKey: ['alunos-cobranca'] })
    },
  })
}

export function useRemoverAlunoCobranca() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (alunoId: string) => {
      const { error } = await supabase.from('aluno_cobranca').update({ ativo: false }).eq('aluno_id', alunoId)
      if (error) throw error
    },
    onSuccess: (_data, alunoId) => {
      qc.invalidateQueries({ queryKey: ['aluno-cobranca', alunoId] })
      qc.invalidateQueries({ queryKey: ['alunos-cobranca'] })
    },
  })
}

// ============================================================
// Participações abertas (para fechar o ciclo)
// ============================================================

export type ParticipacaoAberta = {
  id: string
  aluno_id: string
  status: 'previsto' | 'presente' | 'falta' | 'cancelou'
  cobrar: boolean | null
  valor: number | null
  fatura_id: string | null
  aula: { starts_at: string; duration_min: number; local: string | null } | null
}

export function useParticipacoesAbertas(alunoId: string | undefined) {
  return useQuery({
    queryKey: ['participacoes-abertas', alunoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aula_participantes')
        .select('id, aluno_id, status, cobrar, valor, fatura_id, aula:aulas(starts_at, duration_min, local)')
        .eq('aluno_id', alunoId!)
        .is('fatura_id', null)
        .neq('status', 'previsto')
      if (error) throw error
      return data as unknown as ParticipacaoAberta[]
    },
    enabled: !!alunoId,
  })
}

/** Todas as participações cobráveis em aberto (fatura_id nulo, cobrar = true) de todos os alunos com cobrança ativa — usada no resumo do Financeiro. */
export function useParticipacoesCobraveisTodas() {
  return useQuery({
    queryKey: ['participacoes-cobraveis-todas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aula_participantes')
        .select('id, aluno_id, status, cobrar, valor, fatura_id, aula:aulas(starts_at, duration_min, local)')
        .is('fatura_id', null)
        .eq('cobrar', true)
      if (error) throw error
      return data as unknown as ParticipacaoAberta[]
    },
  })
}

export function useAtualizarValorParticipacao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, valor }: { id: string; valor: number }) => {
      const { error } = await supabase.from('aula_participantes').update({ valor }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['participacoes-abertas'] })
      qc.invalidateQueries({ queryKey: ['participacoes-cobraveis-todas'] })
    },
  })
}

// ============================================================
// Faturas
// ============================================================

export type FaturaStatus = 'aberta' | 'enviada' | 'paga' | 'cancelada'
export type FormaPagamento = 'pix' | 'dinheiro' | 'cartao' | 'transferencia' | 'outro'

export type Fatura = {
  id: string
  professional_id: string
  aluno_id: string
  periodo_inicio: string
  periodo_fim: string
  modelo: ModeloCobranca
  qtd_aulas: number
  valor_aulas: number
  ajuste: number
  ajuste_descricao: string | null
  total: number
  vencimento: string | null
  status: FaturaStatus
  enviada_em: string | null
  paga_em: string | null
  forma_pagamento: FormaPagamento | null
  aluno?: { name: string; phone: string | null } | null
}

export function useFaturasTodas() {
  return useQuery({
    queryKey: ['faturas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('faturas')
        .select('*, aluno:alunos(name, phone)')
        .order('periodo_inicio', { ascending: false })
      if (error) throw error
      return data as Fatura[]
    },
  })
}

export function useFaturasDoAluno(alunoId: string | undefined) {
  return useQuery({
    queryKey: ['faturas-aluno', alunoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('faturas')
        .select('*')
        .eq('aluno_id', alunoId!)
        .order('periodo_inicio', { ascending: false })
      if (error) throw error
      return data as Fatura[]
    },
    enabled: !!alunoId,
  })
}

export function useFatura(faturaId: string | undefined) {
  return useQuery({
    queryKey: ['fatura', faturaId],
    queryFn: async () => {
      const { data, error } = await supabase.from('faturas').select('*, aluno:alunos(name, phone)').eq('id', faturaId!).single()
      if (error) throw error
      return data as Fatura
    },
    enabled: !!faturaId,
  })
}

export type FecharCicloInput = {
  aluno_id: string
  periodo_inicio: string
  periodo_fim: string
  modelo: ModeloCobranca
  qtd_aulas: number
  valor_aulas: number
  ajuste: number
  ajuste_descricao: string | null
  total: number
  vencimento: string | null
  itemIds: string[]
}

export function useFecharCiclo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: FecharCicloInput) => {
      const { data: u } = await supabase.auth.getUser()
      if (!u.user) throw new Error('Sessão expirada')

      const { data: fatura, error } = await supabase
        .from('faturas')
        .insert({
          professional_id: u.user.id,
          aluno_id: input.aluno_id,
          periodo_inicio: input.periodo_inicio,
          periodo_fim: input.periodo_fim,
          modelo: input.modelo,
          qtd_aulas: input.qtd_aulas,
          valor_aulas: input.valor_aulas,
          ajuste: input.ajuste,
          ajuste_descricao: input.ajuste_descricao,
          total: input.total,
          vencimento: input.vencimento,
        })
        .select('id')
        .single()
      if (error) throw error

      if (input.itemIds.length > 0) {
        const { error: errItens } = await supabase.from('aula_participantes').update({ fatura_id: fatura.id }).in('id', input.itemIds)
        if (errItens) throw errItens
      }

      return fatura.id as string
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['faturas'] })
      qc.invalidateQueries({ queryKey: ['faturas-aluno', vars.aluno_id] })
      qc.invalidateQueries({ queryKey: ['participacoes-abertas', vars.aluno_id] })
      qc.invalidateQueries({ queryKey: ['participacoes-cobraveis-todas'] })
    },
  })
}

function invalidarFatura(qc: ReturnType<typeof useQueryClient>, faturaId: string, alunoId?: string) {
  qc.invalidateQueries({ queryKey: ['faturas'] })
  qc.invalidateQueries({ queryKey: ['fatura', faturaId] })
  if (alunoId) qc.invalidateQueries({ queryKey: ['faturas-aluno', alunoId] })
}

export function useEnviarFatura() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ faturaId }: { faturaId: string; alunoId?: string }) => {
      const { error } = await supabase.from('faturas').update({ status: 'enviada', enviada_em: new Date().toISOString() }).eq('id', faturaId)
      if (error) throw error
    },
    onSuccess: (_d, vars) => invalidarFatura(qc, vars.faturaId, vars.alunoId),
  })
}

export function useMarcarFaturaPaga() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      faturaId,
      pagaEm,
      formaPagamento,
    }: {
      faturaId: string
      alunoId?: string
      pagaEm: string
      formaPagamento: FormaPagamento
    }) => {
      const { error } = await supabase
        .from('faturas')
        .update({ status: 'paga', paga_em: pagaEm, forma_pagamento: formaPagamento })
        .eq('id', faturaId)
      if (error) throw error
    },
    onSuccess: (_d, vars) => invalidarFatura(qc, vars.faturaId, vars.alunoId),
  })
}

export function useDesfazerPagamentoFatura() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ faturaId, statusAnterior }: { faturaId: string; alunoId?: string; statusAnterior: 'aberta' | 'enviada' }) => {
      const { error } = await supabase
        .from('faturas')
        .update({ status: statusAnterior, paga_em: null, forma_pagamento: null })
        .eq('id', faturaId)
      if (error) throw error
    },
    onSuccess: (_d, vars) => invalidarFatura(qc, vars.faturaId, vars.alunoId),
  })
}

export function useCancelarFatura() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ faturaId }: { faturaId: string; alunoId?: string }) => {
      const { error } = await supabase.from('faturas').update({ status: 'cancelada' }).eq('id', faturaId)
      if (error) throw error
      const { error: errItens } = await supabase.from('aula_participantes').update({ fatura_id: null }).eq('fatura_id', faturaId)
      if (errItens) throw errItens
    },
    onSuccess: (_d, vars) => {
      invalidarFatura(qc, vars.faturaId, vars.alunoId)
      qc.invalidateQueries({ queryKey: ['participacoes-abertas'] })
      qc.invalidateQueries({ queryKey: ['participacoes-cobraveis-todas'] })
    },
  })
}
