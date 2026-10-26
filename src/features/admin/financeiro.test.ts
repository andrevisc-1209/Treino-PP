import { describe, expect, it } from 'vitest'
import { formatarMoeda, normalizarFinanceiro, taxaConversao } from './financeiro'

describe('taxaConversao', () => {
  it('null sem trial encerrado; arredonda e limita a 100', () => {
    expect(taxaConversao({ ja_pagaram: 0, trials_encerrados: 0 })).toBeNull()
    expect(taxaConversao({ ja_pagaram: 1, trials_encerrados: 3 })).toBe(33)
    expect(taxaConversao({ ja_pagaram: 5, trials_encerrados: 4 })).toBe(100)
    expect(taxaConversao({ ja_pagaram: 0, trials_encerrados: 4 })).toBe(0)
  })
})

describe('formatarMoeda e normalizarFinanceiro', () => {
  it('real com vírgula', () => {
    expect(formatarMoeda(13).replace(/\s/g, ' ')).toBe('R$ 13,00')
  })
  it('converte strings do banco em números e mantém a data do livro', () => {
    const f = normalizarFinanceiro({ assinantes_ativos: '3', mrr_estimado: '38.00', receita_mes: '54.00', livro_desde: '2026-10-26T12:00:00Z' })
    expect(f.assinantes_ativos).toBe(3)
    expect(f.mrr_estimado).toBe(38)
    expect(f.receita_mes).toBe(54)
    expect(f.nao_renovaram).toBe(0)
    expect(f.livro_desde).toBe('2026-10-26T12:00:00Z')
  })
})
