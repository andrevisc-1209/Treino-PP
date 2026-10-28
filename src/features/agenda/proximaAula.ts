/** Mínimo que a escolha da próxima aula precisa saber de uma aula (o tipo completo `Aula` cabe aqui). */
export interface AulaDoDia {
  id: string
  status: 'agendada' | 'realizada' | 'cancelada'
  starts_at: string
  duration_min: number
}

export type SituacaoDaAula = 'proxima' | 'em_andamento' | 'atrasada'

export interface AulasDoDiaOrganizadas<T extends AulaDoDia> {
  /** a aula em foco: a que está rolando, a próxima ou, se só sobraram aulas passadas sem registro, a mais antiga delas */
  destaque: T | null
  situacao: SituacaoDaAula | null
  /** outras aulas pendentes que começam no mesmo horário do destaque (aula em dupla/grupo ou alunos em paralelo) */
  outrasNoHorario: number
  /** demais aulas pendentes (agendadas), por horário, sem o destaque */
  seguintes: T[]
  /** realizadas e canceladas, para consulta no fim da lista */
  encerradas: T[]
}

const fimDe = (a: AulaDoDia) => new Date(a.starts_at).getTime() + a.duration_min * 60_000

/** Aula ainda agendada cujo horário já terminou: ficou sem check-in, falta ou cancelamento. */
export const estaAtrasada = (a: AulaDoDia, agora: number) => a.status === 'agendada' && fimDe(a) <= agora

export function situacaoDaAula(a: AulaDoDia, agora: number): SituacaoDaAula {
  if (estaAtrasada(a, agora)) return 'atrasada'
  return new Date(a.starts_at).getTime() <= agora ? 'em_andamento' : 'proxima'
}

/**
 * Separa as aulas de hoje para a tela "Hoje": o destaque avança sozinho conforme as aulas são iniciadas, encerradas ou passam do horário.
 * Prefere a aula em andamento ou a próxima; só cai numa atrasada quando não sobrou nenhuma por vir.
 */
export function organizarAulasDoDia<T extends AulaDoDia>(aulas: T[], agora: number): AulasDoDiaOrganizadas<T> {
  const porHorario = (a: T, b: T) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  const pendentes = aulas.filter((a) => a.status === 'agendada').sort(porHorario)
  const encerradas = aulas.filter((a) => a.status !== 'agendada').sort(porHorario)

  const destaque = pendentes.find((a) => !estaAtrasada(a, agora)) ?? pendentes[0] ?? null
  if (!destaque) return { destaque: null, situacao: null, outrasNoHorario: 0, seguintes: [], encerradas }

  const mesmoHorario = pendentes.filter((a) => a.id !== destaque.id && a.starts_at === destaque.starts_at)
  const seguintes = pendentes.filter((a) => a.id !== destaque.id)
  return { destaque, situacao: situacaoDaAula(destaque, agora), outrasNoHorario: mesmoHorario.length, seguintes, encerradas }
}

/**
 * Local enxuto para o cartão: "Nome do lugar · Bairro" a partir do texto do endereço
 * ("Posto 4 — Av. Atlântica, s/n - Copacabana, Rio de Janeiro - RJ, 22070-000, Brasil" → "Posto 4 · Copacabana").
 * Sem o padrão esperado, devolve o trecho antes da primeira vírgula.
 */
export function localCurto(local: string | null | undefined): string {
  const texto = (local ?? '').trim()
  if (!texto) return ''
  const partes = texto.split(' — ').map((p) => p.trim()).filter(Boolean)
  const endereco = partes[partes.length - 1]
  const bairro = endereco.match(/\s-\s([^,]+),/)?.[1]?.trim()
  const nome = partes.length > 1 ? partes[0] : endereco.split(',')[0].trim()
  if (bairro && bairro.toLowerCase() !== nome.toLowerCase()) return `${nome} · ${bairro}`
  return nome
}
