import { describe, expect, it } from 'vitest'
import { alertaDeAcao } from './alertaDeAcao'

describe('alertaDeAcao', () => {
  it('registrar vem antes de cobrar', () => {
    expect(alertaDeAcao({ paraRegistrar: 2, ciclosParaFechar: 3 })).toBe('registrar')
  })
  it('sem aula para registrar, aparece o ciclo para fechar', () => {
    expect(alertaDeAcao({ paraRegistrar: 0, ciclosParaFechar: 1 })).toBe('ciclos')
  })
  it('sem nada urgente, não há alerta (convites podem aparecer)', () => {
    expect(alertaDeAcao({ paraRegistrar: 0, ciclosParaFechar: 0 })).toBeNull()
  })
})
