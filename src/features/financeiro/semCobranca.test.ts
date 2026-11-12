import { describe, expect, it } from 'vitest'
import { aulasSemCobranca, resumoNaoFaturado, type ParticipacaoNaoFaturada } from './semCobranca'

const p = (aluno_id: string, valor: number | null, extra: Partial<ParticipacaoNaoFaturada> = {}): ParticipacaoNaoFaturada => ({ aluno_id, cobrar: true, valor, fatura_id: null, ...extra })

describe('aulasSemCobranca', () => {
  const ativos = new Set(['com-cobranca'])
  it('soma as aulas com valor, sem fatura, de quem não tem cobrança ativa (maior valor primeiro)', () => {
    const r = aulasSemCobranca([p('a', 100), p('a', 50), p('b', 200), p('com-cobranca', 100)], ativos)
    expect(r).toEqual([
      { alunoId: 'b', qtd: 1, total: 200 },
      { alunoId: 'a', qtd: 2, total: 150 },
    ])
  })
  it('não conta aula já faturada, não cobrável, de valor zero/nulo (presença de pacote) nem de aluno com cobrança ativa', () => {
    expect(aulasSemCobranca([p('a', 100, { fatura_id: 'f1' }), p('a', 100, { cobrar: false }), p('a', 0), p('a', null), p('com-cobranca', 100)], ativos)).toEqual([])
  })
  it('sem aulas: lista vazia', () => expect(aulasSemCobranca([], ativos)).toEqual([]))
})

describe('resumoNaoFaturado', () => {
  it('conta e soma só o que é cobrável, com valor e sem fatura', () => {
    expect(resumoNaoFaturado([p('a', 100), p('a', 40.5), p('a', 100, { fatura_id: 'f' }), p('a', null)])).toEqual({ qtd: 2, total: 140.5 })
  })
})
