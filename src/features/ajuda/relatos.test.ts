import { describe, expect, it } from 'vitest'
import { dispositivoDoNavegador, RELATO_MAX, rotuloDispositivo, validarRelato } from './relatos'

describe('validarRelato', () => {
  it('recusa texto curto (depois de aparar) e longo demais', () => {
    expect(validarRelato('   oi   ').ok).toBe(false)
    expect(validarRelato('a'.repeat(RELATO_MAX + 1)).ok).toBe(false)
  })
  it('aceita e devolve o texto aparado', () => {
    expect(validarRelato('  A agenda não abre hoje  ')).toEqual({ ok: true, mensagem: 'A agenda não abre hoje' })
  })
})

describe('dispositivoDoNavegador', () => {
  it('corta em 200 e devolve null se vazio', () => {
    expect(dispositivoDoNavegador('x'.repeat(300))).toHaveLength(200)
    expect(dispositivoDoNavegador('  ')).toBeNull()
    expect(dispositivoDoNavegador(undefined)).toBeNull()
  })
})

describe('rotuloDispositivo', () => {
  it('iPhone com Safari e Android com Chrome', () => {
    expect(rotuloDispositivo('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')).toBe('iPhone · Safari')
    expect(rotuloDispositivo('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36')).toBe('Android · Chrome')
  })
  it('vazio e desconhecido não quebram', () => {
    expect(rotuloDispositivo(null)).toBe('Aparelho não informado')
    expect(rotuloDispositivo('curl/8.0')).toBe('Aparelho não identificado')
  })
})
