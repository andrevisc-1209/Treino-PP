import { describe, expect, it } from 'vitest'
import { agruparPorHorario, conflitosDeAluno, criarAbreviador, type AulaParaLeitura } from './leituraDaAgenda'

describe('criarAbreviador', () => {
  it('prenome sozinho quando é único na semana', () => {
    const ab = criarAbreviador(['Andressa pimentel', 'bruno paulo', 'André Scherer'])
    expect(ab('Andressa pimentel')).toBe('Andressa')
    expect(ab('bruno paulo')).toBe('Bruno')
    expect(ab('André Scherer')).toBe('André')
  })
  it('prenome repetido ganha a inicial do último sobrenome', () => {
    const ab = criarAbreviador(['Paulo Henrique guimaraes', 'Paulo Paixão', 'Ana Lima'])
    expect(ab('Paulo Henrique guimaraes')).toBe('Paulo G.')
    expect(ab('Paulo Paixão')).toBe('Paulo P.')
    expect(ab('Ana Lima')).toBe('Ana')
  })
  it('se nem a inicial distingue, mostra o nome inteiro', () => {
    const ab = criarAbreviador(['Paulo Pereira', 'Paulo Pinto'])
    expect(ab('Paulo Pereira')).toBe('Paulo Pereira')
    expect(ab('Paulo Pinto')).toBe('Paulo Pinto')
  })
  it('o mesmo aluno repetido na semana não conta como colisão', () => {
    const ab = criarAbreviador(['Paulo Paixão', 'Paulo Paixão', 'Paulo Paixão'])
    expect(ab('Paulo Paixão')).toBe('Paulo')
  })
  it('nome vazio devolve vazio', () => {
    expect(criarAbreviador([])('')).toBe('')
  })
})

describe('agruparPorHorario', () => {
  it('junta quem começa no mesmo instante, mantendo a ordem', () => {
    const g = agruparPorHorario([
      { id: 'a', starts_at: '2026-10-28T07:00:00-03:00' },
      { id: 'b', starts_at: '2026-10-28T07:00:00-03:00' },
      { id: 'c', starts_at: '2026-10-28T10:00:00-03:00' },
    ])
    expect(g.map((x) => x.aulas.map((a) => a.id))).toEqual([['a', 'b'], ['c']])
  })
})

describe('conflitosDeAluno', () => {
  const aula = (id: string, h: string, alunos: [string, string][], status: AulaParaLeitura['status'] = 'agendada', min = 60): AulaParaLeitura => ({
    id,
    status,
    starts_at: `2026-10-28T${h}:00-03:00`,
    duration_min: min,
    aula_participantes: alunos.map(([aluno_id, nome]) => ({ aluno_id, status: 'previsto', aluno: { name: nome } })),
  })
  it('alunos diferentes no mesmo horário não é conflito', () => {
    expect(conflitosDeAluno([aula('a', '07:00', [['1', 'Paulo']]), aula('b', '07:00', [['2', 'Ana']])]).size).toBe(0)
  })
  it('o mesmo aluno em duas aulas que se cruzam é conflito nas duas', () => {
    const r = conflitosDeAluno([aula('a', '07:00', [['1', 'Paulo']]), aula('b', '07:30', [['1', 'Paulo']])])
    expect(r.get('a')).toEqual(['Paulo'])
    expect(r.get('b')).toEqual(['Paulo'])
  })
  it('aulas seguidas (uma termina quando a outra começa) não se cruzam', () => {
    expect(conflitosDeAluno([aula('a', '07:00', [['1', 'Paulo']]), aula('b', '08:00', [['1', 'Paulo']])]).size).toBe(0)
  })
  it('aula cancelada ou participante que cancelou não gera conflito', () => {
    expect(conflitosDeAluno([aula('a', '07:00', [['1', 'Paulo']]), aula('b', '07:00', [['1', 'Paulo']], 'cancelada')]).size).toBe(0)
    const a = aula('a', '07:00', [['1', 'Paulo']])
    const b = aula('b', '07:00', [['1', 'Paulo']])
    b.aula_participantes[0].status = 'cancelou'
    expect(conflitosDeAluno([a, b]).size).toBe(0)
  })
})
