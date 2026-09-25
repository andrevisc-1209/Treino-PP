import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ItemInput } from '@/features/planos/api'
import type { ItemComparavel } from '@/features/planos/compare'

export type Modelo = {
  id: string
  professional_id: string
  name: string
  notes: string | null
  modelo_exercicios: { order_index: number; exercicio: { name: string } | null }[]
}

export type ModeloExercicioItem = {
  id: string
  modelo_id: string
  exercicio_id: string
  sets: number
  reps: string
  target_load_kg: number | null
  rest_seconds: number | null
  notes: string | null
  order_index: number
  exercicio: { id: string; name: string; muscle_group: string | null; equipment: string | null } | null
}

export function useModelos() {
  return useQuery({
    queryKey: ['modelos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modelos')
        .select('*, modelo_exercicios(order_index, exercicio:exercicios(name))')
        .order('name')
      if (error) throw error
      return data as Modelo[]
    },
  })
}

export function useModelo(modeloId: string | undefined) {
  return useQuery({
    queryKey: ['modelo', modeloId],
    queryFn: async () => {
      const { data, error } = await supabase.from('modelos').select('*').eq('id', modeloId!).single()
      if (error) throw error
      return data as Omit<Modelo, 'modelo_exercicios'>
    },
    enabled: !!modeloId,
  })
}

export function useModeloExercicios(modeloId: string | undefined) {
  return useQuery({
    queryKey: ['modelo-exercicios', modeloId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modelo_exercicios')
        .select('*, exercicio:exercicios(id,name,muscle_group,equipment)')
        .eq('modelo_id', modeloId!)
        .order('order_index')
      if (error) throw error
      return data as ModeloExercicioItem[]
    },
    enabled: !!modeloId,
  })
}

export function useCriarModelo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string; notes?: string }) => {
      const { data: u } = await supabase.auth.getUser()
      if (!u.user) throw new Error('Sessão expirada')
      const { data, error } = await supabase
        .from('modelos')
        .insert({ professional_id: u.user.id, name: input.name, notes: input.notes || null })
        .select('id')
        .single()
      if (error) throw error
      return data.id as string
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['modelos'] }),
  })
}

export function useAtualizarModelo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string; name?: string; notes?: string | null }) => {
      const { error } = await supabase.from('modelos').update(input).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['modelos'] })
      qc.invalidateQueries({ queryKey: ['modelo', vars.id] })
    },
  })
}

export function useExcluirModelo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('modelos').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['modelos'] }),
  })
}

export function useDuplicarModelo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ modelo, novoNome }: { modelo: Modelo; novoNome: string }) => {
      const { data: u } = await supabase.auth.getUser()
      if (!u.user) throw new Error('Sessão expirada')

      const { data: novo, error: errNovo } = await supabase
        .from('modelos')
        .insert({ professional_id: u.user.id, name: novoNome, notes: modelo.notes })
        .select('id')
        .single()
      if (errNovo) throw errNovo

      const { data: itens, error: errItens } = await supabase
        .from('modelo_exercicios')
        .select('*')
        .eq('modelo_id', modelo.id)
        .order('order_index')
      if (errItens) throw errItens

      if (itens.length > 0) {
        const copia = itens.map((it) => ({
          modelo_id: novo.id,
          exercicio_id: it.exercicio_id,
          sets: it.sets,
          reps: it.reps,
          target_load_kg: it.target_load_kg,
          rest_seconds: it.rest_seconds,
          notes: it.notes,
          order_index: it.order_index,
        }))
        const { error: errCopia } = await supabase.from('modelo_exercicios').insert(copia)
        if (errCopia) throw errCopia
      }

      return novo.id as string
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['modelos'] }),
  })
}

export function useAdicionarExercicioModelo(modeloId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: ItemInput & { exercicio_id: string; order_index: number }) => {
      const { error } = await supabase.from('modelo_exercicios').insert({ modelo_id: modeloId, ...input })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['modelo-exercicios', modeloId] })
      qc.invalidateQueries({ queryKey: ['modelo-exercicios-cmp', modeloId] })
    },
  })
}

export function useAtualizarItemModelo(modeloId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: ItemInput & { id: string }) => {
      const { error } = await supabase.from('modelo_exercicios').update(input).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['modelo-exercicios', modeloId] })
      qc.invalidateQueries({ queryKey: ['modelo-exercicios-cmp', modeloId] })
    },
  })
}

export function useRemoverItemModelo(modeloId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('modelo_exercicios').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['modelo-exercicios', modeloId] })
      qc.invalidateQueries({ queryKey: ['modelo-exercicios-cmp', modeloId] })
    },
  })
}

export function useReordenarItemModelo(modeloId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ a, b }: { a: ModeloExercicioItem; b: ModeloExercicioItem }) => {
      const { error: e1 } = await supabase.from('modelo_exercicios').update({ order_index: b.order_index }).eq('id', a.id)
      if (e1) throw e1
      const { error: e2 } = await supabase.from('modelo_exercicios').update({ order_index: a.order_index }).eq('id', b.id)
      if (e2) throw e2
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['modelo-exercicios', modeloId] })
      qc.invalidateQueries({ queryKey: ['modelo-exercicios-cmp', modeloId] })
    },
  })
}

/** Itens comparáveis (para itensIguais) do treino planejado. */
export async function buscarItensComparaveisModelo(modeloId: string): Promise<ItemComparavel[]> {
  const { data, error } = await supabase
    .from('modelo_exercicios')
    .select('exercicio_id, order_index, sets, reps, target_load_kg, rest_seconds')
    .eq('modelo_id', modeloId)
  if (error) throw error
  return data
}
