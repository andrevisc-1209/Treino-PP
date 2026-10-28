import { describe, expect, it } from 'vitest'
import { DIAS_AVISO_FIM_DO_TESTE, varianteDoBannerDoTeste } from './trialBannerRegra'

describe('varianteDoBannerDoTeste', () => {
  it('na tela Hoje, com o teste longe do fim, é a linha compacta', () => {
    expect(varianteDoBannerDoTeste('/', 15)).toBe('compacto')
    expect(varianteDoBannerDoTeste('/', 6)).toBe('compacto')
  })
  it('nas outras telas, com o teste longe do fim, não aparece', () => {
    expect(varianteDoBannerDoTeste('/alunos', 15)).toBeNull()
    expect(varianteDoBannerDoTeste('/agenda', 6)).toBeNull()
  })
  it('nos últimos 5 dias o banner completo aparece em qualquer tela', () => {
    expect(DIAS_AVISO_FIM_DO_TESTE).toBe(5)
    for (const rota of ['/', '/agenda', '/alunos', '/financeiro', '/meus-treinos']) expect(varianteDoBannerDoTeste(rota, 5)).toBe('completo')
    expect(varianteDoBannerDoTeste('/financeiro', 1)).toBe('completo')
  })
  it('sem teste valendo (acabou ou não está em teste) nunca mostra', () => {
    expect(varianteDoBannerDoTeste('/', 0)).toBeNull()
    expect(varianteDoBannerDoTeste('/', null)).toBeNull()
    expect(varianteDoBannerDoTeste('/alunos', 0)).toBeNull()
  })
})
