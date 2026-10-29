import { describe, expect, it } from 'vitest'
import { calcularVagas as doServidor } from '../../../supabase/functions/_shared/agendaPublica'
import { calcularVagas as doApp } from './vagas'

// O servidor (página pública) e o app (agenda do personal) precisam dar as MESMAS vagas: se alguém muda um e esquece o outro, este teste pega.
describe('paridade entre o cálculo de vagas do app e o do servidor', () => {
  const janelas = [
    { weekday: 1, start_time: '07:00:00', end_time: '12:00:00' },
    { weekday: 1, start_time: '14:00:00', end_time: '18:30:00' },
    { weekday: 3, start_time: '06:30:00', end_time: '09:00:00' },
    { weekday: 5, start_time: '07:00:00', end_time: '10:00:00' },
    { weekday: 6, start_time: '08:00:00', end_time: '11:00:00' },
  ]
  const aulas = [
    { starts_at: '2026-11-02T08:30:00-03:00', duration_min: 60, status: 'agendada' },
    { starts_at: '2026-11-02T15:00:00-03:00', duration_min: 45, status: 'realizada' },
    { starts_at: '2026-11-04T07:00:00-03:00', duration_min: 60, status: 'cancelada' },
    { starts_at: '2026-11-06T09:15:00-03:00', duration_min: 60, status: 'agendada' },
  ]
  const bloqueios = [{ data_inicio: '2026-11-07', data_fim: '2026-11-07' }]
  for (const [duracaoMin, intervaloMin, antecedenciaHoras] of [[60, 0, 0], [60, 15, 3], [45, 10, 12], [30, 0, 3]] as const) {
    it(`duração ${duracaoMin}, intervalo ${intervaloMin}, antecedência ${antecedenciaHoras} h`, () => {
      const entrada = { janelas, aulas, bloqueios, parametros: { duracaoMin, intervaloMin, antecedenciaHoras, horizonteSemanas: 4 }, agora: new Date('2026-11-01T15:00:00Z'), de: '2026-11-01', ate: '2026-11-30', antecedenciaHoras }
      const a = doApp(entrada)
      expect(a.length).toBeGreaterThan(10)
      expect(doServidor(entrada)).toEqual(a)
    })
  }
})
