import { describe, expect, it, vi } from 'vitest'

vi.mock('npm:@supabase/supabase-js@2', () => ({ createClient: vi.fn() }))

import { consultarLimite } from './rateLimit.ts'

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
