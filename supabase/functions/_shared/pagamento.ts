// Aplica um pagamento do Checkout Pro à assinatura do personal, sem creditar duas vezes o mesmo pagamento.
// Lógica pura (as chamadas ao banco entram como dependências) para testar com vitest.
//
// Idempotência: cada payment_id é "reivindicado" em treino.pagamentos_processados (INSERT ... ON CONFLICT DO NOTHING) ANTES de
// creditar; só quem inseriu credita. Se creditar falhar, a reivindicação é DESFEITA e o erro sobe (o webhook devolve 500 e o MP
// reenvia) — senão um pagamento já cobrado ficaria marcado como processado e nunca seria creditado.

import { decidirPagamento, ehPlano, type AssinaturaAtual, type PagamentoMP, type Plano } from './mp.ts'

export type DepsPagamento = {
  /** true = este payment_id ainda não tinha sido processado (a linha foi inserida agora). */
  reivindicar(paymentId: string): Promise<boolean>
  /** Desfaz a reivindicação (erro ao creditar). Pode falhar sem derrubar: o erro original é o que sobe. */
  desfazer(paymentId: string): Promise<void>
  /** Grava na assinatura do personal; devolve quantas linhas foram atualizadas. Lança erro se o banco falhar. */
  gravar(professionalId: string, atualizacao: Record<string, unknown>): Promise<number>
}

export type ResultadoPagamento =
  | { tipo: 'ignorado'; motivo: string }
  | { tipo: 'ja_processado' }
  | { tipo: 'creditado'; professionalId: string; atualizacao: Record<string, unknown>; linhas: number }
  | { tipo: 'cancelado'; professionalId: string; linhas: number }

export async function aplicarPagamento(deps: DepsPagamento, pagamento: PagamentoMP, atual: AssinaturaAtual, agora: Date = new Date()): Promise<ResultadoPagamento> {
  const decisao = decidirPagamento(pagamento, atual, agora)
  if (decisao.tipo === 'ignorar') return { tipo: 'ignorado', motivo: decisao.motivo }

  // Estorno/chargeback: cancelar é idempotente por natureza, não precisa de reivindicação.
  if (decisao.tipo === 'cancelar') {
    const linhas = await deps.gravar(decisao.professionalId, decisao.atualizacao)
    return { tipo: 'cancelado', professionalId: decisao.professionalId, linhas }
  }

  const paymentId = String(pagamento.id)
  if (!(await deps.reivindicar(paymentId))) return { tipo: 'ja_processado' }

  let linhas: number
  try {
    linhas = await deps.gravar(decisao.professionalId, decisao.atualizacao)
  } catch (e) {
    await deps.desfazer(paymentId).catch(() => {})
    throw e
  }
  // Nenhuma assinatura para atualizar: nada foi creditado, então não deixa o pagamento marcado como processado.
  if (linhas === 0) await deps.desfazer(paymentId).catch(() => {})
  return { tipo: 'creditado', professionalId: decisao.professionalId, atualizacao: decisao.atualizacao, linhas }
}

/** Linha do livro de pagamentos (treino.pagamentos_assinatura) para um pagamento creditado. null se faltar valor/plano confiável. */
export function linhaLivroPagamento(
  pagamento: { id: string | number; transaction_amount?: unknown; date_approved?: unknown; metadata?: { plan_slug?: unknown } | null },
  professionalId: string,
  agora: Date = new Date(),
): { payment_id: string; professional_id: string; plano: Plano; valor: number; pago_em: string } | null {
  const slug = pagamento.metadata?.plan_slug
  if (!ehPlano(slug)) return null
  const valor = typeof pagamento.transaction_amount === 'number' && pagamento.transaction_amount > 0 ? pagamento.transaction_amount : null
  if (valor === null) return null
  const aprovado = typeof pagamento.date_approved === 'string' ? new Date(pagamento.date_approved) : null
  const pagoEm = aprovado && !Number.isNaN(aprovado.getTime()) ? aprovado : agora
  return { payment_id: String(pagamento.id), professional_id: professionalId, plano: slug, valor: Math.round(valor * 100) / 100, pago_em: pagoEm.toISOString() }
}
