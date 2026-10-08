import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { CHIPS_PADRAO, type ExercicioNatacao } from '@/data/natacao-exercicios'
import type { GrupoNatacao } from '@/types/natacao'

type LinhaCustom = {
  id: string
  nome: string
  descricao: string | null
  ambiente: 'piscina' | 'mar' | 'ambos'
  grupo: GrupoNatacao | null
  parametros_padrao: { parametroPrincipal?: 'distancia' | 'tempo'; valorSugerido?: number } | null
}

const paraExercicio = (l: LinhaCustom): ExercicioNatacao => {
  const principal = l.parametros_padrao?.parametroPrincipal === 'tempo' ? 'tempo' : 'distancia'
  return {
    id: l.id,
    nome: l.nome,
    descricao: l.descricao ?? undefined,
    grupo: l.grupo ?? (l.ambiente === 'mar' ? 'mar' : 'serie'),
    ambiente: l.ambiente,
    parametroPrincipal: principal,
    valorSugerido: l.parametros_padrao?.valorSugerido,
    chipsSugestao: CHIPS_PADRAO[principal],
    is_custom: true,
  }
}

/** Exercícios de natação criados pelo personal (biblioteca própria). */
export function useExerciciosNatacaoCustom() {
  return useQuery({
    queryKey: ['exercicios-natacao-custom'],
    queryFn: async () => {
      const { data, error } = await supabase.from('exercicios_natacao_custom').select('id, nome, descricao, ambiente, grupo, parametros_padrao').order('nome')
      if (error) throw error
      return (data as LinhaCustom[]).map(paraExercicio)
    },
  })
}

export type NovoExercicioNatacao = {
  nome: string
  grupo: GrupoNatacao
  ambiente: 'piscina' | 'mar' | 'ambos'
  descricao: string
  parametroPrincipal: 'distancia' | 'tempo'
  valorSugerido?: number
}

export function useCriarExercicioNatacao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: NovoExercicioNatacao): Promise<ExercicioNatacao> => {
      const { data: u } = await supabase.auth.getUser()
      if (!u.user) throw new Error('Sessão expirada')
      const { data, error } = await supabase
        .from('exercicios_natacao_custom')
        .insert({
          professional_id: u.user.id,
          nome: input.nome.trim(),
          descricao: input.descricao.trim() || null,
          ambiente: input.ambiente,
          grupo: input.grupo,
          parametros_padrao: { parametroPrincipal: input.parametroPrincipal, ...(input.valorSugerido ? { valorSugerido: input.valorSugerido } : {}) },
        })
        .select('id, nome, descricao, ambiente, grupo, parametros_padrao')
        .single()
      if (error) throw error
      return paraExercicio(data as LinhaCustom)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercicios-natacao-custom'] }),
  })
}
