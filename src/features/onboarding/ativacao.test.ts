import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { ALUNOS_PARA_ATIVAR, CHAVE_ATIVACAO_DISPENSADA, emAtivacao, gravarDispensada, lerDispensada, percentualAtivacao, textoProgresso } from './ativacao'

describe('emAtivacao', () => {
  it('mostra com menos de 3 alunos; some com 3 ou mais, quando dispensado ou enquanto carrega', () => {
    expect(ALUNOS_PARA_ATIVAR).toBe(3)
    expect(emAtivacao(0, false)).toBe(true)
    expect(emAtivacao(2, false)).toBe(true)
    expect(emAtivacao(3, false)).toBe(false)
    expect(emAtivacao(10, false)).toBe(false)
    expect(emAtivacao(0, true)).toBe(false)
    expect(emAtivacao(undefined, false)).toBe(false)
  })
})

describe('progresso', () => {
  it('texto e porcentagem nunca passam de 3 de 3', () => {
    expect(textoProgresso(0)).toBe('0 de 3 cadastrados')
    expect(textoProgresso(2)).toBe('2 de 3 cadastrados')
    expect(textoProgresso(7)).toBe('3 de 3 cadastrados')
    expect([0, 1, 2, 3, 9, -1].map(percentualAtivacao)).toEqual([0, 33, 67, 100, 100, 0])
  })
})

describe('dispensar o cartão', () => {
  const store: Record<string, string> = {}
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k]
    vi.stubGlobal('localStorage', { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => void (store[k] = v), removeItem: (k: string) => void delete store[k] })
  })
  afterEach(() => vi.unstubAllGlobals())
  it('grava e lê a escolha', () => {
    expect(lerDispensada()).toBe(false)
    gravarDispensada()
    expect(store[CHAVE_ATIVACAO_DISPENSADA]).toBe('1')
    expect(lerDispensada()).toBe(true)
  })
})
