import type { Plano } from '@/features/planos/api'
import { diasEntre, hojeSP } from '@/lib/datas'
import type { Sessao } from './api'

export type PlanoComUso = { plano: Plano; ultimoUso: string | null }

/**
 * Sugere o próximo treino do rodízio: entre os treinos ativos do aluno, o
 * que foi usado há mais tempo (ou nunca foi usado, o que ganha de todos).
 * Só faz sentido "sugerir" quando há mais de um treino pra escolher.
 */
export function planoSugerido(planos: Plano[], sessoes: Sessao[]): PlanoComUso | null {
  if (planos.length < 2) return null

  const ultimoUsoPorPlano = new Map<string, string>()
  for (const s of sessoes) {
    if (s.status !== 'concluida' || !s.plano_id) continue
    const atual = ultimoUsoPorPlano.get(s.plano_id)
    if (!atual || s.session_date > atual) ultimoUsoPorPlano.set(s.plano_id, s.session_date)
  }

  let melhor: PlanoComUso | null = null
  for (const plano of planos) {
    const ultimoUso = ultimoUsoPorPlano.get(plano.id) ?? null
    if (!melhor || melhor.ultimoUso === null) {
      if (melhor?.ultimoUso === null) continue // já achamos um nunca usado — não tem como ficar melhor
      melhor = { plano, ultimoUso }
      continue
    }
    if (ultimoUso === null || ultimoUso < melhor.ultimoUso) melhor = { plano, ultimoUso }
  }
  return melhor
}

export function rotuloUltimoUso(ultimoUso: string | null, hoje = hojeSP()): string {
  if (!ultimoUso) return 'Nunca usado'
  const dias = diasEntre(ultimoUso, hoje)
  if (dias <= 0) return 'Último: hoje'
  if (dias === 1) return 'Último: ontem'
  return `Último: há ${dias} dias`
}
