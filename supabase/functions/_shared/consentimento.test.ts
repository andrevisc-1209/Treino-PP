import { describe, expect, it } from 'vitest'
import { canalValido, emailValido, escaparHtml, estadoDoToken, expiraEm, montarEmailConsentimento, podeEnviarAgora, validarMotivoReenvio } from './consentimento.ts'

const agora = new Date('2026-10-06T12:00:00.000Z')

describe('estadoDoToken', () => {
  const ok = { used_at: null, expires_at: '2026-10-10T00:00:00.000Z' }
  it('token válido com aluno pendente', () => expect(estadoDoToken(ok, 'pendente', agora)).toBe('valido'))
  it('inexistente', () => expect(estadoDoToken(null, 'pendente', agora)).toBe('invalido'))
  it('já usado', () => expect(estadoDoToken({ ...ok, used_at: '2026-10-06T10:00:00.000Z' }, 'confirmado', agora)).toBe('usado'))
  it('expirado', () => expect(estadoDoToken({ ...ok, expires_at: '2026-10-05T00:00:00.000Z' }, 'pendente', agora)).toBe('expirado'))
  it('cancelado quando o status do aluno deixou de ser pendente (revogado)', () => {
    expect(estadoDoToken(ok, null, agora)).toBe('cancelado')
    expect(estadoDoToken(ok, 'confirmado', agora)).toBe('cancelado')
  })
})

describe('helpers', () => {
  it('expira em 7 dias', () => expect(expiraEm(agora)).toBe('2026-10-13T12:00:00.000Z'))
  it('e-mail', () => {
    expect(emailValido('aluno@exemplo.com')).toBe(true)
    expect(emailValido('sem-arroba')).toBe(false)
    expect(emailValido('a b@c.com')).toBe(false)
    expect(emailValido(42)).toBe(false)
  })
  it('intervalo de reenvio', () => {
    expect(podeEnviarAgora(null, agora)).toBe(true)
    expect(podeEnviarAgora('2026-10-06T11:59:30.000Z', agora)).toBe(false)
    expect(podeEnviarAgora('2026-10-06T11:58:00.000Z', agora)).toBe(true)
  })
  it('e-mail escapa nomes e não leva dado de saúde', () => {
    expect(escaparHtml('<b>"x"</b>')).toBe('&lt;b&gt;&quot;x&quot;&lt;/b&gt;')
    const m = montarEmailConsentimento({ nomeAluno: '<Ana>', nomePersonal: 'Bia & Cia', linkAutorizar: 'https://x/a', linkNegar: 'https://x/n' })
    expect(m.assunto).toBe('Autorização para registro de dados de saúde — Bia & Cia')
    expect(m.html).toContain('&lt;Ana&gt;')
    expect(m.html).toContain('href="https://x/a"')
    expect(m.html).toContain('href="https://x/n"')
    expect(m.html).not.toContain('<Ana>')
  })
})

describe('reenvio com motivo e canal', () => {
  it('motivo obrigatório e dentro da lista', () => {
    expect(validarMotivoReenvio(undefined, undefined).ok).toBe(false)
    expect(validarMotivoReenvio('qualquer coisa', undefined).ok).toBe(false)
    expect(validarMotivoReenvio('Aluno não recebeu o e-mail', undefined)).toEqual({ ok: true, motivo: 'Aluno não recebeu o e-mail', livre: null })
  })
  it('"Outros" exige texto livre', () => {
    expect(validarMotivoReenvio('Outros', '  ').ok).toBe(false)
    expect(validarMotivoReenvio('Outros', 'ab').ok).toBe(false)
    expect(validarMotivoReenvio('Outros', ' Mudou de número ')).toEqual({ ok: true, motivo: 'Outros', livre: 'Mudou de número' })
  })
  it('canal', () => {
    expect(canalValido('email')).toBe(true)
    expect(canalValido('whatsapp')).toBe(true)
    expect(canalValido('sms')).toBe(false)
  })
  it('e-mail: tom humano e logo sobre fundo branco', () => {
    const m = montarEmailConsentimento({ nomeAluno: 'Ana', nomePersonal: 'Bia', linkAutorizar: 'https://x/a', linkNegar: 'https://x/n' })
    expect(m.html).toContain('Olá, Ana!')
    expect(m.html).toContain('quer cuidar do seu treino')
    expect(m.html).toContain('background:#ffffff;padding:12px;border-radius:6px;display:inline-block')
    expect(m.html).toContain('logo-email.png')
  })
})
