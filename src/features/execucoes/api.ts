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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['execucoes', alunoId] })
      qc.invalidateQueries({ queryKey: ['atividade-recente'] })
      qc.invalidateQueries({ queryKey: ['ultima-execucao-por-aluno'] })
    },
  })
}

export type UltimaExecucao = { aluno_id: string; modalidade: ModalidadeTipo; concluido_em: string }

/** Última execução concluída de cada aluno (uma consulta só; o RLS limita aos alunos do personal logado). */
export function useUltimaExecucaoPorAluno() {
  return useQuery({
    queryKey: ['ultima-execucao-por-aluno'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('ultima_execucao_por_aluno')
      if (error) throw error
      return new Map(((data ?? []) as UltimaExecucao[]).map((u) => [u.aluno_id, u]))
    },
    staleTime: 60_000,
  })
}

export type AtividadeRecente = {
  id: string
  concluido_em: string
  plano_nome: string | null
  modalidade: ModalidadeTipo
  notas_aluno: string | null
  aluno: { name: string } | null
}

/** Últimas execuções concluídas de todos os alunos (feed da Home). */
export function useAtividadeRecente(limite = 10) {
  return useQuery({
    queryKey: ['atividade-recente', limite],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('execucoes_assincrono')
        .select('id, concluido_em, plano_nome, modalidade, notas_aluno, aluno:alunos(name)')
        .eq('status', 'concluido')
        .not('concluido_em', 'is', null)
        .order('concluido_em', { ascending: false })
        .limit(limite)
      if (error) throw error
      return data as unknown as AtividadeRecente[]
    },
    staleTime: 30_000,
  })
}
