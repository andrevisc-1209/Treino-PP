/** Indicadores (BI) do /admin: helpers puros (sem I/O). Dados vêm de `admin_bi(p_dias)` (migration 20261067). */

export type PeriodoBI = 1 | 15 | 30 | 90 | 180 | 365

export const PERIODOS_BI: { dias: PeriodoBI; rotulo: string; descricao: string }[] = [
  { dias: 1, rotulo: '24 h', descricao: 'últimas 24 horas' },
  { dias: 15, rotulo: '15 dias', descricao: 'últimos 15 dias' },
  { dias: 30, rotulo: 'Mês', descricao: 'últimos 30 dias' },
  { dias: 90, rotulo: 'Trimestre', descricao: 'últimos 90 dias' },
  { dias: 180, rotulo: 'Semestre', descricao: 'últimos 180 dias' },
  { dias: 365, rotulo: 'Ano', descricao: 'últimos 365 dias' },
]

/** Período vindo da URL (?periodo=); desconhecido cai em 30 dias. */
export function periodoDaUrl(valor: string | null): PeriodoBI {
  const n = Number(valor)
  return PERIODOS_BI.some((p) => p.dias === n) ? (n as PeriodoBI) : 30
}

export type MetricasBI = {
  cadastros: number
  novos_pagantes: number
  pagamentos: number
  receita: number
  alunos_novos: number
  treinos_montados: number
  treinos_presencial: number
  treinos_distancia: number
  aulas_realizadas: number
  faturas_geradas: number
  personais_ativos: number
  trials_encerrados: number
  trials_sem_conversao: number
  planos_vencidos: number
  relatos: number
}
export type ChaveBI = keyof MetricasBI

export type PontoSerie = { dia: string; cadastros: number; alunos_novos: number; treinos: number; pagamentos: number; receita: number }
export type ChaveSerie = Exclude<keyof PontoSerie, 'dia'>

export type DadosBI = { dias: PeriodoBI; inicio: string; fim: string; atual: MetricasBI; anterior: MetricasBI; serie: PontoSerie[] }

const CHAVES_METRICAS: ChaveBI[] = [
  'cadastros', 'novos_pagantes', 'pagamentos', 'receita', 'alunos_novos', 'treinos_montados', 'treinos_presencial', 'treinos_distancia',
  'aulas_realizadas', 'faturas_geradas', 'personais_ativos', 'trials_encerrados', 'trials_sem_conversao', 'planos_vencidos', 'relatos',
]

function metricas(l: unknown): MetricasBI {
  const o = (l ?? {}) as Record<string, unknown>
  return Object.fromEntries(CHAVES_METRICAS.map((k) => [k, Number(o[k] ?? 0)])) as MetricasBI
}

/** Normaliza o JSON do RPC (BIGINT/NUMERIC podem vir como string; métrica ausente vira 0). */
export function normalizarBI(raw: unknown): DadosBI {
  const o = (raw ?? {}) as Record<string, unknown>
  const serie = ((o.serie as Record<string, unknown>[] | undefined) ?? []).map((p) => ({
    dia: String(p.dia),
    cadastros: Number(p.cadastros ?? 0),
    alunos_novos: Number(p.alunos_novos ?? 0),
    treinos: Number(p.treinos ?? 0),
    pagamentos: Number(p.pagamentos ?? 0),
    receita: Number(p.receita ?? 0),
  }))
  return { dias: Number(o.dias) as PeriodoBI, inicio: String(o.inicio ?? ''), fim: String(o.fim ?? ''), atual: metricas(o.atual), anterior: metricas(o.anterior), serie }
}

export type Variacao = { rotulo: string; sentido: 'subiu' | 'caiu' | 'igual' | 'novo' | 'sem_dados' }

/** Variação contra o período anterior. Anterior 0 e atual > 0 = "novo" (percentual não existe); ambos 0 = "sem dados". */
export function variacao(atual: number, anterior: number): Variacao {
  if (atual === 0 && anterior === 0) return { rotulo: 'sem dados no período', sentido: 'sem_dados' }
  if (anterior === 0) return { rotulo: 'novo (sem base no período anterior)', sentido: 'novo' }
  const pct = Math.round(((atual - anterior) / anterior) * 100)
  if (pct === 0) return { rotulo: 'igual ao período anterior', sentido: 'igual' }
  return { rotulo: `${pct > 0 ? '+' : ''}${pct}% vs. período anterior`, sentido: pct > 0 ? 'subiu' : 'caiu' }
}

/** Para "planos vencidos" e "trials sem conversão" subir é ruim; nas demais, subir é bom. */
export const SUBIR_E_RUIM: ChaveBI[] = ['planos_vencidos', 'trials_sem_conversao']

/** Quantos pontos há por barra: dia até 31 dias, semana até 190, mês no resto (o ano). */
export function passoDoGrafico(dias: PeriodoBI): 1 | 7 | 30 {
  return dias <= 31 ? 1 : dias <= 190 ? 7 : 30
}

export type Barra = { rotulo: string; valor: number; detalhe: string }

function dm(dia: string): string {
  const [, m, d] = dia.split('-')
  return `${d}/${m}`
}

/** Agrupa a série diária em barras de `passo` dias somando a métrica; rótulo = dia (ou início–fim) em dd/mm. */
export function agruparSerie(serie: PontoSerie[], chave: ChaveSerie, passo: 1 | 7 | 30): Barra[] {
  const barras: Barra[] = []
  for (let i = 0; i < serie.length; i += passo) {
    const fatia = serie.slice(i, i + passo)
    const valor = fatia.reduce((s, p) => s + p[chave], 0)
    const ini = fatia[0].dia
    const fim = fatia[fatia.length - 1].dia
    const rotulo = dm(ini)
    barras.push({ rotulo, valor, detalhe: ini === fim ? dm(ini) : `${dm(ini)} a ${dm(fim)}` })
  }
  return barras
}
