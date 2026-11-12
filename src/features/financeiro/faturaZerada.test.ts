import { describe, expect, it } from 'vitest'
import { estaVencida } from './rotulos'

describe('fatura sem valor nunca está em atraso', () => {
  it('fatura vencida com valor está em atraso', () => {
    expect(estaVencida('2026-11-05', 'aberta', '2026-11-12', 200)).toBe(true)
  })
  it('fatura de R$ 0,00 vencida não está em atraso', () => {
    expect(estaVencida('2026-11-05', 'aberta', '2026-11-12', 0)).toBe(false)
    expect(estaVencida('2026-11-05', 'enviada', '2026-11-12', 0)).toBe(false)
  })
  it('sem informar o valor, o comportamento antigo se mantém', () => {
    expect(estaVencida('2026-11-05', 'aberta', '2026-11-12')).toBe(true)
  })
  it('paga ou cancelada nunca está em atraso', () => {
    expect(estaVencida('2026-11-05', 'paga', '2026-11-12', 200)).toBe(false)
    expect(estaVencida('2026-11-05', 'cancelada', '2026-11-12', 200)).toBe(false)
  })
})
