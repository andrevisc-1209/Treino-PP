import { describe, expect, it } from 'vitest'
import { mapearErroAuth } from './errosAuth'

describe('mapearErroAuth', () => {
  it('mapeia credenciais inválidas pelo code', () => {
    expect(mapearErroAuth({ code: 'invalid_credentials', message: 'Invalid login credentials' })).toMatch(/e-mail ou senha/i)
  })
  it('mapeia credenciais inválidas pela mensagem quando não vem code', () => {
    expect(mapearErroAuth(new Error('Invalid login credentials'))).toMatch(/e-mail ou senha/i)
  })
  it('mapeia e-mail não confirmado', () => {
    expect(mapearErroAuth({ code: 'email_not_confirmed', message: 'Email not confirmed' })).toMatch(/confirme seu e-mail/i)
  })
  it('mapeia limite de tentativas (rate limit) pelo code', () => {
    expect(mapearErroAuth({ code: 'over_email_send_rate_limit', message: 'Email rate limit exceeded' })).toMatch(/muitos e-mails/i)
  })
  it('mapeia limite de tentativas pela mensagem de espera em segundos', () => {
    expect(mapearErroAuth(new Error('For security purposes, you can only request this after 42 seconds'))).toMatch(/muitas tentativas/i)
  })
  it('mapeia senha fraca', () => {
    expect(mapearErroAuth({ code: 'weak_password', message: 'Password should be at least 8 characters' })).toMatch(/senha fraca/i)
  })
  it('e-mail que já tem conta: mensagem genérica que não confirma o cadastro e orienta a entrar/recuperar', () => {
    for (const code of ['user_already_exists', 'email_exists', 'identity_already_exists']) {
      const m = mapearErroAuth({ code, message: 'User already registered' })
      expect(m).toMatch(/não foi possível concluir o cadastro/i)
      expect(m).toMatch(/esqueci minha senha/i)
      expect(m).not.toMatch(/já está cadastrado/i)
    }
    expect(mapearErroAuth(new Error('User already registered'))).toMatch(/não foi possível concluir o cadastro/i)
  })
  it('conta inexistente no login não é distinguida de senha errada', () => {
    expect(mapearErroAuth({ code: 'user_not_found', message: 'User not found' })).toBe(mapearErroAuth({ code: 'invalid_credentials', message: 'Invalid login credentials' }))
  })
  it('mapeia link expirado', () => {
    expect(mapearErroAuth({ code: 'otp_expired', message: 'Email link is invalid or has expired' })).toMatch(/expirado/i)
  })
  it('mapeia captcha inválido', () => {
    expect(mapearErroAuth({ code: 'captcha_failed', message: 'captcha verification process failed' })).toMatch(/verificação de segurança/i)
  })
  it('mapeia falha de rede', () => {
    expect(mapearErroAuth(new Error('Failed to fetch'))).toMatch(/conexão/i)
  })
  it('mapeia falha do trigger no signUp (CPF/e-mail já cadastrado)', () => {
    expect(mapearErroAuth(new Error('Database error saving new user'))).toMatch(/cpf ou e-mail/i)
  })
  it('cai num texto genérico pra erro desconhecido', () => {
    expect(mapearErroAuth(new Error('algo bem específico do GoTrue'))).toBe('Não foi possível concluir. Tente de novo.')
  })
})
