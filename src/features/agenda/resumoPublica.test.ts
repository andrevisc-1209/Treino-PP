import { describe, expect, it } from 'vitest'
import { normalizarResumo, normalizarResumoAdmin, rotuloTempo, semMovimento, taxaDeAprovacao } from './resumoPublica'

describe('resumo da página pública', () => {
  it('normaliza o JSON do banco (ausente vira 0; mediana ausente vira nulo)', () => {
    expect(normalizarResumo(null)).toEqual({ pedidos7d: 0, pendentes: 0, aprovados30d: 0, medianaRespostaMin: null, aulasRealizadas: 0 })
    expect(normalizarResumo({ pedidos_7d: '3', pendentes: 1, aprovados_30d: 2, mediana_resposta_min: 95.4, aulas_realizadas: 1 })).toEqual({
      pedidos7d: 3, pendentes: 1, aprovados30d: 2, medianaRespostaMin: 95.4, aulasRealizadas: 1,
    })
    expect(normalizarResumo({ mediana_resposta_min: 'x' }).medianaRespostaMin).toBeNull()
  })
  it('tempo em palavras', () => {
    expect(rotuloTempo(null)).toBe('–')
    expect(rotuloTempo(0.4)).toBe('menos de 1 min')
    expect(rotuloTempo(12.2)).toBe('12 min')
    expect(rotuloTempo(95)).toBe('2 h')
    expect(rotuloTempo(60 * 24)).toBe('1 dia')
    expect(rotuloTempo(60 * 24 * 3)).toBe('3 dias')
  })
  it('sem movimento só quando tudo está zerado', () => {
    expect(semMovimento(normalizarResumo({}))).toBe(true)
    expect(semMovimento(normalizarResumo({ pendentes: 1 }))).toBe(false)
    expect(semMovimento(normalizarResumo({ aulas_realizadas: 2 }))).toBe(false)
  })
})

describe('resumo do admin', () => {
  it('traz só totais', () => {
    const r = normalizarResumoAdmin({ personais_com_pagina: 4, personais_com_pedidos_30d: 2, pedidos_7d: 5, pedidos_30d: 12, aprovados_30d: 6, respondidos_30d: 10, mediana_resposta_min: 30, aulas_realizadas: 3, nome: 'não deve passar' })
    expect(r).toEqual({ personaisComPagina: 4, personaisComPedidos30d: 2, pedidos7d: 5, pedidos30d: 12, aprovados30d: 6, respondidos30d: 10, medianaRespostaMin: 30, aulasRealizadas: 3 })
    expect(Object.keys(r)).not.toContain('nome')
  })
  it('taxa de aprovação', () => {
    expect(taxaDeAprovacao(6, 10)).toBe(60)
    expect(taxaDeAprovacao(0, 0)).toBeNull()
  })
})
