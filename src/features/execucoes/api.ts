import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { DetalhesExecucao, ModalidadeTipo } from '@/types/modalidades'
import { detalhesDaSessao } from './daSessao'

export type Execucao = {
  id: string
  plano_id: string | null
  plano_nome: string | null
  /** preenchido nas execuções que vieram de uma sessão presencial de musculação (já listada como sessão) */
  sessao_id: string | null
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

/**
 * Sessão presencial de musculação concluída → também entra no histórico unificado (Performance, selo, feed).
 * Aditivo: o salvamento da sessão em si não muda. Idempotente (sessao_id é único). Quem chama trata a falha
 * (só registra no console) para nunca travar a conclusão do treino.
 */
export async function registrarExecucaoDaSessao(sessaoId: string): Promise<void> {
  const [{ data: sessao, error: errSessao }, { data: itens, error: errItens }] = await Promise.all([
    supabase.from('sessoes').select('id, aluno_id, professional_id, plano_id, plano_nome, created_at, post_pse, duration_minutes').eq('id', sessaoId).single(),
    supabase
      .from('sessao_exercicios')
      .select('exercicio_id, notes, order_index, exercicio:exercicios(name), sessao_series(reps, load_kg, completed)')
      .eq('sessao_id', sessaoId)
      .order('order_index'),
  ])
  if (errSessao) throw errSessao
  if (errItens) throw errItens

  const { error } = await supabase.from('execucoes_assincrono').insert({
    sessao_id: sessao.id,
    plano_id: sessao.plano_id,
    plano_nome: sessao.plano_nome,
    modalidade: 'musculacao',
    aluno_id: sessao.aluno_id,
    professional_id: sessao.professional_id,
    origem: 'presencial',
    iniciado_em: sessao.created_at,
    concluido_em: new Date().toISOString(),
    status: 'concluido',
    detalhes_execucao: detalhesDaSessao(itens as unknown as Parameters<typeof detalhesDaSessao>[0], sessao.post_pse, sessao.duration_minutes),
    notas_aluno: null,
  })
  // 23505 = já registrada (conclusão repetida): não é erro
  if (error && error.code !== '23505') throw error
}
