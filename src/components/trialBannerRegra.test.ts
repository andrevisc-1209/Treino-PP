import { describe, expect, it } from 'vitest'
import { DIAS_AVISO_FIM_DO_TESTE, diasGratisRestantes, varianteDoBannerDoTeste } from './trialBannerRegra'

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

describe('diasGratisRestantes', () => {
  const agora = new Date('2026-11-17T12:00:00Z').getTime()
  it('sem bônus, são os dias do trial', () => {
    expect(diasGratisRestantes(9, new Date('2026-11-26T12:00:00Z'), null, agora)).toBe(9)
  })
  it('com cupom depois do trial, conta até o fim dos dias grátis (não "faltam 3 dias")', () => {
    expect(diasGratisRestantes(3, new Date('2026-11-20T12:00:00Z'), new Date('2027-02-18T12:00:00Z'), agora)).toBe(93)
  })
  it('bônus vencido ou antes do fim do trial não muda; fora do trial devolve null', () => {
    expect(diasGratisRestantes(3, new Date('2026-11-20T12:00:00Z'), new Date('2026-11-10T12:00:00Z'), agora)).toBe(3)
    expect(diasGratisRestantes(null, null, new Date('2027-02-18T12:00:00Z'), agora)).toBeNull()
  })
})
