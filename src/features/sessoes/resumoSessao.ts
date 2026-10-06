// Cálculos puros do resumo pós-treino (volume, variação, status da carga
// interna, recordes). Sem dados de prontidão aqui de propósito: o que sai
// daqui pode ir para a imagem compartilhada (LGPD).

export type SerieResumo = { reps: number | null; load_kg: number | null; completed: boolean }
export type ExercicioResumo = {
  exercicio_id: string
  nome: string
  series: SerieResumo[]
  grupo?: string | null
  /** veio do treino planejado (exercício adicionado na hora fica de fora do "% do planejado") */
  planejado?: boolean
}
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

export function textoVariacao(pct: number | null, primeiroTreino = false): string {
  if (pct == null && primeiroTreino) return 'Primeiro treino'
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

const feitas = (series: SerieResumo[]) => series.filter((s) => s.completed)

export function exerciciosFeitos(exs: ExercicioResumo[]): number {
  return exs.filter((e) => feitas(e.series).length > 0).length
}

export function totalRepeticoes(exs: ExercicioResumo[]): number {
  return exs.reduce((a, e) => a + feitas(e.series).reduce((b, s) => b + (s.reps ?? 0), 0), 0)
}

/** % de séries concluídas dos exercícios planejados; null em treino livre (sem exercício planejado). */
export function cumprimentoPlano(exs: ExercicioResumo[]): { feitas: number; total: number; pct: number } | null {
  const plan = exs.filter((e) => e.planejado)
  const total = plan.reduce((a, e) => a + e.series.length, 0)
  if (total === 0) return null
  const f = plan.reduce((a, e) => a + feitas(e.series).length, 0)
  return { feitas: f, total, pct: Math.round((f / total) * 100) }
}

/** Exercício de maior volume em kg; ignora os sem carga. */
export function exercicioDestaque(exs: ExercicioResumo[]): { nome: string; volume: number; grupo: string | null } | null {
  let melhor: { nome: string; volume: number; grupo: string | null } | null = null
  for (const e of exs) {
    const v = volumeSeries(e.series)
    if (v > 0 && (!melhor || v > melhor.volume)) melhor = { nome: e.nome, volume: v, grupo: e.grupo ?? null }
  }
  return melhor
}

export function gruposTrabalhados(exs: ExercicioResumo[]): string[] {
  const vistos = new Set<string>()
  for (const e of exs) if (e.grupo && feitas(e.series).length > 0) vistos.add(e.grupo)
  return [...vistos]
}

export type Evolucao = { exercicio: string; tipo: 'kg' | 'reps' | 'igual'; delta: number; de: number; para: number; principal?: boolean }

function seriePrincipal(series: SerieResumo[]): SerieResumo | null {
  const f = feitas(series)
  if (f.length === 0) return null
  return f.reduce((m, s) => ((s.load_kg ?? 0) > (m.load_kg ?? 0) || ((s.load_kg ?? 0) === (m.load_kg ?? 0) && (s.reps ?? 0) > (m.reps ?? 0)) ? s : m))
}

/**
 * Melhora por exercício vs. a última sessão anterior em que ele apareceu.
 * Com carga: diferença da maior carga (kg) ou, se igual, das reps da série principal.
 * Sem carga: diferença do total de reps. Só melhoras, maiores primeiro.
 */
export function evolucaoPorExercicio(atual: ExercicioResumo[], historico: SessaoHistorico[], max = 3): Evolucao[] {
  const ordenado = [...historico].sort((a, b) => a.session_date.localeCompare(b.session_date))
  const out: Evolucao[] = []
  for (const ex of atual) {
    const pa = seriePrincipal(ex.series)
    if (!pa) continue
    let anterior: ExercicioResumo | null = null
    for (let i = ordenado.length - 1; i >= 0 && !anterior; i--) {
      const e = ordenado[i].exercicios.find((x) => x.exercicio_id === ex.exercicio_id && feitas(x.series).length > 0)
      if (e) anterior = e
    }
    if (!anterior) continue
    const pp = seriePrincipal(anterior.series)!
    const igual: Evolucao = { exercicio: ex.nome, tipo: 'igual', delta: 0, de: 0, para: 0 }
    if ((pa.load_kg ?? 0) > 0 || (pp.load_kg ?? 0) > 0) {
      const dKg = (pa.load_kg ?? 0) - (pp.load_kg ?? 0)
      if (dKg > 0) out.push({ exercicio: ex.nome, tipo: 'kg', delta: dKg, de: pp.load_kg ?? 0, para: pa.load_kg ?? 0 })
      else if (dKg === 0 && (pa.reps ?? 0) > (pp.reps ?? 0))
        out.push({ exercicio: ex.nome, tipo: 'reps', delta: (pa.reps ?? 0) - (pp.reps ?? 0), de: pp.reps ?? 0, para: pa.reps ?? 0, principal: true })
      else if (dKg === 0) out.push(igual)
    } else {
      const ra = feitas(ex.series).reduce((a, s) => a + (s.reps ?? 0), 0)
      const rp = feitas(anterior.series).reduce((a, s) => a + (s.reps ?? 0), 0)
      if (ra > rp) out.push({ exercicio: ex.nome, tipo: 'reps', delta: ra - rp, de: rp, para: ra })
      else if (ra === rp) out.push(igual)
    }
  }
  // melhoras primeiro (kg antes de reps, maiores antes); "igual" só completa as vagas
  const rank = (e: Evolucao) => (e.tipo === 'kg' ? 0 : e.tipo === 'reps' ? 1 : 2)
  return out.sort((a, b) => rank(a) - rank(b) || b.delta - a.delta).slice(0, max)
}

/** Texto curto para a evolução: "+5 kg" / "+2 reps". */
export function textoEvolucao(e: Evolucao): string {
  if (e.tipo === 'igual') return 'igual à última vez'
  if (e.tipo === 'reps' && e.principal) return `+${e.delta} ${e.delta === 1 ? 'rep' : 'reps'} na série principal`
  return `+${String(e.delta).replace('.', ',')} ${e.tipo === 'kg' ? 'kg' : e.delta === 1 ? 'rep' : 'reps'}`
}

export type Sequencia = { numeroTreino: number; naSemana: number; semanasSeguidas: number }

/** datas = sessões concluídas anteriores; dataAtual = a sessão que acabou de fechar. inicioSemana(d) devolve a segunda-feira de d. */
export function calcularSequencia(datasAnteriores: string[], dataAtual: string, inicioSemana: (d: string) => string, semanaAnterior: (inicio: string) => string): Sequencia {
  const todas = [...datasAnteriores, dataAtual]
  const semanas = new Set(todas.map(inicioSemana))
  const semanaAtual = inicioSemana(dataAtual)
  let seguidas = 0
  for (let w = semanaAtual; semanas.has(w); w = semanaAnterior(w)) seguidas++
  return {
    numeroTreino: todas.length,
    naSemana: todas.filter((d) => inicioSemana(d) === semanaAtual).length,
    semanasSeguidas: seguidas,
  }
}
