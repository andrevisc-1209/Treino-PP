import { describe, expect, it } from 'vitest'
import type { ItemAcao } from './biV1'
import { alertaAdiado, diasSemAtividade, normalizarAtividade, normalizarContatos, normalizarResumoContatos, rotuloUltimaAtividade, rotuloUltimoContato, separarAdiados } from './contatos'

const agora = new Date('2026-10-28T15:00:00Z')
const resumo = (o: Partial<{ professional_id: string; ultimo_em: string; canal: string; resultado: string; adiar_ate: string | null; total: number }> = {}) => ({
  professional_id: 'a', ultimo_em: '2026-10-25T15:00:00Z', canal: 'whatsapp', resultado: 'respondeu', adiar_ate: null, total: 1, ...o,
})
const item = (id: string): ItemAcao => ({ professional_id: id, nome: id, cidade: null, telefone: null, plano: null, status: 'trial', motivo: 'trial_sem_ativacao', dias: 1, qtd_alunos: 0 })

describe('alerta adiado', () => {
  it('vale até o fim do dia da data de adiamento', () => {
    expect(alertaAdiado(resumo({ adiar_ate: '2026-10-28' }), '2026-10-28')).toBe(true)
    expect(alertaAdiado(resumo({ adiar_ate: '2026-10-27' }), '2026-10-28')).toBe(false)
    expect(alertaAdiado(resumo(), '2026-10-28')).toBe(false)
    expect(alertaAdiado(undefined, '2026-10-28')).toBe(false)
  })
  it('separa a lista de ação entre ativos e adiados', () => {
    const mapa = new Map([['b', resumo({ professional_id: 'b', adiar_ate: '2026-11-04' })], ['c', resumo({ professional_id: 'c', adiar_ate: '2026-10-01' })]])
    const r = separarAdiados([item('a'), item('b'), item('c')], mapa, '2026-10-28')
    expect(r.ativos.map((i) => i.professional_id)).toEqual(['a', 'c'])
    expect(r.adiados.map((i) => i.professional_id)).toEqual(['b'])
    expect(separarAdiados([item('a')], undefined, '2026-10-28').ativos).toHaveLength(1)
  })
})

describe('rótulos de contato e atividade', () => {
  it('último contato com canal, resultado e há quanto tempo', () => {
    expect(rotuloUltimoContato(resumo(), agora)).toBe('WhatsApp · respondeu · há 3 dias')
    expect(rotuloUltimoContato(resumo({ ultimo_em: '2026-10-28T12:00:00Z', resultado: 'sem_resposta' }), agora)).toBe('WhatsApp · sem resposta · hoje')
    expect(rotuloUltimoContato(undefined, agora)).toBeNull()
  })
  it('última atividade: hoje, ontem, há N dias, sem uso ou sem dado', () => {
    expect(rotuloUltimaAtividade('2026-10-28T12:00:00Z', agora)).toBe('hoje')
    expect(rotuloUltimaAtividade('2026-10-27T12:00:00Z', agora)).toBe('ontem')
    expect(rotuloUltimaAtividade('2026-10-14T12:00:00Z', agora)).toBe('há 14 dias')
    expect(rotuloUltimaAtividade(null, agora)).toBe('sem uso ainda')
    expect(rotuloUltimaAtividade(undefined, agora)).toBe('—')
    expect(diasSemAtividade('2026-10-14T12:00:00Z', agora)).toBe(14)
    expect(diasSemAtividade(null, agora)).toBeNull()
    expect(diasSemAtividade(undefined, agora)).toBeUndefined()
  })
})

describe('normalização', () => {
  it('resumo, histórico e atividade aceitam null e strings numéricas', () => {
    expect(normalizarResumoContatos(null).size).toBe(0)
    const r = normalizarResumoContatos([{ professional_id: 'p', ultimo_em: '2026-10-25T15:00:00Z', canal: 'telefone', resultado: 'resolvido', adiar_ate: '2026-11-01', total: '2' }])
    expect(r.get('p')).toMatchObject({ total: 2, adiar_ate: '2026-11-01' })
    expect(normalizarContatos([{ id: 'x', criado_em: '2026-10-25T15:00:00Z', canal: 'email', resultado: 'sem_resposta' }])[0]).toMatchObject({ motivo: 'manual', observacao: null, admin_nome: null })
    const at = normalizarAtividade([{ professional_id: 'p', ultima_atividade: null }, { professional_id: 'q', ultima_atividade: '2026-10-01T00:00:00Z' }])
    expect(at.get('p')).toBeNull()
    expect(at.get('q')).toBe('2026-10-01T00:00:00Z')
  })
})
