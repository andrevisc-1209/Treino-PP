import { emailValido } from './consentimento.ts'

/** E-mail do alvo de uma ação do admin: só texto, sem espaços nas pontas e com formato válido; senão null. */
export function normalizarEmailAdmin(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const e = v.trim()
  return emailValido(e) ? e : null
}
