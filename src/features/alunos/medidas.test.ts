import { describe, expect, it } from 'vitest'
import { payloadAltura, podeRegistrarMedidas } from './medidas'

describe('trava de medidas corporais', () => {
  it('sem consentimento a altura não entra no payload (nada é gravado nem apagado)', () => {
    expect(payloadAltura(false, 175)).toEqual({})
    expect('height_cm' in payloadAltura(false, undefined)).toBe(false)
  })
  it('com consentimento grava a altura (ou limpa quando vazia)', () => {
    expect(payloadAltura(true, 175)).toEqual({ height_cm: 175 })
    expect(payloadAltura(true, undefined)).toEqual({ height_cm: null })
  })
  it('só registra medidas com consentimento', () => {
    expect(podeRegistrarMedidas(true)).toBe(true)
    expect(podeRegistrarMedidas(false)).toBe(false)
  })
})
