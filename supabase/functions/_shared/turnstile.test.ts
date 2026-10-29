import { describe, expect, it } from 'vitest'
import { verificarTurnstile } from './turnstile'

const resposta = (success: unknown, ok = true) => async () => ({ ok, json: async () => ({ success }) })

describe('verificarTurnstile', () => {
  it('sem segredo configurado: não dá para conferir', async () => {
    expect(await verificarTurnstile('t', null, undefined, resposta(true))).toBe('sem_segredo')
  })
  it('token ausente, vazio ou enorme: inválido sem nem chamar o Cloudflare', async () => {
    let chamou = false
    const f = async () => {
      chamou = true
      return { ok: true, json: async () => ({ success: true }) }
    }
    for (const t of [undefined, null, '', 123, 'x'.repeat(2049)]) expect(await verificarTurnstile(t, null, 'segredo', f)).toBe('invalido')
    expect(chamou).toBe(false)
  })
  it('sucesso, falha e erro de rede', async () => {
    expect(await verificarTurnstile('t', '1.2.3.4', 'segredo', resposta(true))).toBe('ok')
    expect(await verificarTurnstile('t', null, 'segredo', resposta(false))).toBe('invalido')
    expect(await verificarTurnstile('t', null, 'segredo', resposta('true'))).toBe('invalido')
    expect(await verificarTurnstile('t', null, 'segredo', resposta(true, false))).toBe('erro')
    expect(await verificarTurnstile('t', null, 'segredo', async () => { throw new Error('rede') })).toBe('erro')
  })
  it('manda o segredo, o token e o IP do visitante', async () => {
    let enviado: URLSearchParams | undefined
    await verificarTurnstile('tok', '1.2.3.4', 'seg', async (_u, init) => {
      enviado = init.body
      return { ok: true, json: async () => ({ success: true }) }
    })
    expect(enviado?.get('secret')).toBe('seg')
    expect(enviado?.get('response')).toBe('tok')
    expect(enviado?.get('remoteip')).toBe('1.2.3.4')
  })
})
