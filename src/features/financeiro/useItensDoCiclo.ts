import { useMemo } from 'react'
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
export function useItensDoCiclo(fatura: Pick<Fatura, 'id' | 'aluno_id' | 'modelo' | 'periodo_inicio' | 'periodo_fim'> | undefined) {
  const base = useItensDaFatura(fatura)
  const distancia = useExecucoesADistanciaDoPeriodo(fatura?.aluno_id, fatura?.periodo_inicio, fatura?.periodo_fim)
  const data = useMemo(() => {
    if (!base.data) return undefined
    // se a leitura dos treinos à distância falhar, o relatório sai só com as aulas (nunca bloqueia)
    const extras = (distancia.data ?? []).map(itemDeExecucaoADistancia)
    return juntarTreinosADistancia(base.data, extras)
  }, [base.data, distancia.data])
  return { ...base, data, isLoading: base.isLoading || (!!fatura && distancia.isLoading) }
}
