import { describe, expect, it } from 'vitest'
import { duracaoConfiavel, metricasDeTreino, resumoPorModalidade, textoResumoModalidade, type ItemRecibo } from './recibo'
import { volumeZero } from '@/features/execucoes/volume'

const item = (p: Partial<ItemRecibo> & { id: string }): ItemRecibo => ({
  status: 'presente',
  valor: null,
  starts_at: '2026-10-06T15:30:00Z',
  duration_min: 60,
  local: null,
  modalidade: null,
  pse: null,
  nota: null,
  data_sessao: null,
  ...p,
})
const vol = (p: Partial<ReturnType<typeof volumeZero>>) => ({ ...volumeZero(), ...p })
const textos = (itens: ItemRecibo[]) => resumoPorModalidade(itens).map((r) => `${r.rotulo}: ${textoResumoModalidade(r)}`)

describe('resumoPorModalidade (as 5 modalidades ativas)', () => {
  it('ciclo misto do Bruno: natação, musculação e corrida, cada uma com o seu número', () => {
    const itens = [
      item({ id: '1', modalidade: 'natacao', volume: vol({ natacaoKm: 1.8 }) }),
      item({ id: '2', modalidade: 'natacao', volume: vol({ natacaoKm: 1.4 }) }),
      item({ id: '3', modalidade: 'musculacao', series_feitas: 13, exercicios_feitos: 4 }),
      item({ id: '4', modalidade: 'corrida', volume: vol({ corridaKm: 5.2 }) }),
      item({ id: '5', modalidade: 'corrida', volume: vol({ corridaKm: 7.2 }) }),
    ]
    expect(textos(itens)).toEqual(['Musculação: 1 aula · 13 séries', 'Corrida: 2 aulas · 12,4 km', 'Natação: 2 aulas · 3.200 m nadados'])
  })
  it('ciclismo: km; sem distância, minutos', () => {
    expect(textos([item({ id: '1', modalidade: 'ciclismo', volume: vol({ ciclismoKm: 42 }) })])).toEqual(['Ciclismo: 1 aula · 42 km'])
    expect(textos([item({ id: '1', modalidade: 'ciclismo', volume: vol({ ciclismoMin: 60 }) })])).toEqual(['Ciclismo: 1 aula · 60 min'])
  })
  it('brick: bike e corrida em separado', () => {
    expect(textos([item({ id: '1', modalidade: 'brick', volume: vol({ ciclismoKm: 30, corridaKm: 5 }) })])).toEqual(['Brick (Bike→Run): 1 aula · 30 km de bike · 5 km de corrida'])
  })
  it('sem número registrado fica só a contagem de aulas (nada de zero nem traço)', () => {
    expect(textos([item({ id: '1', modalidade: 'corrida' }), item({ id: '2', modalidade: 'natacao' })])).toEqual(['Corrida: 1 aula', 'Natação: 1 aula'])
  })
  it('faltas, cancelamentos e aulas sem modalidade ficam de fora', () => {
    const itens = [item({ id: '1', modalidade: 'corrida', status: 'falta' }), item({ id: '2', modalidade: null }), item({ id: '3', modalidade: 'corrida', status: 'cancelou' })]
    expect(resumoPorModalidade(itens)).toEqual([])
  })
  it('tempo só entra se for plausível (20 min a 3 h)', () => {
    expect(duracaoConfiavel(1)).toBeNull()
    expect(duracaoConfiavel(19)).toBeNull()
    expect(duracaoConfiavel(45)).toBe(45)
    expect(duracaoConfiavel(180)).toBeNull()
    expect(textos([item({ id: '1', modalidade: 'corrida', duracao_execucao_min: 45 })])).toEqual(['Corrida: 1 aula · 45 min'])
    expect(textos([item({ id: '1', modalidade: 'corrida', duracao_execucao_min: 1 })])).toEqual(['Corrida: 1 aula'])
  })
  it('o "tempo de treino" de 1 minuto do relatório antigo deixa de aparecer', () => {
    expect(metricasDeTreino([item({ id: '1', modalidade: 'musculacao', exercicios_feitos: 4, series_feitas: 13, duracao_sessao_min: 1 })])).toEqual({ exercicios: 4, series: 13, minutos: 0 })
  })
  it('treino à distância não cobrado aparece separado, sem virar aula', () => {
    const itens = [
      item({ id: '1', modalidade: 'corrida', volume: vol({ corridaKm: 5 }) }),
      item({ id: '2', modalidade: 'corrida', volume: vol({ corridaKm: 4 }), a_distancia: true, fora_da_cobranca: true }),
    ]
    expect(textos(itens)).toEqual(['Corrida: 1 aula · 1 treino à distância · 9 km'])
    expect(textos([item({ id: '3', modalidade: 'natacao', a_distancia: true, fora_da_cobranca: true })])).toEqual(['Natação: 1 treino à distância'])
  })
})
