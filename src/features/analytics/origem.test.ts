import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CHAVE_ORIGEM, guardarOrigemDoLink, lerOrigemGuardada, limparOrigemGuardada, origemDoLink } from './origem'

function memoria() {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }
}

describe('origemDoLink', () => {
  it('lê source, medium e campaign; limpa e limita', () => {
    expect(origemDoLink('?utm_source=Instagram&utm_medium=Reels&utm_campaign=cobranca_01')).toEqual({ source: 'instagram', medium: 'reels', campaign: 'cobranca_01' })
    expect(origemDoLink('?utm_source=whatsapp&utm_medium=prospeccao')).toEqual({ source: 'whatsapp', medium: 'prospeccao', campaign: null })
    expect(origemDoLink('?utm_source=<script>x</script>')?.source).toBe('scriptxscript')
    expect(origemDoLink(`?utm_source=${'a'.repeat(200)}`)?.source).toHaveLength(60)
  })
  it('sem utm_source (ou só lixo) não há origem', () => {
    expect(origemDoLink('')).toBeNull()
    expect(origemDoLink('?utm_medium=bio')).toBeNull()
    expect(origemDoLink('?utm_source=%20%20!!')).toBeNull()
  })
  it('o link de indicação vira origem "indicacao"', () => {
    expect(origemDoLink('?ref=ABCD2345&utm_source=indicacao&utm_medium=personal')?.source).toBe('indicacao')
  })
})

describe('guardar e ler a origem', () => {
  beforeEach(() => vi.stubGlobal('localStorage', memoria()))
  afterEach(() => vi.unstubAllGlobals())

  it('guarda quem não está logado e lê de volta', () => {
    guardarOrigemDoLink('?utm_source=instagram&utm_medium=bio', false)
    expect(lerOrigemGuardada()).toEqual({ source: 'instagram', medium: 'bio', campaign: null })
  })
  it('primeiro toque vence: um segundo link não sobrescreve', () => {
    guardarOrigemDoLink('?utm_source=instagram', false)
    guardarOrigemDoLink('?utm_source=whatsapp', false)
    expect(lerOrigemGuardada()?.source).toBe('instagram')
  })
  it('quem já tem sessão não guarda; link sem utm não guarda', () => {
    guardarOrigemDoLink('?utm_source=instagram', true)
    guardarOrigemDoLink('?x=1', false)
    expect(lerOrigemGuardada()).toBeNull()
  })
  it('lê o formato que o script da landing grava e ignora valor quebrado', () => {
    localStorage.setItem(CHAVE_ORIGEM, JSON.stringify({ s: 'Instagram', m: 'ads', c: null, t: 1 }))
    expect(lerOrigemGuardada()).toEqual({ source: 'instagram', medium: 'ads', campaign: null })
    localStorage.setItem(CHAVE_ORIGEM, '{quebrado')
    expect(lerOrigemGuardada()).toBeNull()
  })
  it('limpar remove', () => {
    guardarOrigemDoLink('?utm_source=instagram', false)
    limparOrigemGuardada()
    expect(lerOrigemGuardada()).toBeNull()
  })
})
