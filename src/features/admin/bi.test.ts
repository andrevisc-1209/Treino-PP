import { describe, expect, it } from 'vitest'
import { agruparSerie, normalizarBI, passoDoGrafico, periodoDaUrl, PERIODOS_BI, variacao, type PontoSerie } from './bi'

describe('periodoDaUrl', () => {
  it('válido passa; desconhecido ou ausente vira 30', () => {
    expect(periodoDaUrl('365')).toBe(365)
    expect(periodoDaUrl('7')).toBe(30)
    expect(periodoDaUrl(null)).toBe(30)
    expect(PERIODOS_BI.map((p) => p.dias)).toEqual([1, 15, 30, 90, 180, 365])
  })
})

describe('variacao', () => {
  it('percentual com sinal, arredondado', () => {
    expect(variacao(15, 10)).toEqual({ rotulo: '+50% vs. período anterior', sentido: 'subiu' })
    expect(variacao(5, 10)).toEqual({ rotulo: '-50% vs. período anterior', sentido: 'caiu' })
    expect(variacao(10, 10).sentido).toBe('igual')
  })
  it('sem base não inventa percentual', () => {
    expect(variacao(3, 0).sentido).toBe('novo')
    expect(variacao(0, 0).sentido).toBe('sem_dados')
    expect(variacao(0, 4)).toEqual({ rotulo: '-100% vs. período anterior', sentido: 'caiu' })
  })
})

describe('gráfico', () => {
  const dia = (n: number): string => `2026-10-${String(n).padStart(2, '0')}`
  const serie: PontoSerie[] = Array.from({ length: 15 }, (_, i) => ({ dia: dia(i + 1), cadastros: i + 1, alunos_novos: 0, treinos: 0, pagamentos: 0, receita: 0 }))
  it('passo por período', () => {
    expect([1, 15, 30, 90, 180, 365].map((d) => passoDoGrafico(d as 1))).toEqual([1, 1, 1, 7, 7, 30])
  })
  it('passo 1 mantém um ponto por dia; passo 7 soma as semanas e a última pode ser parcial', () => {
    expect(agruparSerie(serie, 'cadastros', 1)).toHaveLength(15)
    const semanas = agruparSerie(serie, 'cadastros', 7)
    expect(semanas.map((b) => b.valor)).toEqual([28, 77, 15])
    expect(semanas[0]).toMatchObject({ rotulo: '01/10', detalhe: '01/10 a 07/10' })
    expect(semanas[2].detalhe).toBe('15/10')
  })
})

describe('normalizarBI', () => {
  it('converte strings, completa métricas ausentes com 0 e aceita entrada vazia', () => {
    const d = normalizarBI({ dias: 30, atual: { cadastros: '4', receita: '54.00' }, anterior: {}, serie: [{ dia: '2026-10-01', cadastros: '2' }] })
    expect(d.atual.cadastros).toBe(4)
    expect(d.atual.receita).toBe(54)
    expect(d.atual.relatos).toBe(0)
    expect(d.serie[0]).toMatchObject({ dia: '2026-10-01', cadastros: 2, treinos: 0 })
    expect(normalizarBI(null).serie).toEqual([])
  })
})
