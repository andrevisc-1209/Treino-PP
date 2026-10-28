import { describe, expect, it } from 'vitest'
import { statusFinanceiroDoAluno } from './statusAluno'

const brl = (v: number) => `R$ ${v}`
const f = (id: string, status: string, vencimento: string | null, total: number, periodo_fim: string) => ({ id, status, vencimento, total, periodo_fim })

describe('statusFinanceiroDoAluno', () => {
  it('fatura vencida em aberto é alerta e leva à fatura', () => {
    const r = statusFinanceiroDoAluno([f('f1', 'enviada', '2026-10-10', 120, '2026-10-14')], '2026-11-14', '2026-10-28', brl)
    expect(r).toEqual({ texto: '1 fatura em atraso · R$ 120', tom: 'alerta', acao: { rotulo: 'Ver fatura', faturaId: 'f1' } })
  })
  it('soma mais de uma em atraso', () => {
    const r = statusFinanceiroDoAluno([f('f2', 'aberta', '2026-10-01', 50, '2026-10-14'), f('f1', 'enviada', '2026-09-01', 70, '2026-09-14')], '2026-11-14', '2026-10-28', brl)
    expect(r.texto).toBe('2 faturas em atraso · R$ 120')
  })
  it('sem fatura do ciclo atual: ciclo aberto, ação de ver o ciclo', () => {
    const r = statusFinanceiroDoAluno([f('f1', 'paga', '2026-10-20', 100, '2026-10-14')], '2026-11-14', '2026-10-28', brl)
    expect(r).toEqual({ texto: 'Ciclo atual aberto', tom: 'atencao', acao: { rotulo: 'Ver ciclo atual' } })
    expect(statusFinanceiroDoAluno([], '2026-11-14', '2026-10-28', brl).texto).toBe('Ciclo atual aberto')
  })
  it('fatura do ciclo em aberto e no prazo: a receber', () => {
    const r = statusFinanceiroDoAluno([f('f1', 'enviada', '2026-11-20', 300, '2026-11-14')], '2026-11-14', '2026-10-28', brl)
    expect(r).toEqual({ texto: 'R$ 300 a receber', tom: 'atencao', acao: { rotulo: 'Ver fatura', faturaId: 'f1' } })
  })
  it('tudo pago: em dia, sem ação', () => {
    expect(statusFinanceiroDoAluno([f('f1', 'paga', '2026-11-20', 300, '2026-11-14')], '2026-11-14', '2026-10-28', brl)).toEqual({ texto: 'Em dia', tom: 'ok', acao: null })
  })
})
