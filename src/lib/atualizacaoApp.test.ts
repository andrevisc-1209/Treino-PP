import { describe, expect, it, vi } from 'vitest'
import { deveVerificarAgora, verificarNovaVersao, type RegistroSW } from './atualizacaoApp'

function instalador() {
  const ouvintes: (() => void)[] = []
  return {
    state: 'installing',
    addEventListener: (_: string, f: () => void) => ouvintes.push(f),
    removeEventListener: (_: string, f: () => void) => ouvintes.splice(ouvintes.indexOf(f), 1),
    dispatchEvent: () => true,
    mudarPara(s: string) {
      this.state = s
      ouvintes.slice().forEach((f) => f())
    },
  }
}

describe('verificarNovaVersao', () => {
  it('sem registro (navegador sem service worker): indisponível', async () => {
    expect(await verificarNovaVersao(undefined)).toBe('indisponivel')
  })
  it('sem rede (update falha): indisponível, sem estourar erro', async () => {
    const r: RegistroSW = { update: vi.fn().mockRejectedValue(new Error('rede')), waiting: null, installing: null }
    expect(await verificarNovaVersao(r)).toBe('indisponivel')
  })
  it('nada novo: atual', async () => {
    const r: RegistroSW = { update: vi.fn().mockResolvedValue(undefined), waiting: null, installing: null }
    expect(await verificarNovaVersao(r)).toBe('atual')
    expect(r.update).toHaveBeenCalledTimes(1)
  })
  it('versão nova já baixada esperando: nova', async () => {
    const r: RegistroSW = { update: vi.fn().mockResolvedValue(undefined), waiting: {}, installing: null }
    expect(await verificarNovaVersao(r)).toBe('nova')
  })
  it('versão nova sendo baixada: espera ficar pronta e vira nova', async () => {
    const inst = instalador()
    const r: RegistroSW = { update: vi.fn().mockResolvedValue(undefined), waiting: null, installing: inst as never }
    const p = verificarNovaVersao(r, 1000)
    inst.mudarPara('installed')
    expect(await p).toBe('nova')
  })
  it('instalação que falha (redundant): atual; que demora demais: indisponível', async () => {
    const falha = instalador()
    const p1 = verificarNovaVersao({ update: vi.fn().mockResolvedValue(undefined), waiting: null, installing: falha as never }, 1000)
    falha.mudarPara('redundant')
    expect(await p1).toBe('atual')
    const lenta = instalador()
    expect(await verificarNovaVersao({ update: vi.fn().mockResolvedValue(undefined), waiting: null, installing: lenta as never }, 20)).toBe('indisponivel')
  })
})

describe('deveVerificarAgora', () => {
  const min = 60_000
  it('nunca verificou: verifica', () => expect(deveVerificarAgora(null, 1_000_000)).toBe(true))
  it('verificou há pouco: espera', () => expect(deveVerificarAgora(1_000_000, 1_000_000 + 5 * min)).toBe(false))
  it('passou o intervalo (30 min): verifica de novo', () => expect(deveVerificarAgora(1_000_000, 1_000_000 + 30 * min)).toBe(true))
})
