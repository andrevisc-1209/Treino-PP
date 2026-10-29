/** Horários fixos do aluno em texto para o contrato, e o local mais usado neles (puro, sem I/O). */
import { ORDEM_SEMANA_SEG_DOM } from '@/lib/datas'

export type HorarioParaContrato = { weekday: number; start_time: string; duration_min: number; local: string | null; active: boolean; valid_until: string | null }

const NOMES_PLURAL = ['domingos', 'segundas', 'terças', 'quartas', 'quintas', 'sextas', 'sábados']

/** Só o que ainda vale hoje: ativo e sem data final vencida. */
export function horariosVigentes<T extends Pick<HorarioParaContrato, 'active' | 'valid_until'>>(lista: T[], hojeISO: string): T[] {
  return lista.filter((h) => h.active && (!h.valid_until || h.valid_until >= hojeISO))
}

function juntar(itens: string[]): string {
  if (itens.length <= 1) return itens.join('')
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`
}

/** "segundas e quartas, às 07:00; sextas, às 18:30 (45 min)": dias com o mesmo horário e duração são agrupados. */
export function descreverHorarios(lista: HorarioParaContrato[], hojeISO: string): string {
  const grupos = new Map<string, { dias: number[]; hora: string; duracao: number }>()
  for (const h of horariosVigentes(lista, hojeISO)) {
    const hora = h.start_time.slice(0, 5)
    const chave = `${hora}|${h.duration_min}`
    const g = grupos.get(chave) ?? { dias: [], hora, duracao: h.duration_min }
    if (!g.dias.includes(h.weekday)) g.dias.push(h.weekday)
    grupos.set(chave, g)
  }
  const ordem = (d: number) => ORDEM_SEMANA_SEG_DOM.indexOf(d as (typeof ORDEM_SEMANA_SEG_DOM)[number])
  return [...grupos.values()]
    .map((g) => ({ ...g, dias: [...g.dias].sort((a, b) => ordem(a) - ordem(b)) }))
    .sort((a, b) => ordem(a.dias[0]) - ordem(b.dias[0]) || a.hora.localeCompare(b.hora))
    .map((g) => `${juntar(g.dias.map((d) => NOMES_PLURAL[d]))}, às ${g.hora}${g.duracao !== 60 ? ` (${g.duracao} min)` : ''}`)
    .join('; ')
}

/** O local que mais aparece nos horários vigentes (empate: o primeiro); vazio se nenhum horário tem local. */
export function localDosHorarios(lista: Pick<HorarioParaContrato, 'local' | 'active' | 'valid_until'>[], hojeISO: string): string {
  const contagem = new Map<string, number>()
  for (const h of horariosVigentes(lista, hojeISO)) {
    const l = h.local?.trim()
    if (l) contagem.set(l, (contagem.get(l) ?? 0) + 1)
  }
  let melhor = ''
  let n = 0
  for (const [l, c] of contagem) if (c > n) [melhor, n] = [l, c]
  return melhor
}
