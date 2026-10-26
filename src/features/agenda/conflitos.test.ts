import { describe, expect, it } from 'vitest'
import { conflitosDoHorario, pendentesComoExistentes, descreverConflitos, horariosFixosSobrepoe } from './conflitos'

const h = (id: string, weekday: number, start_time: string, duration_min: number, aluno_nomes: string[]) => ({ id, weekday, start_time, duration_min, aluno_nomes })

describe('horariosFixosSobrepoe', () => {
  it('mesmo dia e intervalos que se cruzam', () => {
    expect(horariosFixosSobrepoe({ weekday: 1, start_time: '07:00', duration_min: 60 }, { weekday: 1, start_time: '07:30', duration_min: 60 })).toBe(true)
  })
  it('encostar (um termina quando o outro começa) não é conflito', () => {
    expect(horariosFixosSobrepoe({ weekday: 1, start_time: '07:00', duration_min: 60 }, { weekday: 1, start_time: '08:00', duration_min: 60 })).toBe(false)
  })
  it('dias diferentes não conflitam', () => {
    expect(horariosFixosSobrepoe({ weekday: 1, start_time: '07:00', duration_min: 60 }, { weekday: 2, start_time: '07:00', duration_min: 60 })).toBe(false)
  })
})

describe('conflitosDoHorario', () => {
  const existentes = [h('a', 1, '07:00', 60, ['Paulo']), h('b', 3, '07:00', 60, ['Ana', 'Bruno']), h('c', 5, '18:00', 60, ['Lia'])]

  it('acha todos os horários que cruzam, em qualquer dia escolhido', () => {
    const r = conflitosDoHorario({ weekdays: [1, 3, 5], start_time: '07:30', duration_min: 60 }, existentes)
    expect(r.map((x) => x.id)).toEqual(['a', 'b'])
  })
  it('sem cruzamento: lista vazia (não pede confirmação)', () => {
    expect(conflitosDoHorario({ weekdays: [1], start_time: '09:00', duration_min: 60 }, existentes)).toEqual([])
  })
  it('sem dias escolhidos: nada a conferir', () => {
    expect(conflitosDoHorario({ weekdays: [], start_time: '07:00', duration_min: 60 }, existentes)).toEqual([])
  })
})

describe('descreverConflitos', () => {
  it('mostra dia, hora e quem já está no horário', () => {
    const texto = descreverConflitos([h('a', 1, '07:00', 60, ['Paulo']), h('b', 3, '07:00', 60, ['Ana', 'Bruno'])])
    expect(texto).toContain('07:00 (Paulo)')
    expect(texto).toContain('07:00 (Ana, Bruno)')
    expect(texto).toContain('; ')
  })
  it('horário sem alunos', () => expect(descreverConflitos([h('a', 1, '07:00', 60, [])])).toContain('(sem alunos)'))
})

describe('pendentesComoExistentes', () => {
  const pend = [{ weekdays: [1, 3], start_time: '07:00', duration_min: 60, local: ' ', coParticipantesIds: ['x'] }]
  it('gera uma linha por dia, com o nome do aluno e dos co-participantes', () => {
    const linhas = pendentesComoExistentes(pend, 'Carla', (id) => (id === 'x' ? 'Duda' : undefined))
    expect(linhas).toHaveLength(2)
    expect(linhas[0]).toMatchObject({ weekday: 1, start_time: '07:00', local: null, aluno_nomes: ['Carla', 'Duda'] })
  })
  it('um segundo horário que cruza com o pendente é detectado', () => {
    const linhas = pendentesComoExistentes(pend, '', () => undefined)
    const c = conflitosDoHorario({ weekdays: [3], start_time: '07:30', duration_min: 60 }, linhas)
    expect(c).toHaveLength(1)
    expect(descreverConflitos(c)).toContain('este aluno')
  })
})
