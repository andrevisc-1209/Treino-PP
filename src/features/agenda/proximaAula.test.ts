import { describe, expect, it } from 'vitest'
import { localCurto, organizarAulasDoDia, type AulaDoDia } from './proximaAula'

const hora = (h: string) => `2026-10-28T${h}:00-03:00`
const aula = (id: string, h: string, status: AulaDoDia['status'] = 'agendada', min = 60): AulaDoDia => ({ id, status, starts_at: hora(h), duration_min: min })
const agora = (h: string) => new Date(hora(h)).getTime()

describe('organizarAulasDoDia', () => {
  const dia = [aula('a', '07:00'), aula('b', '10:00'), aula('c', '14:00')]

  it('antes da primeira aula, o destaque é a primeira e as demais seguem por horário', () => {
    const r = organizarAulasDoDia(dia, agora('06:00'))
    expect(r.destaque?.id).toBe('a')
    expect(r.situacao).toBe('proxima')
    expect(r.seguintes.map((x) => x.id)).toEqual(['b', 'c'])
  })
  it('aula em andamento continua em destaque até o horário terminar', () => {
    const r = organizarAulasDoDia(dia, agora('07:30'))
    expect(r.destaque?.id).toBe('a')
    expect(r.situacao).toBe('em_andamento')
  })
  it('depois que uma aula é realizada, o destaque avança para a próxima pendente', () => {
    const r = organizarAulasDoDia([aula('a', '07:00', 'realizada'), aula('b', '10:00'), aula('c', '14:00')], agora('07:30'))
    expect(r.destaque?.id).toBe('b')
    expect(r.encerradas.map((x) => x.id)).toEqual(['a'])
  })
  it('aula que passou sem registro vira "atrasada" na lista, mas o destaque segue para a próxima por vir', () => {
    const r = organizarAulasDoDia(dia, agora('09:00'))
    expect(r.destaque?.id).toBe('b')
    expect(r.seguintes.map((x) => x.id)).toEqual(['a', 'c'])
  })
  it('sem nenhuma por vir, o destaque é a atrasada mais antiga e isso fica explícito', () => {
    const r = organizarAulasDoDia(dia, agora('18:00'))
    expect(r.destaque?.id).toBe('a')
    expect(r.situacao).toBe('atrasada')
  })
  it('sem pendentes não há destaque (a tela mostra o resumo do dia)', () => {
    const r = organizarAulasDoDia([aula('a', '07:00', 'realizada'), aula('b', '10:00', 'cancelada')], agora('11:00'))
    expect(r.destaque).toBeNull()
    expect(r.situacao).toBeNull()
    expect(r.encerradas).toHaveLength(2)
  })
  it('conta as outras aulas no mesmo horário do destaque', () => {
    const r = organizarAulasDoDia([aula('a', '07:00'), aula('b', '07:00'), aula('c', '10:00')], agora('06:00'))
    expect(r.outrasNoHorario).toBe(1)
    expect(organizarAulasDoDia(dia, agora('06:00')).outrasNoHorario).toBe(0)
  })
  it('ordena por horário mesmo se vierem fora de ordem e lista vazia não quebra', () => {
    expect(organizarAulasDoDia([aula('c', '14:00'), aula('a', '07:00')], agora('06:00')).destaque?.id).toBe('a')
    expect(organizarAulasDoDia([], agora('06:00')).destaque).toBeNull()
  })
})

describe('localCurto', () => {
  it('nome do lugar + bairro', () => {
    expect(localCurto('Posto 4 — Av. Atlântica, s/n - Copacabana, Rio de Janeiro - RJ, 22070-000, Brasil')).toBe('Posto 4 · Copacabana')
    expect(localCurto('Academia Smart Fit — Largo do Machado — Largo do Machado, 29 - Catete, Rio de Janeiro - RJ, 22221-020, Brasil')).toBe('Academia Smart Fit · Catete')
  })
  it('sem o padrão, usa o trecho antes da vírgula; vazio devolve vazio', () => {
    expect(localCurto('Parque do Flamengo, aterro')).toBe('Parque do Flamengo')
    expect(localCurto('')).toBe('')
    expect(localCurto(null)).toBe('')
  })
})
