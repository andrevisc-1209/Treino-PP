/** Página pública de pedido de aula: agrupamento das vagas e leitura das respostas da função (puro, sem I/O). */
import type { Vaga } from './vagas'

export type DiaComVagas = { dataISO: string; vagas: Vaga[] }

/** Agrupa as vagas por dia, em ordem de data. */
export function agruparPorDia(vagas: Vaga[]): DiaComVagas[] {
  const mapa = new Map<string, Vaga[]>()
  for (const v of [...vagas].sort((a, b) => (a.dataISO + a.inicio).localeCompare(b.dataISO + b.inicio))) mapa.set(v.dataISO, [...(mapa.get(v.dataISO) ?? []), v])
  return [...mapa.entries()].map(([dataISO, lista]) => ({ dataISO, vagas: lista }))
}

export type RespostaConsulta = { estado: 'ok'; nome_personal: string; cidade: string | null; duracao_min: number; vagas: Vaga[] } | { estado: 'indisponivel' }

/** Aceita só o formato conhecido; qualquer outra coisa vira "indisponível" (a página nunca quebra com resposta estranha). */
export function lerConsulta(bruto: unknown): RespostaConsulta {
  const o = bruto as Record<string, unknown> | null
  if (!o || o.estado !== 'ok' || !Array.isArray(o.vagas)) return { estado: 'indisponivel' }
  const vagas = (o.vagas as Record<string, unknown>[])
    .filter((v) => typeof v?.dataISO === 'string' && typeof v?.inicio === 'string' && typeof v?.fim === 'string')
    .map((v) => ({ dataISO: String(v.dataISO), inicio: String(v.inicio), fim: String(v.fim) }))
  return { estado: 'ok', nome_personal: typeof o.nome_personal === 'string' ? o.nome_personal : '', cidade: typeof o.cidade === 'string' ? o.cidade : null, duracao_min: Number(o.duracao_min) || 60, vagas }
}

/** Link da página pública do personal. */
export const linkDaAgendaPublica = (slug: string, origem: string = 'https://treino.personalperto.com.br'): string => `${origem}/agenda/${slug}`
