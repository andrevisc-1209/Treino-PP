import { describe, expect, it } from 'vitest'
import { textoVencimento, vencimentoDaFatura } from './vencimento'

describe('textoVencimento', () => {
  it('fala como gente, não como sistema', () => {
    expect(textoVencimento(0)).toBe('vence no fechamento')
    expect(textoVencimento(1)).toBe('vence 1 dia após fechar')
    expect(textoVencimento(5)).toBe('vence 5 dias após fechar')
  })
})

describe('vencimentoDaFatura', () => {
  it('ciclo fechado no dia seguinte ao fim: conta a partir do fim do ciclo ou de hoje, o que vier depois', () => {
    expect(vencimentoDaFatura('2026-10-31', '2026-11-01', 5)).toBe('2026-11-06')
  })
  it('fechado com atraso: conta a partir de hoje, a fatura NÃO nasce vencida (antes: 05/11, vencida em 12/11)', () => {
    const v = vencimentoDaFatura('2026-10-31', '2026-11-12', 5)
    expect(v).toBe('2026-11-17')
    expect(v > '2026-11-12').toBe(true)
  })
  it('0 dias: vence no dia do fechamento', () => {
    expect(vencimentoDaFatura('2026-10-31', '2026-11-12', 0)).toBe('2026-11-12')
  })
  it('data de hoje anterior ao fim (não deveria acontecer, o fechamento é bloqueado): usa o fim do ciclo', () => {
    expect(vencimentoDaFatura('2026-10-31', '2026-10-20', 5)).toBe('2026-11-05')
  })
})
