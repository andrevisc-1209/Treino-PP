import { describe, expect, it } from 'vitest'
import { ehRascunho, filtrarModelos, modalidadesDaBiblioteca, type ModeloParaBiblioteca } from './biblioteca'

const m = (name: string, modalidade: ModeloParaBiblioteca['modalidade'], exercicios: string[] = []): ModeloParaBiblioteca => ({
  name,
  modalidade,
  modelo_exercicios: exercicios.map((e) => ({ exercicio: { name: e } })),
})
const lista = [m('Full Body Iniciante', 'musculacao', ['Agachamento Livre']), m('HIIT + Abdômen', 'musculacao', ['Prancha']), m('treino do papai', 'natacao'), m('XXXX', 'musculacao'), m('Antigo', null, ['Supino'])]

describe('filtrarModelos', () => {
  it('sem busca e sem filtro devolve tudo', () => {
    expect(filtrarModelos(lista, '', null)).toHaveLength(5)
  })
  it('busca por nome ignorando acento e maiúscula', () => {
    expect(filtrarModelos(lista, 'abdomen', null).map((x) => x.name)).toEqual(['HIIT + Abdômen'])
    expect(filtrarModelos(lista, 'FULL', null)).toHaveLength(1)
  })
  it('busca também pelo nome de um exercício', () => {
    expect(filtrarModelos(lista, 'agachamento', null).map((x) => x.name)).toEqual(['Full Body Iniciante'])
  })
  it('filtra por modalidade; treino sem modalidade conta como musculação', () => {
    expect(filtrarModelos(lista, '', 'natacao').map((x) => x.name)).toEqual(['treino do papai'])
    expect(filtrarModelos(lista, '', 'musculacao').map((x) => x.name)).toContain('Antigo')
  })
  it('combina busca e modalidade', () => {
    expect(filtrarModelos(lista, 'papai', 'musculacao')).toEqual([])
  })
})

describe('ehRascunho', () => {
  it('só musculação sem exercício é rascunho', () => {
    expect(ehRascunho(lista[3])).toBe(true)
    expect(ehRascunho(lista[0])).toBe(false)
    expect(ehRascunho(lista[2])).toBe(false)
  })
})

describe('modalidadesDaBiblioteca', () => {
  it('conta por modalidade', () => {
    expect(modalidadesDaBiblioteca(lista)).toEqual([
      { modalidade: 'musculacao', qtd: 4 },
      { modalidade: 'natacao', qtd: 1 },
    ])
  })
})
