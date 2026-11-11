import { describe, expect, it } from 'vitest'
import { textoVencimento } from './vencimento'

describe('textoVencimento', () => {
  it('fala como gente, não como sistema', () => {
    expect(textoVencimento(0)).toBe('vence no fechamento')
    expect(textoVencimento(1)).toBe('vence 1 dia após fechar')
    expect(textoVencimento(5)).toBe('vence 5 dias após fechar')
  })
})
