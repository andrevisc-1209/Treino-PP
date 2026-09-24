import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type Plano = {
  id: string
  aluno_id: string
  professional_id: string
  name: string
  notes: string | null
  active: boolean
  plano_exercicios: { count: number }[]
}

export type PlanoExercicioItem = {
  id: string
  plano_id: string
  exercicio_id: string
  sets: number
  reps: string
  target_load_kg: number | null
  rest_seconds: number | null
  notes: string | null
  order_index: number
  exercicio: { id: string; name: string; muscle_group: string | null; equipment: string | null } | null
}

export function usePlanos(alunoId: string | undefined) {
  return useQuery({
    queryKey: ['planos', alunoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planos')
        .select('*, plano_exercicios(count)')
        .eq('aluno_id', alunoId!)
        .order('active', { ascending: false })
        .order('name')
      if (error) throw error
      return data as Plano[]
    },
    enabled: !!alunoId,
  })
}

export function usePlano(planoId: string | undefined) {
  return useQuery({
    queryKey: ['plano', planoId],
    queryFn: async () => {
      const { data, error } = await supabase.from('planos').select('*').eq('id', planoId!).single()
      if (error) throw error
      return data as Omit<Plano, 'plano_exercicios'>
    },
    enabled: !!planoId,
  })
}

export function usePlanoExercicios(planoId: string | undefined) {
  return useQuery({
    queryKey: ['plano-exercicios', planoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plano_exercicios')
        .select('*, exercicio:exercicios(id,name,muscle_group,equipment)')
        .eq('plano_id', planoId!)
        .order('order_index')
      if (error) throw error
      return data as PlanoExercicioItem[]
    },
    enabled: !!planoId,
  })
}

export function useCriarPlano(alunoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string; notes?: string }) => {
      const { data: u } = await supabase.auth.getUser()
      if (!u.user) throw new Error('Sessão expirada')
      const { data, error } = await supabase
        .from('planos')
        .insert({ aluno_id: alunoId, professional_id: u.user.id, name: input.name, notes: input.notes || null })
        .select('id')
        .single()
      if (error) throw error
      return data.id as string
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['planos', alunoId] }),
  })
}

export function useAtualizarPlano(alunoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string; name?: string; notes?: string | null; active?: boolean }) => {
      const { error } = await supabase.from('planos').update(input).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['planos', alunoId] })
      qc.invalidateQueries({ queryKey: ['plano', vars.id] })
    },
  })
}

export function useDuplicarPlano(alunoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (plano: Plano) => {
      const { data: u } = await supabase.auth.getUser()
      if (!u.user) throw new Error('Sessão expirada')

      const { data: novo, error: errNovo } = await supabase
        .from('planos')
        .insert({ aluno_id: alunoId, professional_id: u.user.id, name: `${plano.name} (cópia)`, notes: plano.notes })
        .select('id')
        .single()
      if (errNovo) throw errNovo

      const { data: itens, error: errItens } = await supabase
        .from('plano_exercicios')
        .select('*')
        .eq('plano_id', plano.id)
        .order('order_index')
      if (errItens) throw errItens

      if (itens.length > 0) {
        const copia = itens.map((it) => ({
          plano_id: novo.id,
          exercicio_id: it.exercicio_id,
          sets: it.sets,
          reps: it.reps,
          target_load_kg: it.target_load_kg,
          rest_seconds: it.rest_seconds,
          notes: it.notes,
          order_index: it.order_index,
        }))
        const { error: errCopia } = await supabase.from('plano_exercicios').insert(copia)
        if (errCopia) throw errCopia
      }

      return novo.id as string
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['planos', alunoId] }),
  })
}

export type ItemInput = {
  sets: number
  reps: string
  target_load_kg?: number | null
  rest_seconds?: number | null
  notes?: string | null
}

export function useAdicionarExercicio(planoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: ItemInput & { exercicio_id: string; order_index: number }) => {
      const { error } = await supabase.from('plano_exercicios').insert({ plano_id: planoId, ...input })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plano-exercicios', planoId] }),
  })
}

export function useAtualizarItem(planoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: ItemInput & { id: string }) => {
      const { error } = await supabase.from('plano_exercicios').update(input).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plano-exercicios', planoId] }),
  })
}

export function useRemoverItem(planoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('plano_exercicios').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plano-exercicios', planoId] }),
  })
}

export function useReordenarItem(planoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ a, b }: { a: PlanoExercicioItem; b: PlanoExercicioItem }) => {
      const { error: e1 } = await supabase.from('plano_exercicios').update({ order_index: b.order_index }).eq('id', a.id)
      if (e1) throw e1
      const { error: e2 } = await supabase.from('plano_exercicios').update({ order_index: a.order_index }).eq('id', b.id)
      if (e2) throw e2
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plano-exercicios', planoId] }),
  })
}
