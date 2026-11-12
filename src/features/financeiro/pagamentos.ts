import type { FaturaStatus, FormaPagamento } from './api'
import { estaVencida } from './rotulos'

/** Só o que a lista de pagamentos precisa de uma fatura (testável sem montar uma fatura inteira). */
export type FaturaDePagamento = {
  id: string
  aluno_id: string
  status: FaturaStatus
  total: number
  vencimento: string | null
  paga_em: string | null
  enviada_em?: string | null
  forma_pagamento?: FormaPagamento | null
  periodo_inicio: string
  periodo_fim: string
}

const MESES_EXTENSO = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/** 'YYYY-MM' de uma data 'YYYY-MM-DD'. */
export const mesDaData = (dataISO: string): string => dataISO.slice(0, 7)

/** Soma `delta` meses a um 'YYYY-MM' (negativo volta). */
export function somarMeses(mes: string, delta: number): string {
  const [ano, m] = mes.split('-').map(Number)
  const d = new Date(Date.UTC(ano, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

/** 'novembro de 2026'. */
export function rotuloDoMes(mes: string): string {
  const [ano, m] = mes.split('-').map(Number)
  return `${MESES_EXTENSO[m - 1]} de ${ano}`
}

/**
 * O histórico de pagamentos de um mês: faturas PAGAS cuja data de pagamento cai nesse mês (de qualquer ciclo), da mais recente para a mais
 * antiga. Fatura de R$ 0,00 não é recebimento: fica de fora (e do cartão "Recebido no mês", que usa esta mesma função).
 */
export function faturasPagasDoMes<T extends FaturaDePagamento>(faturas: T[], mes: string): T[] {
  return faturas
    .filter((f) => f.status === 'paga' && f.total > 0 && !!f.paga_em && mesDaData(f.paga_em) === mes)
    .toSorted((a, b) => (b.paga_em ?? '').localeCompare(a.paga_em ?? '') || b.total - a.total)
}

/** Total recebido no mês (soma de `faturasPagasDoMes`). */
export const totalRecebidoDoMes = (faturas: FaturaDePagamento[], mes: string): number => faturasPagasDoMes(faturas, mes).reduce((a, f) => a + f.total, 0)

/**
 * Faturas enviadas e ainda não pagas, de QUALQUER ciclo (o filtro "Enviadas"). As vencidas não entram: ficam em "Em atraso". Mais antigas
 * primeiro, para a que espera há mais tempo ficar no alto.
 */
export function faturasEnviadasPendentes<T extends FaturaDePagamento>(faturas: T[], hojeISO: string): T[] {
  return faturas
    .filter((f) => f.status === 'enviada' && f.total > 0 && !estaVencida(f.vencimento, f.status, hojeISO, f.total))
    .toSorted((a, b) => (a.enviada_em ?? a.periodo_fim).localeCompare(b.enviada_em ?? b.periodo_fim))
}

const FORMAS: Record<FormaPagamento, string> = { pix: 'Pix', dinheiro: 'Dinheiro', cartao: 'Cartão', transferencia: 'Transferência', outro: 'Outro' }
export const rotuloFormaPagamento = (f: FormaPagamento | null | undefined): string | null => (f ? FORMAS[f] : null)
