import { describe, expect, it } from 'vitest'
import { ROTA_IMPORTAR, ROTA_IMPORTAR_COM_IA, ROTA_IMPORTAR_COM_PLANILHA, viaInicial } from './via'

describe('via da importação', () => {
  it('a IA é o padrão: só "planilha" abre o outro caminho; qualquer outra coisa (ou nada) abre a IA', () => {
    expect(viaInicial(null)).toBe('ia')
    expect(viaInicial('ia')).toBe('ia')
    expect(viaInicial('planilha')).toBe('planilha')
    expect(viaInicial('PLANILHA')).toBe('ia')
    expect(viaInicial('<script>')).toBe('ia')
  })
  it('as rotas de entrada apontam para a importação com o caminho certo', () => {
    expect(ROTA_IMPORTAR_COM_IA).toBe(`${ROTA_IMPORTAR}?via=ia`)
    expect(ROTA_IMPORTAR_COM_PLANILHA).toBe(`${ROTA_IMPORTAR}?via=planilha`)
  })
})
