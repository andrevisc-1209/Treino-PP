import { describe, expect, it } from 'vitest'
import { decidirComecar } from './comecarAula'

const p = (aluno_id: string, status = 'previsto') => ({ aluno_id, status })

describe('decidirComecar', () => {
  it('um previsto: vai direto para o treino do aluno, ligado à aula', () => {
    expect(decidirComecar({ id: 'a1', aula_participantes: [p('x')] })).toEqual({ tipo: 'navegar', to: '/alunos/x/sessoes/nova?aula=a1' })
  })
  it('só conta quem está previsto', () => {
    expect(decidirComecar({ id: 'a1', aula_participantes: [p('x', 'presente'), p('y')] })).toEqual({ tipo: 'navegar', to: '/alunos/y/sessoes/nova?aula=a1' })
  })
  it('vários previstos: pergunta quem começa', () => {
    expect(decidirComecar({ id: 'a1', aula_participantes: [p('x'), p('y')] })).toEqual({ tipo: 'escolher' })
  })
  it('ninguém previsto: abre o menu da aula', () => {
    expect(decidirComecar({ id: 'a1', aula_participantes: [] })).toEqual({ tipo: 'menu' })
    expect(decidirComecar({ id: 'a1', aula_participantes: [p('x', 'falta')] })).toEqual({ tipo: 'menu' })
  })
})
