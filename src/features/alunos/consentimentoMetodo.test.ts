import { describe, expect, it } from 'vitest'
import { AVISO_CONSENTIMENTO_DECLARADO, LEMBRETE_PROVA_CONSENTIMENTO, rotuloMetodoConsentimento } from './consentimentoMetodo'

describe('rotuloMetodoConsentimento', () => {
  it('distingue quem prova: aluno (link) × personal (papel) × registro antigo (app)', () => {
    expect(rotuloMetodoConsentimento('link')).toBe('confirmado pelo aluno')
    expect(rotuloMetodoConsentimento('papel')).toBe('declarado por você')
    expect(rotuloMetodoConsentimento('app')).toBe('registrado no app')
    expect(rotuloMetodoConsentimento(null)).toBe('registrado no app')
    expect(rotuloMetodoConsentimento(undefined)).toBe('registrado no app')
  })
})

describe('aviso do consentimento declarado', () => {
  it('diz que a declaração é do personal, que a prova é dele e que pode ser solicitada', () => {
    expect(AVISO_CONSENTIMENTO_DECLARADO).toMatch(/sob sua responsabilidade/)
    expect(AVISO_CONSENTIMENTO_DECLARADO).toMatch(/termo assinado ou registro equivalente/)
    expect(AVISO_CONSENTIMENTO_DECLARADO).toMatch(/Guarde essa prova/)
    expect(AVISO_CONSENTIMENTO_DECLARADO).toMatch(/solicitado a apresentá-la/)
    expect(LEMBRETE_PROVA_CONSENTIMENTO).toMatch(/prova é sua/)
  })
})
