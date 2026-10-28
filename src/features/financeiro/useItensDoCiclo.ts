import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useItensDaFatura } from '@/features/pacotes/useItensDaFatura'
import { itemDeExecucaoADistancia, useExecucoesADistanciaDoPeriodo, type Fatura } from './api'
import type { ItemRecibo } from './recibo'

/** Junta os treinos à distância feitos no período e que não foram cobrados (sem aula ligada à fatura) aos itens da fatura. */
export function juntarTreinosADistancia(itens: ItemRecibo[], extras: ReturnType<typeof itemDeExecucaoADistancia>[]): ItemRecibo[] {
  const jaNaFatura = new Set(itens.map((i) => i.execucao_id).filter((x): x is string => !!x))
  return [...itens, ...extras.filter((e) => !e.execucao_id || !jaNaFatura.has(e.execucao_id))]
}

/**
 * Itens do ciclo para recibo e relatório: as aulas da fatura (incluindo as de treino à distância cobradas) e, além delas, os
 * treinos à distância do período que não foram cobrados — aparecem como informação, fora da cobrança.
 */
/** O pacote desta fatura conta o treino à distância como aula? (decisão do personal; vale também depois de encerrado) */
function useContaDistanciaDoPacote(fatura: { id: string; modelo: string } | undefined) {
  return useQuery({
    queryKey: ['pacote-conta-distancia', fatura?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('aluno_pacotes').select('conta_distancia').eq('fatura_id', fatura!.id).maybeSingle()
      if (error) throw error
      return !!data?.conta_distancia
    },
    enabled: fatura?.modelo === 'pacote',
  })
}

export function useItensDoCiclo(fatura: Pick<Fatura, 'id' | 'aluno_id' | 'modelo' | 'periodo_inicio' | 'periodo_fim'> | undefined) {
  const base = useItensDaFatura(fatura)
  const { data: contaDistancia } = useContaDistanciaDoPacote(fatura)
  const distancia = useExecucoesADistanciaDoPeriodo(fatura?.aluno_id, fatura?.periodo_inicio, fatura?.periodo_fim)
  const data = useMemo(() => {
    if (!base.data) return undefined
    // se a leitura dos treinos à distância falhar, o relatório sai só com as aulas (nunca bloqueia)
    // pacote que conta o treino à distância como aula: ele entra como aula do pacote; senão fica fora da cobrança (só informação)
    const extras = (distancia.data ?? []).map((e) => ({ ...itemDeExecucaoADistancia(e), fora_da_cobranca: !contaDistancia }))
    return juntarTreinosADistancia(base.data, extras)
  }, [base.data, distancia.data, contaDistancia])
  return { ...base, data, isLoading: base.isLoading || (!!fatura && distancia.isLoading) }
}
