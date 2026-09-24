import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type Exercicio = {
  id: string
  professional_id: string | null
  name: string
  muscle_group: string | null
  equipment: string | null
  description: string | null
}

export function useExercicios() {
  return useQuery({
    queryKey: ['exercicios'],
    queryFn: async () => {
      const { data, error } = await supabase.from('exercicios').select('*').order('muscle_group').order('name')
      if (error) throw error
      return data as Exercicio[]
    },
  })
}

export type ExercicioInput = {
  name: string
  muscle_group?: string
  equipment?: string
  description?: string
}

export function useCriarExercicio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: ExercicioInput) => {
      const { data: u } = await supabase.auth.getUser()
      if (!u.user) throw new Error('Sessão expirada')
      const { error } = await supabase.from('exercicios').insert({
        professional_id: u.user.id,
        name: input.name,
        muscle_group: input.muscle_group || null,
        equipment: input.equipment || null,
        description: input.description || null,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercicios'] }),
  })
}

export function useAtualizarExercicio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: ExercicioInput & { id: string }) => {
      const { error } = await supabase
        .from('exercicios')
        .update({
          name: input.name,
          muscle_group: input.muscle_group || null,
          equipment: input.equipment || null,
          description: input.description || null,
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercicios'] }),
  })
}

export function useExcluirExercicio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('exercicios').delete().eq('id', id)
      if (error) {
        if (error.code === '23503') {
          throw new Error('Esse exercício está em uso em um ou mais planos de treino e não pode ser excluído.')
        }
        throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercicios'] }),
  })
}
