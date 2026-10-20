import { describe, expect, it } from 'vitest'
import { criarCacheTtl } from './cacheTtl.ts'

const H = 3_600_000

describe('criarCacheTtl', () => {
  it('acerta dentro da validade e expira depois dela (3 h)', () => {
    let t = 1_000
    const c = criarCacheTtl<string>(3 * H, 10, () => t)
    c.set('curitiba|PR', 'sol')
    expect(c.get('curitiba|PR')).toBe('sol')
    t += 3 * H - 1
    expect(c.get('curitiba|PR')).toBe('sol')
    t += 1
    expect(c.get('curitiba|PR')).toBeUndefined()
    expect(c.tamanho()).toBe(0) // a entrada vencida é descartada
  })
  it('respeita o teto: sai a entrada mais antiga', () => {
    const c = criarCacheTtl<number>(H, 3, () => 0)
    c.set('a', 1)
    c.set('b', 2)
    c.set('c', 3)
    c.set('d', 4)
    expect(c.tamanho()).toBe(3)
    expect(c.get('a')).toBeUndefined()
    expect(c.get('d')).toBe(4)
  })
  it('regravar a mesma chave renova a validade e a posição', () => {
    let t = 0
    const c = criarCacheTtl<number>(H, 2, () => t)
    c.set('a', 1)
    c.set('b', 2)
    t = H - 10
    c.set('a', 11) // renova 'a'; 'b' passa a ser a mais antiga
    c.set('c', 3) // estoura o teto: sai 'b'
    expect(c.get('b')).toBeUndefined()
    expect(c.get('a')).toBe(11)
    t = H + 5 // 'a' foi renovado em H-10, ainda vale
    expect(c.get('a')).toBe(11)
  })
  it('chave inexistente devolve undefined (erros nunca são guardados porque ninguém os grava)', () => {
    expect(criarCacheTtl<string>(H, 5).get('nada')).toBeUndefined()
  })
})
