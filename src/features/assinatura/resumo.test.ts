import { describe, expect, it } from 'vitest'
import { resumirAssinatura } from './resumo'
import type { Assinatura } from './useAssinatura'

const base: Assinatura = { status: 'trial', diasRestantesTrial: null, trialFim: null, plano: null, assinaturaFim: null, bonusAte: null, estaAtivo: true }
const norm = (s: string) => s.replace(/\s/g, ' ')

describe('resumirAssinatura', () => {
  it('trial: dias restantes, data de término e grátis', () => {
    const r = resumirAssinatura({ ...base, diasRestantesTrial: 9, trialFim: new Date('2026-10-23T15:00:00Z') })
    expect(r).toMatchObject({ status: 'Trial', prazoRotulo: 'Trial termina em', prazo: '23/10/2026', valor: 'Grátis', acao: 'assinar' })
    expect(r.nota).toBe('Você tem 9 dias de trial gratuito restantes.')
  })
  it('trial com 1 dia no singular; trial vencido pede para assinar', () => {
    expect(resumirAssinatura({ ...base, diasRestantesTrial: 1, trialFim: new Date('2026-10-15T15:00:00Z') }).nota).toBe('Você tem 1 dia de trial gratuito restantes.')
    const v = resumirAssinatura({ ...base, diasRestantesTrial: 0, trialFim: new Date('2026-10-01T15:00:00Z') })
    expect(v.prazoRotulo).toBe('Trial encerrou em')
    expect(v.nota).toContain('Assine')
  })
  it('ativa: plano, valor, acesso até e renovar', () => {
    const r = resumirAssinatura({ ...base, status: 'ativa', plano: 'trimestral', assinaturaFim: new Date('2027-01-12T15:00:00Z') })
    expect(r).toMatchObject({ status: 'Ativo', plano: 'Trimestral', prazoRotulo: 'Acesso até', prazo: '12/01/2027', acao: 'renovar' })
    expect(norm(r.valor)).toBe('R$ 39,00')
  })
  it('expirada = Encerrado e cancelada = Cancelado', () => {
    expect(resumirAssinatura({ ...base, status: 'expirada', plano: 'mensal', assinaturaFim: new Date('2026-10-01T15:00:00Z') })).toMatchObject({ status: 'Encerrado', plano: 'Mensal', acao: 'assinar' })
    expect(resumirAssinatura({ ...base, status: 'cancelada', plano: 'semestral', assinaturaFim: new Date('2026-12-01T15:00:00Z') }).status).toBe('Cancelado')
  })
  describe('dias grátis (cupom ou indicação)', () => {
    const agora = new Date('2026-11-17T15:00:00Z')
    it('trial rodando + cupom: acesso vai até o fim dos dias grátis e avisa que o plano começa depois', () => {
      const r = resumirAssinatura({ ...base, diasRestantesTrial: 9, trialFim: new Date('2026-11-26T15:00:00Z'), bonusAte: new Date('2027-02-24T15:00:00Z') }, agora)
      expect(r).toMatchObject({ status: 'Trial', prazoRotulo: 'Acesso até', prazo: '24/02/2027', valor: 'Grátis', acao: 'assinar' })
      expect(r.nota).toContain('não perde nenhum dia')
    })
    it('trial já acabou mas o cupom vale: não diz que o teste terminou', () => {
      const r = resumirAssinatura({ ...base, diasRestantesTrial: 0, trialFim: new Date('2026-11-01T15:00:00Z'), bonusAte: new Date('2027-01-30T15:00:00Z') }, agora)
      expect(r).toMatchObject({ status: 'Dias grátis', prazo: '30/01/2027', acao: 'assinar' })
      expect(r.nota).not.toContain('terminou')
    })
    it('assinatura ativa com dias grátis depois: acesso até o fim deles e renovar', () => {
      const r = resumirAssinatura({ ...base, status: 'ativa', plano: 'mensal', assinaturaFim: new Date('2026-12-01T15:00:00Z'), bonusAte: new Date('2027-01-10T15:00:00Z') }, agora)
      expect(r).toMatchObject({ status: 'Ativo', plano: 'Mensal', prazo: '10/01/2027', acao: 'renovar' })
    })
    it('bônus vencido ou que acaba antes do período base não muda nada', () => {
      const a = { ...base, status: 'ativa' as const, plano: 'mensal' as const, assinaturaFim: new Date('2027-03-01T15:00:00Z') }
      expect(resumirAssinatura({ ...a, bonusAte: new Date('2027-01-10T15:00:00Z') }, agora).prazo).toBe('01/03/2027')
      expect(resumirAssinatura({ ...base, diasRestantesTrial: 0, trialFim: new Date('2026-11-01T15:00:00Z'), bonusAte: new Date('2026-11-10T15:00:00Z') }, agora).prazoRotulo).toBe('Trial encerrou em')
    })
  })
})
