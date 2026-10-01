import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { hojeSP, inicioDaSemanaSP } from '@/lib/datas'
import { useAlunos } from './api'

const DIAS_SEM_TREINO_ALERTA = 7

export function useTreinosEstaSemana() {
  return useQuery({
    queryKey: ['metricas', 'treinos-esta-semana'],
    queryFn: async () => {
      const inicioSemana = inicioDaSemanaSP(hojeSP())
      const { count, error } = await supabase.from('sessoes').select('id', { count: 'exact', head: true }).gte('session_date', inicioSemana)
      if (error) throw error
      return count ?? 0
    },
  })
}

/** Quantos alunos ativos não têm sessão concluída nos últimos 7 dias (ou nunca tiveram nenhuma). */
export function useAlunosSemTreinoRecente() {
  const alunosAtivos = useAlunos()

  return useQuery({
    queryKey: ['metricas', 'sem-treino-recente', alunosAtivos.data?.map((a) => a.id).join(',')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessoes')
        .select('aluno_id, session_date')
        .eq('status', 'concluida')
        .order('session_date', { ascending: false })
      if (error) throw error

      const ultimaPorAluno = new Map<string, string>()
      for (const s of data) {
        if (!ultimaPorAluno.has(s.aluno_id)) ultimaPorAluno.set(s.aluno_id, s.session_date)
      }

      const limite = Date.now() - DIAS_SEM_TREINO_ALERTA * 86_400_000
      return (alunosAtivos.data ?? []).filter((a) => {
        const ultima = ultimaPorAluno.get(a.id)
        return !ultima || new Date(ultima + 'T00:00:00').getTime() < limite
      }).length
    },
    enabled: !!alunosAtivos.data,
  })
}
