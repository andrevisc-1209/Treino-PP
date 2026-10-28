import { describe, expect, it } from 'vitest'
import { acaoNecessaria, ehSemValor, linhasDePacote, prioridadeDaLinha, type LinhaFinanceiro } from './listaFinanceiro'

const linha = (estado: LinhaFinanceiro['estado'], totalCiclo: number): LinhaFinanceiro => ({ alunoId: 'x', estado, totalCiclo })

describe('ehSemValor', () => {
  it('ciclo em aberto sem aula é "sem valor"', () => {
    expect(ehSemValor(linha('a_fechar', 0), false)).toBe(true)
  })
  it('com valor, ou já encerrado, ou em outro estado, continua visível', () => {
    expect(ehSemValor(linha('a_fechar', 300), false)).toBe(false)
    expect(ehSemValor(linha('a_fechar', 0), true)).toBe(false)
    expect(ehSemValor(linha('atraso', 0), false)).toBe(false)
    expect(ehSemValor(linha('paga', 0), false)).toBe(false)
  })
  it('mensal (valor fixo) nunca cai em "sem valor"', () => {
    expect(ehSemValor(linha('a_fechar', 450), false)).toBe(false)
  })
})

describe('prioridadeDaLinha', () => {
  it('atraso antes de ciclo encerrado antes do resto', () => {
    expect(prioridadeDaLinha(linha('atraso', 120), false)).toBe(0)
    expect(prioridadeDaLinha(linha('a_fechar', 100), true)).toBe(1)
    expect(prioridadeDaLinha(linha('a_fechar', 100), false)).toBe(2)
  })
})

describe('acaoNecessaria', () => {
  it('some quando não há atraso nem ciclo para fechar', () => {
    expect(acaoNecessaria([], 0)).toBeNull()
  })
  it('soma o atraso e conta os ciclos', () => {
    expect(acaoNecessaria([{ total: 120 }, { total: 30.5 }], 2)).toEqual({ qtdAtraso: 2, totalAtraso: 150.5, qtdCiclosParaFechar: 2 })
    expect(acaoNecessaria([], 1)).toEqual({ qtdAtraso: 0, totalAtraso: 0, qtdCiclosParaFechar: 1 })
  })
})

describe('linhasDePacote', () => {
  const nomes = new Map([['a1', 'Ana'], ['a2', 'Bia'], ['a3', 'Caio'], ['a4', 'Davi']])
  const pacotes = [
    { aluno_id: 'a1', fatura_id: 'f1' },
    { aluno_id: 'a2', fatura_id: 'f2' },
    { aluno_id: 'a3', fatura_id: 'f3' },
    { aluno_id: 'a4', fatura_id: null },
  ]
  const faturas = [
    { id: 'f1', total: 800, status: 'paga', vencimento: null },
    { id: 'f2', total: 600, status: 'aberta', vencimento: '2026-10-01' },
    { id: 'f3', total: 500, status: 'aberta', vencimento: '2026-12-01' },
  ]
  it('paga, em atraso e a receber; sem fatura não gera linha', () => {
    const l = linhasDePacote(pacotes, faturas, nomes, '2026-10-28')
    expect(l.map((x) => [x.nome, x.estado, x.total])).toEqual([
      ['Ana', 'paga', 800],
      ['Bia', 'atraso', 600],
      ['Caio', 'enviada', 500],
    ])
  })
  it('fatura cancelada não gera linha', () => {
    expect(linhasDePacote([{ aluno_id: 'a1', fatura_id: 'f1' }], [{ id: 'f1', total: 1, status: 'cancelada', vencimento: null }], nomes, '2026-10-28')).toEqual([])
  })
})
