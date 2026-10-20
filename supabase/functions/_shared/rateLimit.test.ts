import { describe, expect, it, vi } from 'vitest'

vi.mock('npm:@supabase/supabase-js@2', () => ({ createClient: vi.fn() }))

import { consultarLimite, respostaDoLimite } from './rateLimit.ts'

describe('consultarLimite', () => {
  it('true da RPC = ok; false = excedido', async () => {
    expect(await consultarLimite(async () => ({ data: true, error: null }), 'k', 5)).toBe('ok')
    expect(await consultarLimite(async () => ({ data: false, error: null }), 'k', 5)).toBe('excedido')
  })
  it('erro do banco ou exceção = erro (quem chama decide: falha fechada)', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await consultarLimite(async () => ({ data: null, error: { message: 'boom' } }), 'k', 5)).toBe('erro')
    expect(await consultarLimite(async () => { throw new Error('rede') }, 'k', 5)).toBe('erro')
    spy.mockRestore()
  })
  it('repassa janela e máximo e corta a chave em 120 caracteres', async () => {
    const rpc = vi.fn(async () => ({ data: true, error: null }))
    await consultarLimite(rpc, 'x'.repeat(500), 20, 3600)
    expect(rpc).toHaveBeenCalledWith({ p_key: 'x'.repeat(120), p_max: 20, p_window_seconds: 3600 })
  })
})

describe('respostaDoLimite', () => {
  const cors = { 'Access-Control-Allow-Origin': 'https://treino.personalperto.com.br' }
  it('excedido → 429 com Retry-After, nos dois modos', () => {
    for (const modo of ['aberta', 'fechada'] as const) {
      const r = respostaDoLimite('excedido', modo, cors)
      expect(r?.status).toBe(429)
      expect(r?.headers.get('Retry-After')).toBe('60')
      expect(r?.headers.get('Access-Control-Allow-Origin')).toBe(cors['Access-Control-Allow-Origin'])
    }
  })
  it('erro do banco do limite: modo fechado → 503; modo aberto segue (null)', () => {
    expect(respostaDoLimite('erro', 'fechada', cors)?.status).toBe(503)
    expect(respostaDoLimite('erro', 'aberta', cors)).toBeNull()
  })
  it('mensagem em português quando a rota informa uma (a tela do usuário mostra o texto)', async () => {
    const r = respostaDoLimite('excedido', 'fechada', cors, 'Muitas tentativas. Aguarde alguns minutos e tente de novo.')
    expect(await r?.json()).toEqual({ error: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' })
    expect(await respostaDoLimite('excedido', 'aberta')?.json()).toEqual({ error: 'Too many requests' })
  })
  it('ok segue o fluxo normal nos dois modos', () => {
    expect(respostaDoLimite('ok', 'fechada')).toBeNull()
    expect(respostaDoLimite('ok', 'aberta')).toBeNull()
  })
})

