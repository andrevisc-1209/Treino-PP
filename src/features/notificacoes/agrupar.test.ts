import { describe, expect, it } from 'vitest'
import { agruparNotificacoes, contarNaoLidas, exigeAcao } from './agrupar'

const n = (id: string, tipo: Parameters<typeof exigeAcao>[0], lida = false) => ({ id, tipo, lida })

describe('agruparNotificacoes', () => {
  it('separa por ação, novidades, treinos e lidas, mantendo a ordem', () => {
    const g = agruparNotificacoes([
      n('1', 'treino_concluido'),
      n('2', 'ciclo_encerrado'),
      n('3', 'treino_concluido', true),
      n('4', 'indicacao_concedida'),
      n('5', 'ciclo_encerrado'),
      n('6', 'ciclo_encerrado', true),
    ])
    expect(g.acao.map((x) => x.id)).toEqual(['2', '5'])
    expect(g.novidades.map((x) => x.id)).toEqual(['4'])
    expect(g.treinos.map((x) => x.id)).toEqual(['1'])
    expect(g.lidas.map((x) => x.id)).toEqual(['3', '6'])
  })
  it('lista vazia gera grupos vazios', () => {
    expect(agruparNotificacoes([])).toEqual({ acao: [], novidades: [], treinos: [], lidas: [] })
  })
})

describe('contarNaoLidas', () => {
  it('ciclo encerrado e pedido de aula contam como ação', () => {
    expect(contarNaoLidas(['treino_concluido', 'ciclo_encerrado', 'indicacao_concedida', 'treino_concluido'])).toEqual({ total: 4, acao: 1 })
    expect(contarNaoLidas(['pedido_aula', 'ciclo_encerrado', 'treino_concluido'])).toEqual({ total: 3, acao: 2 })
    expect(contarNaoLidas([])).toEqual({ total: 0, acao: 0 })
  })
})
