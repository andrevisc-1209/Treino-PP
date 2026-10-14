import { dataSP, inicioDaSemanaSP, somarDias } from '@/lib/datas'
import type { DetalhesExecucao, ModalidadeTipo } from '@/types/modalidades'

export type Volume = { natacaoKm: number; ciclismoKm: number; ciclismoMin: number; corridaKm: number }
export const volumeZero = (): Volume => ({ natacaoKm: 0, ciclismoKm: 0, ciclismoMin: 0, corridaKm: 0 })

const n = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0)

/**
 * Volume REALIZADO numa execução (o que o aluno/personal registrou como resultado — a prescrição do treino não entra).
 * Natação: metros → km. Ciclismo indoor, sem distância, conta minutos (separado). Brick: bike e corrida em separado.
 */
export function volumeDaExecucao(modalidade: ModalidadeTipo, d: DetalhesExecucao | null | undefined): Volume {
  const r = d?.resultado ?? {}
  const v = volumeZero()
  if (modalidade === 'natacao') v.natacaoKm = n(r.distancia_total_m) / 1000
  else if (modalidade === 'corrida') v.corridaKm = n(r.distancia_km)
  else if (modalidade === 'ciclismo') {
    v.ciclismoKm = n(r.distancia_km)
    if (v.ciclismoKm === 0) v.ciclismoMin = n(r.tempo_min)
  } else if (modalidade === 'brick') {
    v.ciclismoKm = n(r.bike_distancia_km)
    if (v.ciclismoKm === 0) v.ciclismoMin = n(r.bike_tempo_min)
    v.corridaKm = n(r.run_distancia_km)
  }
  return v
}

export const totalKm = (v: Volume): number => v.natacaoKm + v.ciclismoKm + v.corridaKm
export const temVolume = (v: Volume): boolean => totalKm(v) > 0 || v.ciclismoMin > 0

/** Número da semana ISO da segunda-feira informada ('YYYY-MM-DD'). */
export function numeroSemanaISO(segundaISO: string): number {
  const [a, m, d] = segundaISO.split('-').map(Number)
  const data = new Date(Date.UTC(a, m - 1, d))
  const dia = data.getUTCDay() || 7
  data.setUTCDate(data.getUTCDate() + 4 - dia) // quinta-feira da mesma semana
  const inicioAno = Date.UTC(data.getUTCFullYear(), 0, 1)
  return Math.ceil(((data.getTime() - inicioAno) / 86_400_000 + 1) / 7)
}

export type SemanaVolume = { inicio: string; rotulo: string; volume: Volume }

/** Volume por semana (seg–dom, fuso de SP) das últimas `semanas` semanas, da mais antiga à atual. */
export function volumeSemanal(
  execucoes: { modalidade: ModalidadeTipo; concluido_em: string | null; detalhes_execucao: DetalhesExecucao; status: string }[],
  hojeISO: string,
  semanas = 8,
): SemanaVolume[] {
  const atual = inicioDaSemanaSP(hojeISO)
  const lista: SemanaVolume[] = Array.from({ length: semanas }, (_, i) => {
    const inicio = somarDias(atual, -7 * (semanas - 1 - i))
    return { inicio, rotulo: `Sem ${numeroSemanaISO(inicio)}`, volume: volumeZero() }
  })
  const porInicio = new Map(lista.map((s) => [s.inicio, s]))
  for (const e of execucoes) {
    if (e.status !== 'concluido' || !e.concluido_em) continue
    const semana = porInicio.get(inicioDaSemanaSP(dataSP(e.concluido_em)))
    if (!semana) continue
    const v = volumeDaExecucao(e.modalidade, e.detalhes_execucao)
    semana.volume.natacaoKm += v.natacaoKm
    semana.volume.ciclismoKm += v.ciclismoKm
    semana.volume.ciclismoMin += v.ciclismoMin
    semana.volume.corridaKm += v.corridaKm
  }
  return lista
}
