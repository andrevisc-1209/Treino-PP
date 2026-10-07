import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { DetalhesExecucao, ModalidadeTipo } from '@/types/modalidades'

export type Execucao = {
  id: string
  plano_id: string | null
  plano_nome: string | null
  modalidade: ModalidadeTipo
  aluno_id: string
  origem: 'link' | 'presencial'
  iniciado_em: string
  concluido_em: string | null
  status: 'em_andamento' | 'concluido' | 'cancelado'
  detalhes_execucao: DetalhesExecucao
  notas_aluno: string | null
  created_at: string
}

/** Execuções do aluno (por link ou presenciais), da mais recente para a mais antiga. */
export function useExecucoes(alunoId: string | undefined) {
  return useQuery({
    queryKey: ['execucoes', alunoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('execucoes_assincrono')
        .select('*')
        .eq('aluno_id', alunoId!)
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return data as Execucao[]
    },
    enabled: !!alunoId,
  })
}

/** Registro feito pelo personal na aula presencial (origem 'presencial'; as de link são gravadas pela Edge Function). */
export function useRegistrarExecucaoPresencial(alunoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      plano: { id: string; name: string; modalidade: ModalidadeTipo }
      detalhes: DetalhesExecucao
      notas: string
    }) => {
      const { data: u } = await supabase.auth.getUser()
      if (!u.user) throw new Error('Sessão expirada')
      const agora = new Date().toISOString()
      const { error } = await supabase.from('execucoes_assincrono').insert({
        plano_id: input.plano.id,
        plano_nome: input.plano.name,
        modalidade: input.plano.modalidade,
        aluno_id: alunoId,
        professional_id: u.user.id,
        origem: 'presencial',
        concluido_em: agora,
        status: 'concluido',
        detalhes_execucao: input.detalhes,
        notas_aluno: input.notas.trim() || null,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['execucoes', alunoId] }),
  })
}
