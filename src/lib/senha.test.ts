import { describe, expect, it } from 'vitest'
import { avaliarSenha, SENHA_MIN } from './senha'

describe('avaliarSenha', () => {
  it('vazia não é avaliada', () => expect(avaliarSenha('')).toMatchObject({ nivel: 'vazia', valida: false }))

  it('abaixo do mínimo: curta, diz quantos caracteres faltam, e a barra cresce com o tamanho', () => {
    expect(avaliarSenha('abc')).toMatchObject({ nivel: 'curta', valida: false, dica: 'faltam 7 caracteres' })
    expect(avaliarSenha('abcdefghi')).toMatchObject({ dica: 'falta 1 caractere' })
    expect(avaliarSenha('abcd1234x').progresso).toBeGreaterThan(avaliarSenha('ab').progresso)
  })

  it(`o mínimo é ${SENHA_MIN} caracteres, sem exigir maiúscula, número nem símbolo`, () => {
    expect(avaliarSenha('minhacasa7').valida).toBe(true)
    expect(avaliarSenha('todaminuscula').valida).toBe(true)
    expect(avaliarSenha('SOMENTEMAIUSCULA').valida).toBe(true)
  })

  it('recusa senha óbvia mesmo com o tamanho certo', () => {
    for (const s of ['1234567890', '0000000000', 'aaaaaaaaaaaa', 'abababababab', '9876543210', 'abcdefghijkl', 'Senha12345', 'Password123', 'treino1234']) {
      expect(avaliarSenha(s)).toMatchObject({ nivel: 'previsivel', valida: false })
    }
  })

  it('boa a partir de 10; forte com 14 ou mais, ou 12 com mistura', () => {
    expect(avaliarSenha('cachorro77x')).toMatchObject({ nivel: 'boa', valida: true })
    expect(avaliarSenha('umafrasebemlonga')).toMatchObject({ nivel: 'forte', valida: true })
    expect(avaliarSenha('Cachorro#7712')).toMatchObject({ nivel: 'forte', valida: true })
  })

  it('o progresso vai de 0 a 1 e a senha forte enche a barra', () => {
    expect(avaliarSenha('').progresso).toBe(0)
    expect(avaliarSenha('umafrasebemlonga').progresso).toBe(1)
  })
})

describe('repetição de caracteres não vale como tamanho', () => {
  it('"Visc1989@@@@@@@@@@@@@" (21 caracteres, 10 de informação) é só "Boa", com aviso, e não "Forte"', () => {
    expect(avaliarSenha('Visc1989@@@@@@@@@@@@@')).toMatchObject({ nivel: 'boa', valida: true, dica: 'evite repetir o mesmo caractere' })
  })
  it('poucos caracteres diferentes é previsível, mesmo longo', () => {
    for (const s of ['aaaaabbbbb', '1122334455', 'abcde@@@@@@@@@@@@', '1212121212121212']) {
      expect(avaliarSenha(s)).toMatchObject({ nivel: 'previsivel', valida: false })
    }
  })
  it('uma repetição pequena (duas iguais seguidas) não atrapalha uma senha boa', () => {
    expect(avaliarSenha('Cachorro#7712')).toMatchObject({ nivel: 'forte' })
    expect(avaliarSenha('batatinha-frita')).toMatchObject({ nivel: 'forte' })
  })
})

