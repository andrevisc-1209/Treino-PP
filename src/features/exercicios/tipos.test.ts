import { describe, expect, it } from 'vitest'
import { modalidadesDeExercicio, parametroPadrao, prefillNovoExercicio, rotuloTipo, tiposDaModalidade } from './tipos'

describe('tipos por modalidade', () => {
  it('toda modalidade ativa tem tipos', () => {
    for (const m of modalidadesDeExercicio()) expect(tiposDaModalidade(m).length, m).toBeGreaterThan(0)
  })
  it('musculação soma os grupos que já existem na biblioteca, sem repetir', () => {
    const t = tiposDaModalidade('musculacao', ['Peito', 'Antebraço', ''])
    expect(t.map((x) => x.id)).toContain('Antebraço')
    expect(t.filter((x) => x.id === 'Peito')).toHaveLength(1)
  })
  it('ciclismo não repete tipos que existem em indoor e outdoor', () => {
    const ids = tiposDaModalidade('ciclismo').map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual(expect.arrayContaining(['subidas', 'hiit', 'resistencia-base']))
  })
  it('rótulos', () => {
    expect(rotuloTipo('corrida', 'intervalado-curto')).toBe('Intervalado Curto')
    expect(rotuloTipo('natacao', 'educativo')).toBe('Educativos')
    expect(rotuloTipo('brick', null)).toBeNull()
  })
  it('parâmetro principal sugerido', () => {
    expect(parametroPadrao('musculacao')).toBeNull()
    expect(parametroPadrao('corrida', 'regenerativo')).toBe('tempo')
    expect(parametroPadrao('corrida', 'long-run')).toBe('distancia')
    expect(parametroPadrao('natacao', 'mar')).toBe('tempo')
  })
})

describe('prefillNovoExercicio', () => {
  it('usa modalidade e tipo do contexto', () => {
    expect(prefillNovoExercicio({ modalidade: 'corrida', tipo: 'long-run' })).toEqual({ modalidade: 'corrida', tipo: 'long-run' })
  })
  it('descarta tipo que não pertence à modalidade', () => {
    expect(prefillNovoExercicio({ modalidade: 'natacao', tipo: 'long-run' })).toEqual({ modalidade: 'natacao', tipo: '' })
  })
  it('sem contexto, musculação sem tipo; modalidade inativa cai em musculação', () => {
    expect(prefillNovoExercicio({})).toEqual({ modalidade: 'musculacao', tipo: '' })
    expect(prefillNovoExercicio({ modalidade: 'yoga' })).toEqual({ modalidade: 'musculacao', tipo: '' })
  })
  it('grupo muscular existente na biblioteca vale como tipo', () => {
    expect(prefillNovoExercicio({ modalidade: 'musculacao', tipo: 'Antebraço' }, ['Antebraço'])).toEqual({ modalidade: 'musculacao', tipo: 'Antebraço' })
  })
})
