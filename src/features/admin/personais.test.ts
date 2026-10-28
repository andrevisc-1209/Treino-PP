import { describe, expect, it } from 'vitest'
import { abaDaUrl, cidadeDaUrl, descreverTreinos, filtrarPorCidade, linkMapsCidade, NAO_INFORMADO, ROTULO_ACAO_ADMIN, rotuloCidade } from './personais'

describe('cidade do personal', () => {
  it('vazio vira "Não informado" e não gera link', () => {
    for (const v of [null, undefined, '', '   ']) {
      expect(rotuloCidade(v)).toBe(NAO_INFORMADO)
      expect(linkMapsCidade(v)).toBeNull()
    }
  })
  it('link do Maps codifica cidade/UF', () => {
    expect(rotuloCidade('Niterói/RJ')).toBe('Niterói/RJ')
    expect(linkMapsCidade('Niterói/RJ')).toBe('https://www.google.com/maps/search/?api=1&query=Niter%C3%B3i%2FRJ%2C%20Brasil')
  })
})

describe('descreverTreinos', () => {
  it('sem métricas: "Não informado"', () => {
    expect(descreverTreinos(undefined).montados).toBe(NAO_INFORMADO)
  })
  it('soma e separa presencial x à distância; zero é zero, não "não informado"', () => {
    const d = descreverTreinos({ treinos_presencial: 3, treinos_distancia: 2, exec_presencial: 9, exec_distancia: 0, exec_30d: 4 })
    expect(d.montados).toBe('5 (3 presencial · 2 à distância)')
    expect(d.realizados).toBe('9 (9 presencial · 0 à distância)')
    expect(d.ultimos30).toBe('4')
  })
})

describe('abas do admin', () => {
  it('aba da URL: válida passa, desconhecida ou ausente vira "geral"', () => {
    expect(abaDaUrl('suporte')).toBe('suporte')
    expect(abaDaUrl('xyz')).toBe('geral')
    expect(abaDaUrl(null)).toBe('geral')
  })
  it('toda ação registrada no banco tem rótulo', () => {
    for (const a of ['reset_senha', 'alterar_trial', 'alterar_plano', 'alterar_cpf']) expect(ROTULO_ACAO_ADMIN[a]).toBeTruthy()
  })
})

describe('cidade como filtro da lista de personais', () => {
  const lista = [
    { id: 'a', cidade: 'Curitiba/PR' },
    { id: 'b', cidade: 'Rio de Janeiro/RJ' },
    { id: 'c', cidade: 'Curitiba/PR' },
    { id: 'd', cidade: null },
    { id: 'e', cidade: '  ' },
  ]
  it('sem cidade devolve todos', () => {
    expect(filtrarPorCidade(lista, '')).toHaveLength(5)
    expect(filtrarPorCidade(lista, '   ')).toHaveLength(5)
  })
  it('filtra pela cidade exata', () => {
    expect(filtrarPorCidade(lista, 'Curitiba/PR').map((p) => p.id)).toEqual(['a', 'c'])
    expect(filtrarPorCidade(lista, 'Salvador/BA')).toEqual([])
  })
  it('"Não informado" pega quem não cadastrou cidade', () => {
    expect(filtrarPorCidade(lista, NAO_INFORMADO).map((p) => p.id)).toEqual(['d', 'e'])
  })
  it('cidadeDaUrl limpa espaços e aceita ausência', () => {
    expect(cidadeDaUrl(' Curitiba/PR ')).toBe('Curitiba/PR')
    expect(cidadeDaUrl(null)).toBe('')
  })
})

