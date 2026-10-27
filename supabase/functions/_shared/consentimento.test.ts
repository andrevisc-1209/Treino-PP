import { describe, expect, it } from 'vitest'
import { canalValido, emailValido, escaparHtml, estadoDoToken, expiraEm, ipDoCliente, montarEmailConsentimento, nomeSeguroParaEmail, podeEnviarAgora, validarMotivoReenvio } from './consentimento.ts'

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
    expect(m.html).toContain('background-color:#ffffff;padding:28px 24px 20px')
    expect(m.html).toContain('logo-email-branco.png')
  })
})

describe('ipDoCliente', () => {
  const h = (o: Record<string, string>) => ({ get: (n: string) => o[n.toLowerCase()] ?? null })
  it('usa só cf-connecting-ip', () => {
    expect(ipDoCliente(h({ 'cf-connecting-ip': '200.10.20.30' }))).toBe('200.10.20.30')
  })
  it('ignora x-forwarded-for e x-real-ip (podem ser forjados pelo cliente)', () => {
    expect(ipDoCliente(h({ 'x-forwarded-for': '189.4.5.6, 10.0.0.1' }))).toBeNull()
    expect(ipDoCliente(h({ 'x-real-ip': '177.1.2.3' }))).toBeNull()
    expect(ipDoCliente(h({ 'cf-connecting-ip': '200.10.20.30', 'x-forwarded-for': '1.1.1.1', 'x-real-ip': '2.2.2.2' }))).toBe('200.10.20.30')
  })
  it('aceita IPv6', () => {
    expect(ipDoCliente(h({ 'cf-connecting-ip': '2804:14d:1234::1' }))).toBe('2804:14d:1234::1')
  })
  it('sem header ou com valor que não é IP → null (nunca "unknown")', () => {
    expect(ipDoCliente(h({}))).toBeNull()
    expect(ipDoCliente(h({ 'cf-connecting-ip': 'unknown' }))).toBeNull()
    expect(ipDoCliente(h({ 'cf-connecting-ip': '999.1.1.1' }))).toBeNull()
    expect(ipDoCliente(h({ 'cf-connecting-ip': '<script>' }))).toBeNull()
  })
  it('cf-connecting-ip inválido não cai em outro header', () => {
    expect(ipDoCliente(h({ 'cf-connecting-ip': 'lixo', 'x-real-ip': '177.1.2.3' }))).toBeNull()
  })
})

describe('nomeSeguroParaEmail', () => {
  it('remove links e quebras de linha, limita a 60 caracteres e usa o padrão se sobrar nada', () => {
    expect(nomeSeguroParaEmail('Ana https://golpe.com/x Souza', 'aluno')).toBe('Ana Souza')
    expect(nomeSeguroParaEmail('Ana\nwww.golpe.com\tSouza', 'aluno')).toBe('Ana Souza')
    expect(nomeSeguroParaEmail('a'.repeat(200), 'aluno')).toHaveLength(60)
    expect(nomeSeguroParaEmail('http://golpe.com', 'aluno')).toBe('aluno')
    expect(nomeSeguroParaEmail('   ', 'Seu personal')).toBe('Seu personal')
    expect(nomeSeguroParaEmail('João da Silva', 'aluno')).toBe('João da Silva')
  })
})

