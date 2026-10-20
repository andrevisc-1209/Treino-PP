// Aplica um pagamento do Checkout Pro à assinatura do personal, sem creditar duas vezes o mesmo pagamento.
// Lógica pura (as chamadas ao banco entram como dependências) para testar com vitest.
//
// Idempotência: cada payment_id é "reivindicado" em treino.pagamentos_processados (INSERT ... ON CONFLICT DO NOTHING) ANTES de
// creditar; só quem inseriu credita. Se creditar falhar, a reivindicação é DESFEITA e o erro sobe (o webhook devolve 500 e o MP
// reenvia) — senão um pagamento já cobrado ficaria marcado como processado e nunca seria creditado.

import { decidirPagamento, type AssinaturaAtual, type PagamentoMP } from './mp.ts'

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
