import { describe, expect, it } from 'vitest'
import { calcularProntidao, faixaProntidao, descritorPara } from './prontidao'
import { DESCRITORES_FADIGA } from './descritores'

describe('calcularProntidao', () => {
  it('sono conta a favor, o resto contra', () => {
    expect(calcularProntidao({ pre_sleep: 10, pre_stress: 0, pre_fatigue: 0, pre_muscle_pain: 0 })).toBe(10)
    expect(calcularProntidao({ pre_sleep: 0, pre_stress: 10, pre_fatigue: 10, pre_muscle_pain: 10 })).toBe(0)
  })
  it('null se faltar alguma resposta', () => {
    expect(calcularProntidao({ pre_sleep: 5, pre_stress: null, pre_fatigue: 5, pre_muscle_pain: 5 })).toBeNull()
    expect(calcularProntidao({ pre_sleep: 5, pre_stress: undefined, pre_fatigue: 5, pre_muscle_pain: 5 })).toBeNull()
  })
})

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
