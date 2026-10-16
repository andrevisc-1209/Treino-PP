import { describe, expect, it } from 'vitest'
import { normalizarEmailAdmin } from './adminAcoes.ts'

describe('normalizarEmailAdmin', () => {
  it('aceita e-mail válido e tira espaços das pontas', () => {
    expect(normalizarEmailAdmin('  ana@exemplo.com.br ')).toBe('ana@exemplo.com.br')
  })
  it('rejeita o que não é e-mail de texto', () => {
    for (const ruim of [undefined, null, 42, {}, [], '', '   ', 'sem-arroba', 'a@b', 'a b@c.com', 'x'.repeat(260) + '@a.com']) {
      expect(normalizarEmailAdmin(ruim)).toBeNull()
    }
  })
})
