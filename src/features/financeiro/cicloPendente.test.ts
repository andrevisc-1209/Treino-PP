import { describe, expect, it } from 'vitest'
import { alunosComCicloParaFechar } from './cicloPendente'

// hoje = 23/10/2026; ciclo com início no dia 10 → atual 10/10–09/11, anterior 10/09–09/10
const hoje = '2026-10-23'
const porAula = (aluno_id: string) => ({ aluno_id, modelo: 'por_aula' as const, dia_ciclo: 10 })
const mensal = (aluno_id: string) => ({ aluno_id, modelo: 'mensal' as const, dia_ciclo: 10 })
const aulaNoCicloAnterior = (aluno_id: string) => ({ id: `p-${aluno_id}`, aluno_id, cobrar: true, valor: 100, fatura_id: null, aula: { starts_at: '2026-09-20T13:00:00Z' } })
const faturaAte = (aluno_id: string, periodo_fim: string, status = 'paga') => ({ aluno_id, periodo_fim, status })

describe('alunosComCicloParaFechar', () => {
  it('por aula: ciclo anterior encerrado com aula cobrável sem fatura → avisa', () => {
    expect(alunosComCicloParaFechar({ cobrancas: [porAula('a')], faturas: [], participacoes: [aulaNoCicloAnterior('a')], hoje })).toEqual(['a'])
  })
  it('por aula: sem aula cobrável no ciclo anterior → não avisa (nada a cobrar)', () => {
    expect(alunosComCicloParaFechar({ cobrancas: [porAula('a')], faturas: [], participacoes: [], hoje })).toEqual([])
  })
  it('por aula: aula só no ciclo em andamento → não avisa (ainda não encerrou)', () => {
    const p = { ...aulaNoCicloAnterior('a'), aula: { starts_at: '2026-10-15T13:00:00Z' } }
    expect(alunosComCicloParaFechar({ cobrancas: [porAula('a')], faturas: [], participacoes: [p], hoje })).toEqual([])
  })
  it('já faturado até o fim do ciclo anterior → não avisa', () => {
    expect(alunosComCicloParaFechar({ cobrancas: [porAula('a')], faturas: [faturaAte('a', '2026-10-09')], participacoes: [aulaNoCicloAnterior('a')], hoje })).toEqual([])
  })
  it('fatura cancelada não conta como fechada', () => {
    expect(alunosComCicloParaFechar({ cobrancas: [porAula('a')], faturas: [faturaAte('a', '2026-10-09', 'cancelada')], participacoes: [aulaNoCicloAnterior('a')], hoje })).toEqual(['a'])
  })
  it('fatura de ciclo antigo não cobre o anterior', () => {
    expect(alunosComCicloParaFechar({ cobrancas: [porAula('a')], faturas: [faturaAte('a', '2026-09-09')], participacoes: [aulaNoCicloAnterior('a')], hoje })).toEqual(['a'])
  })
  it('mensal sem nenhuma fatura (aluno novo): não avisa', () => {
    expect(alunosComCicloParaFechar({ cobrancas: [mensal('m')], faturas: [], participacoes: [], hoje })).toEqual([])
  })
  it('mensal que já tem fatura mas falta a do ciclo anterior: avisa', () => {
    expect(alunosComCicloParaFechar({ cobrancas: [mensal('m')], faturas: [faturaAte('m', '2026-09-09')], participacoes: [], hoje })).toEqual(['m'])
  })
  it('não mistura alunos', () => {
    const r = alunosComCicloParaFechar({ cobrancas: [porAula('a'), porAula('b')], faturas: [faturaAte('b', '2026-10-09')], participacoes: [aulaNoCicloAnterior('a'), aulaNoCicloAnterior('b')], hoje })
    expect(r).toEqual(['a'])
  })
})
