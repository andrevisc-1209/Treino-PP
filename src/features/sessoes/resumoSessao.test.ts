import { describe, expect, it } from 'vitest'
import { calcularRecordes, calcularSequencia, cumprimentoPlano, evolucaoPorExercicio, exercicioDestaque, exerciciosFeitos, textoEvolucao, totalRepeticoes, statusCargaInterna, textoVariacao, variacaoVolume, volumeSessao, volumeUltimoTreino, type ExercicioResumo, type SessaoHistorico } from './resumoSessao'

const ex = (id: string, series: [number, number, boolean?][]): ExercicioResumo => ({
  exercicio_id: id,
  nome: `Ex ${id}`,
  series: series.map(([reps, load_kg, completed = true]) => ({ reps, load_kg, completed })),
})
const sess = (id: string, data: string, exs: ExercicioResumo[]): SessaoHistorico => ({ id, session_date: data, exercicios: exs })

describe('resumoSessao', () => {
  it('volume ignora séries não concluídas', () => {
    expect(volumeSessao([ex('a', [[10, 50], [10, 50, false]])])).toBe(500)
  })
  it('variação e texto', () => {
    expect(variacaoVolume(1050, 1000)).toBe(5)
    expect(variacaoVolume(900, 1000)).toBe(-10)
    expect(variacaoVolume(100, null)).toBeNull()
    expect(textoVariacao(5)).toBe('+5% vs. último treino')
    expect(textoVariacao(-10)).toBe('−10% vs. último treino')
    expect(textoVariacao(0)).toBe('Mesmo volume')
    expect(textoVariacao(null)).toBe('Mesmo volume')
    expect(textoVariacao(null, true)).toBe('Primeiro treino')
  })
  it('status da carga interna nos limites', () => {
    expect(statusCargaInterna(199).label).toBe('Leve')
    expect(statusCargaInterna(200).label).toBe('Moderado')
    expect(statusCargaInterna(400).label).toBe('Forte')
    expect(statusCargaInterna(600).label).toBe('Muito forte')
  })
  it('último treino pega o mais recente com volume', () => {
    const h = [sess('1', '2026-01-01', [ex('a', [[10, 10]])]), sess('2', '2026-01-05', [ex('a', [[10, 20]])]), sess('3', '2026-01-08', [ex('a', [[10, 0]])])]
    expect(volumeUltimoTreino(h)).toBe(200)
    expect(volumeUltimoTreino([])).toBeNull()
  })
  it('recordes de volume e carga só com histórico', () => {
    const h = [sess('1', '2026-01-01', [ex('a', [[10, 50]])])]
    const r = calcularRecordes([ex('a', [[10, 60]]), ex('b', [[10, 100]])], h)
    expect(r).toEqual([
      { tipo: 'volume', exercicio: 'Ex a', valor: 600 },
      { tipo: 'carga', exercicio: 'Ex a', valor: 60 },
    ])
    expect(calcularRecordes([ex('a', [[10, 40]])], h)).toEqual([])
  })

  it('exercícios, repetições e cumprimento do plano', () => {
    const exs = [
      { ...ex('a', [[10, 50], [8, 50, false]]), planejado: true },
      { ...ex('b', [[12, 0, false]]), planejado: true },
      ex('c', [[15, 0]]),
    ]
    expect(exerciciosFeitos(exs)).toBe(2)
    expect(totalRepeticoes(exs)).toBe(25)
    expect(cumprimentoPlano(exs)).toEqual({ feitas: 1, total: 3, pct: 33 })
    expect(cumprimentoPlano([ex('c', [[15, 0]])])).toBeNull()
  })
  it('destaque ignora exercício sem carga', () => {
    expect(exercicioDestaque([ex('a', [[10, 0]]), ex('b', [[10, 20]])])).toEqual({ nome: 'Ex b', volume: 200, grupo: null })
    expect(exercicioDestaque([ex('a', [[10, 0]])])).toBeNull()
  })
  it('evolução: kg, reps com mesma carga e só melhoras', () => {
    const h = [
      sess('1', '2026-01-01', [ex('a', [[10, 70]]), ex('b', [[10, 40]]), ex('c', [[10, 30]])]),
      sess('2', '2026-01-08', [ex('a', [[10, 75]]), ex('b', [[8, 40]]), ex('c', [[10, 30]])]),
    ]
    const r = evolucaoPorExercicio([ex('a', [[10, 80]]), ex('b', [[10, 40]]), ex('c', [[10, 30]]), ex('d', [[10, 10]])], h)
    expect(r.map((e) => [e.exercicio, textoEvolucao(e)])).toEqual([['Ex a', '+5 kg'], ['Ex b', '+2 reps na série principal'], ['Ex c', 'igual à última vez']])
  })
  it('evolução sem carga compara total de reps', () => {
    const h = [sess('1', '2026-01-01', [ex('p', [[10, 0], [10, 0]])])]
    expect(evolucaoPorExercicio([ex('p', [[12, 0], [12, 0]])], h)[0]).toMatchObject({ tipo: 'reps', delta: 4 })
  })
  it('sequência: nº do treino, na semana e semanas seguidas', () => {
    const seg = (d: string) => ({ '2026-09-28': '2026-09-28', '2026-09-30': '2026-09-28', '2026-10-05': '2026-10-05', '2026-10-06': '2026-10-05', '2026-09-14': '2026-09-14' })[d]!
    const ant = (w: string) => ({ '2026-10-05': '2026-09-28', '2026-09-28': '2026-09-21', '2026-09-21': '2026-09-14' })[w]!
    expect(calcularSequencia(['2026-09-14', '2026-09-28', '2026-09-30', '2026-10-05'], '2026-10-06', seg, ant)).toEqual({ numeroTreino: 5, naSemana: 2, semanasSeguidas: 2 })
  })
})
