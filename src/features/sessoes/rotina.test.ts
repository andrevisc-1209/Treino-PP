import { describe, expect, it } from 'vitest'
import { planoSugerido, rotuloUltimoUso } from './rotina'
import type { Plano } from '@/features/planos/api'
import type { Sessao } from './api'

function plano(id: string, name: string): Plano {
  return { id, aluno_id: 'a1', professional_id: 'p1', name, notes: null, active: true, modelo_origem_id: null, plano_exercicios: [] }
}

function sessao(planoId: string, sessionDate: string, status: Sessao['status'] = 'concluida'): Sessao {
  return {
    id: `${planoId}-${sessionDate}`,
    aluno_id: 'a1',
    professional_id: 'p1',
    plano_id: planoId,
    plano_nome: null,
    aula_id: null,
    status,
    session_date: sessionDate,
    duration_minutes: null,
    pre_sleep: null,
    pre_stress: null,
    pre_fatigue: null,
    pre_muscle_pain: null,
    post_pse: null,
    prof_rating: null,
    prof_notes: null,
    created_at: `${sessionDate}T00:00:00Z`,
  }
}

describe('planoSugerido', () => {
  it('não sugere nada com 0 ou 1 treino (não há rodízio)', () => {
    expect(planoSugerido([], [])).toBeNull()
    expect(planoSugerido([plano('A', 'Treino A')], [])).toBeNull()
  })

  it('sugere o treino nunca usado antes dos já usados', () => {
    const planos = [plano('A', 'Treino A'), plano('B', 'Treino B')]
    const sessoes = [sessao('A', '2026-09-20')]
    expect(planoSugerido(planos, sessoes)?.plano.id).toBe('B')
  })

  it('sugere o treino usado há mais tempo (rodízio A→B→C)', () => {
    const planos = [plano('A', 'Treino A'), plano('B', 'Treino B'), plano('C', 'Treino C')]
    const sessoes = [sessao('A', '2026-09-24'), sessao('B', '2026-09-25'), sessao('C', '2026-09-20')]
    expect(planoSugerido(planos, sessoes)?.plano.id).toBe('C')
  })

  it('ignora sessões canceladas/em andamento pro cálculo de último uso', () => {
    const planos = [plano('A', 'Treino A'), plano('B', 'Treino B')]
    const sessoes = [sessao('A', '2026-09-25', 'cancelada'), sessao('B', '2026-09-20')]
    expect(planoSugerido(planos, sessoes)?.plano.id).toBe('A')
  })
})

describe('rotuloUltimoUso', () => {
  it('formata nunca usado, hoje, ontem e N dias', () => {
    expect(rotuloUltimoUso(null)).toBe('Nunca usado')
    expect(rotuloUltimoUso('2026-09-25', '2026-09-25')).toBe('Último: hoje')
    expect(rotuloUltimoUso('2026-09-24', '2026-09-25')).toBe('Último: ontem')
    expect(rotuloUltimoUso('2026-09-21', '2026-09-25')).toBe('Último: há 4 dias')
  })
})
