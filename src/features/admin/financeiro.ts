/** Helpers puros do painel financeiro do /admin (sem I/O). */

export type FinanceiroAdmin = {
  assinantes_ativos: number
  mrr_estimado: number
  receita_mes: number
  pagamentos_mes: number
  receita_total: number
  pagamentos_total: number
  livro_desde: string | null
  trials_ativos: number
  trials_encerrados: number
  ja_pagaram: number
  nao_renovaram: number
}

const MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatarMoeda(valor: number): string {
  return MOEDA.format(valor)
}

/** Conversão de trial em plano pago, em % inteiro; null enquanto nenhum trial terminou (evita "0%" enganoso). */
export function taxaConversao(f: Pick<FinanceiroAdmin, 'ja_pagaram' | 'trials_encerrados'>): number | null {
  if (f.trials_encerrados <= 0) return null
  return Math.min(100, Math.round((f.ja_pagaram / f.trials_encerrados) * 100))
}

/** Normaliza a linha do RPC (BIGINT/NUMERIC podem chegar como string). */
export function normalizarFinanceiro(l: Record<string, unknown>): FinanceiroAdmin {
  const n = (v: unknown) => Number(v ?? 0)
  return {
    assinantes_ativos: n(l.assinantes_ativos),
    mrr_estimado: n(l.mrr_estimado),
    receita_mes: n(l.receita_mes),
    pagamentos_mes: n(l.pagamentos_mes),
    receita_total: n(l.receita_total),
    pagamentos_total: n(l.pagamentos_total),
    livro_desde: (l.livro_desde as string | null) ?? null,
    trials_ativos: n(l.trials_ativos),
    trials_encerrados: n(l.trials_encerrados),
    ja_pagaram: n(l.ja_pagaram),
    nao_renovaram: n(l.nao_renovaram),
  }
}
