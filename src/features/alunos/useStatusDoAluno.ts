import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { proximaAulaDe, type ProximaAula } from './linhasDeStatus'

/** A próxima aula marcada do aluno (agendada, ainda não começou). */
export function useProximaAulaDoAluno(alunoId: string | undefined) {
  return useQuery({
    queryKey: ['aulas', 'proxima-do-aluno', alunoId],
    enabled: !!alunoId,
    queryFn: async (): Promise<ProximaAula | null> => {
      const agora = new Date()
      const { data, error } = await supabase
        .from('aula_participantes')
        .select('aula:aulas!inner(starts_at, duration_min, local, status)')
        .eq('aluno_id', alunoId!)
        .eq('status', 'previsto')
        .eq('aula.status', 'agendada')
        .gte('aula.starts_at', agora.toISOString())
        .limit(30)
      if (error) throw error
      const aulas = (data ?? []).map((r) => (r as unknown as { aula: ProximaAula }).aula).filter(Boolean)
      return proximaAulaDe(aulas, agora.getTime())
    },
  })
}

/** Data (AAAA-MM-DD) do último treino concluído do aluno; nulo se nunca treinou. */
export function useUltimoTreinoDoAluno(alunoId: string | undefined) {
  return useQuery({
    queryKey: ['metricas', 'ultimo-treino-do-aluno', alunoId],
    enabled: !!alunoId,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from('sessoes')
        .select('session_date')
        .eq('aluno_id', alunoId!)
        .eq('status', 'concluida')
        .order('session_date', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return (data?.session_date as string | undefined) ?? null
    },
  })
}
