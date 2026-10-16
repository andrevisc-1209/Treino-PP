import { describe, expect, it } from 'vitest'
import { detalhesDoResultado, distanciaNatacaoFeita, duracaoEmMinutos, RESULTADO_VAZIO } from './resultado'
import { resumoVolumeTempo } from './metricas'

const bloco = (nome: string, distancia: number, series = 1) => ({ id: nome, exercicio_id: 'x', nome, parametros: { distancia, series, descanso: 0 } })
const detalhes = { ambiente: 'piscina', blocos: [bloco('Aquecimento Crawl', 400), bloco('Nadadeiras', 800), bloco('Boia + Palmar', 600), bloco('Paraquedas', 1000), bloco('Soltura', 1800)] }

describe('duracaoEmMinutos', () => {
  it('soma horas e minutos; vazio, zero ou inválido vira null', () => {
    expect(duracaoEmMinutos('1', '15')).toBe(75)
    expect(duracaoEmMinutos('', '45')).toBe(45)
    expect(duracaoEmMinutos('2', '')).toBe(120)
    expect(duracaoEmMinutos('', '')).toBeNull()
    expect(duracaoEmMinutos('0', '0')).toBeNull()
    expect(duracaoEmMinutos('abc', '-3')).toBeNull()
  })
})

describe('natação: distância dos blocos marcados', () => {
  it('soma só os feitos (distância × séries)', () => {
    expect(distanciaNatacaoFeita(detalhes, [true, true, true, true, true])).toBe(4600)
    expect(distanciaNatacaoFeita(detalhes, [true, false, true, false, false])).toBe(1000)
    expect(distanciaNatacaoFeita({ blocos: [bloco('Tiros', 100, 4)], ambiente: 'piscina' }, [true])).toBe(400)
  })
  it('detalhesDoResultado grava a distância calculada e o tempo; digitada vale mais', () => {
    const e = { ...RESULTADO_VAZIO, feitos: [true, true, true, true, true], duracaoH: '', duracaoMin: '45' }
    expect(detalhesDoResultado('natacao', detalhes, e).resultado).toEqual({ distancia_total_m: 4600, duracao_minutos: 45 })
    const digitada = { ...e, valores: { distancia_total_m: '3000' } }
    expect(detalhesDoResultado('natacao', detalhes, digitada).resultado).toEqual({ distancia_total_m: 3000, duracao_minutos: 45 })
  })
  it('modalidades com campo de tempo próprio também recebem o valor (leitores antigos)', () => {
    const e = { ...RESULTADO_VAZIO, duracaoH: '1', duracaoMin: '10' }
    expect(detalhesDoResultado('futebol', {}, e).resultado).toEqual({ duracao_minutos: 70, duracao_min: 70 })
    expect(detalhesDoResultado('corrida', {}, e).resultado).toEqual({ duracao_minutos: 70, tempo_min: 70 })
  })
})

describe('resumoVolumeTempo', () => {
  it('formata distância com ponto de milhar e tempo só se preenchido', () => {
    expect(resumoVolumeTempo('natacao', { resultado: { distancia_total_m: 4600, duracao_minutos: 45 } })).toBe('📏 4.600 m  |  ⏱ 45 min')
    expect(resumoVolumeTempo('natacao', { resultado: { distancia_total_m: 4600 } })).toBe('📏 4.600 m')
    expect(resumoVolumeTempo('natacao', { resultado: { duracao_minutos: 75 } })).toBe('⏱ 1 h 15 min')
    expect(resumoVolumeTempo('corrida', { resultado: { distancia_km: 5.2, tempo_min: 28 } })).toBe('📏 5,2 km  |  ⏱ 28 min')
    expect(resumoVolumeTempo('musculacao', { resultado: { volume_kg_rep: 12400 } })).toBe('🏋️ 12.400 kg·rep')
    expect(resumoVolumeTempo('natacao', { resultado: {} })).toBeNull()
    expect(resumoVolumeTempo('natacao', null)).toBeNull()
  })
})
