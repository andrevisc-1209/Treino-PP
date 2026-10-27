import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { mostrarInfoGlobal } from '@/components/Toast'
import { MODALIDADES_CONFIG, ehModalidade, type ModalidadeTipo } from '@/types/modalidades'
import type { PayloadCiclo } from './ciclo'
import { textoAvisoIndicacao, type PayloadIndicacao } from '@/features/indicacao/indicacao'

export type Notificacao = {
  id: string
  /** null só em avisos que não são de aluno (indicacao_concedida) */
  aluno_id: string | null
  tipo: 'treino_concluido' | 'ciclo_encerrado' | 'indicacao_concedida'
  lida: boolean
  payload: { execucao_id?: string; plano_nome?: string; modalidade?: ModalidadeTipo; tem_notas?: boolean } & PayloadCiclo &
    PayloadIndicacao
  criada_em: string
  aluno: { name: string } | null
}

export function useNotificacoes() {
  return useQuery({
    queryKey: ['notificacoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notificacoes_professor')
        .select('id, aluno_id, tipo, lida, payload, criada_em, aluno:alunos(name)')
        .order('lida', { ascending: true })
        .order('criada_em', { ascending: false })
        .limit(20)
      if (error) throw error
      return data as unknown as Notificacao[]
    },
  })
}

export function useNaoLidas() {
  return useQuery({
    queryKey: ['notificacoes-nao-lidas'],
    queryFn: async () => {
      const { count, error } = await supabase.from('notificacoes_professor').select('id', { count: 'exact', head: true }).eq('lida', false)
      if (error) throw error
      return count ?? 0
    },
  })
}

function useInvalidar() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['notificacoes'] })
    qc.invalidateQueries({ queryKey: ['notificacoes-nao-lidas'] })
  }
}

export function useMarcarLida() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notificacoes_professor').update({ lida: true }).eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidar,
  })
}

export function useMarcarTodasLidas() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('notificacoes_professor').update({ lida: true }).eq('lida', false)
      if (error) throw error
    },
    onSuccess: invalidar,
  })
}

/** Observação do aluno de uma execução (não vai no payload da notificação: texto livre, pode citar dor/lesão). */
export function useNotaDaExecucao(execucaoId: string | undefined) {
  return useQuery({
    queryKey: ['execucao-nota', execucaoId],
    enabled: !!execucaoId,
    queryFn: async () => {
      const { data, error } = await supabase.from('execucoes_assincrono').select('notas_aluno').eq('id', execucaoId!).maybeSingle()
      if (error) throw error
      return data?.notas_aluno ?? null
    },
  })
}

/**
 * Escuta novas notificações do personal (Supabase Realtime, respeitando o RLS): atualiza o sino e avisa com um toast.
 * Montado uma vez, no layout autenticado.
 */
export function useNotificacoesRealtime(professionalId: string | undefined) {
  const qc = useQueryClient()
  useEffect(() => {
    if (!professionalId) return
    const canal = supabase
      .channel(`notificacoes-${professionalId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'treino', table: 'notificacoes_professor', filter: `professional_id=eq.${professionalId}` },
        async (evento) => {
          qc.invalidateQueries({ queryKey: ['notificacoes'] })
          qc.invalidateQueries({ queryKey: ['notificacoes-nao-lidas'] })
          qc.invalidateQueries({ queryKey: ['atividade-recente'] })
          qc.invalidateQueries({ queryKey: ['ultima-execucao-por-aluno'] })
          const nova = evento.new as { aluno_id: string | null; tipo?: Notificacao['tipo']; payload?: Notificacao['payload'] }
          if (nova.tipo === 'indicacao_concedida') {
            mostrarInfoGlobal(textoAvisoIndicacao(nova.payload).titulo)
            qc.invalidateQueries({ queryKey: ['indicacoes'] })
            qc.invalidateQueries({ queryKey: ['assinatura'] })
            return
          }
          const { data } = await supabase.from('alunos').select('name').eq('id', nova.aluno_id!).maybeSingle()
          if (nova.tipo === 'ciclo_encerrado') {
            mostrarInfoGlobal(`Ciclo encerrado — ${data?.name ?? 'aluno'}`)
            return
          }
          const m = nova.payload?.modalidade
          mostrarInfoGlobal(`${data?.name ?? 'Um aluno'} concluiu o treino de ${m && ehModalidade(m) ? MODALIDADES_CONFIG[m].emoji : '💪'}`)
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(canal)
    }
  }, [professionalId, qc])
}

/**
 * Pede ao banco para criar as notificações de "Ciclo encerrado" pendentes (não há agendador: o fechamento de ciclo é manual).
 * Roda uma vez por abertura do app autenticado; se a migration ainda não foi aplicada, falha em silêncio.
 */
export function useGerarNotificacoesCiclo(professionalId: string | undefined) {
  const qc = useQueryClient()
  useEffect(() => {
    if (!professionalId) return
    let ativo = true
    supabase.rpc('gerar_notificacoes_ciclo').then(({ data, error }) => {
      if (!ativo || error || !data) return
      qc.invalidateQueries({ queryKey: ['notificacoes'] })
      qc.invalidateQueries({ queryKey: ['notificacoes-nao-lidas'] })
    })
    return () => {
      ativo = false
    }
  }, [professionalId, qc])
}
