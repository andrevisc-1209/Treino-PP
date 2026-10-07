export type StatusConsentimento = 'pendente' | 'confirmado' | 'negado' | 'nao_solicitado'
export type CanalEnvio = 'email' | 'whatsapp'

export type LinhaConsentimento = {
  aluno_id: string
  nome: string
  status: StatusConsentimento
  canal: CanalEnvio | null
  enviado_at: string | null
  respondido_at: string | null
}

export const STATUS_ORDEM: StatusConsentimento[] = ['pendente', 'confirmado', 'negado', 'nao_solicitado']

export const ROTULO_STATUS: Record<StatusConsentimento, string> = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  negado: 'Negado',
  nao_solicitado: 'Não solicitado',
}

/** Cores do selo de status (texto escuro sobre fundo claro: contraste AA). */
export const CLASSE_STATUS: Record<StatusConsentimento, string> = {
  pendente: 'bg-amber-100 text-amber-900',
  confirmado: 'bg-emerald-100 text-emerald-800',
  negado: 'bg-red-100 text-red-800',
  nao_solicitado: 'bg-slate-100 text-slate-700',
}

export function normalizarStatus(s: string | null | undefined): StatusConsentimento {
  return s === 'pendente' || s === 'confirmado' || s === 'negado' ? s : 'nao_solicitado'
}

export function semAcento(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function filtrarConsentimentos(
  linhas: LinhaConsentimento[],
  filtro: { status: StatusConsentimento | 'todos'; busca: string },
): LinhaConsentimento[] {
  const termo = semAcento(filtro.busca.trim())
  return linhas.filter((l) => (filtro.status === 'todos' || l.status === filtro.status) && (!termo || semAcento(l.nome).includes(termo)))
}

export function contarPorStatus(linhas: LinhaConsentimento[]): Record<StatusConsentimento | 'todos', number> {
  const total = { todos: linhas.length, pendente: 0, confirmado: 0, negado: 0, nao_solicitado: 0 }
  for (const l of linhas) total[l.status]++
  return total
}

/** Link enviado há mais de 7 dias e ainda sem resposta. */
export function pendenteExpirado(l: Pick<LinhaConsentimento, 'status' | 'enviado_at'>, agora = Date.now()): boolean {
  return l.status === 'pendente' && !!l.enviado_at && new Date(l.enviado_at).getTime() + 7 * 86_400_000 < agora
}

/** 'dd/mm/aaaa hh:mm' no fuso de São Paulo. */
export function dataHoraSP(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  )
  return `${partes.day}/${partes.month}/${partes.year} ${partes.hour}:${partes.minute}`
}
