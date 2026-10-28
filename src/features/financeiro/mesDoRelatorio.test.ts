import { describe, expect, it } from 'vitest'
import { mesAnterior, mesesDisponiveis, primeiroDiaDoMes, rotuloDoMes, ultimoDiaDoMesRelatorio } from './mesDoRelatorio'

describe('mês do relatório mensal', () => {
  it('rótulo por extenso', () => {
    expect(rotuloDoMes('2026-10')).toBe('outubro de 2026')
    expect(rotuloDoMes('2027-03')).toBe('março de 2027')
  })
  it('12 meses, do atual para trás, atravessando o ano', () => {
    const m = mesesDisponiveis('2026-02-10')
    expect(m).toHaveLength(12)
    expect(m[0]).toEqual({ valor: '2026-02', rotulo: 'fevereiro de 2026' })
    expect(m[1].valor).toBe('2026-01')
    expect(m[2].valor).toBe('2025-12')
    expect(m[11].valor).toBe('2025-03')
  })
  it('mês anterior, inclusive em janeiro', () => {
    expect(mesAnterior('2026-10-28')).toBe('2026-09')
    expect(mesAnterior('2027-01-05')).toBe('2026-12')
  })
  it('primeiro e último dia, com fevereiro bissexto', () => {
    expect(primeiroDiaDoMes('2026-10')).toBe('2026-10-01')
    expect(ultimoDiaDoMesRelatorio('2026-10')).toBe('2026-10-31')
    expect(ultimoDiaDoMesRelatorio('2026-02')).toBe('2026-02-28')
    expect(ultimoDiaDoMesRelatorio('2028-02')).toBe('2028-02-29')
  })
})
