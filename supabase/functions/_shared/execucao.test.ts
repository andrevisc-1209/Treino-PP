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

describe('feedback de corrida, ciclismo e brick', () => {
  it('aceita conclusão, RPE 1–10 e tempo em minutos; descarta valores fora do padrão', () => {
    const r = validarExecucao('corrida', { detalhes: { resultado: { conclusao: 'parcial', distancia_km: 5.2, tempo_min: '28', rpe: 7, hack: 1 } } }, [])
    expect(r.ok && r.detalhes).toEqual({ resultado: { conclusao: 'parcial', distancia_km: 5.2, tempo_min: 28, rpe: 7 }, exercicios_livres: [] })
    const ruim = validarExecucao('corrida', { detalhes: { resultado: { conclusao: 'talvez', rpe: 11 } } }, [])
    expect(ruim.ok && ruim.detalhes).toEqual({ resultado: {}, exercicios_livres: [] })
    expect(validarExecucao('ciclismo', { detalhes: { resultado: { rpe: 0 } } }, []).ok).toBe(true)
  })
  it('brick tem campos separados de bike e corrida', () => {
    const r = validarExecucao('brick', { detalhes: { resultado: { bike_distancia_km: 40, run_distancia_km: 10, run_pace_medio: '5:00', rpe: 9 } } }, [])
    expect(r.ok && r.detalhes).toEqual({ resultado: { bike_distancia_km: 40, run_distancia_km: 10, run_pace_medio: '5:00', rpe: 9 }, exercicios_livres: [] })
  })
})

describe('volume e tempo calculados', () => {
  const bloco = (nome: string, distancia: number, series = 1) => ({ id: nome, exercicio_id: 'x', nome, parametros: { distancia, series, descanso: 0 } })
  const treinoNatacao = {
    ambiente: 'piscina',
    blocos: [bloco('Aquecimento Crawl', 400), bloco('Nadadeiras', 800), bloco('Boia + Palmar', 600), bloco('Paraquedas', 1000), bloco('Soltura', 1800)],
  }
  const todos = treinoNatacao.blocos.map((b) => ({ nome: b.nome, feito: true }))

  it('natação: soma os metros dos blocos marcados (todos = 4.600 m)', () => {
    const r = validarExecucao('natacao', { detalhes: { exercicios_livres: todos } }, [], treinoNatacao)
    expect(r.ok && r.detalhes.resultado).toEqual({ distancia_total_m: 4600 })
  })
  it('natação: bloco desmarcado não entra; distância × séries; nome diferente é ignorado', () => {
    const livres = todos.map((l, i) => ({ ...l, feito: i !== 4 }))
    const r = validarExecucao('natacao', { detalhes: { exercicios_livres: livres } }, [], treinoNatacao)
    expect(r.ok && r.detalhes.resultado).toEqual({ distancia_total_m: 2800 })
    const comSeries = { ambiente: 'piscina', blocos: [bloco('Tiros', 100, 4)] }
    const r2 = validarExecucao('natacao', { detalhes: { exercicios_livres: [{ nome: 'Tiros', feito: true }] } }, [], comSeries)
    expect(r2.ok && r2.detalhes.resultado).toEqual({ distancia_total_m: 400 })
    const r3 = validarExecucao('natacao', { detalhes: { exercicios_livres: [{ nome: 'Outro nome', feito: true }] } }, [], comSeries)
    expect(r3.ok && r3.detalhes.resultado).toEqual({})
  })
  it('natação: distância digitada pelo aluno tem prioridade sobre o cálculo', () => {
    const r = validarExecucao('natacao', { detalhes: { resultado: { distancia_total_m: 3000 }, exercicios_livres: todos } }, [], treinoNatacao)
    expect(r.ok && r.detalhes.resultado).toEqual({ distancia_total_m: 3000 })
  })
  it('tempo de execução opcional: aceita inteiro de minutos, descarta o resto', () => {
    const ok = validarExecucao('corrida', { detalhes: { resultado: { duracao_minutos: 45 } } }, [])
    expect(ok.ok && ok.detalhes.resultado).toEqual({ duracao_minutos: 45 })
    for (const ruim of [0, -5, 1.5, 2000, '45']) {
      const r = validarExecucao('corrida', { detalhes: { resultado: { duracao_minutos: ruim } } }, [])
      expect(r.ok && r.detalhes.resultado).toEqual({})
    }
  })
  it('musculação: volume = séries feitas × reps × carga (só com carga e reps numéricas) e tempo', () => {
    const planoMusc = [
      { exercicio_id: 'e1', nome: 'Supino', series: 3, reps: '10', carga_kg: 40 },
      { exercicio_id: 'e2', nome: 'Remada', series: 4, reps: '8-12', carga_kg: 20 },
      { exercicio_id: 'e3', nome: 'Prancha', series: 3, reps: 'até a falha', carga_kg: null },
    ]
    const r = validarExecucao(
      'musculacao',
      { detalhes: { exercicios: [{ exercicio_id: 'e1', series_feitas: 3 }, { exercicio_id: 'e2', series_feitas: 2 }, { exercicio_id: 'e3', series_feitas: 3 }], resultado: { duracao_minutos: 50 } } },
      planoMusc,
    )
    // 3×10×40 + 2×8×20 = 1200 + 320
    expect(r.ok && r.detalhes.resultado).toEqual({ duracao_minutos: 50, volume_kg_rep: 1520 })
  })
})

