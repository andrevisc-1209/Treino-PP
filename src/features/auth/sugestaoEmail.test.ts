import { describe, expect, it } from 'vitest'
import { sugerirEmail } from './sugestaoEmail'

describe('sugerirEmail', () => {
  it('corrige erros comuns de digitação nos provedores conhecidos', () => {
    expect(sugerirEmail('ana@gmial.com')).toBe('ana@gmail.com')
    expect(sugerirEmail('ana@gmail.con')).toBe('ana@gmail.com')
    expect(sugerirEmail('ana@gamil.com')).toBe('ana@gmail.com')
    expect(sugerirEmail('ana@hotmial.com')).toBe('ana@hotmail.com')
    expect(sugerirEmail('joao.silva@outlok.com')).toBe('joao.silva@outlook.com')
    expect(sugerirEmail('ana@yahoo.com.b')).toBe('ana@yahoo.com.br')
  })
  it('mantém o que veio antes do @ e ignora maiúsculas do domínio', () => {
    expect(sugerirEmail('Ana.Souza+x@GMIAL.COM')).toBe('Ana.Souza+x@gmail.com')
  })
  it('não sugere nada para provedor certo, domínio próprio ou e-mail incompleto', () => {
    expect(sugerirEmail('ana@gmail.com')).toBeNull()
    expect(sugerirEmail('ana@minhaacademia.com.br')).toBeNull()
    expect(sugerirEmail('ana@empresa.com')).toBeNull()
    expect(sugerirEmail('ana@')).toBeNull()
    expect(sugerirEmail('ana')).toBeNull()
    expect(sugerirEmail('')).toBeNull()
  })
})
