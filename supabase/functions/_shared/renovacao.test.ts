import { describe, expect, it } from 'vitest'
import { diasParaVencer, fimEfetivoDoAcesso, lembretesDoDia, montarEmailRenovacao } from './renovacao.ts'
import { montarPlanoExpirando } from './notificacoes.ts'

describe('fimEfetivoDoAcesso', () => {
  it('vale o mais tardio entre a assinatura e o mês grátis de indicação', () => {
    expect(fimEfetivoDoAcesso('2026-11-27T12:00:00Z', '2026-12-27T12:00:00Z')).toBe('2026-12-27T12:00:00Z')
    expect(fimEfetivoDoAcesso('2026-11-27T12:00:00Z', '2026-10-01T12:00:00Z')).toBe('2026-11-27T12:00:00Z')
    expect(fimEfetivoDoAcesso('2026-11-27T12:00:00Z', null)).toBe('2026-11-27T12:00:00Z')
    expect(fimEfetivoDoAcesso(null, null)).toBeNull()
  })
})

describe('diasParaVencer', () => {
  it('conta dias de calendário de São Paulo, não horas', () => {
    expect(diasParaVencer('2026-11-27T15:00:00Z', '2026-10-28')).toBe(30)
    expect(diasParaVencer('2026-11-02T20:00:00Z', '2026-10-28')).toBe(5)
    expect(diasParaVencer('2026-10-29T14:00:00Z', '2026-10-28')).toBe(1)
    expect(diasParaVencer('2026-10-28T23:00:00Z', '2026-10-28')).toBe(0)
    expect(diasParaVencer('2026-10-27T15:00:00Z', '2026-10-28')).toBe(-1)
  })
  it('fim às 02:00 UTC ainda é o dia anterior em São Paulo', () => {
    expect(diasParaVencer('2026-10-29T02:00:00Z', '2026-10-28')).toBe(0)
  })
})

describe('lembretesDoDia', () => {
  it('WhatsApp em 3 e 1 dia; e-mail em 5, 1 e 0', () => {
    expect(lembretesDoDia(5)).toEqual({ whatsapp: null, email: 5 })
    expect(lembretesDoDia(3)).toEqual({ whatsapp: 3, email: null })
    expect(lembretesDoDia(1)).toEqual({ whatsapp: 1, email: 1 })
    expect(lembretesDoDia(0)).toEqual({ whatsapp: null, email: 0 })
  })
  it('outros dias e dias negativos não mandam nada', () => {
    for (const d of [30, 7, 4, 2, -1]) expect(lembretesDoDia(d)).toEqual({ whatsapp: null, email: null })
  })
})

describe('textos', () => {
  it('WhatsApp de 3 dias mantém o texto de sempre e o de 1 dia diz "amanhã"', () => {
    expect(montarPlanoExpirando({ nome: 'André Scherer', plano: 'Mensal', ate: '2026-10-29' })).toContain('vence em 3 dias')
    const um = montarPlanoExpirando({ nome: 'André Scherer', plano: 'Mensal', ate: '2026-10-29', dias: 1 })
    expect(um).toContain('vence amanhã')
    expect(um).not.toContain('3 dias')
  })
  it('e-mail: assunto por prazo, data, botão e aviso de que não renova sozinho', () => {
    const e = montarEmailRenovacao({ nome: 'André Scherer', plano: 'Mensal', fimIso: '2026-11-27T15:00:00Z', dias: 5, appUrl: 'https://app.exemplo' })
    expect(e.assunto).toBe('Seu acesso ao Treino PP termina em 5 dias')
    expect(montarEmailRenovacao({ nome: null, plano: null, fimIso: '2026-11-27T15:00:00Z', dias: 1, appUrl: 'https://a' }).assunto).toBe('Seu acesso ao Treino PP termina amanhã')
    expect(montarEmailRenovacao({ nome: null, plano: null, fimIso: '2026-11-27T15:00:00Z', dias: 0, appUrl: 'https://a' }).assunto).toBe('Seu acesso ao Treino PP termina hoje')
    expect(e.texto).toContain('sexta, 27/11/2026')
    expect(e.html).toContain('sexta, 27/11/2026')
    // a data aparece uma vez só (já houve "segunda, 02/nov, 02/11/2026")
    expect(e.texto.match(/27\/11/g)).toHaveLength(1)
    expect(e.texto).not.toContain('nov,')
    expect(e.texto).toContain('Olá, André.')
    expect(e.texto).toContain('https://app.exemplo/configuracoes')
    expect(e.html).toContain('Renovar agora')
    expect(e.html).toContain('não renova sozinho')
  })
  it('e-mail sem nome nem plano ainda fica correto e escapa o que vem de fora', () => {
    const e = montarEmailRenovacao({ nome: '<b>X</b>', plano: null, fimIso: '2026-11-27T15:00:00Z', dias: 0, appUrl: 'https://a' })
    expect(e.html).not.toContain('<b>X</b>')
    expect(e.texto).not.toContain('plano ')
  })
})
