import type { Peso } from '@/features/alunos/api'
import type { SessaoDetalhada } from './api'

export type Periodo = '30' | '90' | 'tudo'

export function cutoffData(periodo: Periodo): Date | null {
  if (periodo === 'tudo') return null
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - Number(periodo))
  return d
}

export function filtrarPorPeriodo<T>(itens: T[], periodo: Periodo, dataFn: (item: T) => string): T[] {
  const corte = cutoffData(periodo)
  if (!corte) return itens
  return itens.filter((i) => new Date(dataFn(i) + 'T00:00:00') >= corte)
}

export function bemEstar(s: SessaoDetalhada): number | null {
  const { pre_sleep, pre_stress, pre_fatigue, pre_muscle_pain } = s
  if (pre_sleep == null || pre_stress == null || pre_fatigue == null || pre_muscle_pain == null) return null
  return (pre_sleep + (10 - pre_stress) + (10 - pre_fatigue) + (10 - pre_muscle_pain)) / 4
}

export function cargaInterna(s: SessaoDetalhada): number | null {
  if (s.post_pse == null || s.duration_minutes == null) return null
  return s.post_pse * s.duration_minutes
}

export function inicioDaSemana(dataStr: string): string {
  const d = new Date(dataStr + 'T00:00:00')
  const diaSemana = (d.getDay() + 6) % 7 // 0 = segunda-feira
  d.setDate(d.getDate() - diaSemana)
  return d.toISOString().slice(0, 10)
}

export function cargaPorSemana(sessoes: SessaoDetalhada[]): { semana: string; total: number }[] {
  const mapa = new Map<string, number>()
  for (const s of sessoes) {
    const c = cargaInterna(s)
    if (c == null) continue
    const semana = inicioDaSemana(s.session_date)
    mapa.set(semana, (mapa.get(semana) ?? 0) + c)
  }
  return Array.from(mapa.entries())
    .map(([semana, total]) => ({ semana, total }))
    .sort((a, b) => a.semana.localeCompare(b.semana))
}

/** Soma de carga interna em janelas de 7 dias terminando hoje; índice 0 = últimos 7 dias. */
export function janelasSemanais(sessoes: SessaoDetalhada[], n = 5): number[] {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const janelas: number[] = Array(n).fill(0)
  for (const s of sessoes) {
    const c = cargaInterna(s)
    if (c == null) continue
    const data = new Date(s.session_date + 'T00:00:00')
    const diffDias = Math.floor((hoje.getTime() - data.getTime()) / 86_400_000)
    const indice = Math.floor(diffDias / 7)
    if (indice >= 0 && indice < n) janelas[indice] += c
  }
  return janelas
}

export function tendenciaCargaSemanal(sessoes: SessaoDetalhada[]): { atual: number; mediaAnterior: number } {
  const janelas = janelasSemanais(sessoes, 5)
  const atual = janelas[0]
  const anteriores = janelas.slice(1)
  const mediaAnterior = anteriores.length > 0 ? anteriores.reduce((a, b) => a + b, 0) / anteriores.length : 0
  return { atual, mediaAnterior }
}

export function pseMedia(sessoes: SessaoDetalhada[]): number | null {
  const valores = sessoes.map((s) => s.post_pse).filter((v): v is number => v != null)
  if (valores.length === 0) return null
  return valores.reduce((a, b) => a + b, 0) / valores.length
}

export function variacaoPeso(pesos: Peso[]): number | null {
  if (pesos.length < 2) return null
  const ordenado = [...pesos].sort((a, b) => a.measured_at.localeCompare(b.measured_at))
  const primeiro = ordenado[0].weight_kg
  const ultimo = ordenado[ordenado.length - 1].weight_kg
  return Math.round((ultimo - primeiro) * 10) / 10
}

export function epley1RM(loadKg: number, reps: number): number {
  return loadKg * (1 + reps / 30)
}

export function exerciciosExecutados(sessoes: SessaoDetalhada[]): { id: string; nome: string }[] {
  const mapa = new Map<string, string>()
  for (const s of sessoes) {
    for (const se of s.sessao_exercicios) {
      if (se.exercicio) mapa.set(se.exercicio_id, se.exercicio.name)
    }
  }
  return Array.from(mapa.entries())
    .map(([id, nome]) => ({ id, nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome))
}

export type PontoExercicio = {
  session_date: string
  maiorCarga: number | null
  rm1: number | null
  volume: number
}

export function evolucaoExercicio(sessoes: SessaoDetalhada[], exercicioId: string): PontoExercicio[] {
  const pontos: PontoExercicio[] = []
  for (const s of sessoes) {
    const se = s.sessao_exercicios.find((e) => e.exercicio_id === exercicioId)
    if (!se) continue
    const series = se.sessao_series.filter((sr) => sr.completed)
    if (series.length === 0) continue

    const comCarga = series.filter((sr): sr is { reps: number | null; load_kg: number; completed: boolean } => sr.load_kg != null)
    const maiorCarga = comCarga.length > 0 ? Math.max(...comCarga.map((sr) => sr.load_kg)) : null

    let melhor: { reps: number | null; load_kg: number } | null = null
    for (const sr of comCarga) {
      if (!melhor || sr.load_kg > melhor.load_kg) melhor = sr
    }
    const rm1 = melhor && melhor.reps != null ? epley1RM(melhor.load_kg, melhor.reps) : null

    const volume = series.reduce((acc, sr) => acc + (sr.reps ?? 0) * (sr.load_kg ?? 0), 0)

    pontos.push({ session_date: s.session_date, maiorCarga, rm1, volume })
  }
  return pontos
}

export function formatarDataCurta(dataStr: string): string {
  const [, mes, dia] = dataStr.split('-')
  return `${dia}/${mes}`
}

const formatoNumero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

export function formatarNumero(valor: number): string {
  return formatoNumero.format(valor)
}
