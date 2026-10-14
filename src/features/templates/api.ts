import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
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
