import { beforeEach, describe, expect, it } from 'vitest'
import { CHAVE_CUPOM, guardarCupom, guardarCupomDoLink, lerCupomGuardado, limparCupomGuardado, linkDeCupom, normalizarCupom, textoDoResultado } from './cupom'

const memoria = new Map<string, string>()
beforeEach(() => {
  memoria.clear()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: (k: string) => memoria.get(k) ?? null, setItem: (k: string, v: string) => void memoria.set(k, v), removeItem: (k: string) => void memoria.delete(k) },
  })
})

describe('normalizarCupom', () => {
  it('maiúsculas, sem espaço nem hífen', () => {
    expect(normalizarCupom(' parceiro-3m ')).toBe('PARCEIRO3M')
    expect(normalizarCupom('ab12')).toBe('AB12')
  })
  it('recusa formato inválido (curto, longo, símbolo, vazio)', () => {
    for (const v of ['abc', 'a'.repeat(21), 'abc$', '', null, undefined]) expect(normalizarCupom(v as string)).toBeNull()
  })
})

describe('guarda do cupom', () => {
  it('guarda, lê e limpa', () => {
    guardarCupom('teste90')
    expect(lerCupomGuardado()).toBe('TESTE90')
    limparCupomGuardado()
    expect(lerCupomGuardado()).toBeNull()
  })
  it('valor inválido apaga o que estava guardado', () => {
    guardarCupom('TESTE90')
    guardarCupom('x')
    expect(memoria.has(CHAVE_CUPOM)).toBe(false)
  })
  it('link ?cupom= guarda só sem sessão', () => {
    guardarCupomDoLink('?cupom=teste90&utm_source=parceiro', true)
    expect(lerCupomGuardado()).toBeNull()
    guardarCupomDoLink('?cupom=teste90&utm_source=parceiro', false)
    expect(lerCupomGuardado()).toBe('TESTE90')
  })
  it('link com cupom inválido é ignorado e não apaga o guardado', () => {
    guardarCupom('TESTE90')
    guardarCupomDoLink('?cupom=%24%24', false)
    expect(lerCupomGuardado()).toBe('TESTE90')
  })
})

describe('linkDeCupom', () => {
  it('abre no cadastro com cupom e origem do parceiro', () => {
    expect(linkDeCupom('PARCEIRO3M', 'Academia X!')).toBe('https://treino.personalperto.com.br/login?cupom=PARCEIRO3M&utm_source=parceiro&utm_medium=academiax&utm_campaign=cupom-parceiro3m')
    expect(linkDeCupom('ABCD')).toBe('https://treino.personalperto.com.br/login?cupom=ABCD&utm_source=parceiro&utm_campaign=cupom-abcd')
  })
})

describe('textoDoResultado', () => {
  it('ok mostra os dias; cada recusa tem texto próprio, sem jargão', () => {
    expect(textoDoResultado({ resultado: 'ok', dias: 90 })).toEqual({ ok: true, texto: 'Cupom aplicado! Você ganhou 90 dias grátis, somados ao seu teste.' })
    for (const r of ['invalido', 'fora_do_periodo', 'esgotado', 'ja_usou', 'nao_novo', 'muitas_tentativas'] as const) {
      const t = textoDoResultado({ resultado: r })
      expect(t.ok).toBe(false)
      expect(t.texto.length).toBeGreaterThan(20)
    }
  })
})
