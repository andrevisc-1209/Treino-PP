import { describe, expect, it } from 'vitest'
import { frequenciaSemanal, notasPorTreino, pseMedioPorSemana, resumoRecibo, textoCompartilharRecibo, type ItemRecibo } from './recibo'

function item(p: Partial<ItemRecibo> & { starts_at: string }): ItemRecibo {
  return { id: p.starts_at, status: 'presente', valor: 50, duration_min: 60, local: null, pse: null, nota: null, data_sessao: null, ...p }
}

// 2026-09-15 é terça; 2026-09-21 é segunda (semana seguinte); 2026-10-05 é segunda
const itens: ItemRecibo[] = [
  item({ starts_at: '2026-09-15T13:00:00Z', local: 'Academia Central', pse: 6, nota: 8, data_sessao: '2026-09-15' }),
  item({ starts_at: '2026-09-17T13:00:00Z', local: ' academia central ', pse: 8, nota: 9, data_sessao: '2026-09-17' }),
  item({ starts_at: '2026-09-21T13:00:00Z', local: 'Praia' }),
  item({ starts_at: '2026-10-06T13:00:00Z', status: 'falta', local: 'Parque', pse: 9 }),
]

describe('resumoRecibo', () => {
  it('conta só presenças; dias e locais únicos (locais sem diferenciar caixa/espaços)', () => {
    expect(resumoRecibo(itens)).toEqual({ aulasRealizadas: 3, diasUnicos: 3, locais: ['Academia Central', 'Praia'] })
  })
  it('lista vazia', () => {
    expect(resumoRecibo([])).toEqual({ aulasRealizadas: 0, diasUnicos: 0, locais: [] })
  })
})

describe('frequenciaSemanal', () => {
  it('conta por semana (seg–dom) só de presenças', () => {
    expect(frequenciaSemanal(itens).map((p) => [p.semana, p.valor])).toEqual([
      ['2026-09-14', 2],
      ['2026-09-21', 1],
    ])
  })
  it('preenche semanas sem aula com 0', () => {
    const r = frequenciaSemanal([item({ starts_at: '2026-09-15T13:00:00Z' }), item({ starts_at: '2026-10-06T13:00:00Z' })])
    expect(r.map((p) => p.valor)).toEqual([1, 0, 0, 1])
  })
  it('sem presença: vazio', () => {
    expect(frequenciaSemanal([item({ starts_at: '2026-09-15T13:00:00Z', status: 'falta' })])).toEqual([])
  })
})

describe('pseMedioPorSemana', () => {
  it('média por semana, ignorando itens sem PSE', () => {
    expect(pseMedioPorSemana(itens).map((p) => [p.semana, p.valor])).toEqual([
      ['2026-09-14', 7],
      ['2026-10-05', 9],
    ])
  })
})

describe('notasPorTreino', () => {
  it('uma nota por treino, em ordem cronológica', () => {
    expect(notasPorTreino(itens).map((p) => [p.data, p.valor])).toEqual([
      ['2026-09-15', 8],
      ['2026-09-17', 9],
    ])
  })
})

describe('textoCompartilharRecibo', () => {
  it('traz cobrança e volume, sem PSE/notas', () => {
    const t = textoCompartilharRecibo({
      alunoNome: 'Ana',
      personalNome: 'Carlos',
      periodo: '15/09 a 14/10',
      resumo: { aulasRealizadas: 8, diasUnicos: 8, locais: ['A'] },
      total: 400,
    })
    expect(t).toContain('Aulas realizadas: 8 em 8 dias')
    expect(t).toMatch(/Total do ciclo: R\$\s?400,00/)
    expect(t).not.toMatch(/PSE|nota|prontid/i)
  })
})
