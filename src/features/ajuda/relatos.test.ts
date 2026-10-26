import { describe, expect, it } from 'vitest'
import { dispositivoDoNavegador, RELATO_MAX, validarRelato } from './relatos'

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
