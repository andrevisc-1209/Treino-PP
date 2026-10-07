import { describe, expect, it } from 'vitest'
import { linkValido, validarExecucao } from './execucao.ts'

const plano = [
  { exercicio_id: 'e1', nome: 'Supino', series: 3 },
  { exercicio_id: 'e2', nome: 'Remada', series: 4 },
]

describe('validarExecucao', () => {
  it('musculação: só exercícios do treino, séries limitadas ao planejado', () => {
    const r = validarExecucao('musculacao', { detalhes: { exercicios: [
      { exercicio_id: 'e1', series_feitas: 3, obs: ' pesado ' },
      { exercicio_id: 'e1', series_feitas: 1 },
      { exercicio_id: 'fake', series_feitas: 9 },
    ] }, notas: ' ok ' }, plano)
    expect(r).toEqual({ ok: true, notas: 'ok', detalhes: { exercicios: [{ exercicio_id: 'e1', nome: 'Supino', series_planejadas: 3, series_feitas: 3, obs: 'pesado' }] } })
  })
  it('musculação: séries acima do planejado ou não inteiras são recusadas', () => {
    expect(validarExecucao('musculacao', { detalhes: { exercicios: [{ exercicio_id: 'e1', series_feitas: 4 }] } }, plano).ok).toBe(false)
    expect(validarExecucao('musculacao', { detalhes: { exercicios: [{ exercicio_id: 'e1', series_feitas: 1.5 }] } }, plano).ok).toBe(false)
  })
  it('outras modalidades: só campos conhecidos, números como número, textos limitados', () => {
    const r = validarExecucao('corrida', { detalhes: { resultado: { distancia_km: '5,2', tempo_total: '28:30', hack: 'x', pace_medio: 7 }, exercicios_livres: [{ nome: 'Alongar', feito: true }, { nome: '', feito: true }, 'lixo'] } }, [])
    expect(r).toEqual({ ok: true, notas: null, detalhes: { resultado: { distancia_km: 5.2, tempo_total: '28:30' }, exercicios_livres: [{ nome: 'Alongar', feito: true }] } })
  })
  it('descarta valores absurdos e limita o tamanho das notas', () => {
    const r = validarExecucao('natacao', { detalhes: { resultado: { tiros_feitos: -1, distancia_total_m: 1e9 } }, notas: 'a'.repeat(5000) }, [])
    expect(r.ok && r.detalhes).toEqual({ resultado: {}, exercicios_livres: [] })
    expect(r.ok && r.notas?.length).toBe(1000)
  })
})

describe('linkValido', () => {
  const agora = new Date('2026-10-10T12:00:00Z')
  it('estados', () => {
    expect(linkValido(null, agora)).toBe('invalido')
    expect(linkValido({ expira_em: '2026-10-12T00:00:00Z', usado_em: null }, agora)).toBe('valido')
    expect(linkValido({ expira_em: '2026-10-12T00:00:00Z', usado_em: '2026-10-10T10:00:00Z' }, agora)).toBe('usado')
    expect(linkValido({ expira_em: '2026-10-09T00:00:00Z', usado_em: null }, agora)).toBe('expirado')
  })
})
