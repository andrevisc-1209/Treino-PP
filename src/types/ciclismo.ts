import { formatarNumero } from '@/lib/format'
import { formatarTempo } from './natacao'

export type AmbienteCiclismo = 'indoor' | 'outdoor'
export type TipoCiclismo = 'recuperacao' | 'resistencia-base' | 'tempo' | 'hiit' | 'piramide' | 'subidas' | 'sprints' | 'fartlek' | 'longo'

export const TIPOS_CICLISMO_IDS: TipoCiclismo[] = ['recuperacao', 'resistencia-base', 'tempo', 'hiit', 'piramide', 'subidas', 'sprints', 'fartlek', 'longo']

export interface BlocoCiclismo {
  id: string
  tipo: TipoCiclismo
  nome: string
  distancia?: number // km (outdoor)
  tempo?: number // minutos
  velocidade_alvo?: number // km/h (outdoor)
  watts_alvo?: number // W (indoor)
  cadencia_alvo?: number // rpm (indoor)
  zona_fc?: 1 | 2 | 3 | 4 | 5
  // intervalados / HIIT / pirâmide / subidas / sprints
  series?: number
  tempo_serie?: number // segundos
  descanso?: number // segundos
  observacao?: string
  /** bloco criado a partir de um exercício do personal (treino.exercicios) */
  exercicio_id?: string
}

export interface DadosCiclismo {
  ambiente: AmbienteCiclismo
  blocos: BlocoCiclismo[]
}

export const ciclismoVazio = (): DadosCiclismo => ({ ambiente: 'indoor', blocos: [] })
export const rotuloAmbienteCiclismo = (a: AmbienteCiclismo): string => (a === 'indoor' ? 'Indoor' : 'Outdoor')

export const distanciaTotalCiclismo = (blocos: BlocoCiclismo[]): number => blocos.reduce((a, b) => a + (b.distancia ?? 0), 0)

/** Minutos de um bloco: contínuo, ou séries × tempo da série + descansos entre as séries. */
export function minDoBlocoCiclismo(b: BlocoCiclismo): number {
  if (b.series && b.tempo_serie) return (b.series * b.tempo_serie + Math.max(0, b.series - 1) * (b.descanso ?? 0)) / 60
  return b.tempo ?? 0
}
export const tempoTotalCiclismo = (blocos: BlocoCiclismo[]): number => blocos.reduce((a, b) => a + minDoBlocoCiclismo(b), 0)

/** Outdoor com distância → "40 km"; senão "55 min". */
export function totalCiclismo(d: DadosCiclismo): string | null {
  const km = distanciaTotalCiclismo(d.blocos)
  if (d.ambiente === 'outdoor' && km > 0) return `${formatarNumero(km)} km`
  const min = Math.round(tempoTotalCiclismo(d.blocos))
  return min > 0 ? `${formatarNumero(min)} min` : null
}

export function descricaoBlocoCiclismo(b: BlocoCiclismo): string {
  const partes: (string | null)[] = []
  if (b.series && b.tempo_serie) partes.push(`${b.series} × ${formatarTempo(b.tempo_serie)}`)
  else partes.push(b.distancia ? `${formatarNumero(b.distancia)} km` : b.tempo ? `${formatarNumero(b.tempo)} min` : null)
  if (b.series && b.descanso) partes.push(`descanso ${formatarTempo(b.descanso)}`)
  if (b.watts_alvo) partes.push(`${b.watts_alvo} W`)
  if (b.cadencia_alvo) partes.push(`${b.cadencia_alvo} rpm`)
  if (b.velocidade_alvo) partes.push(`${formatarNumero(b.velocidade_alvo)} km/h`)
  if (b.zona_fc) partes.push(`Z${b.zona_fc}`)
  if (b.observacao?.trim()) partes.push(`“${b.observacao.trim()}”`)
  return partes.filter(Boolean).join(' · ')
}

const ehBloco = (b: unknown): b is BlocoCiclismo => {
  const x = b as Partial<BlocoCiclismo> | null
  return !!x && typeof x.tipo === 'string' && (TIPOS_CICLISMO_IDS as string[]).includes(x.tipo) && typeof x.nome === 'string'
}

/** Dados estruturados de ciclismo, ou null (formato antigo). */
export function dadosCiclismoDe(d: Record<string, unknown> | null | undefined): DadosCiclismo | null {
  if (!d || !Array.isArray(d.blocos)) return null
  const blocos = (d.blocos as unknown[]).filter(ehBloco)
  return blocos.length > 0 ? { ambiente: d.ambiente === 'outdoor' ? 'outdoor' : 'indoor', blocos } : null
}

const limpar = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== '' && !(typeof v === 'number' && Number.isNaN(v)))) as T

export const limparBlocosCiclismo = (blocos: BlocoCiclismo[]): BlocoCiclismo[] =>
  blocos.map((b) => limpar({ ...b, id: b.id || crypto.randomUUID(), observacao: b.observacao?.trim() }))

export function montarDetalhesCiclismo(d: DadosCiclismo): Record<string, unknown> {
  return { ambiente: d.ambiente, blocos: limparBlocosCiclismo(d.blocos) }
}

export function validarBlocosCiclismo(blocos: BlocoCiclismo[]): string | null {
  if (blocos.length === 0) return 'Adicione ao menos um tipo de treino de ciclismo.'
  for (const b of blocos) {
    const comSeries = b.tipo === 'hiit' || b.tipo === 'piramide' || b.tipo === 'subidas' || b.tipo === 'sprints'
    if (comSeries && (!b.series || b.series < 1 || !b.tempo_serie)) return `Informe séries e tempo da série de "${b.nome}".`
    if (!comSeries && !b.tempo && !b.distancia) return `Informe o tempo ou a distância de "${b.nome}".`
  }
  return null
}

export const validarCiclismo = (d: DadosCiclismo): string | null => validarBlocosCiclismo(d.blocos)
