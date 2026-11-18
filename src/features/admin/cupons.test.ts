import { describe, expect, it } from 'vitest'
import { erroDoFormulario, fimDoDiaSP, normalizarCupons, percentual, situacaoDaCampanha } from './cupons'

const agora = new Date('2026-11-18T12:00:00Z').getTime()
const camp = { ativa: true, valido_de: '2026-11-01T00:00:00Z', valido_ate: '2027-02-28T23:59:59Z', max_usos: 10, usos: 3 }

describe('situacaoDaCampanha', () => {
  it('vigente, pausada, vencida, esgotada e ainda não começou', () => {
    expect(situacaoDaCampanha(camp, agora)).toBe('vigente')
    expect(situacaoDaCampanha({ ...camp, ativa: false }, agora)).toBe('pausada')
    expect(situacaoDaCampanha({ ...camp, valido_ate: '2026-11-10T00:00:00Z' }, agora)).toBe('vencida')
    expect(situacaoDaCampanha({ ...camp, usos: 10 }, agora)).toBe('esgotada')
    expect(situacaoDaCampanha({ ...camp, valido_de: '2026-12-01T00:00:00Z' }, agora)).toBe('agendada')
  })
  it('pausada vence as outras situações', () => {
    expect(situacaoDaCampanha({ ...camp, ativa: false, usos: 10, valido_ate: '2026-11-10T00:00:00Z' }, agora)).toBe('pausada')
  })
})

describe('fimDoDiaSP e percentual', () => {
  it('último instante do dia em Brasília (UTC-3)', () => {
    expect(fimDoDiaSP('2027-02-28')).toBe('2027-03-01T02:59:59.000Z')
    expect(fimDoDiaSP('28/02/2027')).toBeNull()
    expect(fimDoDiaSP('')).toBeNull()
  })
  it('percentual inteiro e 0 sem total', () => {
    expect(percentual(1, 3)).toBe(33)
    expect(percentual(5, 0)).toBe(0)
  })
})

describe('erroDoFormulario', () => {
  const ok = { codigo: 'parceiro3m', parceiro: 'Academia X', dias: '90', validade: '2027-02-28', maxUsos: '50', publico: 'novos' as const }
  it('formulário certo não dá erro', () => expect(erroDoFormulario(ok, agora)).toBeNull())
  it('cada campo inválido tem a sua mensagem', () => {
    expect(erroDoFormulario({ ...ok, codigo: 'ab' }, agora)).toContain('código')
    expect(erroDoFormulario({ ...ok, parceiro: ' ' }, agora)).toContain('parceiro')
    expect(erroDoFormulario({ ...ok, dias: '0' }, agora)).toContain('dias')
    expect(erroDoFormulario({ ...ok, dias: '400' }, agora)).toContain('dias')
    expect(erroDoFormulario({ ...ok, validade: '2026-11-01' }, agora)).toContain('validade')
    expect(erroDoFormulario({ ...ok, maxUsos: '0' }, agora)).toContain('limite')
  })
})

describe('normalizarCupons', () => {
  it('aceita contagens como texto e nunca devolve undefined', () => {
    const p = normalizarCupons({ totais: { campanhas: '2', pagantes: '1' }, campanhas: [{ id: 'a', codigo: 'X', usos: '3', ativa: true }], recentes: [{ id: 'r', pagante: true }] })
    expect(p.totais).toMatchObject({ campanhas: 2, pagantes: 1, resgates: 0 })
    expect(p.campanhas[0]).toMatchObject({ id: 'a', usos: 3, ativa: true, max_usos: 0, publico: 'novos' })
    expect(normalizarCupons({ campanhas: [{ id: 'b', publico: 'todos' }, { id: 'c', publico: 'qualquer' }] }).campanhas.map((c) => c.publico)).toEqual(['todos', 'novos'])
    expect(p.recentes[0]).toMatchObject({ pagante: true, ativado: false })
    expect(normalizarCupons(null)).toEqual({ totais: { campanhas: 0, ativas: 0, resgates: 0, ativados: 0, pagantes: 0, dias_concedidos: 0 }, campanhas: [], recentes: [] })
  })
})
