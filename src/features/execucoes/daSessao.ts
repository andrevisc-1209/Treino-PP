import type { DetalhesExecucao } from '@/types/modalidades'

type ItemSessao = {
  exercicio_id: string
  notes: string | null
  exercicio: { name: string } | null
  sessao_series: { reps: number | null; load_kg: number | null; completed: boolean }[]
}

/**
 * Sessão presencial de musculação → `detalhes_execucao` no mesmo formato da execução por link
 * (séries feitas/planejadas por exercício) + maior carga feita, PSE e duração.
 */
export function detalhesDaSessao(itens: ItemSessao[], pse: number | null, duracaoMin: number | null): DetalhesExecucao {
  return {
    exercicios: itens.map((i) => {
      const feitas = i.sessao_series.filter((s) => s.completed)
      const maiorCarga = Math.max(0, ...feitas.map((s) => s.load_kg ?? 0))
      return {
        exercicio_id: i.exercicio_id,
        nome: i.exercicio?.name ?? 'Exercício',
        series_planejadas: i.sessao_series.length,
        series_feitas: feitas.length,
        ...(maiorCarga > 0 ? { carga_kg: maiorCarga } : {}),
        ...(i.notes?.trim() ? { obs: i.notes.trim() } : {}),
      }
    }),
    ...(pse !== null ? { pse } : {}),
    ...(duracaoMin !== null ? { duracao_min: duracaoMin } : {}),
  }
}
