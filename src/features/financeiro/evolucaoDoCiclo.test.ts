import { describe, expect, it } from 'vitest'
import { evolucaoDoCiclo, paceEmSegundos } from './evolucaoDoCiclo'
import { volumeZero } from '@/features/execucoes/volume'
import type { ItemRecibo } from './recibo'

const item = (p: Partial<ItemRecibo> & { id: string; starts_at: string }): ItemRecibo => ({ status: 'presente', valor: null, duration_min: 60, local: null, modalidade: null, pse: null, nota: null, data_sessao: null, ...p })
const cargas = (kg: number, id = 'ex1', nome = 'Agachamento') => [{ exercicio_id: id, nome, carga_kg: kg }]
const vol = (p: Partial<ReturnType<typeof volumeZero>>) => ({ ...volumeZero(), ...p })
const txt = (itens: ItemRecibo[]) => evolucaoDoCiclo(itens).map((l) => `${l.modalidade}|${l.assunto}|${l.de}→${l.para}|${l.variacao}`)

describe('paceEmSegundos', () => {
  it('lê "5:29" e recusa o resto', () => {
    expect(paceEmSegundos('5:29')).toBe(329)
    expect(paceEmSegundos(' 6:00 ')).toBe(360)
    expect(paceEmSegundos('5,29')).toBeNull()
    expect(paceEmSegundos('5:75')).toBeNull()
    expect(paceEmSegundos(5.3)).toBeNull()
  })
})

describe('evolucaoDoCiclo', () => {
  it('musculação: carga do primeiro ao último treino do mesmo exercício', () => {
    const itens = [
      item({ id: '1', starts_at: '2026-10-06T15:00:00Z', modalidade: 'musculacao', cargas: cargas(40) }),
      item({ id: '2', starts_at: '2026-10-13T15:00:00Z', modalidade: 'musculacao', cargas: cargas(45) }),
      item({ id: '3', starts_at: '2026-10-27T15:00:00Z', modalidade: 'musculacao', cargas: cargas(50) }),
    ]
    expect(txt(itens)).toEqual(['Musculação|Agachamento|40 kg (06/10)→50 kg (27/10)|+25%'])
  })
  it('com um só registro não há o que comparar', () => {
    expect(evolucaoDoCiclo([item({ id: '1', starts_at: '2026-10-06T15:00:00Z', modalidade: 'musculacao', cargas: cargas(40) })])).toEqual([])
  })
  it('só mostra o que melhorou pelo menos 5%; queda e variação pequena ficam de fora', () => {
    const itens = [
      item({ id: '1', starts_at: '2026-10-06T15:00:00Z', modalidade: 'musculacao', cargas: [...cargas(40), ...cargas(30, 'ex2', 'Supino'), ...cargas(20, 'ex3', 'Remada')] }),
      item({ id: '2', starts_at: '2026-10-20T15:00:00Z', modalidade: 'musculacao', cargas: [...cargas(41), ...cargas(35, 'ex2', 'Supino'), ...cargas(15, 'ex3', 'Remada')] }),
    ]
    expect(txt(itens)).toEqual(['Musculação|Supino|30 kg (06/10)→35 kg (20/10)|+17%'])
  })
  it('musculação mostra no máximo 4 exercícios, os que mais subiram', () => {
    const ex = (n: number, a: number, b: number) => ({ a: { exercicio_id: `e${n}`, nome: `Ex${n}`, carga_kg: a }, b: { exercicio_id: `e${n}`, nome: `Ex${n}`, carga_kg: b } })
    const lista = [ex(1, 10, 11), ex(2, 10, 20), ex(3, 10, 15), ex(4, 10, 13), ex(5, 10, 12), ex(6, 10, 30)]
    const itens = [
      item({ id: '1', starts_at: '2026-10-06T15:00:00Z', modalidade: 'musculacao', cargas: lista.map((x) => x.a) }),
      item({ id: '2', starts_at: '2026-10-20T15:00:00Z', modalidade: 'musculacao', cargas: lista.map((x) => x.b) }),
    ]
    expect(evolucaoDoCiclo(itens).map((l) => l.assunto)).toEqual(['Ex6', 'Ex2', 'Ex3', 'Ex4'])
  })
  it('corrida: distância e pace (menor é melhor)', () => {
    const itens = [
      item({ id: '1', starts_at: '2026-10-06T15:00:00Z', modalidade: 'corrida', volume: vol({ corridaKm: 5 }), pace_seg_km: 370 }),
      item({ id: '2', starts_at: '2026-10-27T15:00:00Z', modalidade: 'corrida', volume: vol({ corridaKm: 7.2 }), pace_seg_km: 335 }),
    ]
    expect(txt(itens)).toEqual(['Corrida|Distância por treino|5 km (06/10)→7,2 km (27/10)|+44%', 'Corrida|Pace médio|6:10/km (06/10)→5:35/km (27/10)|9% mais rápido'])
  })
  it('pace pior não aparece', () => {
    const itens = [
      item({ id: '1', starts_at: '2026-10-06T15:00:00Z', modalidade: 'corrida', pace_seg_km: 330 }),
      item({ id: '2', starts_at: '2026-10-27T15:00:00Z', modalidade: 'corrida', pace_seg_km: 360 }),
    ]
    expect(evolucaoDoCiclo(itens)).toEqual([])
  })
  it('natação em metros e brick com bike e corrida em separado', () => {
    const nat = [
      item({ id: '1', starts_at: '2026-10-06T15:00:00Z', modalidade: 'natacao', volume: vol({ natacaoKm: 1.2 }) }),
      item({ id: '2', starts_at: '2026-10-27T15:00:00Z', modalidade: 'natacao', volume: vol({ natacaoKm: 1.8 }) }),
    ]
    expect(txt(nat)).toEqual(['Natação|Distância por treino|1.200 m (06/10)→1.800 m (27/10)|+50%'])
    const brick = [
      item({ id: '1', starts_at: '2026-10-06T15:00:00Z', modalidade: 'brick', volume: vol({ ciclismoKm: 20, corridaKm: 3 }) }),
      item({ id: '2', starts_at: '2026-10-27T15:00:00Z', modalidade: 'brick', volume: vol({ ciclismoKm: 30, corridaKm: 5 }) }),
    ]
    expect(evolucaoDoCiclo(brick).map((l) => l.assunto)).toEqual(['Bike por treino', 'Corrida por treino'])
  })
  it('faltas e aulas sem modalidade não entram', () => {
    const itens = [
      item({ id: '1', starts_at: '2026-10-06T15:00:00Z', modalidade: 'corrida', volume: vol({ corridaKm: 5 }) }),
      item({ id: '2', starts_at: '2026-10-27T15:00:00Z', modalidade: 'corrida', volume: vol({ corridaKm: 9 }), status: 'falta' }),
    ]
    expect(evolucaoDoCiclo(itens)).toEqual([])
  })
})
