import { describe, expect, it } from 'vitest'
import { inicioDaSemanaSP } from '@/lib/datas'
import { direcaoDoDeslize, ehSegunda, montarFaixa, rotuloAcessivelDoDia } from './faixaDeDias'

describe('montarFaixa', () => {
  const inicio = inicioDaSemanaSP('2026-10-28') // quarta-feira
  const contagem = new Map([['2026-10-28', 2], ['2026-10-30', 1]])
  const faixa = montarFaixa(inicio, '2026-10-28', '2026-10-29', contagem)

  it('são 7 dias, de segunda a domingo, em ordem', () => {
    expect(ehSegunda(inicio)).toBe(true)
    expect(faixa.map((d) => d.iso)).toEqual(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01'])
    expect(faixa.map((d) => d.sigla)).toEqual(['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'])
    expect(faixa.map((d) => d.numero)).toEqual([26, 27, 28, 29, 30, 31, 1])
  })
  it('marca hoje, o dia aberto e a contagem de aulas', () => {
    expect(faixa.filter((d) => d.hoje).map((d) => d.iso)).toEqual(['2026-10-28'])
    expect(faixa.filter((d) => d.selecionado).map((d) => d.iso)).toEqual(['2026-10-29'])
    expect(faixa.map((d) => d.aulas)).toEqual([0, 0, 2, 0, 1, 0, 0])
  })
  it('hoje fora da semana mostrada não marca ninguém', () => {
    expect(montarFaixa(inicio, '2026-12-01', '2026-10-26', new Map()).some((d) => d.hoje)).toBe(false)
  })
})

describe('rotulo acessível', () => {
  it('diz as aulas e se é hoje', () => {
    const d = { iso: '2026-10-28', sigla: 'Qua', numero: 28, hoje: true, selecionado: true, aulas: 2 }
    expect(rotuloAcessivelDoDia(d, 'Quarta, 28 de outubro')).toBe('Quarta, 28 de outubro: 2 aulas (hoje)')
    expect(rotuloAcessivelDoDia({ ...d, hoje: false, aulas: 1 }, 'Quarta, 28 de outubro')).toBe('Quarta, 28 de outubro: 1 aula')
    expect(rotuloAcessivelDoDia({ ...d, hoje: false, aulas: 0 }, 'Quarta, 28 de outubro')).toBe('Quarta, 28 de outubro: sem aulas')
  })
})

describe('direcaoDoDeslize', () => {
  it('arrastar para a esquerda avança a semana; para a direita volta; movimento curto é toque', () => {
    expect(direcaoDoDeslize(-120)).toBe(1)
    expect(direcaoDoDeslize(120)).toBe(-1)
    expect(direcaoDoDeslize(-59)).toBe(0)
    expect(direcaoDoDeslize(10)).toBe(0)
  })
})
