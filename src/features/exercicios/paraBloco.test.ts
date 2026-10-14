import { describe, expect, it } from 'vitest'
import type { Exercicio } from './api'
import { exerciciosParaBloco } from './paraBloco'

const ex = (p: Partial<Exercicio>): Exercicio => ({ id: p.name ?? 'x', professional_id: 'eu', name: 'X', muscle_group: null, equipment: null, description: null, ...p })

const lista: Exercicio[] = [
  ex({ name: 'Tiros 400', modalidade: 'corrida', tipo: 'intervalado-curto', parametro_principal: 'distancia' }),
  ex({ name: 'Subida do morro', modalidade: 'ciclismo', tipo: 'subidas', parametro_principal: 'tempo' }),
  ex({ name: 'HIIT rolo', modalidade: 'ciclismo', tipo: 'hiit' }),
  ex({ name: 'Bike do brick', modalidade: 'brick', tipo: 'bike' }),
  ex({ name: 'Corrida do brick', modalidade: 'brick', tipo: 'corrida' }),
  ex({ name: 'Supino', modalidade: 'musculacao', muscle_group: 'Peito' }),
  ex({ name: 'Global', professional_id: null, modalidade: 'corrida', tipo: 'long-run' }),
]

describe('exerciciosParaBloco', () => {
  it('corrida: só os meus da modalidade corrida', () => {
    expect(exerciciosParaBloco(lista, 'corrida').map((e) => e.nome)).toEqual(['Tiros 400'])
  })
  it('ciclismo: só tipos que existem no ambiente (subidas é outdoor, hiit é indoor)', () => {
    expect(exerciciosParaBloco(lista, 'ciclismo', { ambiente: 'outdoor' }).map((e) => e.nome)).toEqual(['Subida do morro'])
    expect(exerciciosParaBloco(lista, 'ciclismo', { ambiente: 'indoor' }).map((e) => e.nome)).toEqual(['HIIT rolo'])
  })
  it('brick: exercícios da modalidade brick entram na parte certa, com tipo de bloco genérico', () => {
    const bike = exerciciosParaBloco(lista, 'ciclismo', { ambiente: 'outdoor', incluirBrick: true })
    expect(bike.map((e) => [e.nome, e.tipoId])).toEqual([['Bike do brick', 'resistencia-base'], ['Subida do morro', 'subidas']])
    const corrida = exerciciosParaBloco(lista, 'corrida', { incluirBrick: true })
    expect(corrida.map((e) => [e.nome, e.tipoId])).toEqual([['Corrida do brick', 'aerobico-base'], ['Tiros 400', 'intervalado-curto']])
  })
  it('não traz exercícios do sistema nem de musculação, e detalhe mostra tipo e parâmetro', () => {
    const r = exerciciosParaBloco(lista, 'corrida')
    expect(r.some((e) => e.nome === 'Global' || e.nome === 'Supino')).toBe(false)
    expect(r[0].detalhe).toBe('Intervalado Curto · Distância')
  })
})
