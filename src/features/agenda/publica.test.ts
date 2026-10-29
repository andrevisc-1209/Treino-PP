import { describe, expect, it } from 'vitest'
import { agruparPorDia, linkDaAgendaPublica, lerConsulta } from './publica'

describe('agrupar as vagas por dia', () => {
  it('ordena por data e hora e junta o mesmo dia', () => {
    const r = agruparPorDia([
      { dataISO: '2026-10-31', inicio: '09:00', fim: '10:00' },
      { dataISO: '2026-10-30', inicio: '14:00', fim: '15:00' },
      { dataISO: '2026-10-30', inicio: '07:00', fim: '08:00' },
    ])
    expect(r.map((d) => [d.dataISO, d.vagas.map((v) => v.inicio)])).toEqual([['2026-10-30', ['07:00', '14:00']], ['2026-10-31', ['09:00']]])
    expect(agruparPorDia([])).toEqual([])
  })
})

describe('ler a resposta da função', () => {
  it('formato conhecido', () => {
    expect(lerConsulta({ estado: 'ok', nome_personal: 'André', cidade: 'Rio/RJ', duracao_min: 45, vagas: [{ dataISO: '2026-10-30', inicio: '07:00', fim: '07:45' }] })).toEqual({
      estado: 'ok',
      nome_personal: 'André',
      cidade: 'Rio/RJ',
      duracao_min: 45,
      vagas: [{ dataISO: '2026-10-30', inicio: '07:00', fim: '07:45' }],
    })
  })
  it('qualquer coisa fora do formato vira indisponível; vagas malformadas são descartadas', () => {
    for (const ruim of [null, undefined, 'x', {}, { estado: 'indisponivel' }, { estado: 'ok' }, { estado: 'ok', vagas: 'x' }]) expect(lerConsulta(ruim)).toEqual({ estado: 'indisponivel' })
    expect(lerConsulta({ estado: 'ok', vagas: [{ dataISO: 1 }, null, { dataISO: '2026-10-30', inicio: '07:00', fim: '08:00' }] })).toMatchObject({ vagas: [{ dataISO: '2026-10-30' }] })
  })
  it('link público', () => {
    expect(linkDaAgendaPublica('andre-scherer-4f2k')).toBe('https://treino.personalperto.com.br/agenda/andre-scherer-4f2k')
  })
})
