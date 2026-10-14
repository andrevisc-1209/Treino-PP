import { formatarNumero } from '@/lib/format'
import { formatarTempo } from './natacao'
import { descricaoBlocoCiclismo, distanciaTotalCiclismo, limparBlocosCiclismo, tempoTotalCiclismo, validarBlocosCiclismo, type BlocoCiclismo } from './ciclismo'
import { dadosCorridaDe, descricaoBlocoCorrida, distanciaTotalCorrida, montarDetalhesCorrida, tempoTotalCorrida, validarCorrida, type BlocoCorrida } from './corrida'

export interface DadosBrick {
  blocos_bike: BlocoCiclismo[]
  transicao_segundos?: number // tempo alvo de T2, opcional
  blocos_corrida: BlocoCorrida[]
}

export const brickVazio = (): DadosBrick => ({ blocos_bike: [], blocos_corrida: [] })

const totalBike = (d: DadosBrick): string => {
  const km = distanciaTotalCiclismo(d.blocos_bike)
  return km > 0 ? `${formatarNumero(km)} km` : `${formatarNumero(Math.round(tempoTotalCiclismo(d.blocos_bike)))} min`
}
const totalRun = (d: DadosBrick): string => {
  const km = distanciaTotalCorrida(d.blocos_corrida)
  return km > 0 ? `${formatarNumero(km)} km` : `${formatarNumero(Math.round(tempoTotalCorrida(d.blocos_corrida)))} min`
}

/** "🚴 40 km → ⏱ 2min → 🏃 10 km" */
export function resumoBrick(d: DadosBrick): string {
  return [`🚴 ${totalBike(d)}`, d.transicao_segundos ? `⏱ ${formatarTempo(d.transicao_segundos)}` : null, `🏃 ${totalRun(d)}`].filter(Boolean).join(' → ')
}

/** "40 km bike + 10 km corrida" (texto do card). */
export const resumoBrickCurto = (d: DadosBrick): string => `${totalBike(d)} bike + ${totalRun(d)} corrida`

export function dadosBrickDe(d: Record<string, unknown> | null | undefined): DadosBrick | null {
  if (!d || !Array.isArray(d.blocos_bike) || !Array.isArray(d.blocos_corrida)) return null
  const bike = (d.blocos_bike as BlocoCiclismo[]).filter((b) => b && typeof b.tipo === 'string')
  const corrida = dadosCorridaDe({ blocos: d.blocos_corrida })?.blocos ?? []
  if (bike.length === 0 && corrida.length === 0) return null
  return { blocos_bike: bike, blocos_corrida: corrida, transicao_segundos: typeof d.transicao_segundos === 'number' ? d.transicao_segundos : undefined }
}

export function montarDetalhesBrick(d: DadosBrick): Record<string, unknown> {
  return {
    blocos_bike: limparBlocosCiclismo(d.blocos_bike),
    ...(d.transicao_segundos ? { transicao_segundos: d.transicao_segundos } : {}),
    blocos_corrida: (montarDetalhesCorrida({ blocos: d.blocos_corrida }) as { blocos: BlocoCorrida[] }).blocos,
  }
}

export function validarBrick(d: DadosBrick): string | null {
  const bike = validarBlocosCiclismo(d.blocos_bike)
  if (bike) return `Bike: ${bike}`
  const run = validarCorrida({ blocos: d.blocos_corrida })
  return run ? `Corrida: ${run}` : null
}

export const descricoesBrick = (d: DadosBrick): { bike: string[]; corrida: string[] } => ({
  bike: d.blocos_bike.map((b) => `${b.nome} — ${descricaoBlocoCiclismo(b)}`),
  corrida: d.blocos_corrida.map((b) => `${b.nome} — ${descricaoBlocoCorrida(b)}`),
})
