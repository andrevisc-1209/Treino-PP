import { describe, expect, it } from 'vitest'
import { diasParaFimDoAcesso, varianteDoAvisoDeRenovacao } from './renovacaoBannerRegra'

describe('varianteDoAvisoDeRenovacao', () => {
  it('longe do fim (mais de 7 dias) não aparece', () => {
    expect(varianteDoAvisoDeRenovacao('/', 8)).toBeNull()
    expect(varianteDoAvisoDeRenovacao('/', 30)).toBeNull()
  })
  it('de 7 a 4 dias: linha compacta só na Hoje', () => {
    expect(varianteDoAvisoDeRenovacao('/', 7)).toBe('compacto')
    expect(varianteDoAvisoDeRenovacao('/', 4)).toBe('compacto')
    expect(varianteDoAvisoDeRenovacao('/agenda', 5)).toBeNull()
  })
  it('nos últimos 3 dias: banner completo em qualquer tela', () => {
    for (const rota of ['/', '/agenda', '/alunos', '/financeiro']) expect(varianteDoAvisoDeRenovacao(rota, 3)).toBe('completo')
    expect(varianteDoAvisoDeRenovacao('/financeiro', 1)).toBe('completo')
  })
  it('sem data ou já vencido, nunca mostra (quem assume é o modo leitura)', () => {
    expect(varianteDoAvisoDeRenovacao('/', null)).toBeNull()
    expect(varianteDoAvisoDeRenovacao('/', 0)).toBeNull()
    expect(varianteDoAvisoDeRenovacao('/', -2)).toBeNull()
  })
})

describe('diasParaFimDoAcesso', () => {
  const agora = new Date('2026-10-28T12:00:00Z').getTime()
  it('arredonda para cima e usa o mais tardio entre assinatura e mês grátis', () => {
    expect(diasParaFimDoAcesso(new Date('2026-11-02T10:00:00Z'), null, agora)).toBe(5)
    expect(diasParaFimDoAcesso(new Date('2026-11-02T10:00:00Z'), new Date('2026-12-02T10:00:00Z'), agora)).toBe(35)
  })
  it('sem nenhuma data devolve null; data passada devolve zero ou negativo', () => {
    expect(diasParaFimDoAcesso(null, null, agora)).toBeNull()
    expect(diasParaFimDoAcesso(new Date('2026-10-20T12:00:00Z'), null, agora)).toBeLessThanOrEqual(0)
  })
})
