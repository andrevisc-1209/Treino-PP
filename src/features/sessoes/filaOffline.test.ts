import { beforeEach, describe, expect, it } from 'vitest'
import { enfileirar, lerFila, limparFila, removerDaFila } from './filaOffline'

// O ambiente de teste roda em Node puro (sem jsdom) — localStorage não existe
// por padrão, então um shim mínimo em memória basta pra testar o módulo.
class LocalStorageEmMemoria implements Storage {
  private dados = new Map<string, string>()
  get length() {
    return this.dados.size
  }
  clear(): void {
    this.dados.clear()
  }
  getItem(key: string): string | null {
    return this.dados.get(key) ?? null
  }
  key(index: number): string | null {
    return Array.from(this.dados.keys())[index] ?? null
  }
  removeItem(key: string): void {
    this.dados.delete(key)
  }
  setItem(key: string, value: string): void {
    this.dados.set(key, value)
  }
}

globalThis.localStorage = new LocalStorageEmMemoria()

beforeEach(() => {
  localStorage.clear()
})

describe('filaOffline', () => {
  it('começa vazia', () => {
    expect(lerFila('sessao-1')).toEqual([])
  })

  it('enfileira e persiste no localStorage', () => {
    const fila = enfileirar('sessao-1', { sessao_exercicio_id: 'ex-1', set_number: 1, reps: 10, load_kg: 20, completed: true })
    expect(fila).toHaveLength(1)
    expect(lerFila('sessao-1')).toHaveLength(1)
    expect(fila[0].id).toBe('ex-1:1')
  })

  it('substitui (não duplica) quando a mesma série é marcada de novo', () => {
    enfileirar('sessao-1', { sessao_exercicio_id: 'ex-1', set_number: 1, reps: 10, load_kg: 20, completed: true })
    const fila = enfileirar('sessao-1', { sessao_exercicio_id: 'ex-1', set_number: 1, reps: 12, load_kg: 22, completed: true })
    expect(fila).toHaveLength(1)
    expect(fila[0].reps).toBe(12)
  })

  it('mantém filas de sessões diferentes separadas', () => {
    enfileirar('sessao-1', { sessao_exercicio_id: 'ex-1', set_number: 1, reps: 10, load_kg: 20, completed: true })
    enfileirar('sessao-2', { sessao_exercicio_id: 'ex-9', set_number: 1, reps: 5, load_kg: 5, completed: true })
    expect(lerFila('sessao-1')).toHaveLength(1)
    expect(lerFila('sessao-2')).toHaveLength(1)
  })

  it('remove pelo id', () => {
    enfileirar('sessao-1', { sessao_exercicio_id: 'ex-1', set_number: 1, reps: 10, load_kg: 20, completed: true })
    enfileirar('sessao-1', { sessao_exercicio_id: 'ex-2', set_number: 1, reps: 8, load_kg: 15, completed: true })
    const restante = removerDaFila('sessao-1', 'ex-1:1')
    expect(restante).toHaveLength(1)
    expect(restante[0].id).toBe('ex-2:1')
  })

  it('limpa a fila inteira', () => {
    enfileirar('sessao-1', { sessao_exercicio_id: 'ex-1', set_number: 1, reps: 10, load_kg: 20, completed: true })
    limparFila('sessao-1')
    expect(lerFila('sessao-1')).toEqual([])
  })

  it('não quebra com JSON corrompido no localStorage', () => {
    localStorage.setItem('treino-fila-offline:sessao-x', '{not json')
    expect(lerFila('sessao-x')).toEqual([])
  })
})
