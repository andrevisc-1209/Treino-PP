import { describe, expect, it } from 'vitest'
import { faixaProntidao, descritorPara } from './prontidao'
import { DESCRITORES_FADIGA } from './descritores'

describe('faixaProntidao', () => {
  it('classifica as 3 faixas', () => {
    expect(faixaProntidao(0).label).toBe('Baixa')
    expect(faixaProntidao(3.9).label).toBe('Baixa')
    expect(faixaProntidao(4).label).toBe('Moderada')
    expect(faixaProntidao(6.9).label).toBe('Moderada')
    expect(faixaProntidao(7).label).toBe('Boa')
    expect(faixaProntidao(10).label).toBe('Boa')
  })
})

describe('descritorPara', () => {
  it('acha o rótulo certo pro valor', () => {
    expect(descritorPara(DESCRITORES_FADIGA, 10)).toBe('Muito alta')
    expect(descritorPara(DESCRITORES_FADIGA, 0)).toBe('Nenhuma')
  })
})
