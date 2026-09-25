// Lógica pura de detecção de conflito de horário. Sem I/O.

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
