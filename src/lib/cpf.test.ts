import { describe, expect, it } from 'vitest'
import { mascararCPF, validarCPF } from './cpf'

describe('mascararCPF', () => {
  it('formata progressivamente conforme os dígitos chegam', () => {
    expect(mascararCPF('123')).toBe('123')
    expect(mascararCPF('123456')).toBe('123.456')
    expect(mascararCPF('123456789')).toBe('123.456.789')
    expect(mascararCPF('12345678900')).toBe('123.456.789-00')
  })
  it('ignora caracteres não numéricos e trunca em 11 dígitos', () => {
    expect(mascararCPF('123.456.789-001234')).toBe('123.456.789-00')
  })
})

describe('validarCPF', () => {
  it('aceita um CPF válido (dígitos verificadores corretos)', () => {
    expect(validarCPF('111.444.777-35')).toBe(true)
  })
  it('rejeita dígito verificador errado', () => {
    expect(validarCPF('111.444.777-36')).toBe(false)
  })
  it('rejeita sequência repetida', () => {
    expect(validarCPF('111.111.111-11')).toBe(false)
  })
  it('rejeita tamanho errado', () => {
    expect(validarCPF('123.456.789')).toBe(false)
  })
})
