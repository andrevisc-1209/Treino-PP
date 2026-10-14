import { describe, expect, it } from 'vitest'
import { numeroSemanaISO, temVolume, totalKm, volumeDaExecucao, volumeSemanal } from './volume'

const ex = (modalidade: never, data: string, resultado: Record<string, number | string>, status = 'concluido') => ({ modalidade, concluido_em: data, status, detalhes_execucao: { resultado } })

describe('volume por execução (resultado registrado)', () => {
  it('natação converte metros em km; corrida e ciclismo usam km', () => {
    expect(volumeDaExecucao('natacao', { resultado: { distancia_total_m: 3200 } }).natacaoKm).toBe(3.2)
    expect(volumeDaExecucao('corrida', { resultado: { distancia_km: 10.5 } }).corridaKm).toBe(10.5)
    expect(volumeDaExecucao('ciclismo', { resultado: { distancia_km: 45, tempo_min: 90 } })).toMatchObject({ ciclismoKm: 45, ciclismoMin: 0 })
  })
  it('ciclismo indoor sem distância conta minutos, separado', () => {
    const v = volumeDaExecucao('ciclismo', { resultado: { tempo_min: 60 } })
    expect(v).toMatchObject({ ciclismoKm: 0, ciclismoMin: 60 })
    expect(totalKm(v)).toBe(0)
    expect(temVolume(v)).toBe(true)
  })
  it('brick separa bike e corrida', () => {
    expect(volumeDaExecucao('brick', { resultado: { bike_distancia_km: 40, run_distancia_km: 10 } })).toMatchObject({ ciclismoKm: 40, corridaKm: 10 })
  })
  it('ignora musculação, valores inválidos e execução sem resultado', () => {
    expect(temVolume(volumeDaExecucao('musculacao', { exercicios: [] }))).toBe(false)
    expect(temVolume(volumeDaExecucao('corrida', { resultado: { distancia_km: -3 } }))).toBe(false)
    expect(temVolume(volumeDaExecucao('natacao', undefined))).toBe(false)
  })
})

describe('volume semanal', () => {
  it('numera a semana ISO', () => {
    expect(numeroSemanaISO('2026-10-05')).toBe(41)
    expect(numeroSemanaISO('2026-01-05')).toBe(2)
  })
  it('8 semanas terminando na atual; soma por semana; ignora fora da janela e não concluídas', () => {
    // 2026-10-07 é quarta; a semana atual começa em 05/10
    const lista = volumeSemanal(
      [
        ex('corrida' as never, '2026-10-06T12:00:00Z', { distancia_km: 10 }),
        ex('corrida' as never, '2026-10-04T12:00:00Z', { distancia_km: 8 }), // domingo: semana anterior
        ex('natacao' as never, '2026-10-06T12:00:00Z', { distancia_total_m: 1500 }),
        ex('ciclismo' as never, '2026-10-07T12:00:00Z', { tempo_min: 50 }),
        ex('corrida' as never, '2026-01-01T12:00:00Z', { distancia_km: 99 }), // fora da janela
        ex('corrida' as never, '2026-10-06T12:00:00Z', { distancia_km: 77 }, 'cancelado'),
      ],
      '2026-10-07',
    )
    expect(lista).toHaveLength(8)
    expect(lista[7].inicio).toBe('2026-10-05')
    expect(lista[7].rotulo).toBe('Sem 41')
    expect(lista[7].volume).toMatchObject({ corridaKm: 10, natacaoKm: 1.5, ciclismoKm: 0, ciclismoMin: 50 })
    expect(lista[6].volume.corridaKm).toBe(8)
    expect(lista.slice(0, 6).every((s) => !temVolume(s.volume))).toBe(true)
  })
})
