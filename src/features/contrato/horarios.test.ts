import { describe, expect, it } from 'vitest'
import { descreverHorarios, horariosVigentes, localDosHorarios, type HorarioParaContrato } from './horarios'

const h = (o: Partial<HorarioParaContrato> = {}): HorarioParaContrato => ({ weekday: 1, start_time: '07:00:00', duration_min: 60, local: null, active: true, valid_until: null, ...o })
const hoje = '2026-10-29'

describe('horários do aluno em texto', () => {
  it('agrupa dias com o mesmo horário, na ordem de segunda a domingo', () => {
    expect(descreverHorarios([h({ weekday: 3 }), h({ weekday: 1 })], hoje)).toBe('segundas e quartas, às 07:00')
    expect(descreverHorarios([h({ weekday: 0 }), h({ weekday: 6 }), h({ weekday: 5 })], hoje)).toBe('sextas, sábados e domingos, às 07:00')
  })
  it('horários diferentes viram partes separadas, com a duração quando não é 60 min', () => {
    expect(descreverHorarios([h({ weekday: 5, start_time: '18:30', duration_min: 45 }), h({ weekday: 1 }), h({ weekday: 3 })], hoje)).toBe('segundas e quartas, às 07:00; sextas, às 18:30 (45 min)')
  })
  it('ignora horário inativo ou com data final vencida; sem horário = vazio', () => {
    const lista = [h({ active: false }), h({ weekday: 2, valid_until: '2026-10-28' }), h({ weekday: 4, valid_until: '2026-10-29' })]
    expect(horariosVigentes(lista, hoje)).toHaveLength(1)
    expect(descreverHorarios(lista, hoje)).toBe('quintas, às 07:00')
    expect(descreverHorarios([], hoje)).toBe('')
  })
  it('um dia repetido não aparece duas vezes', () => {
    expect(descreverHorarios([h(), h()], hoje)).toBe('segundas, às 07:00')
  })
})

describe('local mais usado nos horários', () => {
  it('o que mais aparece vence; local vazio e horário inativo não contam', () => {
    const lista = [h({ local: 'Academia A' }), h({ weekday: 2, local: 'Praça B' }), h({ weekday: 3, local: 'Praça B' }), h({ weekday: 4, local: 'Academia A', active: false }), h({ weekday: 5, local: '  ' })]
    expect(localDosHorarios(lista, hoje)).toBe('Praça B')
    expect(localDosHorarios([h()], hoje)).toBe('')
  })
})
