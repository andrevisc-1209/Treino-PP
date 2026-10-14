import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ModalidadeTipo } from '@/types/modalidades'
import type { ParametroPrincipal } from './tipos'

export type Exercicio = {
  id: string
  professional_id: string | null
  name: string
  muscle_group: string | null
  equipment: string | null
  description: string | null
  /** fase da progressão (grupo Reabilitação / Prep Física): 'I' | 'II'; dado, não aparece na tela */
  fase?: 'I' | 'II' | null
  /** ausente/undefined = musculação (linhas antigas, ou banco sem a migration 20261032) */
  modalidade?: ModalidadeTipo
  /** fora da musculação: tipo da modalidade (ex.: 'intervalado-curto'); musculação usa muscle_group */
  tipo?: string | null
  parametro_principal?: ParametroPrincipal | null
}

export const ehMusculacao = (e: Pick<Exercicio, 'modalidade'>): boolean => (e.modalidade ?? 'musculacao') === 'musculacao'

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

/** Só os exercícios de musculação (o que os editores de treino e a sessão listam). */
export function useExerciciosMusculacao() {
  return useQuery({
    queryKey: ['exercicios'],
    queryFn: async () => {
      const { data, error } = await supabase.from('exercicios').select('*').order('muscle_group').order('name')
      if (error) throw error
      return data as Exercicio[]
    },
    select: (lista) => lista.filter(ehMusculacao),
  })
}

export type ExercicioInput = {
  name: string
  muscle_group?: string
  equipment?: string
  description?: string
  /** padrão musculação; só é enviada ao banco quando é outra modalidade */
  modalidade?: ModalidadeTipo
  tipo?: string
  parametro_principal?: ParametroPrincipal
}

/** Colunas da modalidade: musculação não manda nada (continua funcionando antes da migration 20261032). */
function colunasModalidade(input: ExercicioInput) {
  if (!input.modalidade || input.modalidade === 'musculacao') return {}
  return { modalidade: input.modalidade, tipo: input.tipo || null, parametro_principal: input.parametro_principal ?? null }
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
        ...colunasModalidade(input),
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
          ...colunasModalidade(input),
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
