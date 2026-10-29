import { describe, expect, it } from 'vitest'
import { PARAMETROS_PADRAO } from './disponibilidade'
import { calcularVagas, mensagemDaVaga, rotuloDaVaga, type EntradaVagas } from './vagas'

// 2026-10-30 é sexta-feira (weekday 5); São Paulo = UTC-3
const base: EntradaVagas = {
  janelas: [{ weekday: 5, start_time: '07:00:00', end_time: '10:00:00' }],
  aulas: [],
  bloqueios: [],
  parametros: PARAMETROS_PADRAO,
  agora: new Date('2026-10-29T12:00:00Z'),
  de: '2026-10-30',
  ate: '2026-10-30',
}
const horas = (v: { inicio: string }[]) => v.map((x) => x.inicio)
const aula = (hora: string, duration_min = 60, status = 'agendada') => ({ starts_at: `2026-10-30T${hora}:00-03:00`, duration_min, status })

describe('vagas livres', () => {
  it('fatia a janela em aulas da duração padrão', () => {
    expect(calcularVagas(base).map((v) => `${v.inicio}-${v.fim}`)).toEqual(['07:00-08:00', '08:00-09:00', '09:00-10:00'])
  })
  it('o intervalo entre aulas separa as vagas', () => {
    expect(horas(calcularVagas({ ...base, parametros: { ...PARAMETROS_PADRAO, intervaloMin: 15 } }))).toEqual(['07:00', '08:15'])
  })
  it('aula marcada tira a vaga; cancelada libera', () => {
    expect(horas(calcularVagas({ ...base, aulas: [aula('08:00')] }))).toEqual(['07:00', '09:00'])
    expect(horas(calcularVagas({ ...base, aulas: [aula('08:00', 60, 'cancelada')] }))).toEqual(['07:00', '08:00', '09:00'])
    expect(horas(calcularVagas({ ...base, aulas: [aula('08:00', 60, 'realizada')] }))).toEqual(['07:00', '09:00'])
  })
  it('aula fora do horário redondo reorganiza as vagas depois dela', () => {
    expect(calcularVagas({ ...base, aulas: [aula('07:30', 60)] }).map((v) => `${v.inicio}-${v.fim}`)).toEqual(['08:30-09:30'])
    expect(calcularVagas({ ...base, janelas: [{ weekday: 5, start_time: '07:00', end_time: '12:00' }], aulas: [aula('07:30', 60)] }).map((v) => `${v.inicio}-${v.fim}`)).toEqual(['08:30-09:30', '09:30-10:30', '10:30-11:30'])
  })
  it('o intervalo vale dos dois lados da aula marcada', () => {
    const p = { ...PARAMETROS_PADRAO, intervaloMin: 15 }
    const r = calcularVagas({ ...base, janelas: [{ weekday: 5, start_time: '07:00', end_time: '12:00' }], aulas: [aula('09:00')], parametros: p })
    expect(r.map((v) => `${v.inicio}-${v.fim}`)).toEqual(['07:00-08:00', '10:15-11:15'])
  })
  it('bloqueio do dia tira todas as vagas', () => {
    expect(calcularVagas({ ...base, bloqueios: [{ data_inicio: '2026-10-28', data_fim: '2026-10-30' }] })).toEqual([])
    expect(calcularVagas({ ...base, bloqueios: [{ data_inicio: '2026-10-31', data_fim: '2026-11-02' }] })).toHaveLength(3)
  })
  it('só dias que o personal atende; vários dias em ordem', () => {
    const r = calcularVagas({ ...base, janelas: [{ weekday: 5, start_time: '07:00', end_time: '08:00' }, { weekday: 6, start_time: '09:00', end_time: '10:00' }], ate: '2026-11-01' })
    expect(r.map((v) => `${v.dataISO} ${v.inicio}`)).toEqual(['2026-10-30 07:00', '2026-10-31 09:00'])
  })
  it('duas janelas no mesmo dia', () => {
    const r = calcularVagas({ ...base, janelas: [{ weekday: 5, start_time: '14:00', end_time: '15:00' }, { weekday: 5, start_time: '07:00', end_time: '08:00' }] })
    expect(horas(r)).toEqual(['07:00', '14:00'])
  })
  it('não oferece horário que já passou nem o que está dentro da antecedência mínima', () => {
    const noMeio = { ...base, agora: new Date('2026-10-30T08:30:00-03:00') }
    expect(horas(calcularVagas(noMeio))).toEqual(['09:00'])
    expect(horas(calcularVagas({ ...noMeio, antecedenciaHoras: 3 }))).toEqual([])
    expect(horas(calcularVagas({ ...base, agora: new Date('2026-10-30T05:00:00-03:00'), antecedenciaHoras: 3 }))).toEqual(['08:00', '09:00'])
  })
  it('janela menor que a aula não gera vaga', () => {
    expect(calcularVagas({ ...base, janelas: [{ weekday: 5, start_time: '07:00', end_time: '07:40' }] })).toEqual([])
  })
})

describe('mensagem da vaga', () => {
  it('só o primeiro nome do aluno, o dia e a hora', () => {
    const m = mensagemDaVaga({ alunoNome: 'Maria Souza', personalNome: 'André Scherer', vaga: { dataISO: '2026-10-30', inicio: '07:00' } })
    expect(m).toBe('Oi, Maria! Abriu uma vaga na minha agenda: sexta, 30 de outubro, às 07:00. Se quiser, me responda aqui que eu confirmo. — André Scherer')
    expect(m).not.toContain('Souza')
  })
  it('sem nome do personal não deixa o travessão solto', () => {
    expect(mensagemDaVaga({ alunoNome: 'Ana', personalNome: ' ', vaga: { dataISO: '2026-10-30', inicio: '07:00' } })).not.toContain('—')
  })
  it('rótulo da vaga', () => {
    expect(rotuloDaVaga({ dataISO: '2026-10-30', inicio: '07:00', fim: '08:00' })).toBe('Sexta, 30 de outubro, 07:00 às 08:00')
  })
})
