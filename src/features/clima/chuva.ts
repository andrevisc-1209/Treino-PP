import { formatarNumero } from '@/lib/format'

/** Volume de chuva previsto para o dia ("~8 mm"); null quando é irrelevante (< 0,1 mm) ou a previsão não trouxe o dado. */
export function rotuloChuvaMm(mm: number | null | undefined): string | null {
  if (mm == null || !Number.isFinite(mm) || mm < 0.1) return null
  if (mm < 1) return '< 1 mm'
  return `~${formatarNumero(mm >= 10 ? Math.round(mm) : mm, 1)} mm`
}
