import { describe, expect, it } from 'vitest'
import { erroDoCref, mascararCref } from './cref'

describe('máscara do CREF', () => {
  it('monta 012345-G/RJ enquanto digita', () => {
    expect(mascararCref('0')).toBe('0')
    expect(mascararCref('012345')).toBe('012345')
    expect(mascararCref('012345g')).toBe('012345-G')
    expect(mascararCref('012345G/R')).toBe('012345-G/R')
    expect(mascararCref('012345-G/rj')).toBe('012345-G/RJ')
  })
  it('aceita colar com prefixo, espaços ou pontuação', () => {
    expect(mascararCref('CREF 012345-G/RJ')).toBe('012345-G/RJ')
    expect(mascararCref('cref 012345 p rj')).toBe('012345-P/RJ')
    expect(mascararCref('012.345-G/SP')).toBe('012345-G/SP')
  })
  it('não passa de 6 dígitos nem de 2 letras de UF, e recusa categoria diferente de G ou P', () => {
    expect(mascararCref('01234567')).toBe('012345')
    expect(mascararCref('012345-G/RJX')).toBe('012345-G/RJ')
    expect(mascararCref('012345X')).toBe('012345')
    expect(mascararCref('1111111222222222')).toBe('111111')
  })
  it('valida só o formato completo; vazio vale', () => {
    expect(erroDoCref('')).toBeNull()
    expect(erroDoCref('012345-G/RJ')).toBeNull()
    expect(erroDoCref('012345-P/sp')).not.toBeNull()
    expect(erroDoCref('012345')).not.toBeNull()
    expect(erroDoCref('012345-G/R')).not.toBeNull()
    expect(erroDoCref('1111111222222222')).not.toBeNull()
  })
})
