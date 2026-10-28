import { describe, expect, it } from 'vitest'
import { ROTA_IMPORTAR, ROTA_IMPORTAR_COM_IA, viaInicial } from './via'

describe('via da importação', () => {
  it('só "ia" abre o caminho da IA; qualquer outra coisa (ou nada) abre a planilha', () => {
    expect(viaInicial('ia')).toBe('ia')
    expect(viaInicial('planilha')).toBe('planilha')
    expect(viaInicial(null)).toBe('planilha')
    expect(viaInicial('IA')).toBe('planilha')
    expect(viaInicial('<script>')).toBe('planilha')
  })
  it('a rota com IA é a da importação com ?via=ia', () => {
    expect(ROTA_IMPORTAR_COM_IA).toBe(`${ROTA_IMPORTAR}?via=ia`)
  })
})
