// Cache em memória com validade e teto de entradas (melhor esforço: vale por instância da function, some no cold start).
// Relógio injetável para testar com vitest.

export type CacheTtl<V> = {
  get(chave: string): V | undefined
  set(chave: string, valor: V): void
  tamanho(): number
}

export function criarCacheTtl<V>(ttlMs: number, maxEntradas: number, agora: () => number = Date.now): CacheTtl<V> {
  const mapa = new Map<string, { valor: V; ts: number }>()
  return {
    get(chave) {
      const e = mapa.get(chave)
      if (!e) return undefined
      if (agora() - e.ts >= ttlMs) {
        mapa.delete(chave)
        return undefined
      }
      return e.valor
    },
    set(chave, valor) {
      mapa.delete(chave) // reinserir move para o fim: o mais antigo é sempre o primeiro
      mapa.set(chave, { valor, ts: agora() })
      while (mapa.size > maxEntradas) {
        const maisAntiga = mapa.keys().next().value
        if (maisAntiga === undefined) break
        mapa.delete(maisAntiga)
      }
    },
    tamanho: () => mapa.size,
  }
}
