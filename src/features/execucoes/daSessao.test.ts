import { describe, expect, it } from 'vitest'
import { descreverExecucao } from '@/types/modalidades'
import { metricaPrincipal, textoMetrica } from './metricas'
import { detalhesDaSessao } from './daSessao'

const itens = [
  { exercicio_id: 'e1', notes: ' pesado ', exercicio: { name: 'Supino' }, sessao_series: [
    { reps: 10, load_kg: 40, completed: true }, { reps: 10, load_kg: 50, completed: true }, { reps: 8, load_kg: 60, completed: false } ] },
  { exercicio_id: 'e2', notes: null, exercicio: { name: 'Flexão' }, sessao_series: [{ reps: 15, load_kg: null, completed: true }] },
]

describe('sessão presencial → histórico unificado', () => {
  const d = detalhesDaSessao(itens, 8, 55)
  it('usa o mesmo formato da execução por link (séries feitas/planejadas) + carga, PSE e duração', () => {
    expect(d).toEqual({
      exercicios: [
        { exercicio_id: 'e1', nome: 'Supino', series_planejadas: 3, series_feitas: 2, carga_kg: 50, obs: 'pesado' },
        { exercicio_id: 'e2', nome: 'Flexão', series_planejadas: 1, series_feitas: 1 },
      ],
      pse: 8,
      duracao_min: 55,
    })
  })
  it('as métricas da Fase 3 leem esse formato', () => {
    expect(metricaPrincipal('musculacao', d).valor).toBe(3)
    expect(textoMetrica('musculacao', d)).toBe('3/4 séries')
  })
  it('descrição mostra carga, PSE e duração', () => {
    expect(descreverExecucao('musculacao', d)).toEqual(['Supino: 2/3 séries · até 50 kg — pesado', 'Flexão: 1/1 séries', 'PSE: 8/10', 'Duração: 55 min'])
  })
  it('sem PSE/duração, omite', () => {
    expect(detalhesDaSessao([], null, null)).toEqual({ exercicios: [] })
  })
})
