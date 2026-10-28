import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { limitesDoDiaSP } from '@/lib/datas'
import { itemDeExecucaoADistancia, paraItemRecibo, SELECT_SESSAO_DETALHE, type ExecucaoADistancia } from './api'
import { primeiroDiaDoMes, ultimoDiaDoMesRelatorio } from './mesDoRelatorio'
import type { ItemRecibo } from './recibo'
import { juntarTreinosADistancia } from './useItensDoCiclo'

/**
 * Tudo o que aconteceu com o aluno em um mês (AAAA-MM), cobrado ou não: aulas presentes, faltas e cancelamentos e os treinos
 * à distância. Não depende de fatura: é a base do relatório mensal de acompanhamento.
 */
export function useItensDoMes(alunoId: string | undefined, mes: string | undefined) {
  return useQuery({
    queryKey: ['itens-do-mes', alunoId, mes],
    queryFn: async (): Promise<ItemRecibo[]> => {
      const inicio = limitesDoDiaSP(primeiroDiaDoMes(mes!)).inicio.toISOString()
      const fim = limitesDoDiaSP(ultimoDiaDoMesRelatorio(mes!)).fim.toISOString()
      const { data, error } = await supabase
        .from('aula_participantes')
        .select(`id, status, valor, execucao_id, aula:aulas!inner(starts_at, duration_min, local, tipo), execucao:execucoes_assincrono(modalidade, detalhes_execucao), ${SELECT_SESSAO_DETALHE}`)
        .eq('aluno_id', alunoId!)
        .in('status', ['presente', 'falta', 'cancelou'])
        .gte('aula.starts_at', inicio)
        .lte('aula.starts_at', fim)
      if (error) throw error
      const aulas = (data as unknown as Parameters<typeof paraItemRecibo>[0][]).map(paraItemRecibo).filter((i): i is ItemRecibo => !!i)

      // treinos à distância do mês que não viraram aula: entram só como informação (sem leitura, o relatório sai só com as aulas)
      const { data: execs } = await supabase
        .from('execucoes_assincrono')
        .select('id, modalidade, concluido_em, detalhes_execucao')
        .eq('aluno_id', alunoId!)
        .eq('origem', 'link')
        .eq('status', 'concluido')
        .gte('concluido_em', inicio)
        .lte('concluido_em', fim)
        .order('concluido_em')
      return juntarTreinosADistancia(aulas, ((execs ?? []) as ExecucaoADistancia[]).map(itemDeExecucaoADistancia))
    },
    enabled: !!alunoId && !!mes,
  })
}
