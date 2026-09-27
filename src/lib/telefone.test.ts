import { describe, expect, it } from 'vitest'
import { mascararTelefone, validarTelefone } from './telefone'

describe('mascararTelefone', () => {
  it('formata progressivamente conforme os dígitos chegam', () => {
    expect(mascararTelefone('11')).toBe('(11')
    expect(mascararTelefone('1199999')).toBe('(11) 9999-9')
    expect(mascararTelefone('11999998888')).toBe('(11) 99999-8888')
  })
  it('trunca em 11 dígitos', () => {
    expect(mascararTelefone('119999988881234')).toBe('(11) 99999-8888')
  })
})

describe('validarTelefone', () => {
  it('aceita 10 dígitos (fixo) e 11 (celular)', () => {
    expect(validarTelefone('(11) 3333-4444')).toBe(true)
    expect(validarTelefone('(11) 99999-8888')).toBe(true)
  })
  it('rejeita tamanho errado', () => {
    expect(validarTelefone('(11) 999-88')).toBe(false)
  })
})
