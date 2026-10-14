import { formatarNumero } from '@/lib/format'
import { formatarTempo } from './natacao'

export type TipoCorrida =
  | 'regenerativo'
  | 'aerobico-base'
  | 'tempo-limiar'
  | 'fartlek'
  | 'progressivo'
  | 'intervalado-curto' // 200m–400m
  | 'intervalado-longo' // 800m–1200m+
  | 'long-run'
  | 'race-pace'
  | 'hill-repeats'
  | 'strides'

export const TIPOS_CORRIDA_IDS: TipoCorrida[] = [
  'regenerativo', 'aerobico-base', 'tempo-limiar', 'fartlek', 'progressivo', 'intervalado-curto',
  'intervalado-longo', 'long-run', 'race-pace', 'hill-repeats', 'strides',
]

export interface BlocoCorrida {
  id: string
  tipo: TipoCorrida
  nome: string
  distancia?: number // km
  tempo?: number // minutos
  pace_alvo?: string // "5:30" (min/km)
  zona_fc?: 1 | 2 | 3 | 4 | 5
  // intervalados e hill repeats
  series?: number
  distancia_serie?: number // metros
  tempo_serie?: number // segundos
  descanso?: number // segundos
  // strides
  aceleracoes?: number
  observacao?: string
  /** bloco criado a partir de um exercício do personal (treino.exercicios) */
  exercicio_id?: string
}

export interface DadosCorrida {
  blocos: BlocoCorrida[]
}

export const corridaVazia = (): DadosCorrida => ({ blocos: [] })

/** Distância (km) de um bloco: contínua, ou séries × distância da série. */
export function kmDoBloco(b: BlocoCorrida): number {
  if (b.series && b.distancia_serie) return (b.series * b.distancia_serie) / 1000
  return b.distancia ?? 0
}

export function minDoBloco(b: BlocoCorrida): number {
  if (b.series && b.tempo_serie) return (b.series * b.tempo_serie) / 60
  return b.tempo ?? 0
}

export const distanciaTotalCorrida = (blocos: BlocoCorrida[]): number => blocos.reduce((a, b) => a + kmDoBloco(b), 0)
export const tempoTotalCorrida = (blocos: BlocoCorrida[]): number => blocos.reduce((a, b) => a + minDoBloco(b), 0)

/** "14 km" quando há distância; senão "45 min"; vazio se não houver nenhum. */
export function totalCorrida(blocos: BlocoCorrida[]): string | null {
  const km = distanciaTotalCorrida(blocos)
  if (km > 0) return `${formatarNumero(km)} km`
  const min = tempoTotalCorrida(blocos)
  return min > 0 ? `${formatarNumero(Math.round(min))} min` : null
}

/** "8 km · pace 5:30/km · Z2" / "6 × 400 m · descanso 90s · pace 4:00/km" */
export function descricaoBlocoCorrida(b: BlocoCorrida): string {
  const partes: (string | null)[] = []
  if (b.tipo === 'strides') {
    partes.push(b.aceleracoes ? `${b.aceleracoes} acelerações${b.tempo_serie ? ` de ${b.tempo_serie}s` : ''}` : null)
  } else if (b.series && b.distancia_serie) {
    partes.push(`${b.series} × ${formatarNumero(b.distancia_serie)} m`)
  } else {
    partes.push(b.distancia ? `${formatarNumero(b.distancia)} km` : b.tempo ? `${formatarNumero(b.tempo)} min` : null)
  }
  if (b.descanso) partes.push(`descanso ${formatarTempo(b.descanso)}`)
  if (b.pace_alvo?.trim()) partes.push(`pace ${b.pace_alvo.trim()}/km`)
  if (b.zona_fc) partes.push(`Z${b.zona_fc}`)
  if (b.observacao?.trim()) partes.push(`“${b.observacao.trim()}”`)
  return partes.filter(Boolean).join(' · ')
}

const ehBloco = (b: unknown): b is BlocoCorrida => {
  const x = b as Partial<BlocoCorrida> | null
  return !!x && typeof x.tipo === 'string' && (TIPOS_CORRIDA_IDS as string[]).includes(x.tipo) && typeof x.nome === 'string'
}

/** Dados estruturados de corrida, ou null (treino no formato antigo, de texto livre/campos únicos). */
export function dadosCorridaDe(d: Record<string, unknown> | null | undefined): DadosCorrida | null {
  if (!d || !Array.isArray(d.blocos)) return null
  const blocos = (d.blocos as unknown[]).filter(ehBloco)
  return blocos.length > 0 ? { blocos } : null
}

const limpar = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== '' && !(typeof v === 'number' && Number.isNaN(v)))) as T

export function montarDetalhesCorrida(d: DadosCorrida): Record<string, unknown> {
  return { blocos: d.blocos.map((b) => limpar({ ...b, id: b.id || crypto.randomUUID(), pace_alvo: b.pace_alvo?.trim(), observacao: b.observacao?.trim() })) }
}

export function validarCorrida(d: DadosCorrida): string | null {
  if (d.blocos.length === 0) return 'Adicione ao menos um tipo de treino de corrida.'
  for (const b of d.blocos) {
    const comSeries = b.tipo === 'intervalado-curto' || b.tipo === 'intervalado-longo' || b.tipo === 'hill-repeats'
    if (b.tipo === 'strides') {
      if (!b.aceleracoes || b.aceleracoes < 1) return `Informe o número de acelerações de "${b.nome}".`
    } else if (comSeries) {
      if (!b.series || b.series < 1 || !b.distancia_serie) return `Informe séries e distância da série de "${b.nome}".`
    } else if (!b.distancia && !b.tempo) {
      return `Informe a distância ou o tempo de "${b.nome}".`
    }
  }
  return null
}
