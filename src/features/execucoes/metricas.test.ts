import { describe, expect, it } from 'vitest'
import { diasDesde, metricaPrincipal, pontosGrafico, rotuloDias, semanasSeguidasAtuais, tempoRelativo, textoMetrica } from './metricas'

describe('métrica principal (formato real da Fase 2)', () => {
  it('lê o resultado das modalidades sem lista de exercícios', () => {
    const d = { resultado: { distancia_km: 5.2, tempo_total: '28:30', pace_medio: '5:29' } }
    expect(metricaPrincipal('corrida', d)).toEqual({ valor: 5.2, unidade: 'km', rotulo: 'km percorridos' })
    expect(textoMetrica('corrida', d)).toBe('5,2 km em 28:30 · pace 5:29/km')
    expect(metricaPrincipal('remo', { resultado: { distancia_m: 2500 } }).valor).toBe(2.5)
    expect(textoMetrica('natacao', { resultado: { tiros_feitos: 8, distancia_total_m: 800 } })).toBe('8 tiros · 800 m')
    expect(metricaPrincipal('yoga', { resultado: { duracao_min: 45 } })).toMatchObject({ valor: 45, unidade: 'min' })
  })
  it('musculação: séries feitas', () => {
    const d = { exercicios: [{ exercicio_id: 'a', nome: 'A', series_planejadas: 3, series_feitas: 3 }, { exercicio_id: 'b', nome: 'B', series_planejadas: 4, series_feitas: 2 }] }
    expect(metricaPrincipal('musculacao', d).valor).toBe(5)
    expect(textoMetrica('musculacao', d)).toBe('5/7 séries')
  })
  it('sem resultado: valor nulo e texto neutro', () => {
    expect(metricaPrincipal('corrida', { resultado: {} }).valor).toBeNull()
    expect(textoMetrica('corrida', {})).toBe('Sem resultado preenchido')
  })
  it('pontos do gráfico: só a modalidade, só com valor, em ordem e limitados', () => {
    const ex = (data: string, km: number | null, modalidade: 'corrida' | 'natacao' = 'corrida') => ({
      concluido_em: data, modalidade, detalhes_execucao: { resultado: km === null ? ({} as Record<string, number>) : { distancia_km: km } },
    })
    const pts = pontosGrafico([ex('2026-10-03T10:00:00Z', 6), ex('2026-10-01T10:00:00Z', 5), ex('2026-10-02T10:00:00Z', null), ex('2026-10-04T10:00:00Z', 9, 'natacao')], 'corrida')
    expect(pts.map((p) => p.valor)).toEqual([5, 6])
    expect(pontosGrafico([ex('2026-10-01T10:00:00Z', 1), ex('2026-10-02T10:00:00Z', 2), ex('2026-10-03T10:00:00Z', 3)], 'corrida', 2).map((p) => p.valor)).toEqual([2, 3])
  })
})

describe('sequência e tempo relativo', () => {
  // 2026-10-07 é quarta-feira; semanas começam na segunda (05/10)
  it('semanas seguidas, com a semana atual ainda por acontecer', () => {
    expect(semanasSeguidasAtuais(['2026-10-06T12:00:00Z', '2026-09-30T12:00:00Z', '2026-09-23T12:00:00Z'], '2026-10-07')).toBe(3)
    expect(semanasSeguidasAtuais(['2026-09-30T12:00:00Z', '2026-09-23T12:00:00Z'], '2026-10-07')).toBe(2) // esta semana ainda sem execução
    expect(semanasSeguidasAtuais(['2026-09-16T12:00:00Z'], '2026-10-07')).toBe(0) // buraco: sequência quebrou
    expect(semanasSeguidasAtuais([], '2026-10-07')).toBe(0)
  })
  const agora = new Date('2026-10-07T18:00:00Z') // 15:00 em SP
  it('rótulos', () => {
    expect(tempoRelativo('2026-10-07T17:15:00Z', agora)).toBe('há 45 min')
    expect(tempoRelativo('2026-10-07T13:00:00Z', agora)).toBe('há 5 h')
    expect(tempoRelativo('2026-10-06T17:00:00Z', agora)).toBe('ontem às 14h')
    expect(tempoRelativo('2026-10-03T17:00:00Z', agora)).toBe('há 4 dias')
    expect(tempoRelativo('2026-09-23T17:00:00Z', agora)).toBe('há 2 semanas')
    expect(diasDesde('2026-10-05T12:00:00Z', agora)).toBe(2)
    expect(rotuloDias('2026-10-07T12:00:00Z', agora)).toBe('hoje')
    expect(rotuloDias('2026-10-05T12:00:00Z', agora)).toBe('há 2 dias')
    expect(rotuloDias('2026-09-30T12:00:00Z', agora)).toBe('há 1 semana')
    expect(rotuloDias('2026-07-01T12:00:00Z', agora)).toBe('há 3 meses')
  })
})
