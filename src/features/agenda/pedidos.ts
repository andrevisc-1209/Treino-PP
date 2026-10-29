/** Pedidos de aula feitos pela página pública: leitura, aluno do telefone e mensagens de WhatsApp (puro, sem I/O). */
import { dataSP, formatarDataCompleta, horaSP } from '@/lib/datas'
import { formatarTelefone } from '@/lib/utils'

export type StatusPedido = 'pendente' | 'aprovado' | 'recusado' | 'indisponivel'
export type PedidoAgenda = {
  id: string
  visitante_nome: string
  /** 55 + DDD + número */
  visitante_telefone: string
  mensagem: string | null
  inicio: string
  duracao_min: number
  status: StatusPedido
  aluno_id: string | null
  created_at: string
}

/** Só os dígitos do telefone, sem o 55 do Brasil (para comparar "(21) 99999-0000" com "5521999990000"). */
export function digitosNacionais(telefone: string | null | undefined): string {
  const d = (telefone ?? '').replace(/\D/g, '')
  return (d.length === 12 || d.length === 13) && d.startsWith('55') ? d.slice(2) : d
}

/** "(21) 99999-0000" a partir de 5521999990000. */
export const telefoneDoPedido = (t: string): string => formatarTelefone(digitosNacionais(t))

/** O aluno que já tem esse telefone (só os alunos ativos que a tela conhece); null se for gente nova. */
export function alunoDoTelefone<T extends { phone: string | null }>(alunos: T[], telefonePedido: string): T | null {
  const alvo = digitosNacionais(telefonePedido)
  if (alvo.length < 10) return null
  return alunos.find((a) => digitosNacionais(a.phone) === alvo) ?? null
}

/** "Sexta, 30 de outubro, às 07:00" */
export const textoDoHorario = (inicioISO: string): string => `${formatarDataCompleta(dataSP(inicioISO))}, às ${horaSP(inicioISO)}`

const primeiro = (nome: string): string => nome.trim().split(/\s+/)[0] || ''
const assinatura = (personal: string): string => (personal.trim() ? ` — ${personal.trim()}` : '')

export function mensagemDeAprovacao(o: { visitanteNome: string; personalNome: string; inicioISO: string }): string {
  return `Oi, ${primeiro(o.visitanteNome)}! Confirmado: ${textoDoHorario(o.inicioISO).toLowerCase()}. Te espero!${assinatura(o.personalNome)}`
}

export function mensagemDeRecusa(o: { visitanteNome: string; personalNome: string; inicioISO: string }): string {
  return `Oi, ${primeiro(o.visitanteNome)}! Obrigado pelo interesse. Não consegui confirmar ${textoDoHorario(o.inicioISO).toLowerCase()}. Quer que eu te passe outros horários?${assinatura(o.personalNome)}`
}

/** Os outros pedidos pendentes do mesmo horário: viram "indisponível" quando um é aprovado. */
export const outrosDoMesmoHorario = (pedidos: PedidoAgenda[], p: PedidoAgenda): PedidoAgenda[] =>
  pedidos.filter((x) => x.id !== p.id && x.status === 'pendente' && new Date(x.inicio).getTime() === new Date(p.inicio).getTime())

export function normalizarPedidos(raw: unknown): PedidoAgenda[] {
  return ((raw as Record<string, unknown>[] | null) ?? []).map((r) => ({
    id: String(r.id),
    visitante_nome: String(r.visitante_nome ?? ''),
    visitante_telefone: String(r.visitante_telefone ?? ''),
    mensagem: (r.mensagem as string | null) ?? null,
    inicio: String(r.inicio),
    duracao_min: Number(r.duracao_min) || 60,
    status: r.status as StatusPedido,
    aluno_id: (r.aluno_id as string | null) ?? null,
    created_at: String(r.created_at),
  }))
}
