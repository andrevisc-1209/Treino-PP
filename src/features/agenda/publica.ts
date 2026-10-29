/** Página pública de pedido de aula: agrupamento das vagas e leitura das respostas da função (puro, sem I/O). */
import { normalizarTelefone } from '../../../supabase/functions/_shared/agendaPublica'
import { formatarDataCompleta, nomeDiaCurto } from '@/lib/datas'
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

// ---------- apresentação da página pública ----------
export type Turno = 'manha' | 'tarde' | 'noite'
export const ROTULO_TURNO: Record<Turno, string> = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' }

/** Manhã até 11:59, tarde até 17:59, noite depois. */
export function turnoDaHora(hora: string): Turno {
  const h = Number(hora.slice(0, 2))
  return h < 12 ? 'manha' : h < 18 ? 'tarde' : 'noite'
}

/** Os horários de um dia separados por turno (só os turnos que têm horário), na ordem do dia. */
export function agruparPorTurno(vagas: Vaga[]): { turno: Turno; rotulo: string; vagas: Vaga[] }[] {
  const ordem: Turno[] = ['manha', 'tarde', 'noite']
  const ordenadas = [...vagas].sort((a, b) => a.inicio.localeCompare(b.inicio))
  return ordem.map((turno) => ({ turno, rotulo: ROTULO_TURNO[turno], vagas: ordenadas.filter((v) => turnoDaHora(v.inicio) === turno) })).filter((g) => g.vagas.length > 0)
}

/** Dados do cartão de um dia na faixa: "QUI", "29" e "2 vagas". */
export function cartaoDoDia(d: DiaComVagas): { sigla: string; numero: string; vagas: string } {
  return { sigla: nomeDiaCurto(d.dataISO).slice(0, 3).toUpperCase(), numero: String(Number(d.dataISO.slice(8, 10))), vagas: `${d.vagas.length} ${d.vagas.length === 1 ? 'vaga' : 'vagas'}` }
}

/** Título do dia escolhido: "Sexta, 30 de outubro". */
export const tituloDoDia = (dataISO: string): string => formatarDataCompleta(dataISO)

/** Iniciais para o avatar (até duas letras); sem nome, uma interrogação não: devolve vazio e a tela mostra um ícone. */
export function iniciais(nome: string | null | undefined): string {
  const partes = (nome ?? '').trim().split(/\s+/).filter(Boolean)
  return (partes[0]?.[0] ?? '').toUpperCase() + (partes.length > 1 ? (partes[partes.length - 1][0] ?? '').toUpperCase() : '')
}

export type ErrosDoPedido = { nome?: string; telefone?: string; consentimento?: string; horario?: string }

/** Confere o formulário antes de enviar (o servidor confere de novo): mensagens por campo, vazio = tudo certo. */
export function validarPedidoNoCliente(v: { nome: string; telefone: string; consentimento: boolean; temHorario: boolean }): ErrosDoPedido {
  const e: ErrosDoPedido = {}
  if (!v.temHorario) e.horario = 'Escolha um horário.'
  if (v.nome.trim().length < 2) e.nome = 'Informe seu nome.'
  if (!normalizarTelefone(v.telefone)) e.telefone = 'Informe um número de WhatsApp válido com DDD.'
  if (!v.consentimento) e.consentimento = 'Marque a autorização para o contato por WhatsApp.'
  return e
}

/** A mensagem para cada falha do envio. Os dados do formulário sempre continuam preenchidos; só a vaga ocupada pede escolher outro horário. */
export function mensagemDeErroDoPedido(status: number | undefined, mensagemDoServidor: string | null): { texto: string; vagaOcupada: boolean } {
  if (status === 409) return { texto: 'Esse horário não está mais disponível. Escolha outro para continuar.', vagaOcupada: true }
  if (status === 429) return { texto: 'Muitos pedidos em pouco tempo. Aguarde alguns minutos e tente de novo.', vagaOcupada: false }
  if (status === 503) return { texto: 'Não foi possível validar sua solicitação agora. Seus dados continuam preenchidos: tente novamente.', vagaOcupada: false }
  if (status === 400 && mensagemDoServidor) return { texto: mensagemDoServidor, vagaOcupada: false }
  if (status === undefined) return { texto: 'Não foi possível enviar. Confira sua conexão: seus dados continuam preenchidos. Tente novamente.', vagaOcupada: false }
  return { texto: 'Não foi possível enviar agora. Seus dados continuam preenchidos: tente novamente.', vagaOcupada: false }
}

// ---------- fila de pedidos (lado do personal) ----------
/** "agora", "há 40 min", "há 2 h", "há 3 dias". */
export function tempoDeEspera(desdeISO: string, agora: Date = new Date()): string {
  const min = Math.max(0, Math.floor((agora.getTime() - new Date(desdeISO).getTime()) / 60_000))
  if (min < 2) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.floor(h / 24)
  return `há ${d} ${d === 1 ? 'dia' : 'dias'}`
}

export const LIMITE_ESPERA_LONGA_H = 24

/** O pedido está esperando resposta há mais de 24 horas? */
export const esperaLonga = (desdeISO: string, agora: Date = new Date()): boolean => agora.getTime() - new Date(desdeISO).getTime() > LIMITE_ESPERA_LONGA_H * 3_600_000
