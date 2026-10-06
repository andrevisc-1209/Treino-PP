import { describe, expect, it } from 'vitest'
import { descreverMenuAula } from './menuAula'

describe('descreverMenuAula', () => {
  it('o menu nunca fica vazio, em nenhuma combinação', () => {
    for (const status of ['agendada', 'realizada', 'cancelada'] as const) {
      for (const totalParticipantes of [0, 1, 3]) {
        for (const previstos of [0, 1, 3].filter((p) => p <= totalParticipantes)) {
          const m = descreverMenuAula({ status, totalParticipantes, previstos })
          expect(m.mensagem !== null || m.agirNosAlunos || m.agirNaAula).toBe(true)
        }
      }
    }
  })

  it('aula agendada sem alunos oferece cancelar/remarcar e explica (era o painel vazio do iPhone)', () => {
    const m = descreverMenuAula({ status: 'agendada', totalParticipantes: 0, previstos: 0 })
    expect(m).toMatchObject({ agirNosAlunos: false, agirNaAula: true })
    expect(m.mensagem).toMatch(/não tem alunos/)
  })

  it('aula agendada com todos já registrados explica e mantém cancelar/remarcar', () => {
    const m = descreverMenuAula({ status: 'agendada', totalParticipantes: 2, previstos: 0 })
    expect(m).toMatchObject({ agirNosAlunos: false, agirNaAula: true })
    expect(m.mensagem).toMatch(/já foram registrados/)
  })

  it('aula normal: ações dos alunos + da aula, sem aviso', () => {
    expect(descreverMenuAula({ status: 'agendada', totalParticipantes: 1, previstos: 1 })).toEqual({ mensagem: null, agirNosAlunos: true, agirNaAula: true })
  })

  it('aula realizada/cancelada: só informa', () => {
    expect(descreverMenuAula({ status: 'realizada', totalParticipantes: 1, previstos: 0 })).toMatchObject({ agirNosAlunos: false, agirNaAula: false })
    expect(descreverMenuAula({ status: 'cancelada', totalParticipantes: 1, previstos: 1 }).mensagem).toMatch(/cancelada/)
  })
})
