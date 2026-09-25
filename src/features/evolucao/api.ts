import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type SessaoDetalhada = {
  id: string
  session_date: string
  pre_sleep: number | null
  pre_stress: number | null
  pre_fatigue: number | null
  pre_muscle_pain: number | null
  post_pse: number | null
  duration_minutes: number | null
  sessao_exercicios: {
    exercicio_id: string
    exercicio: { name: string } | null
    sessao_series: { reps: number | null; load_kg: number | null; completed: boolean }[]
  }[]
}

export function useSessoesDetalhadas(alunoId: string | undefined) {
  return useQuery({
    queryKey: ['sessoes-detalhadas', alunoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessoes')
        .select(
          'id, session_date, pre_sleep, pre_stress, pre_fatigue, pre_muscle_pain, post_pse, duration_minutes, sessao_exercicios(exercicio_id, exercicio:exercicios(name), sessao_series(reps, load_kg, completed))',
        )
        .eq('aluno_id', alunoId!)
        .eq('status', 'concluida')
        .order('session_date')
      if (error) throw error
      return data as unknown as SessaoDetalhada[]
    },
    enabled: !!alunoId,
  })
}
