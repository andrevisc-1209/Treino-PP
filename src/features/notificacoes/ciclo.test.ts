import { describe, expect, it } from 'vitest'
import { linkEncerrarMes, periodoDoCiclo, textoCicloEncerrado } from './ciclo'

const p = { periodo_inicio: '2026-09-10', periodo_fim: '2026-10-09', total: 600, modelo: 'por_aula' as const }

describe('notificação de ciclo encerrado', () => {
  it('período e texto', () => {
    expect(periodoDoCiclo(p)).toBe('10/09 a 09/10')
    expect(textoCicloEncerrado(p).replace(/\s/g, ' ')).toBe('O ciclo de 10/09 a 09/10 fechou. Encerre o mês e envie o resumo com o valor de R$ 600,00.')
  })
  it('sem valor, não inventa', () => {
    expect(textoCicloEncerrado({ periodo_inicio: '2026-09-10', periodo_fim: '2026-10-09' })).toBe('O ciclo de 10/09 a 09/10 fechou. Encerre o mês e envie o resumo.')
  })
  it('o botão abre o fechamento daquele ciclo', () => {
    expect(linkEncerrarMes('a1', p)).toBe('/alunos/a1/fechar-ciclo?ref=2026-09-10')
    expect(linkEncerrarMes('a1', {})).toBe('/alunos/a1/fechar-ciclo')
  })
})
