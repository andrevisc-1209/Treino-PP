// Lógica pura de detecção de conflito de horário. Sem I/O.

import { nomeDiaCurtoPorWeekday } from '@/lib/datas'

function minutosDoDia(hora: string): number {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
}

/** Dois horários fixos se sobrepõem se caem no mesmo dia da semana e os intervalos de tempo se cruzam. */
export function horariosFixosSobrepoe(
  a: { weekday: number; start_time: string; duration_min: number },
  b: { weekday: number; start_time: string; duration_min: number },
): boolean {
  if (a.weekday !== b.weekday) return false
  const aIni = minutosDoDia(a.start_time)
  const aFim = aIni + a.duration_min
  const bIni = minutosDoDia(b.start_time)
  const bFim = bIni + b.duration_min
  return aIni < bFim && bIni < aFim
}

export type HorarioComAlunos = { id: string; weekday: number; start_time: string; duration_min: number; aluno_nomes: string[] }

/** Horários já existentes que cruzam com o novo (em qualquer um dos dias escolhidos), sem repetir o mesmo horário. */
export function conflitosDoHorario<T extends HorarioComAlunos>(
  novo: { weekdays: number[]; start_time: string; duration_min: number },
  existentes: T[],
): T[] {
  return existentes.filter((h) =>
    novo.weekdays.some((weekday) => horariosFixosSobrepoe({ weekday, start_time: novo.start_time, duration_min: novo.duration_min }, h)),
  )
}

/** Texto para o personal conferir: "Seg 07:00 (Paulo Henrique); Qua 07:00 (Ana, Bruno)". */
export function descreverConflitos(conflitos: HorarioComAlunos[]): string {
  return conflitos.map((h) => `${nomeDiaCurtoPorWeekday(h.weekday)} ${h.start_time} (${h.aluno_nomes.join(', ') || 'sem alunos'})`).join('; ')
}

/** Duas aulas (instantes) se sobrepõem se os intervalos [starts_at, starts_at+duration) se cruzam. */
export function aulasSobrepoe(
  a: { starts_at: string; duration_min: number },
  b: { starts_at: string; duration_min: number },
): boolean {
  const aIni = new Date(a.starts_at).getTime()
  const aFim = aIni + a.duration_min * 60_000
  const bIni = new Date(b.starts_at).getTime()
  const bFim = bIni + b.duration_min * 60_000
  return aIni < bFim && bIni < aFim
}
