import { describe, expect, it } from 'vitest'
import { perfilCompleto } from './perfilCompleto'

describe('perfilCompleto', () => {
  it('completo: nome, CPF e telefone', () => {
    expect(perfilCompleto({ name: 'Ana', cpf: '12345678909', phone: '21999990000' })).toBe(true)
  })
  it('falta qualquer um dos três (inclusive em branco): incompleto', () => {
    expect(perfilCompleto({ name: '', cpf: '12345678909', phone: '21999990000' })).toBe(false)
    expect(perfilCompleto({ name: '  ', cpf: '12345678909', phone: '21999990000' })).toBe(false)
    expect(perfilCompleto({ name: 'Ana', cpf: null, phone: '21999990000' })).toBe(false)
    expect(perfilCompleto({ name: 'Ana', cpf: '12345678909', phone: '' })).toBe(false)
  })
})
