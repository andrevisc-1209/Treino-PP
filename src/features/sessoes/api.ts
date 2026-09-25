import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type SessaoStatus = 'em_andamento' | 'concluida' | 'cancelada'

export type Sessao = {
  id: string
  aluno_id: string
  professional_id: string
  plano_id: string | null
  plano_nome: string | null
  aula_id: string | null
  status: SessaoStatus
  session_date: string
  duration_minutes: number | null
  pre_sleep: number | null
  pre_stress: number | null
  pre_fatigue: number | null
  pre_muscle_pain: number | null
  post_pse: number | null
  prof_rating: number | null
  prof_notes: string | null
  created_at: string
}

export type SessaoSerie = {
  id: string
  sessao_exercicio_id: string
  set_number: number
  reps: number | null
  load_kg: number | null
  completed: boolean
}

export type SessaoExercicio = {
  id: string
  sessao_id: string
  exercicio_id: string
  plano_exercicio_id: string | null
  notes: string | null
  order_index: number
  exercicio: { id: string; name: string; muscle_group: string | null } | null
  sessao_series: SessaoSerie[]
}

export function useSessaoEmAndamento(alunoId: string | undefined) {
  return useQuery({
    queryKey: ['sessao-em-andamento', alunoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessoes')
        .select('id')
        .eq('aluno_id', alunoId!)
        .eq('status', 'em_andamento')
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data as { id: string } | null
    },
    enabled: !!alunoId,
  })
}

export function useSessoes(alunoId: string | undefined) {
  return useQuery({
    queryKey: ['sessoes', alunoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessoes')
        .select('*')
        .eq('aluno_id', alunoId!)
        .order('session_date', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Sessao[]
    },
    enabled: !!alunoId,
  })
}

export function useSessao(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['sessao', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase.from('sessoes').select('*').eq('id', sessionId!).single()
      if (error) throw error
      return data as Sessao
    },
    enabled: !!sessionId,
  })
}

export function useSessaoExercicios(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['sessao-exercicios', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessao_exercicios')
        .select('*, exercicio:exercicios(id,name,muscle_group), sessao_series(*)')
        .eq('sessao_id', sessionId!)
        .order('order_index')
        .order('set_number', { foreignTable: 'sessao_series' })
      if (error) throw error
      return data as SessaoExercicio[]
    },
    enabled: !!sessionId,
  })
}

function parseRepsPadrao(reps: string): number | null {
  const m = reps.match(/\d+/)
  return m ? Number(m[0]) : null
}

async function buscarUltimaCarga(alunoId: string, exercicioId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('sessao_exercicios')
    .select('sessao_series(load_kg, set_number), sessoes!inner(session_date, aluno_id)')
    .eq('exercicio_id', exercicioId)
    .eq('sessoes.aluno_id', alunoId)
    .order('session_date', { foreignTable: 'sessoes', ascending: false })
    .limit(1)
  if (error || !data || data.length === 0) return null
  const series = (data[0].sessao_series ?? []) as { load_kg: number | null; set_number: number }[]
  const comCarga = series.filter((s) => s.load_kg != null)
  if (comCarga.length === 0) return null
  comCarga.sort((a, b) => b.set_number - a.set_number)
  return comCarga[0].load_kg
}

export type PreTreinoInput = {
  pre_sleep: number
  pre_stress: number
  pre_fatigue: number
  pre_muscle_pain: number
  plano_id: string | null
  plano_nome: string | null
  aula_id: string | null
}

export function useIniciarSessao(alunoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: PreTreinoInput) => {
      const { data: u } = await supabase.auth.getUser()
      if (!u.user) throw new Error('Sessão expirada')

      const { data: sessao, error: errSessao } = await supabase
        .from('sessoes')
        .insert({
          aluno_id: alunoId,
          professional_id: u.user.id,
          plano_id: input.plano_id,
          plano_nome: input.plano_nome,
          aula_id: input.aula_id,
          status: 'em_andamento',
          pre_sleep: input.pre_sleep,
          pre_stress: input.pre_stress,
          pre_fatigue: input.pre_fatigue,
          pre_muscle_pain: input.pre_muscle_pain,
        })
        .select('id')
        .single()
      if (errSessao) throw errSessao

      if (input.plano_id) {
        const { data: itensPlano, error: errItens } = await supabase
          .from('plano_exercicios')
          .select('*')
          .eq('plano_id', input.plano_id)
          .order('order_index')
        if (errItens) throw errItens

        for (const [index, item] of itensPlano.entries()) {
          const { data: sessaoEx, error: errSessaoEx } = await supabase
            .from('sessao_exercicios')
            .insert({
              sessao_id: sessao.id,
              exercicio_id: item.exercicio_id,
              plano_exercicio_id: item.id,
              order_index: index,
            })
            .select('id')
            .single()
          if (errSessaoEx) throw errSessaoEx

          const cargaAnterior = await buscarUltimaCarga(alunoId, item.exercicio_id)
          const carga = cargaAnterior ?? item.target_load_kg
          const reps = parseRepsPadrao(item.reps)

          const series = Array.from({ length: item.sets }, (_, i) => ({
            sessao_exercicio_id: sessaoEx.id,
            set_number: i + 1,
            reps,
            load_kg: carga,
            completed: false,
          }))
          const { error: errSeries } = await supabase.from('sessao_series').insert(series)
          if (errSeries) throw errSeries
        }
      }

      return sessao.id as string
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessao-em-andamento', alunoId] })
      qc.invalidateQueries({ queryKey: ['sessoes', alunoId] })
    },
  })
}

export function useAdicionarExercicioSessao(sessionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ exercicio_id, order_index }: { exercicio_id: string; order_index: number }) => {
      const { data: sessaoEx, error } = await supabase
        .from('sessao_exercicios')
        .insert({ sessao_id: sessionId, exercicio_id, order_index })
        .select('id')
        .single()
      if (error) throw error
      const { error: errSerie } = await supabase
        .from('sessao_series')
        .insert({ sessao_exercicio_id: sessaoEx.id, set_number: 1, completed: false })
      if (errSerie) throw errSerie
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessao-exercicios', sessionId] }),
  })
}

export function useRemoverExercicioSessao(sessionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (sessaoExercicioId: string) => {
      const { error } = await supabase.from('sessao_exercicios').delete().eq('id', sessaoExercicioId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessao-exercicios', sessionId] }),
  })
}

export function useSalvarSerie(sessionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      sessao_exercicio_id: string
      set_number: number
      reps: number | null
      load_kg: number | null
      completed: boolean
    }) => {
      const { error } = await supabase
        .from('sessao_series')
        .upsert(input, { onConflict: 'sessao_exercicio_id,set_number' })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessao-exercicios', sessionId] }),
  })
}

export function useAtualizarSessao(sessionId: string, alunoId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (
      input: Partial<
        Pick<Sessao, 'status' | 'post_pse' | 'duration_minutes' | 'prof_rating' | 'prof_notes'>
      >,
    ) => {
      const { error } = await supabase.from('sessoes').update(input).eq('id', sessionId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessao', sessionId] })
      if (alunoId) {
        qc.invalidateQueries({ queryKey: ['sessao-em-andamento', alunoId] })
        qc.invalidateQueries({ queryKey: ['sessoes', alunoId] })
      }
    },
  })
}
