import { beforeEach, describe, expect, it } from 'vitest'
import { aguardandoEnvio, classificarErroSerie, enfileirar, lerFila, liberarRecusados, limparFila, marcarRecusado, recusadas, removerDaFila } from './filaOffline'

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

describe('série recusada pelo servidor', () => {
  const serie = (n: number) => ({ sessao_exercicio_id: 'ex-1', set_number: n, reps: 10, load_kg: 20, completed: true })

  it('marcar como recusada guarda o motivo e tira a série do reenvio automático, sem perdê-la', () => {
    enfileirar('s', serie(1))
    enfileirar('s', serie(2))
    const fila = marcarRecusado('s', 'ex-1:1', 'Assine o plano para fazer esta alteração.')
    expect(fila).toHaveLength(2)
    expect(recusadas(fila).map((i) => i.id)).toEqual(['ex-1:1'])
    expect(aguardandoEnvio(fila).map((i) => i.id)).toEqual(['ex-1:2'])
    expect(recusadas(lerFila('s'))[0].recusadoMotivo).toMatch(/Assine o plano/)
  })

  it('liberar recusadas devolve todas ao reenvio', () => {
    enfileirar('s', serie(1))
    marcarRecusado('s', 'ex-1:1', 'motivo')
    const fila = liberarRecusados('s')
    expect(recusadas(fila)).toHaveLength(0)
    expect(aguardandoEnvio(fila)).toHaveLength(1)
    expect(fila[0]).not.toHaveProperty('recusadoMotivo')
  })

  it('marcar de novo a mesma série (o personal refez) a recoloca no envio', () => {
    enfileirar('s', serie(1))
    marcarRecusado('s', 'ex-1:1', 'motivo')
    const fila = enfileirar('s', { ...serie(1), reps: 12 })
    expect(recusadas(fila)).toHaveLength(0)
  })
})

describe('classificarErroSerie: rede (tenta de novo) × recusado (para de tentar)', () => {
  it.each([
    ['sem conexão', new TypeError('Failed to fetch')],
    ['rede (outro texto)', { message: 'NetworkError when attempting to fetch resource.' }],
    ['carregamento falhou', { message: 'Load failed' }],
    ['timeout', { message: 'request timed out' }],
    ['servidor fora (503)', { status: 503, message: 'x' }],
    ['limite de requisições (429)', { status: 429, message: 'x' }],
    ['sem código nem status', { message: 'algo estranho' }],
    ['valor nulo', null],
  ])('rede: %s', (_nome, erro) => expect(classificarErroSerie(erro)).toBe('rede'))

  it.each([
    ['assinatura vencida / RLS', { code: '42501', message: 'new row violates row-level security policy "assinatura_ativa_insert" for table "sessao_series"' }],
    ['valor fora do limite (CHECK)', { code: '23514', message: 'violates check constraint' }],
    ['texto longo demais', { code: '22001', message: 'value too long' }],
    ['JWT expirado', { code: 'PGRST301', status: 401, message: 'JWT expired' }],
    ['permissão negada (403)', { status: 403, message: 'forbidden' }],
    ['pedido inválido (400)', { status: 400, message: 'bad request' }],
  ])('recusado: %s', (_nome, erro) => expect(classificarErroSerie(erro)).toBe('recusado'))
})
