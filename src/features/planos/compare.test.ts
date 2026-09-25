import { describe, expect, it } from 'vitest'
import { itensIguais, type ItemComparavel } from './compare'

function item(over: Partial<ItemComparavel> = {}): ItemComparavel {
  return {
    exercicio_id: 'ex-1',
    order_index: 0,
    sets: 3,
    reps: '10',
    target_load_kg: null,
    rest_seconds: 60,
    ...over,
  }
}

describe('itensIguais', () => {
  it('true para listas vazias', () => {
    expect(itensIguais([], [])).toBe(true)
  })

  it('true quando tudo é idêntico', () => {
    const a = [item({ exercicio_id: 'ex-1', order_index: 0 }), item({ exercicio_id: 'ex-2', order_index: 1 })]
    const b = [item({ exercicio_id: 'ex-1', order_index: 0 }), item({ exercicio_id: 'ex-2', order_index: 1 })]
    expect(itensIguais(a, b)).toBe(true)
  })

  it('false quando a quantidade de itens é diferente', () => {
    const a = [item()]
    const b = [item(), item({ exercicio_id: 'ex-2', order_index: 1 })]
    expect(itensIguais(a, b)).toBe(false)
  })

  it('false quando um exercício foi trocado', () => {
    const a = [item({ exercicio_id: 'ex-1' })]
    const b = [item({ exercicio_id: 'ex-2' })]
    expect(itensIguais(a, b)).toBe(false)
  })

  it('false quando a ordem é diferente, mesmo com os mesmos exercícios', () => {
    const a = [item({ exercicio_id: 'ex-1', order_index: 0 }), item({ exercicio_id: 'ex-2', order_index: 1 })]
    const b = [item({ exercicio_id: 'ex-2', order_index: 0 }), item({ exercicio_id: 'ex-1', order_index: 1 })]
    expect(itensIguais(a, b)).toBe(false)
  })

  it('false quando séries, reps, carga ou descanso mudam', () => {
    const base = item()
    expect(itensIguais([base], [item({ sets: 4 })])).toBe(false)
    expect(itensIguais([base], [item({ reps: '8-12' })])).toBe(false)
    expect(itensIguais([base], [item({ target_load_kg: 20 })])).toBe(false)
    expect(itensIguais([base], [item({ rest_seconds: 90 })])).toBe(false)
  })

  it('ignora o valor literal de order_index, só a ordem relativa', () => {
    const a = [item({ exercicio_id: 'ex-1', order_index: 0 }), item({ exercicio_id: 'ex-2', order_index: 1 })]
    const b = [item({ exercicio_id: 'ex-1', order_index: 10 }), item({ exercicio_id: 'ex-2', order_index: 20 })]
    expect(itensIguais(a, b)).toBe(true)
  })
})
