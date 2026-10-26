import { describe, expect, it } from 'vitest'
import { descreverTreinos, linkMapsCidade, NAO_INFORMADO, rotuloCidade } from './personais'

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
