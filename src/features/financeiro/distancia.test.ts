import { describe, expect, it } from 'vitest'
import { payloadDistancia, validarDistancia } from './distancia'

const base = { modelo: 'por_aula' as const, cobrarDistancia: true, valorDistanciaTexto: '40,50' }

describe('cobrança de treino à distância', () => {
  it('por aula + ligada: exige valor maior que zero e envia o valor do personal', () => {
    expect(validarDistancia(base)).toBeNull()
    expect(payloadDistancia(base)).toEqual({ cobrar_distancia: true, valor_distancia: 40.5 })
    expect(validarDistancia({ ...base, valorDistanciaTexto: '' })).toMatch(/Informe/)
    expect(validarDistancia({ ...base, valorDistanciaTexto: '0' })).toMatch(/Informe/)
    expect(validarDistancia({ ...base, valorDistanciaTexto: 'abc' })).toMatch(/Informe/)
  })
  it('desligada ou mensal: nada é cobrado por treino', () => {
    expect(payloadDistancia({ ...base, cobrarDistancia: false })).toEqual({ cobrar_distancia: false, valor_distancia: null })
    expect(payloadDistancia({ ...base, modelo: 'mensal' })).toEqual({ cobrar_distancia: false, valor_distancia: null })
    expect(validarDistancia({ ...base, modelo: 'mensal', valorDistanciaTexto: '' })).toBeNull()
  })
})
