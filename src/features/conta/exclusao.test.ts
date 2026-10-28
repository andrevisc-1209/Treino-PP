import { describe, expect, it } from 'vitest'
import { confirmacaoValida, dataDaExclusao, previsaoDaExclusao } from './exclusao'

describe('confirmacaoValida', () => {
  it('só a palavra EXCLUIR (sem diferença de caixa ou espaço nas pontas)', () => {
    expect(confirmacaoValida('EXCLUIR')).toBe(true)
    expect(confirmacaoValida(' excluir ')).toBe(true)
    for (const v of ['', 'EXCLUI', 'EXCLUIR TUDO', 'sim', 'excluír']) expect(confirmacaoValida(v)).toBe(false)
  })
})

describe('datas da exclusão (dd/mm/aaaa, fuso de São Paulo)', () => {
  it('converte o instante do banco', () => {
    expect(dataDaExclusao('2026-11-27T15:00:00Z')).toBe('27/11/2026')
    expect(dataDaExclusao('2026-11-28T01:30:00Z')).toBe('27/11/2026') // 22h30 do dia 27 em São Paulo
  })
  it('a previsão é 30 dias depois de hoje', () => {
    expect(previsaoDaExclusao(new Date('2026-10-28T15:00:00Z'))).toBe('27/11/2026')
  })
})
