import { describe, expect, it } from 'vitest'
import { camposPrePosDoResultado, prontidaoDaExecucao } from './prontidaoExecucao'

describe('camposPrePosDoResultado', () => {
  it('só entram as respostas dadas; pular não grava nada', () => {
    expect(camposPrePosDoResultado({})).toEqual({})
    expect(camposPrePosDoResultado({ prontidao: { sono: 8, dor: 2 }, pse: 6 })).toEqual({ pre_sono: 8, pre_dor: 2, pse: 6 })
  })
  it('zero é resposta válida; valores fora de 0–10 ou não inteiros são descartados', () => {
    expect(camposPrePosDoResultado({ prontidao: { sono: 0, fadiga: 11, estresse: 2.5 }, pse: -1 })).toEqual({ pre_sono: 0 })
    expect(camposPrePosDoResultado({ pse: null })).toEqual({})
  })
})

describe('prontidaoDaExecucao', () => {
  it('usa a mesma conta da musculação: sono a favor, o resto contra', () => {
    expect(prontidaoDaExecucao({ pre_sono: 8, pre_estresse: 2, pre_fadiga: 2, pre_dor: 2 })).toBe(8)
  })
  it('incompleta (alguma pulada) não gera nota', () => {
    expect(prontidaoDaExecucao({ pre_sono: 8, pre_estresse: 2 })).toBeNull()
    expect(prontidaoDaExecucao(undefined)).toBeNull()
  })
})
