import { describe, expect, it } from 'vitest'
import { recebidoPorMes } from './desempenho'

const f = (paga_em: string | null, total: number, status = 'paga') => ({ status: status as 'paga', paga_em, total })

describe('recebidoPorMes', () => {
  it('soma pagas por mês de pagamento, em ordem, com zeros nos meses vazios', () => {
    const r = recebidoPorMes([f('2026-10-02', 100), f('2026-10-20', 50), f('2026-08-15', 300), f('2026-07-31', 10)], '2026-10-06', 4)
    expect(r.map((p) => [p.mes, p.total])).toEqual([
      ['2026-07', 10],
      ['2026-08', 300],
      ['2026-09', 0],
      ['2026-10', 150],
    ])
    expect(r.map((p) => p.rotulo)).toEqual(['jul', 'ago', 'set', 'out'])
  })
  it('ignora não pagas e atravessa a virada de ano', () => {
    const r = recebidoPorMes([f('2026-01-10', 80), f(null, 999, 'enviada'), f('2025-12-30', 20)], '2026-01-15', 3)
    expect(r.map((p) => [p.mes, p.total])).toEqual([
      ['2025-11', 0],
      ['2025-12', 20],
      ['2026-01', 80],
    ])
  })
})
