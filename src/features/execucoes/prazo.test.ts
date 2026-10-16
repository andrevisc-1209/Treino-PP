import { describe, expect, it } from 'vitest'
import { tempoRestante } from './prazo'

const H = 3_600_000
describe('tempoRestante', () => {
  it('formata o que falta até o prazo', () => {
    expect(tempoRestante(20 * 60_000)).toBe('20 min')
    expect(tempoRestante(30_000)).toBe('1 min')
    expect(tempoRestante(5.5 * H)).toBe('5 h 30 min')
    expect(tempoRestante(6 * H)).toBe('6 h')
    expect(tempoRestante(47 * H)).toBe('1 dia e 23 h')
    expect(tempoRestante(48 * H)).toBe('2 dias')
    expect(tempoRestante(-5)).toBe('1 min')
  })
})
