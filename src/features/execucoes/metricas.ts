import { formatarNumero } from '@/lib/format'
import { inicioDaSemanaSP, somarDias, dataSP, horaSP } from '@/lib/datas'
import type { DetalhesExecucao, ModalidadeTipo } from '@/types/modalidades'

export type Metrica = { valor: number | null; unidade: string; rotulo: string }

const n = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/**
 * Métrica principal de uma execução, lida do formato REAL gravado (Fase 2):
 * modalidades sem lista de exercícios → `resultado`; musculação → séries feitas.
 */
export function metricaPrincipal(modalidade: ModalidadeTipo, d: DetalhesExecucao | null | undefined): Metrica {
  const r = d?.resultado ?? {}
  switch (modalidade) {
    case 'musculacao': {
      const feitas = (d?.exercicios ?? []).reduce((a, e) => a + (e.series_feitas ?? 0), 0)
      return { valor: d?.exercicios ? feitas : null, unidade: 'séries', rotulo: 'séries feitas' }
    }
    case 'corrida':
      return { valor: n(r.distancia_km), unidade: 'km', rotulo: 'km percorridos' }
    case 'ciclismo':
      return { valor: n(r.distancia_km), unidade: 'km', rotulo: 'km pedalados' }
    case 'natacao':
      return { valor: n(r.tiros_feitos), unidade: 'tiros', rotulo: 'tiros feitos' }
    case 'funcional':
      return { valor: n(r.rounds_feitos), unidade: 'rounds', rotulo: 'rounds completos' }
    case 'boxe':
      return { valor: n(r.rounds_feitos), unidade: 'rounds', rotulo: 'rounds feitos' }
    case 'remo': {
      const m = n(r.distancia_m)
      return { valor: m === null ? null : m / 1000, unidade: 'km', rotulo: 'km remados' }
    }
    case 'escalada':
      return { valor: n(r.vias_feitas), unidade: 'vias', rotulo: 'vias feitas' }
    default:
      return { valor: n(r.duracao_min), unidade: 'min', rotulo: 'minutos' }
  }
}

const fmt = (v: number | null, unidade: string) => (v === null ? null : `${formatarNumero(v)} ${unidade}`)

/** Resumo de uma linha da execução, ex.: "5,2 km em 28:30 · pace 5:29/km". */
export function textoMetrica(modalidade: ModalidadeTipo, d: DetalhesExecucao | null | undefined): string {
  const r = d?.resultado ?? {}
  const m = metricaPrincipal(modalidade, d)
  const partes: (string | null)[] = []
  switch (modalidade) {
    case 'musculacao': {
      const plan = (d?.exercicios ?? []).reduce((a, e) => a + (e.series_planejadas ?? 0), 0)
      partes.push(m.valor === null ? null : `${m.valor}/${plan} séries`)
      break
    }
    case 'corrida':
    case 'ciclismo':
      partes.push([fmt(m.valor, 'km'), r.tempo_total ? `em ${r.tempo_total}` : null].filter(Boolean).join(' '), r.pace_medio ? `pace ${r.pace_medio}/km` : null)
      break
    case 'natacao':
      partes.push(fmt(m.valor, 'tiros'), fmt(n(r.distancia_total_m), 'm'))
      break
    case 'remo':
      partes.push([fmt(m.valor, 'km'), r.tempo_total ? `em ${r.tempo_total}` : null].filter(Boolean).join(' '))
      break
    case 'escalada':
      partes.push(fmt(m.valor, 'vias'), r.nivel_max ? `até ${r.nivel_max}` : null)
      break
    default:
      partes.push(fmt(m.valor, m.unidade))
  }
  return partes.filter(Boolean).join(' · ') || 'Sem resultado preenchido'
}

/** Pontos do gráfico (mais antigo → mais novo), só execuções que têm a métrica. */
export function pontosGrafico(
  execucoes: { concluido_em: string | null; modalidade: ModalidadeTipo; detalhes_execucao: DetalhesExecucao }[],
  modalidade: ModalidadeTipo,
  limite = 20,
): { data: string; valor: number }[] {
  return execucoes
    .filter((e) => e.modalidade === modalidade && e.concluido_em)
    .map((e) => ({ data: e.concluido_em as string, valor: metricaPrincipal(modalidade, e.detalhes_execucao).valor }))
    .filter((p): p is { data: string; valor: number } => p.valor !== null)
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(-limite)
}

/**
 * Sequência atual: semanas (seg–dom, SP) seguidas com ao menos 1 execução, contando de trás para frente a partir da
 * semana atual. Se esta semana ainda não teve execução mas a anterior teve, a sequência segue viva (a semana não acabou).
 */
export function semanasSeguidasAtuais(datas: string[], hojeISO: string): number {
  const semanas = new Set(datas.map((d) => inicioDaSemanaSP(dataSP(d))))
  let semana = inicioDaSemanaSP(hojeISO)
  if (!semanas.has(semana)) semana = somarDias(semana, -7)
  let total = 0
  while (semanas.has(semana)) {
    total++
    semana = somarDias(semana, -7)
  }
  return total
}

/** "há 45 min", "há 3 h", "ontem às 14h", "há 3 dias", "há 2 semanas", "12/09/2026". */
export function tempoRelativo(iso: string, agora: Date = new Date()): string {
  const t = new Date(iso)
  const min = Math.floor((agora.getTime() - t.getTime()) / 60000)
  if (min < 1) return 'agora há pouco'
  if (min < 60) return `há ${min} min`
  const dias = diasDesde(iso, agora)
  if (dias === 0) return `há ${Math.floor(min / 60)} h`
  const hora = horaSP(t).slice(0, 2)
  if (dias === 1) return `ontem às ${hora}h`
  if (dias < 7) return `há ${dias} dias`
  if (dias < 30) return `há ${Math.floor(dias / 7)} ${Math.floor(dias / 7) === 1 ? 'semana' : 'semanas'}`
  return dataSP(t).split('-').reverse().join('/')
}

const diaUTC = (iso: string | Date): number => {
  const [y, m, d] = dataSP(iso).split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

/** Dias de calendário (SP) desde a data: 0 = hoje. */
export function diasDesde(iso: string, agora: Date = new Date()): number {
  return Math.max(0, Math.round((diaUTC(agora) - diaUTC(iso)) / 86_400_000))
}

/** Rótulo curto para o selo da lista de alunos: "hoje", "há 2 dias", "há 1 semana", "há 3 meses". */
export function rotuloDias(iso: string, agora: Date = new Date()): string {
  const d = diasDesde(iso, agora)
  if (d === 0) return 'hoje'
  if (d === 1) return 'ontem'
  if (d < 7) return `há ${d} dias`
  if (d < 30) return `há ${Math.floor(d / 7)} ${Math.floor(d / 7) === 1 ? 'semana' : 'semanas'}`
  const meses = Math.floor(d / 30)
  return `há ${meses} ${meses === 1 ? 'mês' : 'meses'}`
}
