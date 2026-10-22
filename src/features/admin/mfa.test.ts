import { describe, expect, it } from 'vitest'
import { codigoMfaValido, estadoMfa, MFA_AVISO_DEMORA_MS, mensagemErroMfa, MSG_MFA_DEMORA } from './mfa'

describe('estadoMfa: o que o painel admin faz com a sessão', () => {
  it('sem autenticador cadastrado → sem_fator (segue, com aviso para ativar)', () => {
    expect(estadoMfa({ nivelAtual: 'aal1', temFatorVerificado: false })).toBe('sem_fator')
    expect(estadoMfa({ nivelAtual: null, temFatorVerificado: false })).toBe('sem_fator')
  })
  it('autenticador cadastrado e sessão só com Google/senha (aal1) → pede o código', () => {
    expect(estadoMfa({ nivelAtual: 'aal1', temFatorVerificado: true })).toBe('precisa_codigo')
    expect(estadoMfa({ nivelAtual: null, temFatorVerificado: true })).toBe('precisa_codigo')
  })
  it('autenticador cadastrado e sessão já confirmada (aal2) → ok', () => {
    expect(estadoMfa({ nivelAtual: 'aal2', temFatorVerificado: true })).toBe('ok')
  })
})

describe('codigoMfaValido', () => {
  it('exatamente 6 dígitos', () => {
    expect(codigoMfaValido('012345')).toBe(true)
    for (const ruim of ['', '12345', '1234567', '12 456', 'abcdef', '12345a']) expect(codigoMfaValido(ruim)).toBe(false)
  })
})

describe('mensagemErroMfa', () => {
  it('traduz código errado, limite de tentativas e o resto', () => {
    expect(mensagemErroMfa({ code: 'mfa_verification_failed', message: 'Invalid TOTP code entered' })).toMatch(/código incorreto/i)
    expect(mensagemErroMfa({ message: 'Invalid TOTP code entered' })).toMatch(/código incorreto/i)
    expect(mensagemErroMfa({ code: 'over_request_rate_limit', message: 'x' })).toMatch(/muitas tentativas/i)
    expect(mensagemErroMfa(new Error('algo estranho'))).toMatch(/não foi possível confirmar/i)
    expect(mensagemErroMfa(null)).toMatch(/não foi possível confirmar/i)
  })
})

describe('aviso de demora na confirmação do código', () => {
  it('só aparece depois de uns segundos (não assusta quem confirma rápido)', () => {
    expect(MFA_AVISO_DEMORA_MS).toBeGreaterThanOrEqual(5000)
    expect(MFA_AVISO_DEMORA_MS).toBeLessThanOrEqual(10000)
  })
  it('tranquiliza: não é erro e não pede para digitar de novo', () => {
    expect(MSG_MFA_DEMORA).toMatch(/aguardando/i)
    expect(MSG_MFA_DEMORA).toMatch(/não precisa digitar/i)
  })
})
