import { describe, expect, it } from 'vitest'
import { TIPOS_CICLISMO_INDOOR, TIPOS_CICLISMO_OUTDOOR } from '@/data/ciclismo-tipos'
import { TIPOS_CORRIDA } from '@/data/corrida-tipos'
import { gerarMensagemTreino } from '@/lib/mensagemTreino'
import { metricaPrincipal, textoMetrica } from '@/features/execucoes/metricas'
import { descricoesBrick, dadosBrickDe, montarDetalhesBrick, resumoBrick, resumoBrickCurto, validarBrick, type DadosBrick } from './brick'
import { dadosCiclismoDe, descricaoBlocoCiclismo, totalCiclismo, validarCiclismo, type BlocoCiclismo } from './ciclismo'
import { dadosCorridaDe, descricaoBlocoCorrida, montarDetalhesCorrida, totalCorrida, validarCorrida, TIPOS_CORRIDA_IDS, type BlocoCorrida } from './corrida'
import { estruturadosDe, estruturadosVazios } from './estruturado'
import { blocosDe, cabecalhoEstruturado, itensChecklist, montarDetalhes, resumoModalidade, validarBlocos } from './modalidades'

const b = (p: Partial<BlocoCorrida> & { tipo: BlocoCorrida['tipo'] }): BlocoCorrida => ({ id: p.tipo, nome: p.tipo, ...p })
const c = (p: Partial<BlocoCiclismo> & { tipo: BlocoCiclismo['tipo'] }): BlocoCiclismo => ({ id: p.tipo, nome: p.tipo, ...p })

describe('configuração', () => {
  it('11 tipos de corrida e todos os ids do tipo estão configurados', () => {
    expect(TIPOS_CORRIDA).toHaveLength(11)
    expect(TIPOS_CORRIDA.map((t) => t.id).sort()).toEqual([...TIPOS_CORRIDA_IDS].sort())
  })
  it('ciclismo: tipos por ambiente', () => {
    expect(TIPOS_CICLISMO_INDOOR.map((t) => t.id)).toEqual(['recuperacao', 'resistencia-base', 'tempo', 'hiit', 'piramide'])
    expect(TIPOS_CICLISMO_OUTDOOR.map((t) => t.id)).toEqual(['recuperacao', 'resistencia-base', 'subidas', 'sprints', 'fartlek', 'longo'])
  })
})

describe('corrida', () => {
  const dados = { blocos: [b({ tipo: 'aerobico-base', nome: 'Aeróbico Base', distancia: 8, pace_alvo: '5:30', zona_fc: 2 }), b({ tipo: 'intervalado-curto', nome: 'Tiros', series: 6, distancia_serie: 400, descanso: 90 })] }
  it('total em km (séries entram), descrição e resumo do card', () => {
    expect(totalCorrida(dados.blocos)).toBe('10,4 km')
    expect(totalCorrida([b({ tipo: 'regenerativo', tempo: 30 })])).toBe('30 min')
    expect(descricaoBlocoCorrida(dados.blocos[0])).toBe('8 km · pace 5:30/km · Z2')
    expect(descricaoBlocoCorrida(dados.blocos[1])).toBe('6 × 400 m · descanso 1min30s')
    expect(resumoModalidade('corrida', montarDetalhesCorrida(dados) as never)).toBe('2 blocos · 10,4 km')
  })
  it('validação por tipo', () => {
    expect(validarCorrida({ blocos: [] })).toMatch(/ao menos um/)
    expect(validarCorrida({ blocos: [b({ tipo: 'long-run' })] })).toMatch(/distância ou o tempo/)
    expect(validarCorrida({ blocos: [b({ tipo: 'hill-repeats', series: 4 })] })).toMatch(/séries e distância/)
    expect(validarCorrida({ blocos: [b({ tipo: 'strides' })] })).toMatch(/acelerações/)
    expect(validarCorrida(dados)).toBeNull()
  })
  it('treino no formato antigo não é estruturado', () => {
    expect(dadosCorridaDe({ blocos: [{ id: '1', nome: 'Aquecimento', descricao: '10 min' }] })).toBeNull()
    expect(blocosDe('corrida', { blocos: [{ id: '1', nome: 'Aquecimento', descricao: '10 min' }] })[0].nome).toBe('Aquecimento')
    expect(dadosCorridaDe(montarDetalhesCorrida(dados))?.blocos).toHaveLength(2)
  })
})

describe('ciclismo', () => {
  it('indoor por tempo e outdoor por km', () => {
    const indoor = { ambiente: 'indoor' as const, blocos: [c({ tipo: 'tempo', tempo: 40, watts_alvo: 220 }), c({ tipo: 'hiit', series: 6, tempo_serie: 60, descanso: 60 })] }
    expect(totalCiclismo(indoor)).toBe('51 min') // 40 + (6×60 + 5×60)/60 = 51
    expect(descricaoBlocoCiclismo(indoor.blocos[0])).toBe('40 min · 220 W')
    expect(validarCiclismo(indoor)).toBeNull()
    const outdoor = { ambiente: 'outdoor' as const, blocos: [c({ tipo: 'longo', distancia: 60, velocidade_alvo: 28 })] }
    expect(totalCiclismo(outdoor)).toBe('60 km')
    expect(cabecalhoEstruturado('ciclismo', { ambiente: 'outdoor', blocos: outdoor.blocos } as never)).toBe('Outdoor · Total: 60 km')
    expect(validarCiclismo({ ambiente: 'indoor', blocos: [c({ tipo: 'hiit' })] })).toMatch(/séries e tempo/)
    expect(validarCiclismo({ ambiente: 'indoor', blocos: [] })).toMatch(/ao menos um/)
    expect(dadosCiclismoDe({ ambiente: 'indoor', blocos: [{ id: 'x', nome: 'texto livre', descricao: 'y' }] })).toBeNull()
  })
})

describe('brick', () => {
  const brick: DadosBrick = { blocos_bike: [c({ tipo: 'longo', nome: 'Pedal', distancia: 40 })], transicao_segundos: 120, blocos_corrida: [b({ tipo: 'race-pace', nome: 'Run', distancia: 10, pace_alvo: '5:00' })] }
  it('resumos', () => {
    expect(resumoBrick(brick)).toBe('🚴 40 km → ⏱ 2min → 🏃 10 km')
    expect(resumoBrickCurto(brick)).toBe('40 km bike + 10 km corrida')
    expect(resumoModalidade('brick', montarDetalhesBrick(brick) as never)).toBe('40 km bike + 10 km corrida')
    expect(descricoesBrick(brick).corrida[0]).toBe('Run — 10 km · pace 5:00/km')
  })
  it('valida bike e corrida, relê e vira checklist com os dois blocos', () => {
    expect(validarBrick({ ...brick, blocos_bike: [] })).toMatch(/^Bike:/)
    expect(validarBrick({ ...brick, blocos_corrida: [] })).toMatch(/^Corrida:/)
    expect(validarBrick(brick)).toBeNull()
    const salvo = montarDetalhesBrick(brick)
    expect(dadosBrickDe(salvo)?.blocos_corrida).toHaveLength(1)
    expect(itensChecklist('brick', salvo as never).map((i) => i.nome)).toEqual(['🚴 Pedal', '🏃 Run'])
  })
})

describe('estruturado + mensagem + métricas', () => {
  it('montarDetalhes/validar por modalidade usam o formulário certo', () => {
    const e = estruturadosVazios()
    expect(validarBlocos('corrida', [], e)).toMatch(/corrida/)
    expect(validarBlocos('ciclismo', [], e)).toMatch(/ciclismo/)
    expect(validarBlocos('brick', [], e)).toMatch(/^Bike:/)
    e.corrida = { blocos: [b({ tipo: 'long-run', distancia: 21 })] }
    expect(montarDetalhes('corrida', { observacoes: ' leve ' }, [], [], e)).toMatchObject({ observacoes: 'leve' })
    expect(estruturadosDe('corrida', montarDetalhesCorrida(e.corrida)).corrida.blocos).toHaveLength(1)
    expect(estruturadosDe('ciclismo', { ambiente: 'outdoor' }).ciclismo.ambiente).toBe('outdoor')
  })
  it('WhatsApp do brick traz a sequência e os blocos numerados', () => {
    const brick: DadosBrick = { blocos_bike: [c({ tipo: 'longo', nome: 'Pedal', distancia: 40 })], transicao_segundos: 120, blocos_corrida: [b({ tipo: 'race-pace', nome: 'Run', distancia: 10 })] }
    const m = gerarMensagemTreino({ nomeAluno: 'Ana', nomePersonal: 'Bia', nomeTreino: 'Brick', modalidade: 'brick', detalhes: montarDetalhesBrick(brick) as never })
    expect(m).toContain('🧱 🚴 40 km → ⏱ 2min → 🏃 10 km')
    expect(m).toContain('1. 🚴 Pedal — 40 km')
  })
  it('métricas do resultado: corrida, ciclismo e brick', () => {
    const corrida = { resultado: { conclusao: 'sim', distancia_km: 5.2, tempo_min: 28, pace_medio: '5:23', rpe: 7 } }
    expect(textoMetrica('corrida', corrida)).toBe('5,2 km em 28 min · pace 5:23/km · RPE 7')
    expect(metricaPrincipal('brick', { resultado: { bike_distancia_km: 40, run_distancia_km: 10 } }).valor).toBe(50)
    expect(textoMetrica('brick', { resultado: { bike_distancia_km: 40, run_distancia_km: 10, rpe: 8 } })).toBe('40 km bike · 10 km corrida · RPE 8')
    expect(textoMetrica('ciclismo', { resultado: { distancia_km: 60, tempo_min: 120, velocidade_media: 30 } })).toBe('60 km em 120 min · 30 km/h')
  })
})
