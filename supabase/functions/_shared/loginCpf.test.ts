import { describe, expect, it } from 'vitest'
import { classificarErroAuth, cpfValido, falhaLogin, lerPedido, LIMITE_CPF, esperaAteOPiso, LIMITE_IP, MSG_CREDENCIAIS, PISO_FALHA_MS, normalizarCpf } from './loginCpf'

const CPF = '52998224725' // válido (dígitos verificadores corretos)

describe('cpfValido / normalizarCpf', () => {
  it('aceita CPF válido e ignora a máscara', () => {
    expect(cpfValido(CPF)).toBe(true)
    expect(cpfValido(normalizarCpf('529.982.247-25'))).toBe(true)
  })
  it('rejeita dígito errado, tamanho errado e sequência repetida', () => {
    expect(cpfValido('52998224726')).toBe(false)
    expect(cpfValido('1234567890')).toBe(false)
    expect(cpfValido('11111111111')).toBe(false)
  })
  it('normalizarCpf não quebra com tipos estranhos', () => {
    expect(normalizarCpf(undefined)).toBe('')
    expect(normalizarCpf({ a: 1 })).toBe('')
    expect(normalizarCpf(52998224725)).toBe('')
  })
})

describe('lerPedido', () => {
  it('aceita CPF com ou sem máscara, senha e token opcional', () => {
    expect(lerPedido({ cpf: '529.982.247-25', password: 'abc123', captchaToken: 'tok' })).toEqual({ cpf: CPF, password: 'abc123', captchaToken: 'tok' })
    expect(lerPedido({ cpf: CPF, password: 'abc123' })).toEqual({ cpf: CPF, password: 'abc123', captchaToken: undefined })
  })
  it.each([
    ['corpo nulo', null],
    ['corpo não objeto', 'x'],
    ['sem cpf', { password: 'abc123' }],
    ['cpf inválido', { cpf: '12345678900', password: 'abc123' }],
    ['sem senha', { cpf: CPF }],
    ['senha vazia', { cpf: CPF, password: '' }],
    ['senha gigante', { cpf: CPF, password: 'a'.repeat(129) }],
    ['senha não texto', { cpf: CPF, password: 123456 }],
    ['token não texto', { cpf: CPF, password: 'abc123', captchaToken: 1 }],
    ['token gigante', { cpf: CPF, password: 'abc123', captchaToken: 'a'.repeat(5000) }],
  ])('recusa: %s', (_nome, corpo) => expect(lerPedido(corpo)).toBeNull())
})

describe('classificarErroAuth', () => {
  it('captcha → captcha', () => {
    expect(classificarErroAuth({ status: 400, code: 'captcha_failed', message: 'captcha verification process failed' })).toBe('captcha')
  })
  it('limite do Auth → limite', () => {
    expect(classificarErroAuth({ status: 429, code: 'over_request_rate_limit' })).toBe('limite')
  })
  it('tudo que revelaria algo da conta cai em credenciais', () => {
    expect(classificarErroAuth({ status: 400, code: 'invalid_credentials' })).toBe('credenciais')
    expect(classificarErroAuth({ status: 400, code: 'email_not_confirmed' })).toBe('credenciais')
    expect(classificarErroAuth({ status: 400, code: 'user_banned' })).toBe('credenciais')
    expect(classificarErroAuth({ status: 500, message: 'algo' })).toBe('credenciais')
  })
})

describe('resposta uniforme', () => {
  it('pedido malformado e credencial errada devolvem exatamente a mesma resposta', () => {
    expect(falhaLogin('pedido')).toEqual(falhaLogin('credenciais'))
    expect(falhaLogin('credenciais')).toEqual({ status: 401, corpo: { error: MSG_CREDENCIAIS } })
  })
  it('captcha e limite têm resposta própria (independem de o CPF existir)', () => {
    expect(falhaLogin('captcha').status).toBe(400)
    expect(falhaLogin('limite').status).toBe(429)
  })
})

describe('piso de tempo das falhas', () => {
  it('completa até o piso e nunca espera negativo', () => {
    expect(esperaAteOPiso(0)).toBe(PISO_FALHA_MS)
    expect(esperaAteOPiso(1200)).toBe(PISO_FALHA_MS - 1200)
    expect(esperaAteOPiso(PISO_FALHA_MS + 500)).toBe(0)
    expect(esperaAteOPiso(-50)).toBe(PISO_FALHA_MS)
  })
  it('o piso fica acima do caminho lento observado em produção (~2,4 s)', () => expect(PISO_FALHA_MS).toBeGreaterThanOrEqual(2800))
})

describe('limites', () => {
  it('por CPF protege a conta (10 em 15 min); por IP é folgado para rede compartilhada (100/h)', () => {
    expect(LIMITE_CPF).toEqual({ max: 10, janelaSeg: 900 })
    expect(LIMITE_IP).toEqual({ max: 100, janelaSeg: 3600 })
  })
})
