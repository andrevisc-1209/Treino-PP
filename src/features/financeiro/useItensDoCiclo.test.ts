import { describe, expect, it } from 'vitest'
import { itemDeExecucaoADistancia } from './api'
import { juntarTreinosADistancia } from './useItensDoCiclo'
import { resumoRecibo, type ItemRecibo } from './recibo'

const aula = (id: string, execucao_id: string | null): ItemRecibo => ({ id, status: 'presente', valor: 50, starts_at: '2026-10-06T15:30:00Z', duration_min: 60, local: null, pse: null, nota: null, data_sessao: null, execucao_id })
const exec = (id: string) => itemDeExecucaoADistancia({ id, modalidade: 'corrida', concluido_em: '2026-10-08T12:00:00Z', detalhes_execucao: { resultado: { distancia_km: 5.2, pre_sono: 3 } } })

describe('treinos à distância no ciclo', () => {
  it('o treino à distância não cobrado entra como informação, fora da cobrança', () => {
    const e = exec('e1')
    expect(e).toMatchObject({ fora_da_cobranca: true, a_distancia: true, modalidade: 'corrida', status: 'presente' })
    expect(e.volume?.corridaKm).toBe(5.2)
  })
  it('só os números do resultado são lidos: prontidão não vai para o item', () => {
    expect(JSON.stringify(exec('e1'))).not.toMatch(/pre_sono|sono/)
  })
  it('o que já está na fatura (cobrado como aula) não entra de novo', () => {
    const itens = juntarTreinosADistancia([aula('a', 'e1'), aula('b', null)], [exec('e1'), exec('e2')])
    expect(itens.map((i) => i.id)).toEqual(['a', 'b', 'exec-e2'])
  })
  it('não conta como aula realizada nem como dia treinado', () => {
    const itens = juntarTreinosADistancia([aula('a', null)], [exec('e2')])
    expect(resumoRecibo(itens).aulasRealizadas).toBe(1)
    expect(resumoRecibo(itens).diasUnicos).toBe(1)
  })
})
