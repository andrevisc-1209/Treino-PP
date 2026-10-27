import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CHAVE_CONSENTIMENTO, deveAvisar, lerEscolha, podeMedir, recusar } from './analytics'

// os testes rodam em Node (sem navegador): um localStorage mínimo, com as chaves como propriedades (como no navegador)
function criarStorage() {
  const s: Record<string, string> = {}
  for (const [nome, fn] of Object.entries({
    getItem: (k: string) => (k in s ? s[k] : null),
    setItem: (k: string, v: string) => void (s[k] = String(v)),
    removeItem: (k: string) => void delete s[k],
    clear: () => Object.keys(s).forEach((k) => delete s[k]),
  })) Object.defineProperty(s, nome, { value: fn, enumerable: false })
  return s as unknown as Storage
}
beforeEach(() => vi.stubGlobal('localStorage', criarStorage()))
afterEach(() => vi.unstubAllGlobals())

describe('regras de consentimento', () => {
  it('só avisa quem ainda não escolheu e não enviou o sinal GPC', () => {
    expect(deveAvisar(null, false)).toBe(true)
    expect(deveAvisar(null, true)).toBe(false)
    expect(deveAvisar('accepted', false)).toBe(false)
    expect(deveAvisar('declined', false)).toBe(false)
  })
  it('só mede com aceite explícito e sem GPC', () => {
    expect(podeMedir('accepted', false)).toBe(true)
    expect(podeMedir('accepted', true)).toBe(false)
    expect(podeMedir('declined', false)).toBe(false)
    expect(podeMedir(null, false)).toBe(false)
  })
})

describe('escolha guardada (mesma chave da landing)', () => {
  it('lê só valores válidos', () => {
    expect(lerEscolha()).toBeNull()
    localStorage.setItem(CHAVE_CONSENTIMENTO, 'accepted')
    expect(lerEscolha()).toBe('accepted')
    localStorage.setItem(CHAVE_CONSENTIMENTO, 'qualquer-coisa')
    expect(lerEscolha()).toBeNull()
  })
  it('recusar grava a escolha e apaga o identificador do PostHog', () => {
    localStorage.setItem('ph_phc_x_posthog', '{"distinct_id":"abc"}')
    localStorage.setItem('outra_chave', 'fica')
    recusar()
    expect(lerEscolha()).toBe('declined')
    expect(localStorage.getItem('ph_phc_x_posthog')).toBeNull()
    expect(localStorage.getItem('outra_chave')).toBe('fica')
  })
})
