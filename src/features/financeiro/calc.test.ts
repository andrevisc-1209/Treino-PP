import { describe, expect, it } from 'vitest'
import { cicloAtual, dividirValor, itensCobraveisDoCiclo, totalMensal, totalPorAula } from './calc'

describe('cicloAtual', () => {
  it('dia 10, hoje depois do início do ciclo: 10/set a 09/out', () => {
    expect(cicloAtual(10, '2026-09-25')).toEqual({ inicio: '2026-09-10', fim: '2026-10-09' })
  })

  it('dia 10, hoje antes do início do ciclo no mês: ciclo começou no mês anterior', () => {
    expect(cicloAtual(10, '2026-09-05')).toEqual({ inicio: '2026-08-10', fim: '2026-09-09' })
  })

  it('dia 1: ciclo é o mês corrente inteiro', () => {
    expect(cicloAtual(1, '2026-09-25')).toEqual({ inicio: '2026-09-01', fim: '2026-09-30' })
  })

  it('vira o ano corretamente (dezembro → janeiro)', () => {
    expect(cicloAtual(15, '2026-12-20')).toEqual({ inicio: '2026-12-15', fim: '2027-01-14' })
    expect(cicloAtual(15, '2027-01-05')).toEqual({ inicio: '2026-12-15', fim: '2027-01-14' })
  })
})

describe('itensCobraveisDoCiclo', () => {
  const ciclo = { inicio: '2026-09-10', fim: '2026-10-09' }

  it('inclui só itens sem fatura, cobráveis, com a aula dentro do ciclo', () => {
    const itens = [
      { id: '1', cobrar: true, valor: 50, fatura_id: null, aula_starts_at: '2026-09-15T13:00:00Z' }, // dentro
      { id: '2', cobrar: true, valor: 50, fatura_id: 'f1', aula_starts_at: '2026-09-15T13:00:00Z' }, // já faturado
      { id: '3', cobrar: false, valor: null, fatura_id: null, aula_starts_at: '2026-09-15T13:00:00Z' }, // não cobra
      { id: '4', cobrar: null, valor: null, fatura_id: null, aula_starts_at: '2026-09-15T13:00:00Z' }, // ainda previsto
      { id: '5', cobrar: true, valor: 50, fatura_id: null, aula_starts_at: '2026-09-05T13:00:00Z' }, // antes do ciclo
      { id: '6', cobrar: true, valor: 50, fatura_id: null, aula_starts_at: '2026-10-09T02:30:00Z' }, // 08/10 23:30 SP, dentro
    ]
    const resultado = itensCobraveisDoCiclo(itens, ciclo)
    expect(resultado.map((i) => i.id)).toEqual(['1', '6'])
  })
})

describe('totalPorAula / totalMensal', () => {
  it('soma os valores dos itens e aplica o ajuste', () => {
    const itens = [{ valor: 50 }, { valor: 50 }, { valor: 50 }, { valor: 0 }]
    expect(totalPorAula(itens, 0)).toBe(150)
    expect(totalPorAula(itens, -20)).toBe(130)
  })

  it('mensal ignora os itens e usa só o valor da mensalidade + ajuste', () => {
    expect(totalMensal(300, 0)).toBe(300)
    expect(totalMensal(300, 50)).toBe(350)
  })
})

describe('dividirValor', () => {
  it('divide igualmente quando é exato', () => {
    expect(dividirValor(100, 2)).toEqual([50, 50])
  })

  it('coloca a sobra de centavos no último participante', () => {
    expect(dividirValor(100, 3)).toEqual([33.33, 33.33, 33.34])
    expect(dividirValor(10, 3)).toEqual([3.33, 3.33, 3.34])
  })
})
