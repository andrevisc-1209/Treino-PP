// Cálculos puros do resumo pós-treino (volume, variação, status da carga
// interna, recordes). Sem dados de prontidão aqui de propósito: o que sai
// daqui pode ir para a imagem compartilhada (LGPD).

export type SerieResumo = { reps: number | null; load_kg: number | null; completed: boolean }
export type ExercicioResumo = { exercicio_id: string; nome: string; series: SerieResumo[] }
export type SessaoHistorico = { id: string; session_date: string; exercicios: ExercicioResumo[] }

export function volumeSeries(series: SerieResumo[]): number {
  return series.filter((s) => s.completed).reduce((a, s) => a + (s.reps ?? 0) * (s.load_kg ?? 0), 0)
}

export function volumeSessao(exercicios: ExercicioResumo[]): number {
  return exercicios.reduce((a, e) => a + volumeSeries(e.series), 0)
}

/** Variação percentual do volume vs. o último treino; null quando não há base de comparação. */
export function variacaoVolume(atual: number, anterior: number | null): number | null {
  if (anterior == null || anterior <= 0) return null
  return Math.round(((atual - anterior) / anterior) * 100)
}

export function textoVariacao(pct: number | null): string {
  if (pct == null || pct === 0) return 'Mesmo volume'
  return `${pct > 0 ? '+' : '−'}${Math.abs(pct)}% vs. último treino`
}

export type StatusCarga = { label: 'Leve' | 'Moderado' | 'Forte' | 'Muito forte'; classe: string }

/** Faixas de carga interna (UA = PSE × minutos) de uma sessão: <200 · 200–399 · 400–599 · ≥600. */
export function statusCargaInterna(ua: number): StatusCarga {
  if (ua < 200) return { label: 'Leve', classe: 'bg-emerald-100 text-emerald-800' }
  if (ua < 400) return { label: 'Moderado', classe: 'bg-amber-100 text-amber-800' }
  if (ua < 600) return { label: 'Forte', classe: 'bg-orange-100 text-orange-800' }
  return { label: 'Muito forte', classe: 'bg-red-100 text-red-800' }
}

export type Recorde = { tipo: 'volume' | 'carga'; exercicio: string; valor: number }

/**
 * Recordes da sessão atual frente ao histórico do aluno (sessões anteriores,
 * já sem a atual). Só conta se o exercício já tinha histórico — a primeira
 * vez não é "recorde".
 */
export function calcularRecordes(atual: ExercicioResumo[], historico: SessaoHistorico[]): Recorde[] {
  const recordes: Recorde[] = []
  for (const ex of atual) {
    const anteriores = historico.flatMap((s) => s.exercicios.filter((e) => e.exercicio_id === ex.exercicio_id))
    const comSeries = anteriores.filter((e) => e.series.some((s) => s.completed))
    if (comSeries.length === 0) continue

    const volAtual = volumeSeries(ex.series)
    const volMax = Math.max(...comSeries.map((e) => volumeSeries(e.series)))
    if (volAtual > 0 && volAtual > volMax) recordes.push({ tipo: 'volume', exercicio: ex.nome, valor: volAtual })

    const maiorCarga = (series: SerieResumo[]) => Math.max(0, ...series.filter((s) => s.completed).map((s) => s.load_kg ?? 0))
    const cargaAtual = maiorCarga(ex.series)
    const cargaMax = Math.max(...comSeries.map((e) => maiorCarga(e.series)))
    if (cargaAtual > 0 && cargaAtual > cargaMax) recordes.push({ tipo: 'carga', exercicio: ex.nome, valor: cargaAtual })
  }
  return recordes
}

/** Volume do último treino anterior (por data, depois por ordem) com volume > 0. */
export function volumeUltimoTreino(historico: SessaoHistorico[]): number | null {
  const ordenado = [...historico].sort((a, b) => a.session_date.localeCompare(b.session_date))
  for (let i = ordenado.length - 1; i >= 0; i--) {
    const v = volumeSessao(ordenado[i].exercicios)
    if (v > 0) return v
  }
  return null
}
