import { describe, expect, it } from 'vitest'
import { calcularRecordes, statusCargaInterna, textoVariacao, variacaoVolume, volumeSessao, volumeUltimoTreino, type ExercicioResumo, type SessaoHistorico } from './resumoSessao'

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
})
