import { describe, expect, it } from 'vitest'
import { contarFaixas, diasSemTreino, estaNaFila, ordenarAlunos, pertenceAFaixa } from './filaAlunos'

describe('diasSemTreino', () => {
  it('conta dias de calendário; sem treino algum devolve null', () => {
    expect(diasSemTreino('2026-10-20', '2026-10-28')).toBe(8)
    expect(diasSemTreino('2026-10-28', '2026-10-28')).toBe(0)
    expect(diasSemTreino(undefined, '2026-10-28')).toBeNull()
  })
})

describe('faixas', () => {
  it('7 dias ainda não é alerta; 8 já é', () => {
    expect(estaNaFila(7)).toBe(false)
    expect(estaNaFila(8)).toBe(true)
    expect(estaNaFila(null)).toBe(true)
  })
  it('cada intervalo é exclusivo e cobre os limites', () => {
    expect(pertenceAFaixa(8, '8-14')).toBe(true)
    expect(pertenceAFaixa(14, '8-14')).toBe(true)
    expect(pertenceAFaixa(15, '8-14')).toBe(false)
    expect(pertenceAFaixa(15, '15-30')).toBe(true)
    expect(pertenceAFaixa(30, '15-30')).toBe(true)
    expect(pertenceAFaixa(31, '30+')).toBe(true)
    expect(pertenceAFaixa(30, '30+')).toBe(false)
  })
  it('quem nunca treinou só entra em "nunca" e em "alerta"', () => {
    expect(pertenceAFaixa(null, 'nunca')).toBe(true)
    expect(pertenceAFaixa(null, 'alerta')).toBe(true)
    expect(pertenceAFaixa(null, '30+')).toBe(false)
    expect(pertenceAFaixa(3, 'nunca')).toBe(false)
  })
  it('contarFaixas: os intervalos somam o alerta', () => {
    const c = contarFaixas([0, 7, 9, 20, 40, null, null])
    expect(c).toMatchObject({ todos: 7, alerta: 5, '8-14': 1, '15-30': 1, '30+': 1, nunca: 2 })
    expect(c['8-14'] + c['15-30'] + c['30+'] + c.nunca).toBe(c.alerta)
  })
})

describe('ordenarAlunos', () => {
  const alunos = [
    { id: 'a', name: 'Carlos' },
    { id: 'b', name: 'ana' },
    { id: 'c', name: 'Bia' },
    { id: 'd', name: 'Davi' },
  ]
  const dias = new Map<string, number | null>([['a', 10], ['b', 30], ['c', null], ['d', 2]])
  it('por nome, sem diferenciar maiúscula', () => {
    expect(ordenarAlunos(alunos, 'nome', { dias, comCobrancaPendente: new Set() }).map((x) => x.id)).toEqual(['b', 'c', 'a', 'd'])
  })
  it('sem treino: quem nunca treinou, depois o mais antigo', () => {
    expect(ordenarAlunos(alunos, 'sem_treino', { dias, comCobrancaPendente: new Set() }).map((x) => x.id)).toEqual(['c', 'b', 'a', 'd'])
  })
  it('cobrança pendente primeiro, desempate por nome', () => {
    expect(ordenarAlunos(alunos, 'cobranca', { dias, comCobrancaPendente: new Set(['d', 'a']) }).map((x) => x.id)).toEqual(['a', 'd', 'b', 'c'])
  })
  it('não altera a lista original', () => {
    const copia = [...alunos]
    ordenarAlunos(alunos, 'sem_treino', { dias, comCobrancaPendente: new Set() })
    expect(alunos).toEqual(copia)
  })
})
