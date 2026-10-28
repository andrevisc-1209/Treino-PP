import { describe, expect, it } from 'vitest'
import { MODALIDADES_ATIVAS } from '@/types/modalidades'
import { MODALIDADES_COM_TEMPLATE_DO_SISTEMA, modalidadesDoAtalhoDeModelo } from './aplicar'

describe('abas do atalho "Usar um modelo pronto"', () => {
  it('traz musculação, corrida, ciclismo e brick (as que têm modelo do sistema), na ordem do catálogo', () => {
    expect(modalidadesDoAtalhoDeModelo(['musculacao', 'natacao', 'corrida', 'ciclismo', 'brick', 'funcional' as never])).toEqual(['musculacao', 'corrida', 'ciclismo', 'brick'])
  })
  it('esconde a modalidade desabilitada no app e nunca inventa uma sem modelo', () => {
    expect(modalidadesDoAtalhoDeModelo(['musculacao', 'brick'])).toEqual(['musculacao', 'brick'])
    expect(modalidadesDoAtalhoDeModelo(['natacao'])).toEqual([])
  })
  it('no app de hoje, todas as modalidades com modelo do sistema estão habilitadas (o atalho mostra mais de uma aba)', () => {
    const abas = modalidadesDoAtalhoDeModelo(MODALIDADES_ATIVAS)
    expect(abas.length).toBeGreaterThan(1)
    expect(abas.every((m) => MODALIDADES_COM_TEMPLATE_DO_SISTEMA.includes(m))).toBe(true)
  })
})
