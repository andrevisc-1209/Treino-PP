/** Helpers puros da lista de personais do /admin (sem I/O). */

export const NAO_INFORMADO = 'Não informado'

export type MetricasPersonal = {
  treinos_presencial: number
  treinos_distancia: number
  exec_presencial: number
  exec_distancia: number
  exec_30d: number
}

/** "São Paulo/SP" ou "Não informado" quando o personal não cadastrou a cidade. */
export function rotuloCidade(cidade: string | null | undefined): string {
  const c = (cidade ?? '').trim()
  return c || NAO_INFORMADO
}

/** Link do Google Maps para a cidade; null se não informada. */
export function linkMapsCidade(cidade: string | null | undefined): string | null {
  const c = (cidade ?? '').trim()
  if (!c) return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${c}, Brasil`)}`
}

/** "5 montados (3 presencial · 2 à distância) · 12 realizados (9 presencial · 3 à distância)"; sem métricas = "Não informado". */
export function descreverTreinos(m: MetricasPersonal | undefined): { montados: string; realizados: string; ultimos30: string } {
  if (!m) return { montados: NAO_INFORMADO, realizados: NAO_INFORMADO, ultimos30: NAO_INFORMADO }
  const montados = m.treinos_presencial + m.treinos_distancia
  const realizados = m.exec_presencial + m.exec_distancia
  return {
    montados: `${montados} (${m.treinos_presencial} presencial · ${m.treinos_distancia} à distância)`,
    realizados: `${realizados} (${m.exec_presencial} presencial · ${m.exec_distancia} à distância)`,
    ultimos30: String(m.exec_30d),
  }
}

export const ROTULO_ACAO_ADMIN: Record<string, string> = {
  reset_senha: 'Reset de senha',
  alterar_trial: 'Ajuste de trial',
  alterar_plano: 'Ajuste de plano',
  alterar_cpf: 'Correção de CPF',
}

export type AbaAdmin = 'geral' | 'personais' | 'suporte' | 'privacidade'
export const ABAS_ADMIN: { id: AbaAdmin; rotulo: string }[] = [
  { id: 'geral', rotulo: 'Visão geral' },
  { id: 'personais', rotulo: 'Personais' },
  { id: 'suporte', rotulo: 'Suporte' },
  { id: 'privacidade', rotulo: 'Privacidade' },
]

/** Aba vinda da URL (?aba=); qualquer valor desconhecido cai em "Visão geral". */
export function abaDaUrl(valor: string | null): AbaAdmin {
  return ABAS_ADMIN.some((a) => a.id === valor) ? (valor as AbaAdmin) : 'geral'
}
