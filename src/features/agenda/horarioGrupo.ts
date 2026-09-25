// Lógica pura para agrupar linhas de horarios_fixos (uma por dia da
// semana) que foram criadas juntas na mesma etapa do cadastro — mesmo
// horário, duração, local, alunos e vigência — numa única entrada
// "Seg e Qua · 07:00 · 60 min · Smart Fit" para exibição/edição.

export type HorarioFixoLinha = {
  id: string
  weekday: number
  start_time: string
  duration_min: number
  local: string | null
  valid_from: string
  valid_until: string | null
  active: boolean
  aluno_ids: string[]
  aluno_nomes: string[]
}

export type GrupoHorario = {
  ids: string[]
  weekdays: number[]
  start_time: string
  duration_min: number
  local: string | null
  valid_from: string
  valid_until: string | null
  active: boolean
  aluno_ids: string[]
  aluno_nomes: string[]
}

function chave(h: HorarioFixoLinha): string {
  return [
    h.start_time,
    h.duration_min,
    h.local ?? '',
    h.valid_from,
    h.valid_until ?? '',
    h.active,
    [...h.aluno_ids].sort().join(','),
  ].join('|')
}

export function agruparHorarios(linhas: HorarioFixoLinha[]): GrupoHorario[] {
  const grupos = new Map<string, GrupoHorario>()
  for (const h of linhas) {
    const k = chave(h)
    const existente = grupos.get(k)
    if (existente) {
      existente.ids.push(h.id)
      existente.weekdays.push(h.weekday)
    } else {
      grupos.set(k, {
        ids: [h.id],
        weekdays: [h.weekday],
        start_time: h.start_time,
        duration_min: h.duration_min,
        local: h.local,
        valid_from: h.valid_from,
        valid_until: h.valid_until,
        active: h.active,
        aluno_ids: h.aluno_ids,
        aluno_nomes: h.aluno_nomes,
      })
    }
  }
  for (const g of grupos.values()) g.weekdays.sort((a, b) => a - b)
  return Array.from(grupos.values()).sort((a, b) => a.start_time.localeCompare(b.start_time))
}
