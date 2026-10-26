import { describe, expect, it } from 'vitest'
import { ARTIGOS, buscarArtigos, CATEGORIAS } from './artigos'

describe('central de ajuda', () => {
  it('ids únicos e categorias válidas', () => {
    const ids = ARTIGOS.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
    const cats = new Set(CATEGORIAS.map((c) => c.id))
    for (const a of ARTIGOS) expect(cats.has(a.categoria)).toBe(true)
  })

  it('toda categoria tem ao menos um artigo e todo artigo tem passos', () => {
    for (const c of CATEGORIAS) expect(ARTIGOS.some((a) => a.categoria === c.id)).toBe(true)
    for (const a of ARTIGOS) expect(a.passos.length).toBeGreaterThan(0)
  })

  it('respeita o vocabulário do produto', () => {
    const texto = ARTIGOS.flatMap((a) => [a.titulo, ...a.passos]).join(' ').toLowerCase()
    expect(texto).not.toContain('professor')
    expect(texto).not.toContain('assíncron')
    expect(texto).not.toContain('confirm(')
  })

  it('busca ignora acento e maiúsculas e exige todas as palavras', () => {
    expect(buscarArtigos('PRONTIDAO').map((a) => a.id)).toContain('prontidao')
    expect(buscarArtigos('chave pix').map((a) => a.id)).toContain('receber-pix')
    expect(buscarArtigos('zzzxxx')).toEqual([])
    expect(buscarArtigos('  ')).toHaveLength(ARTIGOS.length)
  })
})
