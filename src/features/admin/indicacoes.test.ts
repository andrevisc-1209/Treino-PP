import { describe, expect, it } from 'vitest'
import { fimDoAcesso, normalizarIndicacoes, sinaisDeAbuso } from './indicacoes'

const AGORA = new Date('2026-10-26T12:00:00Z').getTime()

describe('fimDoAcesso (mês grátis no /admin)', () => {
  const trial = { status: 'trial', trial_fim: '2026-10-30T00:00:00Z', assinatura_fim: null }
  it('sem bônus, mostra o fim do trial (ou da assinatura paga)', () => {
    expect(fimDoAcesso(trial, null, AGORA)).toEqual({ data: '2026-10-30T00:00:00Z', comBonus: false })
    expect(fimDoAcesso({ status: 'ativa', trial_fim: '2026-09-01T00:00:00Z', assinatura_fim: '2026-12-01T00:00:00Z' }, null, AGORA).data).toBe('2026-12-01T00:00:00Z')
  })
  it('com bônus depois do fim, o acesso vai até o bônus', () => {
    expect(fimDoAcesso(trial, '2026-11-29T00:00:00Z', AGORA)).toEqual({ data: '2026-11-29T00:00:00Z', comBonus: true })
  })
  it('trial vencido (expirada) com bônus vigente: o acesso é o bônus, não "vencido"', () => {
    expect(fimDoAcesso({ status: 'expirada', trial_fim: '2026-10-10T00:00:00Z', assinatura_fim: null }, '2026-11-09T00:00:00Z', AGORA).comBonus).toBe(true)
  })
  it('bônus já vencido ou ausente não conta', () => {
    expect(fimDoAcesso(trial, '2026-10-01T00:00:00Z', AGORA).comBonus).toBe(false)
    expect(fimDoAcesso(trial, undefined, AGORA).comBonus).toBe(false)
  })
})

describe('sinaisDeAbuso', () => {
  it('lista só o que ocorreu, em português', () => {
    expect(sinaisDeAbuso({})).toEqual([])
    expect(sinaisDeAbuso({ mesmo_telefone: true, varias_em_24h: true })).toEqual(['Mesmo telefone nas duas contas', '3 ou mais indicações concedidas em 24 horas'])
    expect(sinaisDeAbuso({ concedida_rapida: true })).toEqual(['Concedida em menos de 1 hora depois de criar a conta'])
  })
})

describe('normalizarIndicacoes', () => {
  it('tolera resposta vazia e converte contagens em texto', () => {
    expect(normalizarIndicacoes(null).totais.indicacoes).toBe(0)
    expect(normalizarIndicacoes(null).recentes).toEqual([])
    const r = normalizarIndicacoes({ totais: { indicacoes: '3', concedidas: 2 }, por_indicador: [{ indicador_id: 'a', nome: 'Ana', indicados: '3', concedidas: 2, varias_em_24h: true }], recentes: [] })
    expect(r.totais).toMatchObject({ indicacoes: 3, concedidas: 2, revogadas: 0 })
    expect(r.por_indicador[0]).toMatchObject({ nome: 'Ana', indicados: 3, varias_em_24h: true, mesmo_telefone: false })
  })
})
