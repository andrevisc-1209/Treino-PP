import { describe, expect, it } from 'vitest'
import { formatarIdentificador, identificadorValido, tipoIdentificador } from './identificador'

describe('tipoIdentificador', () => {
  it('reconhece e-mail, CPF (com ou sem máscara) e o resto', () => {
    expect(tipoIdentificador('ana@exemplo.com')).toBe('email')
    expect(tipoIdentificador('529.982.247-25')).toBe('cpf')
    expect(tipoIdentificador('52998224725')).toBe('cpf')
    expect(tipoIdentificador('ana')).toBe('invalido')
    expect(tipoIdentificador('')).toBe('invalido')
  })
})

describe('formatarIdentificador', () => {
  it('aplica a máscara enquanto só há números', () => {
    expect(formatarIdentificador('5299')).toBe('529.9')
    expect(formatarIdentificador('52998224725')).toBe('529.982.247-25')
  })
  it('não mexe em e-mail, mesmo que comece com número', () => {
    expect(formatarIdentificador('1abc@exemplo.com')).toBe('1abc@exemplo.com')
    expect(formatarIdentificador('ana@exemplo.com')).toBe('ana@exemplo.com')
  })
})

describe('identificadorValido', () => {
  it('aceita e-mail válido e CPF válido', () => {
    expect(identificadorValido('ana@exemplo.com')).toBe(true)
    expect(identificadorValido('529.982.247-25')).toBe(true)
  })
  it('recusa e-mail malformado, CPF com dígito errado e texto solto', () => {
    expect(identificadorValido('ana@')).toBe(false)
    expect(identificadorValido('529.982.247-26')).toBe(false)
    expect(identificadorValido('ana')).toBe(false)
  })
})
