import { describe, expect, it } from 'vitest'
import { lerPrecoDigitado, perfilDigitadoDe, perfilParaSalvar } from './perfilPagina'

describe('preço digitado', () => {
  it('aceita vírgula, ponto de milhar e R$', () => {
    expect(lerPrecoDigitado('120')).toBe(120)
    expect(lerPrecoDigitado('120,50')).toBe(120.5)
    expect(lerPrecoDigitado('R$ 1.200,00')).toBe(1200)
  })
  it('vazio é "sem valor"; fora da faixa ou ilegível é inválido', () => {
    expect(lerPrecoDigitado('  ')).toBeNull()
    for (const ruim of ['0', '0,5', '5001', 'abc', '-20']) expect(lerPrecoDigitado(ruim)).toBe('invalido')
  })
})

describe('perfilParaSalvar', () => {
  it('apara, limita e transforma vazio em nulo', () => {
    const r = perfilParaSalvar({ cref: '  012345-G/RJ ', modalidades: 'Musculação  ·  Natação', preco: '' })
    expect(r).toEqual({ ok: true, dados: { pagina_cref: '012345-G/RJ', pagina_modalidades: 'Musculação · Natação', pagina_preco_aula: null } })
  })
  it('preço inválido pede correção e não grava nada', () => {
    const r = perfilParaSalvar({ cref: '', modalidades: '', preco: '9999' })
    expect(r.ok).toBe(false)
  })
  it('o formulário volta do que está salvo', () => {
    expect(perfilDigitadoDe({ pagina_cref: 'X', pagina_preco_aula: 120.5 })).toEqual({ cref: 'X', modalidades: '', preco: '120,5' })
    expect(perfilDigitadoDe(null)).toEqual({ cref: '', modalidades: '', preco: '' })
  })
})
