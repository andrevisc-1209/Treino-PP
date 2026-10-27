import { describe, expect, it } from 'vitest'
import { rotuloChuvaMm } from './chuva'

describe('rotuloChuvaMm', () => {
  it('some quando não há chuva relevante ou o dado não veio', () => {
    expect(rotuloChuvaMm(undefined)).toBeNull()
    expect(rotuloChuvaMm(null)).toBeNull()
    expect(rotuloChuvaMm(0)).toBeNull()
    expect(rotuloChuvaMm(0.05)).toBeNull()
    expect(rotuloChuvaMm(Number.NaN)).toBeNull()
  })
  it('garoa fraca vira "< 1 mm"', () => expect(rotuloChuvaMm(0.4)).toBe('< 1 mm'))
  it('usa vírgula e uma casa até 10 mm; inteiro a partir de 10', () => {
    expect(rotuloChuvaMm(3.6)).toBe('~3,6 mm')
    expect(rotuloChuvaMm(12.4)).toBe('~12 mm')
  })
})
