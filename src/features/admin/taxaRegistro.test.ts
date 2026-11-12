import { describe, expect, it } from 'vitest'
import { normalizarTaxaRegistro, taxaDeRegistro } from './taxaRegistro'

describe('taxa de registro', () => {
  it('normaliza a resposta da RPC, inclusive vazia', () => {
    expect(normalizarTaxaRegistro({ aulas_passadas_30d: 40, aulas_registradas_30d: 30, personais_com_aulas_30d: 6, personais_registrando: 4 })).toEqual({
      aulasPassadas: 40,
      aulasRegistradas: 30,
      personaisComAulas: 6,
      personaisRegistrando: 4,
    })
    expect(normalizarTaxaRegistro(null)).toEqual({ aulasPassadas: 0, aulasRegistradas: 0, personaisComAulas: 0, personaisRegistrando: 0 })
  })
  it('calcula a taxa em % e devolve null sem aulas passadas', () => {
    expect(taxaDeRegistro({ aulasPassadas: 40, aulasRegistradas: 30 })).toBe(75)
    expect(taxaDeRegistro({ aulasPassadas: 3, aulasRegistradas: 3 })).toBe(100)
    expect(taxaDeRegistro({ aulasPassadas: 0, aulasRegistradas: 0 })).toBeNull()
  })
})
