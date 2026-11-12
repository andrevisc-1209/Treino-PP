import { fotoValida } from './fotoPerfil'
/** Página pública de pedido de aula: agrupamento das vagas e leitura das respostas da função (puro, sem I/O). */
import { normalizarTelefone } from '../../../supabase/functions/_shared/agendaPublica'
import { formatarDataCompleta, nomeDiaCurto, somarDias } from '@/lib/datas'
import { formatarBRL } from '@/lib/moeda'
import type { Vaga } from './vagas'

export type DiaComVagas = { dataISO: string; vagas: Vaga[] }

/** Agrupa as vagas por dia, em ordem de data. */
export function agruparPorDia(vagas: Vaga[]): DiaComVagas[] {
  const mapa = new Map<string, Vaga[]>()
  for (const v of [...vagas].sort((a, b) => (a.dataISO + a.inicio).localeCompare(b.dataISO + b.inicio))) mapa.set(v.dataISO, [...(mapa.get(v.dataISO) ?? []), v])
  return [...mapa.entries()].map(([dataISO, lista]) => ({ dataISO, vagas: lista }))
}

export type PerfilDaPagina = { cref: string | null; modalidades: string | null; locais: string | null; preco_aula: number | null; foto: string | null }
export const PERFIL_VAZIO: PerfilDaPagina = { cref: null, modalidades: null, locais: null, preco_aula: null, foto: null }

/** O que o visitante escolhe ao pedir: os NOMES dos locais do personal e as modalidades que ele atende. Lista vazia = o campo não aparece. */
export type OpcoesDoPedido = { locais: string[]; modalidades: { chave: string; label: string }[] }
export const SEM_OPCOES: OpcoesDoPedido = { locais: [], modalidades: [] }

export function lerOpcoes(bruto: unknown): OpcoesDoPedido {
  const o = (bruto ?? {}) as Record<string, unknown>
  const locais = (Array.isArray(o.locais) ? o.locais : []).filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim().slice(0, 80)).slice(0, 5)
  const modalidades = (Array.isArray(o.modalidades) ? o.modalidades : [])
    .map((m) => (m ?? {}) as Record<string, unknown>)
    .filter((m) => typeof m.chave === 'string' && typeof m.label === 'string')
    .map((m) => ({ chave: String(m.chave), label: String(m.label).slice(0, 40) }))
    .slice(0, 5)
  return { locais, modalidades }
}

export type RespostaConsulta =
  | { estado: 'ok'; nome_personal: string; cidade: string | null; apresentacao: string | null; perfil: PerfilDaPagina; opcoes: OpcoesDoPedido; antecedencia_horas: number | null; duracao_min: number; vagas: Vaga[] }
  | { estado: 'indisponivel' }

const textoCurto = (t: unknown, max: number): string | null => (typeof t === 'string' && t.trim() ? t.trim().slice(0, max) : null)

/** O perfil que veio da função, só com o formato conhecido (qualquer outra coisa vira campo vazio, que a página não mostra). */
export function lerPerfil(bruto: unknown): PerfilDaPagina {
  const o = (bruto ?? {}) as Record<string, unknown>
  const preco = Number(o.preco_aula)
  return { cref: textoCurto(o.cref, 30), modalidades: textoCurto(o.modalidades, 80), locais: textoCurto(o.locais, 100), preco_aula: Number.isFinite(preco) && preco >= 1 && preco <= 5000 ? preco : null, foto: fotoValida(o.foto) }
}

/** Aceita só o formato conhecido; qualquer outra coisa vira "indisponível" (a página nunca quebra com resposta estranha). */
export function lerConsulta(bruto: unknown): RespostaConsulta {
  const o = bruto as Record<string, unknown> | null
  if (!o || o.estado !== 'ok' || !Array.isArray(o.vagas)) return { estado: 'indisponivel' }
  const vagas = (o.vagas as Record<string, unknown>[])
    .filter((v) => typeof v?.dataISO === 'string' && typeof v?.inicio === 'string' && typeof v?.fim === 'string')
    .map((v) => ({ dataISO: String(v.dataISO), inicio: String(v.inicio), fim: String(v.fim) }))
  return { estado: 'ok', nome_personal: typeof o.nome_personal === 'string' ? o.nome_personal : '', cidade: typeof o.cidade === 'string' ? o.cidade : null, apresentacao: typeof o.apresentacao === 'string' && o.apresentacao.trim() ? o.apresentacao.trim().slice(0, 160) : null, perfil: lerPerfil(o.perfil), opcoes: lerOpcoes(o.opcoes), antecedencia_horas: Number(o.antecedencia_horas) > 0 ? Number(o.antecedencia_horas) : null, duracao_min: Number(o.duracao_min) || 60, vagas }
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

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** "nov" para 2026-11-12. */
export const rotuloDoMes = (dataISO: string): string => MESES_CURTOS[Number(dataISO.slice(5, 7)) - 1] ?? ''

/**
 * Dados do cartão de um dia na faixa: "HOJE", "AMANHÃ" ou "QUI", o número e "2 vagas". O mês aparece no primeiro dia da faixa e na virada
 * (quando o dia anterior é de outro mês), para o "30" seguido de "1" não confundir.
 */
export function cartaoDoDia(d: DiaComVagas, hojeISO?: string, diaAnteriorISO?: string): { sigla: string; numero: string; vagas: string; mes: string | null } {
  const amanha = hojeISO ? somarDias(hojeISO, 1) : null
  const sigla = hojeISO && d.dataISO === hojeISO ? 'HOJE' : amanha && d.dataISO === amanha ? 'AMANHÃ' : nomeDiaCurto(d.dataISO).slice(0, 3).toUpperCase()
  const viraMes = !diaAnteriorISO || diaAnteriorISO.slice(5, 7) !== d.dataISO.slice(5, 7)
  return { sigla, numero: String(Number(d.dataISO.slice(8, 10))), vagas: `${d.vagas.length} ${d.vagas.length === 1 ? 'vaga' : 'vagas'}`, mes: viraMes ? rotuloDoMes(d.dataISO) : null }
}

/** "a partir de R$ 120,00 por aula" (o valor é opcional e escolhido pelo personal). */
export const textoDoPreco = (preco: number | null): string | null => (preco === null ? null : `a partir de ${formatarBRL(preco)} por aula`)

/** Linhas do perfil que têm conteúdo, na ordem em que aparecem na página. Sem nada preenchido, lista vazia. */
export function linhasDoPerfil(p: PerfilDaPagina): { chave: 'cref' | 'modalidades' | 'locais' | 'preco'; texto: string }[] {
  const preco = textoDoPreco(p.preco_aula)
  return [
    p.cref ? { chave: 'cref' as const, texto: `CREF ${p.cref.replace(/^cref\s*/i, '')}` } : null,
    p.modalidades ? { chave: 'modalidades' as const, texto: p.modalidades } : null,
    p.locais ? { chave: 'locais' as const, texto: p.locais } : null,
    preco ? { chave: 'preco' as const, texto: preco } : null,
  ].filter((x): x is NonNullable<typeof x> => x !== null)
}

/** Título do dia escolhido: "Sexta, 30 de outubro". */
export const tituloDoDia = (dataISO: string): string => formatarDataCompleta(dataISO)

/** Iniciais para o avatar (até duas letras); sem nome, uma interrogação não: devolve vazio e a tela mostra um ícone. */
export function iniciais(nome: string | null | undefined): string {
  const partes = (nome ?? '').trim().split(/\s+/).filter(Boolean)
  return (partes[0]?.[0] ?? '').toUpperCase() + (partes.length > 1 ? (partes[partes.length - 1][0] ?? '').toUpperCase() : '')
}

export type ErrosDoPedido = { nome?: string; telefone?: string; consentimento?: string; horario?: string; local?: string; modalidade?: string }

/** Confere o formulário antes de enviar (o servidor confere de novo): mensagens por campo, vazio = tudo certo. */
export function validarPedidoNoCliente(v: { nome: string; telefone: string; consentimento: boolean; temHorario: boolean; opcoes?: OpcoesDoPedido; local?: string; modalidade?: string }): ErrosDoPedido {
  const e: ErrosDoPedido = {}
  if (v.opcoes && v.opcoes.locais.length > 0 && !v.opcoes.locais.includes(v.local ?? '')) e.local = 'Escolha onde será a aula.'
  if (v.opcoes && v.opcoes.modalidades.length > 0 && !v.opcoes.modalidades.some((m) => m.chave === v.modalidade)) e.modalidade = 'Escolha a modalidade.'
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

/** Status e mensagem `{ error }` que a função devolveu em caso de falha (FunctionsHttpError); status indefinido = sem conexão. */
export async function corpoDoErro(error: unknown): Promise<{ status: number | undefined; mensagem: string | null }> {
  const contexto = (error as { context?: Response } | null)?.context
  if (!contexto || typeof contexto.status !== 'number') return { status: undefined, mensagem: null }
  let mensagem: string | null = null
  try {
    const corpo = await contexto.json()
    if (typeof corpo?.error === 'string') mensagem = corpo.error
  } catch {
    /* corpo ausente ou não-JSON */
  }
  return { status: contexto.status, mensagem }
}

/** Texto da faixa única da Agenda: "2 pedidos para responder · 3 na lista de espera". */
export function textoDaFaixa(pedidos: number, espera: number): string {
  const partes: string[] = []
  if (pedidos > 0) partes.push(`${pedidos} ${pedidos === 1 ? 'pedido de aula para responder' : 'pedidos de aula para responder'}`)
  if (espera > 0) partes.push(`${espera} ${espera === 1 ? 'pessoa' : 'pessoas'} na lista de espera`)
  return partes.join(' · ')
}
