import { describe, expect, it } from 'vitest'
import { cicloJaResolvido, contagemSemResolvidos, linkEncerrarMes, periodoDoCiclo, textoCicloEncerrado } from './ciclo'

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

describe('aviso de ciclo já resolvido', () => {
  const pendentes = new Set(['a1'])
  it('resolvido quando o aluno já não tem ciclo esperando fatura', () => {
    expect(cicloJaResolvido({ tipo: 'ciclo_encerrado', aluno_id: 'a2' }, pendentes)).toBe(true)
    expect(cicloJaResolvido({ tipo: 'ciclo_encerrado', aluno_id: 'a1' }, pendentes)).toBe(false)
  })
  it('nunca resolve enquanto carrega, sem aluno ou de outro tipo', () => {
    expect(cicloJaResolvido({ tipo: 'ciclo_encerrado', aluno_id: 'a2' }, null)).toBe(false)
    expect(cicloJaResolvido({ tipo: 'ciclo_encerrado', aluno_id: null }, pendentes)).toBe(false)
    expect(cicloJaResolvido({ tipo: 'pedido_aula', aluno_id: 'a2' }, pendentes)).toBe(false)
  })
  it('o selo desconta só os avisos resolvidos', () => {
    expect(contagemSemResolvidos({ total: 5, acao: 3 }, ['a1', 'a2', 'a3'], pendentes)).toEqual({ total: 3, acao: 1 })
    expect(contagemSemResolvidos({ total: 5, acao: 3 }, ['a1', 'a2', 'a3'], null)).toEqual({ total: 5, acao: 3 })
    expect(contagemSemResolvidos({ total: 1, acao: 1 }, ['x', 'y'], new Set())).toEqual({ total: 0, acao: 0 })
  })
})
