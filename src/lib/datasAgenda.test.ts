import { describe, expect, it } from 'vitest'
import { rotuloDiaAgenda, rotuloSemanaAgenda } from './datas'

describe('rótulo do cabeçalho da Agenda', () => {
  it('dia atual é "Hoje"; outro dia mostra dia da semana + data curta', () => {
    expect(rotuloDiaAgenda('2026-10-14', '2026-10-14')).toBe('Hoje')
    expect(rotuloDiaAgenda('2026-10-15', '2026-10-14')).toBe('Qui, 15/10')
    expect(rotuloDiaAgenda('2026-10-13', '2026-10-14')).toBe('Ter, 13/10')
    expect(rotuloDiaAgenda('2027-01-01', '2026-10-14')).toBe('Sex, 01/01')
  })
  it('semana atual é "Esta semana"; outra mostra o intervalo', () => {
    expect(rotuloSemanaAgenda('2026-10-12', '2026-10-14')).toBe('Esta semana')
    expect(rotuloSemanaAgenda('2026-10-19', '2026-10-14')).toBe('19/10–25/10')
    expect(rotuloSemanaAgenda('2026-10-26', '2026-10-14')).toBe('26/10–01/11')
  })
})
