import { formatarDataCurta } from '@/lib/datas'
import { formatarNumero } from '@/lib/format'
import type { UltimoUsoExercicio } from './api'

/** "Última vez: 3×10 · 18 kg (12/09)" — omite o que não tiver dado. */
export function formatarUltimoUso(u: UltimoUsoExercicio | undefined): string | null {
  if (!u) return null
  const partes: string[] = []
  if (u.reps != null) partes.push(`${u.sets}×${u.reps}`)
  else partes.push(`${u.sets} ${u.sets === 1 ? 'série' : 'séries'}`)
  if (u.load_kg != null) partes.push(`${formatarNumero(u.load_kg)} kg`)
  return `Última vez: ${partes.join(' · ')} (${formatarDataCurta(u.session_date)})`
}
