import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { itensMusculacaoDe } from './aplicar'
import type { ModalidadeDetalhes, ModalidadeTipo } from '@/types/modalidades'

/** Modelo pronto do sistema (treino.templates_treino): catálogo global, somente leitura. */
export type TemplateTreino = {
  id: string
  slug: string
  modalidade: ModalidadeTipo
  nome: string
  descricao: string | null
  modalidade_detalhes: ModalidadeDetalhes
  ordem: number
}

export function useTemplatesTreino(modalidade: ModalidadeTipo, habilitado = true) {
  return useQuery({
    queryKey: ['templates-treino', modalidade],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('templates_treino')
        .select('id, slug, modalidade, nome, descricao, modalidade_detalhes, ordem')
        .eq('modalidade', modalidade)
        .order('ordem')
      if (error) throw error
      return data as TemplateTreino[]
    },
    enabled: habilitado,
    staleTime: 60 * 60 * 1000,
  })
}

/** Grava os exercícios de um modelo de musculação no treino (plano) ou treino planejado (modelo) recém-criado. */
export function useAplicarItensTemplate() {
  const qc = useQueryClient()
  return async (destino: { tabela: 'plano_exercicios'; plano_id: string } | { tabela: 'modelo_exercicios'; modelo_id: string }, t: TemplateTreino) => {
    const itens = itensMusculacaoDe(t.modalidade_detalhes)
    if (itens.length === 0) return
    const linhas = itens.map((it, i) => ({ ...destino, exercicio_id: it.exercicio_id, sets: it.sets, reps: it.reps, rest_seconds: it.rest_seconds, order_index: i }))
    const { error } = await supabase.from(destino.tabela).insert(linhas)
    if (error) throw error
    const id = 'plano_id' in destino ? destino.plano_id : destino.modelo_id
    qc.invalidateQueries({ queryKey: ['plano-exercicios', id] })
    qc.invalidateQueries({ queryKey: ['planos'] })
    qc.invalidateQueries({ queryKey: ['modelos'] })
  }
}
